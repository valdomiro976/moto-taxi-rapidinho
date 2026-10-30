'use strict';

const express = require('express');
const { hashPassword, verifyPassword, signToken } = require('../auth');

const router = express.Router();
const ROLES = ['passenger', 'driver'];

function publicUser(row) {
  return { id: row.id, name: row.name, email: row.email, phone: row.phone, role: row.role };
}

router.post('/register', (req, res) => {
  const { name, email, password, phone, role = 'passenger' } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Informe nome, e-mail e senha' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'A senha deve ter ao menos 6 caracteres' });
  }
  if (!ROLES.includes(role)) {
    return res.status(400).json({ error: 'Papel inválido' });
  }

  const db = req.app.locals.db;
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) {
    return res.status(409).json({ error: 'E-mail já cadastrado' });
  }

  const now = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO users (name, email, phone, password_hash, role, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(name, email, phone || null, hashPassword(password), role, now);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  return res.status(201).json({ user: publicUser(user), token: signToken(user) });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Informe e-mail e senha' });
  }

  const db = req.app.locals.db;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  return res.json({ user: publicUser(user), token: signToken(user) });
});

module.exports = router;
