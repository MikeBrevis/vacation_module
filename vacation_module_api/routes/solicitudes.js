const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { validarYCrearSolicitud, crearSolicitudHistorica } = require('../services/vacacionesService');
const { generarPDF } = require('../services/pdfService');

router.post('/', async (req, res) => {
  try {
    const { empleado_id, fecha_inicio, fecha_fin, es_progresivo, periodo_asignado } = req.body;
    const { insertId } = await validarYCrearSolicitud(empleado_id, fecha_inicio, fecha_fin, es_progresivo, periodo_asignado);
    res.status(201).json({ mensaje: 'Solicitud creada', solicitud_id: insertId });
  } catch (error) { res.status(422).json({ mensaje: error.message }); }
});

router.post('/historico', async (req, res) => {
  try {
    const { empleado_id, anio, dias } = req.body;
    const { insertId } = await crearSolicitudHistorica(empleado_id, anio, dias);
    res.status(201).json({ mensaje: 'Histórico registrado', solicitud_id: insertId });
  } catch (error) { res.status(422).json({ mensaje: error.message }); }
});

router.get('/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;
    const [[solicitud]] = await pool.query('SELECT * FROM solicitudes_vacaciones WHERE id = ?', [id]);
    if (!solicitud) return res.status(404).json({ mensaje: 'Solicitud no encontrada' });

    const [[empleado]] = await pool.query('SELECT * FROM empleados WHERE id = ?', [solicitud.empleado_id]);
    
    const fecha_inicio = solicitud.fecha_inicio.toISOString().split('T')[0];
    const fecha_fin = solicitud.fecha_fin.toISOString().split('T')[0];
    const es_historico = fecha_inicio.endsWith('-01-01') && fecha_fin.endsWith('-12-31');
    const anio = fecha_inicio.split('-')[0];

    const { calcularSaldo } = require('../services/vacacionesService');
    const saldo = await calcularSaldo(empleado.id);

    const fecha_ingreso = empleado.fecha_ingreso.toISOString().split('T')[0];
    
    // Días calendario
    const fInicio = new Date(solicitud.fecha_inicio);
    const fFin = new Date(solicitud.fecha_fin);
    const dias_calendario = Math.round((fFin - fInicio) / (1000 * 60 * 60 * 24)) + 1;
    const dias_inhabiles = es_historico ? 0 : (dias_calendario - solicitud.dias_habiles_consumidos);

    const datos = {
      nombre_completo: empleado.nombre_completo,
      rut: empleado.rut,
      cargo: empleado.cargo,
      fecha_ingreso,
      fecha_inicio,
      fecha_fin,
      dias_habiles: solicitud.dias_habiles_consumidos,
      dias_inhabiles,
      dias_progresivos: saldo.diasProgresivosAnuales,
      dias_pendientes: saldo.saldoActual,
      es_historico,
      es_progresivo: solicitud.es_progresivo,
      anio
    };

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="comprobante_${id}.pdf"`);
    
    await generarPDF(datos, res);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM solicitudes_vacaciones WHERE id=?', [id]);
    res.json({ mensaje: 'Solicitud anulada' });
  } catch (error) { res.status(500).json({ mensaje: error.message }); }
});

module.exports = router;
