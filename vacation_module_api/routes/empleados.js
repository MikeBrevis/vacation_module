const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { calcularSaldo } = require('../services/vacacionesService');
const dv = require('validador-digito-verificador-chile').default;

// Normaliza el RUT: quita puntos/espacios y agrega guión si falta
function normalizarRut(rut) {
  let limpio = rut.replace(/[\.\s]/g, '').trim();
  if (!limpio.includes('-') && limpio.length > 1) {
    limpio = limpio.slice(0, -1) + '-' + limpio.slice(-1);
  }
  return limpio;
}

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM empleados ORDER BY nombre_completo');
    const data = await Promise.all(rows.map(async emp => {
      const saldos = await calcularSaldo(emp.id);
      return { ...emp, saldoActual: saldos.saldoActual };
    }));
    res.json(data);
  } catch (error) { res.status(500).json({ mensaje: error.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [[empleado]] = await pool.query('SELECT * FROM empleados WHERE id = ?', [id]);
    if (!empleado) return res.status(404).json({ mensaje: 'Empleado no encontrado' });

    const saldo = await calcularSaldo(id);
    const [solicitudes] = await pool.query('SELECT * FROM solicitudes_vacaciones WHERE empleado_id = ? ORDER BY fecha_inicio DESC', [id]);

    res.json({ empleado, saldo, solicitudes });
  } catch (error) { res.status(500).json({ mensaje: error.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { rut, nombre_completo, cargo, fecha_ingreso, cumple_10_anos_base, anos_externos, meses_externos } = req.body;
    
    if (!rut) {
      return res.status(400).json({ mensaje: 'El RUT es obligatorio.' });
    }
    const rutNormalizado = normalizarRut(rut);
    if (!dv.Validar(rutNormalizado)) {
      return res.status(400).json({ mensaje: 'El RUT ingresado no es válido. Verifique el dígito verificador.' });
    }
    const rutFormateado = dv.DarFormato(rutNormalizado);

    const anosExt = parseInt(anos_externos) || 0;
    const mesesExt = parseInt(meses_externos) || 0;
    if (anosExt >= 10) {
      return res.status(400).json({ mensaje: 'Si tiene 10 o más años, marque la casilla "Acredita 10 años de cotizaciones base".' });
    }
    if (mesesExt > 11) {
      return res.status(400).json({ mensaje: 'Los meses adicionales no pueden superar 11.' });
    }

    const [result] = await pool.query(
      'INSERT INTO empleados (rut, nombre_completo, cargo, fecha_ingreso, cumple_10_anos_base, anos_externos, meses_externos) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [rutFormateado, nombre_completo, cargo, fecha_ingreso, cumple_10_anos_base ? 1 : 0, anosExt, mesesExt]
    );
    res.status(201).json({ mensaje: 'Empleado creado', id: result.insertId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ mensaje: 'El RUT ingresado ya existe.' });
    }
    res.status(400).json({ mensaje: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rut, nombre_completo, cargo, fecha_ingreso, cumple_10_anos_base, anos_externos, meses_externos } = req.body;
    
    if (rut) {
      const rutNormalizado = normalizarRut(rut);
      if (!dv.Validar(rutNormalizado)) {
        return res.status(400).json({ mensaje: 'El RUT ingresado no es válido. Verifique el dígito verificador.' });
      }
    }
    const rutFormateado = rut ? dv.DarFormato(normalizarRut(rut)) : undefined;

    const anosExt = anos_externos !== undefined ? parseInt(anos_externos) || 0 : undefined;
    const mesesExt = meses_externos !== undefined ? parseInt(meses_externos) || 0 : undefined;

    if (anosExt !== undefined && anosExt >= 10) {
      return res.status(400).json({ mensaje: 'Si tiene 10 o más años, marque la casilla "Acredita 10 años de cotizaciones base".' });
    }
    if (mesesExt !== undefined && mesesExt > 11) {
      return res.status(400).json({ mensaje: 'Los meses adicionales no pueden superar 11.' });
    }

    // Construir campos a actualizar dinámicamente
    const campos = {};
    if (rutFormateado) campos.rut = rutFormateado;
    if (nombre_completo) campos.nombre_completo = nombre_completo;
    if (cargo) campos.cargo = cargo;
    if (fecha_ingreso) campos.fecha_ingreso = fecha_ingreso;
    if (cumple_10_anos_base !== undefined) campos.cumple_10_anos_base = cumple_10_anos_base ? 1 : 0;
    if (anosExt !== undefined) campos.anos_externos = anosExt;
    if (mesesExt !== undefined) campos.meses_externos = mesesExt;

    const keys = Object.keys(campos);
    if (keys.length === 0) return res.status(400).json({ mensaje: 'No se enviaron campos para actualizar.' });

    const setClause = keys.map(k => `${k}=?`).join(', ');
    const values = keys.map(k => campos[k]);
    values.push(id);

    await pool.query(`UPDATE empleados SET ${setClause} WHERE id=?`, values);
    res.json({ mensaje: 'Empleado actualizado' });
  } catch (error) { res.status(400).json({ mensaje: error.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const force = req.query.force === 'true';
    const [[{ cnt }]] = await pool.query('SELECT COUNT(*) as cnt FROM solicitudes_vacaciones WHERE empleado_id=?', [id]);
    
    if (cnt > 0 && !force) {
      return res.status(409).json({ 
        mensaje: `Este empleado tiene ${cnt} solicitud(es) de vacaciones registrada(s). ¿Desea eliminar al empleado y todo su historial?`,
        solicitudes: cnt,
        requiere_confirmacion: true
      });
    }

    if (cnt > 0) {
      await pool.query('DELETE FROM solicitudes_vacaciones WHERE empleado_id=?', [id]);
    }
    await pool.query('DELETE FROM empleados WHERE id=?', [id]);
    res.json({ mensaje: 'Empleado eliminado correctamente' });
  } catch (error) { res.status(500).json({ mensaje: error.message }); }
});

module.exports = router;
