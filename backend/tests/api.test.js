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

test('fluxo completo: cadastro, login e corrida', async (t) => {
  const { server, base } = await startServer();
  t.after(() => server.close());

  const health = await api(base, 'GET', '/api/health');
  assert.equal(health.status, 200);
  assert.equal(health.data.status, 'ok');

  const passenger = await api(base, 'POST', '/api/auth/register', {
    body: { name: 'Ana', email: 'ana@example.com', password: 'segredo1', role: 'passenger' },
  });
  assert.equal(passenger.status, 201);
  assert.ok(passenger.data.token);

  const driver = await api(base, 'POST', '/api/auth/register', {
    body: { name: 'Beto', email: 'beto@example.com', password: 'segredo1', role: 'driver' },
  });
  assert.equal(driver.status, 201);

  const login = await api(base, 'POST', '/api/auth/login', {
    body: { email: 'ana@example.com', password: 'segredo1' },
  });
  assert.equal(login.status, 200);

  const created = await api(base, 'POST', '/api/rides', {
    token: passenger.data.token,
    body: { origin: 'Rua A, 10', destination: 'Praça Central', priceCents: 1500 },
  });
  assert.equal(created.status, 201);
  assert.equal(created.data.ride.status, 'requested');
  assert.equal(created.data.ride.priceCents, 1500);
  const rideId = created.data.ride.id;

  const accepted = await api(base, 'PATCH', `/api/rides/${rideId}/status`, {
    token: driver.data.token,
    body: { status: 'accepted' },
  });
  assert.equal(accepted.status, 200);
  assert.equal(accepted.data.ride.status, 'accepted');
  assert.equal(accepted.data.ride.driverId, driver.data.user.id);

  const invalid = await api(base, 'PATCH', `/api/rides/${rideId}/status`, {
    token: driver.data.token,
    body: { status: 'completed' },
  });
  assert.equal(invalid.status, 409);

  const noAuth = await api(base, 'GET', '/api/rides');
  assert.equal(noAuth.status, 401);
});
