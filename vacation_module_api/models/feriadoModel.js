const pool = require('../config/db');

async function upsert(fecha, descripcion) {
  await pool.query(
    'INSERT INTO feriados (fecha, descripcion) VALUES (?, ?) ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion)',
    [fecha, descripcion]
  );
}

module.exports = { upsert };
