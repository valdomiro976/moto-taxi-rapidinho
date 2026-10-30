'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { openDatabase } = require('../src/db');
const { hashPassword, verifyPassword } = require('../src/auth');

test('hashPassword gera hash verificável e formato salt:hash', () => {
  const stored = hashPassword('segredo123');
  assert.match(stored, /^[0-9a-f]{32}:[0-9a-f]{128}$/);
  assert.equal(verifyPassword('segredo123', stored), true);
  assert.equal(verifyPassword('errado', stored), false);
});

test('openDatabase cria o schema esperado', () => {
  const db = openDatabase(':memory:');
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all()
    .map((r) => r.name);
  assert.ok(tables.includes('users'));
  assert.ok(tables.includes('rides'));
});
