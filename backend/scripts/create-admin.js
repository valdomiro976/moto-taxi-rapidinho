'use strict';

/**
 * Cria (ou atualiza a senha de) um usuario administrador do DASHBOARD.
 *
 * Uso:
 *   node scripts/create-admin.js --email admin@exemplo.com --password "senha-forte"
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/create-admin.js
 *
 * O papel 'admin' nao pode ser escolhido no autocadastro da API; ele so e
 * concedido por este script, que roda com acesso direto ao banco.
 */

const { openDatabase } = require('../src/db');
const { hashPassword } = require('../src/auth');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) {
      args[argv[i].slice(2)] = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const name = args.name || process.env.ADMIN_NAME || 'Administrador';
const email = args.email || process.env.ADMIN_EMAIL;
const password = args.password || process.env.ADMIN_PASSWORD;

if (!email || !password) {
  console.error('Informe --email e --password (ou ADMIN_EMAIL / ADMIN_PASSWORD).');
  process.exit(1);
}
if (password.length < 8) {
  console.error('A senha do admin deve ter ao menos 8 caracteres.');
  process.exit(1);
}

const db = openDatabase();
const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);

if (existing) {
  db.prepare('UPDATE users SET name = ?, password_hash = ?, role = ? WHERE id = ?').run(
    name,
    hashPassword(password),
    'admin',
    existing.id,
  );
  console.log(`Admin atualizado: ${email}`);
} else {
  db.prepare(
    `INSERT INTO users (name, email, phone, password_hash, role, created_at)
     VALUES (?, ?, NULL, ?, 'admin', ?)`,
  ).run(name, email, hashPassword(password), new Date().toISOString());
  console.log(`Admin criado: ${email}`);
}

console.log('Acesse o painel em http://localhost:3000/dashboard');
