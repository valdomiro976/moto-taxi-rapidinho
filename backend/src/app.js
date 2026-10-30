'use strict';

const path = require('node:path');
const express = require('express');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const rideRoutes = require('./routes/rides');
const adminRoutes = require('./routes/admin');
const { openDatabase } = require('./db');

/**
 * Cria a aplicação Express. Não abre porta — use `server.js` para isso.
 * @param {{db?: object}} [options]
 * @returns {import('express').Express}
 */
function createApp(options = {}) {
  const app = express();
  app.locals.db = options.db || openDatabase();

  app.use(express.json());
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    return next();
  });

  app.use('/api', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/rides', rideRoutes);
  app.use('/api/admin', adminRoutes);

  // Cada modulo e servido na sua propria rota, com o mesmo backend da API.
  // COMPARTILHADO guarda os assets comuns (api.js, ui.js, shell.js, app.css).
  const root = path.join(__dirname, '..', '..');
  app.use('/compartilhado', express.static(path.join(root, 'COMPARTILHADO')));
  app.use('/passageiro', express.static(path.join(root, 'PASSAGEIRO')));
  app.use('/motorista', express.static(path.join(root, 'MOTORISTA')));
  app.use('/dashboard', express.static(path.join(root, 'DASHBOARD')));

  // Portal: pagina inicial que leva aos tres modulos.
  app.get('/', (req, res) => {
    res.sendFile(path.join(root, 'COMPARTILHADO', 'index.html'));
  });

  app.use((req, res) => res.status(404).json({ error: 'Rota não encontrada' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'Erro interno' });
  });

  return app;
}

module.exports = { createApp };
