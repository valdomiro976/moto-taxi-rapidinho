'use strict';

const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

const STATUSES = ['requested', 'accepted', 'in_progress', 'completed', 'canceled'];
const TRANSITIONS = {
  requested: ['accepted', 'canceled'],
  accepted: ['in_progress', 'canceled'],
  in_progress: ['completed', 'canceled'],
  completed: [],
  canceled: [],
};

function serialize(row) {
  return {
    id: row.id,
    passengerId: row.passenger_id,
    driverId: row.driver_id,
    origin: row.origin,
    destination: row.destination,
    status: row.status,
    priceCents: row.price_cents,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

router.use(requireAuth);

// Fila de corridas pendentes: exclusiva do modulo Motorista.
router.get('/available', requireRole('driver'), (req, res) => {
  const db = req.app.locals.db;
  const rows = db
    .prepare("SELECT * FROM rides WHERE status = 'requested' ORDER BY id ASC")
    .all();
  res.json({ rides: rows.map(serialize) });
});

// Historico do proprio usuario: passageiro ve as corridas que pediu,
// motoboy ve as corridas que aceitou.
router.get('/mine', (req, res) => {
  const db = req.app.locals.db;
  const column = req.user.role === 'driver' ? 'driver_id' : 'passenger_id';
  const rows = db
    .prepare(`SELECT * FROM rides WHERE ${column} = ? ORDER BY id DESC`)
    .all(req.user.id);
  res.json({ rides: rows.map(serialize) });
});

router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const status = req.query.status;
  const rows = status
    ? db.prepare('SELECT * FROM rides WHERE status = ? ORDER BY id DESC').all(status)
    : db.prepare('SELECT * FROM rides ORDER BY id DESC').all();
  res.json({ rides: rows.map(serialize) });
});

router.post('/', requireRole('passenger'), (req, res) => {
  const { origin, destination, priceCents = 0 } = req.body || {};
  if (!origin || !destination) {
    return res.status(400).json({ error: 'Informe origem e destino' });
  }
  if (!Number.isInteger(priceCents) || priceCents < 0) {
    return res.status(400).json({ error: 'priceCents deve ser inteiro >= 0' });
  }

  const db = req.app.locals.db;
  const now = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO rides (passenger_id, origin, destination, status, price_cents, created_at, updated_at)
       VALUES (?, ?, ?, 'requested', ?, ?, ?)`,
    )
    .run(req.user.id, origin, destination, priceCents, now, now);

  const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ ride: serialize(ride) });
});

router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(Number(req.params.id));
  if (!ride) return res.status(404).json({ error: 'Corrida não encontrada' });
  return res.json({ ride: serialize(ride) });
});

// Quem pode cada transicao:
//   accepted            -> apenas motoboy (assume a corrida)
//   in_progress/completed -> apenas o motoboy dono
//   canceled            -> passageiro dono ou motoboy dono
router.patch('/:id/status', (req, res) => {
  const { status, driverId } = req.body || {};
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Status inválido' });
  }

  const db = req.app.locals.db;
  const id = Number(req.params.id);
  const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(id);
  if (!ride) return res.status(404).json({ error: 'Corrida não encontrada' });

  const isPassengerOwner = req.user.role === 'passenger' && ride.passenger_id === req.user.id;
  const isDriverOwner = req.user.role === 'driver' && ride.driver_id === req.user.id;

  if (status === 'accepted' && req.user.role !== 'driver') {
    return res.status(403).json({ error: 'Apenas motoboys podem aceitar corridas' });
  }
  if ((status === 'in_progress' || status === 'completed') && !isDriverOwner) {
    return res.status(403).json({ error: 'Apenas o motoboy da corrida pode fazer isso' });
  }
  if (status === 'canceled' && !isPassengerOwner && !isDriverOwner) {
    return res.status(403).json({ error: 'Você não participa desta corrida' });
  }

  if (!TRANSITIONS[ride.status].includes(status)) {
    return res
      .status(409)
      .json({ error: `Transição inválida: ${ride.status} → ${status}` });
  }

  const nextDriver = status === 'accepted' ? driverId ?? req.user.id : ride.driver_id;
  const now = new Date().toISOString();
  db.prepare('UPDATE rides SET status = ?, driver_id = ?, updated_at = ? WHERE id = ?').run(
    status,
    nextDriver,
    now,
    id,
  );

  const updated = db.prepare('SELECT * FROM rides WHERE id = ?').get(id);
  return res.json({ ride: serialize(updated) });
});

module.exports = router;
