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

  // Meses totales en la empresa actual
  const mesesEnEmpresa = (hoy.getFullYear() - ingreso.getFullYear()) * 12 + (hoy.getMonth() - ingreso.getMonth());
  const anosEnEmpresa = Math.floor(mesesEnEmpresa / 12);

  // --- Cálculo de Días Progresivos ---
  const anosExternos = empleado.anos_externos || 0;
  const mesesExternos = empleado.meses_externos || 0;
  const tieneBaseDiezAnos = empleado.cumple_10_anos_base ? true : false;

  // Total de experiencia acumulada (empresa actual + externos) en meses
  const mesesTotalExternos = (anosExternos * 12) + mesesExternos;
  const mesesExperienciaTotal = mesesEnEmpresa + mesesTotalExternos;
  const anosExperienciaTotal = Math.floor(mesesExperienciaTotal / 12);

  let progresivosEmpresa = 0;
  let mesesPostBase = 0;

  if (tieneBaseDiezAnos) {
    // Caso B: Ya tiene la base de 10 años acreditada
    // El primer día progresivo se otorga al cumplir 3 años en la empresa actual
    mesesPostBase = mesesEnEmpresa;
    progresivosEmpresa = Math.floor(anosEnEmpresa / 3);
  } else if (anosExperienciaTotal >= 10) {
    // La base se alcanza combinando experiencia externa + empresa actual
    // Calcular cuántos meses en la empresa actual se necesitaron para llegar a 10 años
    const mesesParaBase = Math.max(0, (10 * 12) - mesesTotalExternos);
    // Meses en la empresa actual después de cumplir la base
    mesesPostBase = Math.max(0, mesesEnEmpresa - mesesParaBase);
    const anosPostBase = Math.floor(mesesPostBase / 12);
    progresivosEmpresa = Math.floor(anosPostBase / 3);
  }
  // Calcular dias progresivos historicos acumulados
  let diasProgresivosAcumulados = 0;
  const anosPostBaseTotales = Math.floor(mesesPostBase / 12);
  for (let y = 1; y <= anosPostBaseTotales; y++) {
    diasProgresivosAcumulados += Math.floor(y / 3);
  }

  const diasLegalesAcumulados = parseFloat((mesesEnEmpresa * 1.25).toFixed(4));
  const diasProgresivosTotal = diasProgresivosAcumulados;
  const diasProgresivosAnuales = progresivosEmpresa;
  const consumido = parseFloat(total_consumido);
  const saldoActual = Math.floor(diasLegalesAcumulados + diasProgresivosTotal - consumido);

  const detalleAnual = [];
  for (let i = 1; i <= anosEnEmpresa; i++) {
    let mesesParaBaseCalculo = 0;
    if (!tieneBaseDiezAnos) {
       mesesParaBaseCalculo = Math.max(0, (10 * 12) - mesesTotalExternos);
    }
    const mesesPostBaseEnAniversario = Math.max(0, (i * 12) - mesesParaBaseCalculo);
    const anosPostBaseEnAniversario = Math.floor(mesesPostBaseEnAniversario / 12);
    const progr = Math.floor(anosPostBaseEnAniversario / 3);
    
    detalleAnual.push({
      periodo: `${ingreso.getFullYear() + i - 1} - ${ingreso.getFullYear() + i}`,
      base: 15,
      progresivos: progr,
      total: 15 + progr
    });
  }
  
  const mesesProporcionales = mesesEnEmpresa % 12;
  if (mesesProporcionales > 0 || anosEnEmpresa === 0) {
    detalleAnual.push({
      periodo: `${ingreso.getFullYear() + anosEnEmpresa} - Actual`,
      base: parseFloat((mesesProporcionales * 1.25).toFixed(2)),
      progresivos: 0,
      total: parseFloat((mesesProporcionales * 1.25).toFixed(2))
    });
  }

  return {
    diasLegalesAcumulados,
    anosEnEmpresa,
    anosExternos,
    mesesExternos,
    tieneBaseDiezAnos,
    anosExperienciaTotal,
    progresivosEmpresa,
    diasProgresivosTotal,
    diasProgresivosAnuales,
    diasConsumidos: consumido,
    saldoActual,
    detalleAnual
  };
}

// Lógica de validaciones para POST /api/solicitudes (6 pasos)
async function validarYCrearSolicitud(empleado_id, fecha_inicio, fecha_fin) {
  if (new Date(fecha_inicio) > new Date(fecha_fin)) {
    throw new Error('Fecha de inicio posterior a fecha de fin');
  }

  const hoyStr = new Date().toISOString().split('T')[0];
  // Validación de fecha pasada removida temporalmente para permitir carga de historial.

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

async function crearSolicitudHistorica(empleado_id, year, dias) {
  const fecha_inicio = `${year}-01-01`;
  const fecha_fin = `${year}-12-31`;
  const dias_habiles = parseFloat(dias); // preserve 0.5-day precision

  const saldos = await calcularSaldo(empleado_id);
  
  if (dias_habiles > saldos.saldoActual) {
    throw new Error(`Saldo insuficiente. Días a registrar: ${dias_habiles}, Saldo: ${saldos.saldoActual}`);
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
  validarYCrearSolicitud,
  crearSolicitudHistorica
};
