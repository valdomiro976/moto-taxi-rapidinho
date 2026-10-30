'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createApp } = require('../src/app');
const { openDatabase } = require('../src/db');
const { hashPassword, signToken } = require('../src/auth');

async function startServer() {
  const db = openDatabase(':memory:');
  const app = createApp({ db });
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { server, base, db };
}

async function api(base, method, path, { body, token } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function registerUser(base, overrides = {}) {
  const payload = {
    name: 'Usuario',
    email: `u${Math.random().toString(36).slice(2)}@example.com`,
    password: 'segredo1',
    role: 'passenger',
    ...overrides,
  };
  const res = await api(base, 'POST', '/api/auth/register', { body: payload });
  assert.equal(res.status, 201, `registro falhou: ${JSON.stringify(res.data)}`);
  return res.data;
}

// O papel admin so e criado por script, entao inserimos direto no banco.
function seedAdmin(db, email = 'admin@example.com') {
  const info = db
    .prepare(
      `INSERT INTO users (name, email, phone, password_hash, role, created_at)
       VALUES ('Admin', ?, NULL, ?, 'admin', ?)`,
    )
    .run(email, hashPassword('senha-admin'), new Date().toISOString());
  return {
    user: { id: Number(info.lastInsertRowid), role: 'admin' },
    token: signToken({ id: Number(info.lastInsertRowid), role: 'admin' }),
  };
}

test('admin nao pode ser escolhido no autocadastro', async (t) => {
  const { server, base } = await startServer();
  t.after(() => server.close());

  const res = await api(base, 'POST', '/api/auth/register', {
    body: { name: 'X', email: 'x@example.com', password: 'segredo1', role: 'admin' },
  });
  assert.equal(res.status, 400);
});

test('rotas de admin exigem autenticacao e papel admin', async (t) => {
  const { server, base, db } = await startServer();
  t.after(() => server.close());

  const anonymous = await api(base, 'GET', '/api/admin/stats');
  assert.equal(anonymous.status, 401);

  const passenger = await registerUser(base, { role: 'passenger' });
  const forbidden = await api(base, 'GET', '/api/admin/stats', { token: passenger.token });
  assert.equal(forbidden.status, 403);

  const driver = await registerUser(base, { role: 'driver' });
  const forbiddenDriver = await api(base, 'GET', '/api/admin/users', { token: driver.token });
  assert.equal(forbiddenDriver.status, 403);

  const admin = seedAdmin(db);
  const allowed = await api(base, 'GET', '/api/admin/stats', { token: admin.token });
  assert.equal(allowed.status, 200);
});

test('/api/admin/stats agrega usuarios, corridas e faturamento', async (t) => {
  const { server, base, db } = await startServer();
  t.after(() => server.close());

  const admin = seedAdmin(db);
  const passenger = await registerUser(base, { role: 'passenger' });
  const driver = await registerUser(base, { role: 'driver' });

  const created = await api(base, 'POST', '/api/rides', {
    token: passenger.token,
    body: { origin: 'A', destination: 'B', priceCents: 2000 },
  });
  const rideId = created.data.ride.id;

  for (const status of ['accepted', 'in_progress', 'completed']) {
    const res = await api(base, 'PATCH', `/api/rides/${rideId}/status`, {
      token: driver.token,
      body: { status },
    });
    assert.equal(res.status, 200);
  }

  const stats = await api(base, 'GET', '/api/admin/stats', { token: admin.token });
  assert.equal(stats.status, 200);
  assert.equal(stats.data.users.byRole.passenger, 1);
  assert.equal(stats.data.users.byRole.driver, 1);
  assert.equal(stats.data.users.byRole.admin, 1);
  assert.equal(stats.data.rides.total, 1);
  assert.equal(stats.data.rides.byStatus.completed, 1);
  assert.equal(stats.data.revenueCents, 2000);
});

test('/api/admin/rides inclui nomes e aceita filtro por status', async (t) => {
  const { server, base, db } = await startServer();
  t.after(() => server.close());

  const admin = seedAdmin(db);
  const passenger = await registerUser(base, { name: 'Ana', role: 'passenger' });

  await api(base, 'POST', '/api/rides', {
    token: passenger.token,
    body: { origin: 'A', destination: 'B' },
  });

  const all = await api(base, 'GET', '/api/admin/rides', { token: admin.token });
  assert.equal(all.data.rides.length, 1);
  assert.equal(all.data.rides[0].passengerName, 'Ana');
  assert.equal(all.data.rides[0].driverName, null);

  const filtered = await api(base, 'GET', '/api/admin/rides?status=completed', {
    token: admin.token,
  });
  assert.equal(filtered.data.rides.length, 0);
});

test('/api/admin/users aceita filtro por papel', async (t) => {
  const { server, base, db } = await startServer();
  t.after(() => server.close());

  const admin = seedAdmin(db);
  await registerUser(base, { role: 'passenger' });
  await registerUser(base, { role: 'driver' });

  const drivers = await api(base, 'GET', '/api/admin/users?role=driver', {
    token: admin.token,
  });
  assert.equal(drivers.status, 200);
  assert.equal(drivers.data.users.length, 1);
  assert.equal(drivers.data.users[0].role, 'driver');

  const all = await api(base, 'GET', '/api/admin/users', { token: admin.token });
  assert.equal(all.data.users.length, 3);
});

test('o painel DASHBOARD e servido em /dashboard', async (t) => {
  const { server, base } = await startServer();
  t.after(() => server.close());

  const res = await fetch(base + '/dashboard/');
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /DASHBOARD/);
  assert.match(html, /js\/dashboard\.js/);
});
