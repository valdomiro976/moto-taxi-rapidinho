'use strict';

const path = require('node:path');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');

const DEFAULT_PATH = path.join(__dirname, '..', 'data', 'moto-taxi.sqlite');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE,
  phone         TEXT,
  password_hash TEXT    NOT NULL,
  role          TEXT    NOT NULL DEFAULT 'passenger',
  created_at    TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS rides (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  passenger_id INTEGER NOT NULL REFERENCES users(id),
  driver_id    INTEGER REFERENCES users(id),
  origin       TEXT    NOT NULL,
  destination  TEXT    NOT NULL,
  status       TEXT    NOT NULL DEFAULT 'requested',
  price_cents  INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT    NOT NULL,
  updated_at   TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);
CREATE INDEX IF NOT EXISTS idx_rides_passenger ON rides(passenger_id);
`;

/**
 * Abre (ou cria) o banco e aplica o schema.
 * @param {string} [file] Caminho do arquivo SQLite. Use ":memory:" em testes.
 * @returns {import('node:sqlite').DatabaseSync}
 */
function openDatabase(file = process.env.DATABASE_PATH || DEFAULT_PATH) {
  if (file !== ':memory:') {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  }
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  return db;
}

module.exports = { openDatabase, DEFAULT_PATH };
