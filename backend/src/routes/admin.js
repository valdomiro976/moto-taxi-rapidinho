'use strict';

const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireRole('admin'));

/**
 * Resumo geral: contagens de usuários e corridas, faturamento concluído.
 */
router.get('/stats', (req, res) => {
  const db = req.app.locals.db;

  const count = (sql) => db.prepare(sql).get().total;

  const usersByRole = {
    passenger: count("SELECT COUNT(*) AS total FROM users WHERE role = 'passenger'"),
    driver: count("SELECT COUNT(*) AS total FROM users WHERE role = 'driver'"),
    admin: count("SELECT COUNT(*) AS total FROM users WHERE role = 'admin'"),
  };

  const ridesByStatus = {};
  for (const row of db
    .prepare('SELECT status, COUNT(*) AS total FROM rides GROUP BY status')
    .all()) {
    ridesByStatus[row.status] = row.total;
  }

  const revenue = db
    .prepare("SELECT COALESCE(SUM(price_cents), 0) AS total FROM rides WHERE status = 'completed'")
    .get().total;

  res.json({
    users: { total: usersByRole.passenger + usersByRole.driver + usersByRole.admin, byRole: usersByRole },
    rides: { total: count('SELECT COUNT(*) AS total FROM rides'), byStatus: ridesByStatus },
    revenueCents: revenue,
  });
});

router.get('/users', (req, res) => {
  const db = req.app.locals.db;
  const { role } = req.query;

  const rows = role
    ? db
        .prepare(
          'SELECT id, name, email, phone, role, created_at FROM users WHERE role = ? ORDER BY id DESC',
        )
        .all(role)
    : db
        .prepare('SELECT id, name, email, phone, role, created_at FROM users ORDER BY id DESC')
        .all();

  res.json({
    users: rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      role: r.role,
      createdAt: r.created_at,
    })),
  });
});

router.get('/rides', (req, res) => {
  const db = req.app.locals.db;
  const { status } = req.query;

  const base = `
    SELECT r.*, p.name AS passenger_name, d.name AS driver_name
    FROM rides r
    LEFT JOIN users p ON p.id = r.passenger_id
    LEFT JOIN users d ON d.id = r.driver_id
  `;

  const rows = status
    ? db.prepare(`${base} WHERE r.status = ? ORDER BY r.id DESC`).all(status)
    : db.prepare(`${base} ORDER BY r.id DESC`).all();

  res.json({
    rides: rows.map((r) => ({
      id: r.id,
      passengerId: r.passenger_id,
      passengerName: r.passenger_name,
      driverId: r.driver_id,
      driverName: r.driver_name,
      origin: r.origin,
      destination: r.destination,
      status: r.status,
      priceCents: r.price_cents,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
  });
});

module.exports = router;
