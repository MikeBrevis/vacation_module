const express = require('express');
const router = express.Router();
const { sincronizarFeriados } = require('../services/feriadosSync');
const pool = require('../config/db');

router.post('/sincronizar', async (req, res) => {
  try {
    const resultado = await sincronizarFeriados();
    res.json({ mensaje: 'Feriados sincronizados', ...resultado });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT fecha, descripcion FROM feriados ORDER BY fecha ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
});

module.exports = router;
