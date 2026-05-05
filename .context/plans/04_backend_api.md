# 04. Plan de Implementación: Backend API (Fase 3.4, 3.9)

## Dependencias Previas
- `01_database.md`, `02_backend_setup.md`, `03_backend_algorithms.md` implementados.
- Instalar `pdfkit` si no se hizo en fase anterior (`npm install pdfkit`).

## Implementación de Controladores y Rutas

### `routes/empleados.js`
```javascript
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { calcularSaldo } = require('../services/vacacionesService');

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
    const { rut, nombre_completo, cargo, fecha_ingreso, cumple_10_anos_base, dias_progresivos_base } = req.body;
    const [result] = await pool.query(
      'INSERT INTO empleados (rut, nombre_completo, cargo, fecha_ingreso, cumple_10_anos_base, dias_progresivos_base) VALUES (?, ?, ?, ?, ?, ?)',
      [rut, nombre_completo, cargo, fecha_ingreso, cumple_10_anos_base ? 1 : 0, dias_progresivos_base || 0]
    );
    res.status(201).json({ mensaje: 'Empleado creado', id: result.insertId });
  } catch (error) { res.status(400).json({ mensaje: error.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rut, nombre_completo, cargo, fecha_ingreso, cumple_10_anos_base, dias_progresivos_base } = req.body;
    await pool.query(
      'UPDATE empleados SET rut=?, nombre_completo=?, cargo=?, fecha_ingreso=?, cumple_10_anos_base=?, dias_progresivos_base=? WHERE id=?',
      [rut, nombre_completo, cargo, fecha_ingreso, cumple_10_anos_base ? 1 : 0, dias_progresivos_base || 0, id]
    );
    res.json({ mensaje: 'Empleado actualizado' });
  } catch (error) { res.status(400).json({ mensaje: error.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [[{ cnt }]] = await pool.query('SELECT COUNT(*) as cnt FROM solicitudes_vacaciones WHERE empleado_id=?', [id]);
    if (cnt > 0) return res.status(400).json({ mensaje: 'No se puede eliminar: tiene solicitudes' });
    await pool.query('DELETE FROM empleados WHERE id=?', [id]);
    res.json({ mensaje: 'Empleado eliminado' });
  } catch (error) { res.status(500).json({ mensaje: error.message }); }
});

module.exports = router;
```

### `services/pdfService.js` (Integración pdfkit)
```javascript
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function generarPDF(datos) {
  return new Promise((resolve, reject) => {
    const nombreArchivo = `comprobante_${datos.empleado_id}_${datos.solicitud_id}.pdf`;
    const rutaRelativa = `/public/comprobantes/${nombreArchivo}`;
    const rutaAbsoluta = path.join(__dirname, '..', rutaRelativa);

    const doc = new PDFDocument();
    const stream = fs.createWriteStream(rutaAbsoluta);
    doc.pipe(stream);

    doc.fontSize(20).text('Comprobante de Vacaciones', { align: 'center' }).moveDown();
    doc.fontSize(14).text(`Empleado: ${datos.nombre_completo} (RUT: ${datos.rut})`);
    doc.text(`Cargo: ${datos.cargo}`).moveDown();
    doc.text(`Período: ${datos.fecha_inicio} al ${datos.fecha_fin}`);
    doc.text(`Días Hábiles Consumidos: ${datos.dias_habiles}`);
    doc.text(`Saldo Anterior: ${datos.saldo_anterior}`);
    doc.text(`Saldo Restante: ${(datos.saldo_anterior - datos.dias_habiles).toFixed(2)}`).moveDown(4);
    
    doc.text('_________________________', { align: 'left' });
    doc.text('Firma Trabajador', { align: 'left' }).moveUp(2);
    doc.text('_________________________', { align: 'right' });
    doc.text('Firma Administrador', { align: 'right' });

    doc.end();

    stream.on('finish', () => resolve(rutaRelativa));
    stream.on('error', reject);
  });
}

module.exports = { generarPDF };
```

### `routes/solicitudes.js`
```javascript
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { validarYCrearSolicitud } = require('../services/vacacionesService');
const { generarPDF } = require('../services/pdfService');

router.post('/', async (req, res) => {
  try {
    const { empleado_id, fecha_inicio, fecha_fin } = req.body;
    const { insertId, dias_habiles, saldos_previos } = await validarYCrearSolicitud(empleado_id, fecha_inicio, fecha_fin);
    
    const [[empleado]] = await pool.query('SELECT * FROM empleados WHERE id = ?', [empleado_id]);
    
    const rutaPDF = await generarPDF({
      empleado_id, solicitud_id: insertId,
      nombre_completo: empleado.nombre_completo, rut: empleado.rut, cargo: empleado.cargo,
      fecha_inicio, fecha_fin, dias_habiles, saldo_anterior: saldos_previos.saldoActual
    });

    await pool.query('UPDATE solicitudes_vacaciones SET ruta_comprobante = ? WHERE id = ?', [rutaPDF, insertId]);

    res.status(201).json({ mensaje: 'Solicitud creada', solicitud_id: insertId, ruta_comprobante: rutaPDF });
  } catch (error) { res.status(422).json({ mensaje: error.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM solicitudes_vacaciones WHERE id=?', [id]);
    res.json({ mensaje: 'Solicitud anulada' });
  } catch (error) { res.status(500).json({ mensaje: error.message }); }
});

module.exports = router;
```

## Formato de Respuestas JSON
- Errores (4xx/5xx): `{ "mensaje": "..." }`
- Correctas (2xx): Arrays `[]` de datos u objetos `{ "mensaje": "...", "id": ... }`.

## Criterio de Éxito
- Todos los endpoints responden correctamente en Postman/Thunder Client.
- PDF generado con nombre `comprobante_{empleado_id}_{solicitud_id}.pdf` contiene los datos correctos.
