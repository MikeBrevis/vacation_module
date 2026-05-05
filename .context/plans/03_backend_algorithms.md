# 03. Plan de Implementación: Algoritmos de Backend (Fase 3.3, 3.6, 3.7, 3.8)

## Dependencias Previas
- `01_database.md` y `02_backend_setup.md` deben estar implementados.

## Implementación de `services/vacacionesService.js`

```javascript
const pool = require('../config/db');

async function calcularDiasHabiles(fechaInicio, fechaFin) {
  const [feriados] = await pool.query(
    'SELECT fecha FROM feriados WHERE fecha BETWEEN ? AND ?',
    [fechaInicio, fechaFin]
  );
  
  const feriadosSet = new Set(feriados.map(f => new Date(f.fecha).toISOString().split('T')[0]));

  let dias = 0;
  const current = new Date(`${fechaInicio}T00:00:00`);
  const fin = new Date(`${fechaFin}T00:00:00`);

  while (current <= fin) {
    const dow = current.getDay();
    const iso = current.toISOString().split('T')[0];
    
    if (dow !== 0 && dow !== 6 && !feriadosSet.has(iso)) {
      dias++;
    }
    current.setDate(current.getDate() + 1);
  }
  return dias;
}

async function calcularSaldo(empleadoId) {
  const [[empleado]] = await pool.query('SELECT * FROM empleados WHERE id = ?', [empleadoId]);
  if (!empleado) throw new Error('Empleado no encontrado');

  const [[{ total_consumido }]] = await pool.query(
    'SELECT COALESCE(SUM(dias_habiles_consumidos), 0) AS total_consumido FROM solicitudes_vacaciones WHERE empleado_id = ?',
    [empleadoId]
  );

  const hoy = new Date();
  const ingreso = new Date(empleado.fecha_ingreso);

  const meses = (hoy.getFullYear() - ingreso.getFullYear()) * 12 + (hoy.getMonth() - ingreso.getMonth());

  let progresivosEmpresa = 0;
  if (empleado.cumple_10_anos_base) {
    const anosEnEmpresa = Math.floor(meses / 12);
    progresivosEmpresa = Math.floor(anosEnEmpresa / 3);
  }

  const diasLegalesAcumulados = parseFloat((meses * 1.25).toFixed(4));
  const diasProgresivosTotal = empleado.dias_progresivos_base + progresivosEmpresa;
  const consumido = parseFloat(total_consumido);
  const saldoActual = parseFloat((diasLegalesAcumulados + diasProgresivosTotal - consumido).toFixed(2));

  return {
    diasLegalesAcumulados,
    diasProgresivosBase: empleado.dias_progresivos_base,
    progresivosEmpresa,
    diasProgresivosTotal,
    diasConsumidos: consumido,
    saldoActual
  };
}

// Lógica de validaciones para POST /api/solicitudes (6 pasos)
async function validarYCrearSolicitud(empleado_id, fecha_inicio, fecha_fin) {
  if (new Date(fecha_inicio) > new Date(fecha_fin)) {
    throw new Error('Fecha de inicio posterior a fecha de fin');
  }

  const hoyStr = new Date().toISOString().split('T')[0];
  if (fecha_inicio < hoyStr) {
    throw new Error('No se pueden registrar vacaciones en fechas pasadas');
  }

  const dias_habiles = await calcularDiasHabiles(fecha_inicio, fecha_fin);
  if (dias_habiles === 0) {
    throw new Error('El rango seleccionado no contiene días hábiles');
  }

  const saldos = await calcularSaldo(empleado_id);

  if (dias_habiles > saldos.saldoActual) {
    throw new Error(`Saldo insuficiente. Días solicitados: ${dias_habiles}, Saldo: ${saldos.saldoActual}`);
  }

  const [result] = await pool.query(
    'INSERT INTO solicitudes_vacaciones (empleado_id, fecha_inicio, fecha_fin, dias_habiles_consumidos) VALUES (?, ?, ?, ?)',
    [empleado_id, fecha_inicio, fecha_fin, dias_habiles]
  );

  return { insertId: result.insertId, dias_habiles, saldos_previos: saldos };
}

module.exports = {
  calcularDiasHabiles,
  calcularSaldo,
  validarYCrearSolicitud
};
```

## Casos Borde Contemplados
- **Empleado con 0 solicitudes previas:** Controlado con `COALESCE` en SQL (asigna 0).
- **cumple_10_anos_base = false:** Validado en el `if (empleado.cumple_10_anos_base)`, no suma días progresivos empresa.
- **Rango de fechas con feriados intermedios:** Validado a través de `calcularDiasHabiles`, usando el `Set` de feriados para exclusión eficiente.

## Criterio de Éxito
- `calcularSaldo` retorna los 6 campos del objeto de respuesta (`diasLegalesAcumulados`, `diasProgresivosBase`, `progresivosEmpresa`, `diasProgresivosTotal`, `diasConsumidos`, `saldoActual`).
- `calcularDiasHabiles` excluye fines de semana y feriados.
