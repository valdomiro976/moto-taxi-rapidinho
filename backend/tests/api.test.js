'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createApp } = require('../src/app');
const { openDatabase } = require('../src/db');

async function startServer() {
  const app = createApp({ db: openDatabase(':memory:') });
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { server, base };
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

test('health responde ok', async (t) => {
  const { server, base } = await startServer();
  t.after(() => server.close());

  const res = await api(base, 'GET', '/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.data.status, 'ok');
});

test('fluxo completo do passageiro e do motorista', async (t) => {
  const { server, base } = await startServer();
  t.after(() => server.close());

  const passenger = await registerUser(base, { name: 'Ana', role: 'passenger' });
  const driver = await registerUser(base, { name: 'Beto', role: 'driver' });

  const created = await api(base, 'POST', '/api/rides', {
    token: passenger.token,
    body: { origin: 'Rua A, 10', destination: 'Praça Central', priceCents: 1500 },
  });
  assert.equal(created.status, 201);
  assert.equal(created.data.ride.status, 'requested');
  const rideId = created.data.ride.id;

  const available = await api(base, 'GET', '/api/rides/available', { token: driver.token });
  assert.equal(available.status, 200);
  assert.equal(available.data.rides.length, 1);
  assert.equal(available.data.rides[0].id, rideId);

  const accepted = await api(base, 'PATCH', `/api/rides/${rideId}/status`, {
    token: driver.token,
    body: { status: 'accepted' },
  });
  assert.equal(accepted.status, 200);
  assert.equal(accepted.data.ride.status, 'accepted');
  assert.equal(accepted.data.ride.driverId, driver.user.id);

  const started = await api(base, 'PATCH', `/api/rides/${rideId}/status`, {
    token: driver.token,
    body: { status: 'in_progress' },
  });
  assert.equal(started.status, 200);

  const done = await api(base, 'PATCH', `/api/rides/${rideId}/status`, {
    token: driver.token,
    body: { status: 'completed' },
  });
  assert.equal(done.status, 200);
  assert.equal(done.data.ride.status, 'completed');
});

test('passageiro nao pode aceitar nem concluir corrida', async (t) => {
  const { server, base } = await startServer();
  t.after(() => server.close());

  const passenger = await registerUser(base, { role: 'passenger' });
  const created = await api(base, 'POST', '/api/rides', {
    token: passenger.token,
    body: { origin: 'A', destination: 'B' },
  });
  const rideId = created.data.ride.id;

  const accept = await api(base, 'PATCH', `/api/rides/${rideId}/status`, {
    token: passenger.token,
    body: { status: 'accepted' },
  });
  assert.equal(accept.status, 403);

  const complete = await api(base, 'PATCH', `/api/rides/${rideId}/status`, {
    token: passenger.token,
    body: { status: 'completed' },
  });
  assert.equal(complete.status, 403);
});

test('motorista nao pode pedir corrida', async (t) => {
  const { server, base } = await startServer();
  t.after(() => server.close());

  const driver = await registerUser(base, { role: 'driver' });
  const res = await api(base, 'POST', '/api/rides', {
    token: driver.token,
    body: { origin: 'A', destination: 'B' },
  });
  assert.equal(res.status, 403);
});

test('fila de disponiveis e exclusiva do motorista', async (t) => {
  const { server, base } = await startServer();
  t.after(() => server.close());

  const passenger = await registerUser(base, { role: 'passenger' });
  const res = await api(base, 'GET', '/api/rides/available', { token: passenger.token });
  assert.equal(res.status, 403);
});

test('outro motorista nao pode iniciar corrida alheia', async (t) => {
  const { server, base } = await startServer();
  t.after(() => server.close());

  const passenger = await registerUser(base, { role: 'passenger' });
  const driverA = await registerUser(base, { role: 'driver' });
  const driverB = await registerUser(base, { role: 'driver' });

  const created = await api(base, 'POST', '/api/rides', {
    token: passenger.token,
    body: { origin: 'A', destination: 'B' },
  });
  const rideId = created.data.ride.id;

  await api(base, 'PATCH', `/api/rides/${rideId}/status`, {
    token: driverA.token,
    body: { status: 'accepted' },
  });

  const intruder = await api(base, 'PATCH', `/api/rides/${rideId}/status`, {
    token: driverB.token,
    body: { status: 'in_progress' },
  });
  assert.equal(intruder.status, 403);
});

test('/rides/mine separa por papel', async (t) => {
  const { server, base } = await startServer();
  t.after(() => server.close());

  const passenger = await registerUser(base, { role: 'passenger' });
  const driver = await registerUser(base, { role: 'driver' });

  await api(base, 'POST', '/api/rides', {
    token: passenger.token,
    body: { origin: 'A', destination: 'B' },
  });

  const minePassenger = await api(base, 'GET', '/api/rides/mine', { token: passenger.token });
  assert.equal(minePassenger.data.rides.length, 1);

  const mineDriver = await api(base, 'GET', '/api/rides/mine', { token: driver.token });
  assert.equal(mineDriver.data.rides.length, 0);
});

test('transicao invalida retorna 409 e sem token retorna 401', async (t) => {
  const { server, base } = await startServer();
  t.after(() => server.close());

  const passenger = await registerUser(base, { role: 'passenger' });
  const driver = await registerUser(base, { role: 'driver' });

  const created = await api(base, 'POST', '/api/rides', {
    token: passenger.token,
    body: { origin: 'A', destination: 'B' },
  });
  const rideId = created.data.ride.id;

  await api(base, 'PATCH', `/api/rides/${rideId}/status`, {
    token: driver.token,
    body: { status: 'accepted' },
  });

  const invalid = await api(base, 'PATCH', `/api/rides/${rideId}/status`, {
    token: driver.token,
    body: { status: 'accepted' },
  });
  assert.equal(invalid.status, 409);

  const noAuth = await api(base, 'GET', '/api/rides');
  assert.equal(noAuth.status, 401);
});

test('o portal e servido na raiz com os tres modulos', async (t) => {
  const { server, base } = await startServer();
  t.after(() => server.close());

  const res = await fetch(base + '/');
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /MOTO/);
  assert.match(html, /href="\/passageiro\/"/);
  assert.match(html, /href="\/motorista\/"/);
  assert.match(html, /href="\/dashboard\/"/);
});

test('o app do passageiro e servido em /passageiro', async (t) => {
  const { server, base } = await startServer();
  t.after(() => server.close());

  const res = await fetch(base + '/passageiro/');
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /Acesso do passageiro/);
  assert.match(html, /js\/passageiro\.js/);
});

test('o app do motorista e servido em /motorista', async (t) => {
  const { server, base } = await startServer();
  t.after(() => server.close());

  const res = await fetch(base + '/motorista/');
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /Acesso do motorista/);
  assert.match(html, /js\/motorista\.js/);
});

test('os assets compartilhados sao servidos em /compartilhado', async (t) => {
  const { server, base } = await startServer();
  t.after(() => server.close());

  for (const asset of ['js/api.js', 'js/ui.js', 'js/shell.js', 'css/app.css']) {
    const res = await fetch(`${base}/compartilhado/${asset}`);
    assert.equal(res.status, 200, `asset ausente: ${asset}`);
  }
});
