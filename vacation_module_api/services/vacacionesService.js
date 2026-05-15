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

  const [solicitudes] = await pool.query(
    'SELECT * FROM solicitudes_vacaciones WHERE empleado_id = ?',
    [empleadoId]
  );
  
  let total_consumido = 0;
  const consumidosPorPeriodo = {};
  const consumidosBasePorPeriodo = {};
  const consumidosProgPorPeriodo = {};
  
  let total_consumido_base = 0;
  let total_consumido_prog = 0;

  solicitudes.forEach(s => {
    const dias = parseFloat(s.dias_habiles_consumidos);
    total_consumido += dias;
    if (s.es_progresivo) {
      total_consumido_prog += dias;
    } else {
      total_consumido_base += dias;
    }

    if (s.periodo_asignado) {
      consumidosPorPeriodo[s.periodo_asignado] = (consumidosPorPeriodo[s.periodo_asignado] || 0) + dias;
      if (s.es_progresivo) {
        consumidosProgPorPeriodo[s.periodo_asignado] = (consumidosProgPorPeriodo[s.periodo_asignado] || 0) + dias;
      } else {
        consumidosBasePorPeriodo[s.periodo_asignado] = (consumidosBasePorPeriodo[s.periodo_asignado] || 0) + dias;
      }
    }
  });

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
  const detalleAnual = [];
  let diasProgresivosAcumulados = 0;
  let baseYaAlcanzada = tieneBaseDiezAnos || (mesesTotalExternos >= 120);
  
  for (let i = 1; i <= anosEnEmpresa; i++) {
    let mesesParaBaseCalculo = 0;
    if (!tieneBaseDiezAnos) {
       mesesParaBaseCalculo = Math.max(0, (10 * 12) - mesesTotalExternos);
    }
    const mesesPostBaseEnAniversario = Math.max(0, (i * 12) - mesesParaBaseCalculo);
    const anosPostBaseEnAniversario = Math.floor(mesesPostBaseEnAniversario / 12);
    const progr = Math.floor(anosPostBaseEnAniversario / 3);
    
    diasProgresivosAcumulados += progr;

    const startYear = ingreso.getFullYear() + i - 1;
    const consBase = consumidosBasePorPeriodo[startYear] || 0;
    const consProg = consumidosProgPorPeriodo[startYear] || 0;
    const consTotal = consBase + consProg;
    
    // Identificar si en este periodo se cumple la base de 10 años
    let esPeriodoBase = false;
    const mesesTotalesAlFinal = (i * 12) + mesesTotalExternos;
    if (!baseYaAlcanzada && mesesTotalesAlFinal >= 120) {
      esPeriodoBase = true;
      baseYaAlcanzada = true;
    }

    detalleAnual.push({
      startYear,
      periodo: `${startYear} - ${startYear + 1}`,
      base: 15,
      progresivos: progr,
      total: 15 + progr,
      consumidos: consTotal,
      consumidos_base: consBase,
      consumidos_prog: consProg,
      disponibles: (15 + progr) - consTotal,
      disponibles_base: 15 - consBase,
      disponibles_prog: progr - consProg,
      es_periodo_base: esPeriodoBase
    });
  }

  const mesesProporcionales = mesesEnEmpresa % 12;
  if (mesesProporcionales > 0 || anosEnEmpresa === 0) {
    const startYear = ingreso.getFullYear() + anosEnEmpresa;
    const consBase = consumidosBasePorPeriodo[startYear] || 0;
    const consProg = consumidosProgPorPeriodo[startYear] || 0;
    const consTotal = consBase + consProg;
    const tot = parseFloat((mesesProporcionales * 1.25).toFixed(2));
    
    let esPeriodoBase = false;
    const mesesTotalesAhora = mesesEnEmpresa + mesesTotalExternos;
    if (!baseYaAlcanzada && mesesTotalesAhora >= 120) {
      esPeriodoBase = true;
      baseYaAlcanzada = true;
    }

    // Calcular días progresivos correspondientes a este periodo proporcional (adelantados)
    let mesesParaBaseCalculo = 0;
    if (!tieneBaseDiezAnos) {
       mesesParaBaseCalculo = Math.max(0, (10 * 12) - mesesTotalExternos);
    }
    const mesesPostBaseEnAniversario = Math.max(0, ((anosEnEmpresa + 1) * 12) - mesesParaBaseCalculo);
    const anosPostBaseEnAniversario = Math.floor(mesesPostBaseEnAniversario / 12);
    const progr = Math.floor(anosPostBaseEnAniversario / 3);

    diasProgresivosAcumulados += progr;

    detalleAnual.push({
      startYear,
      periodo: `${startYear} - Actual`,
      base: tot,
      progresivos: progr,
      total: tot + progr,
      consumidos: consTotal,
      consumidos_base: consBase,
      consumidos_prog: consProg,
      disponibles: (tot + progr) - consTotal,
      disponibles_base: tot - consBase,
      disponibles_prog: progr - consProg,
      es_periodo_base: esPeriodoBase
    });
  }

  // === Segunda pasada: calcular excedentes (overflow entre periodos) ===
  let maxYearInSolicitudes = ingreso.getFullYear();
  for (const yearStr in consumidosPorPeriodo) {
    const y = parseInt(yearStr);
    if (y > maxYearInSolicitudes) maxYearInSolicitudes = y;
  }

  let excedenteBase = 0;
  let excedenteProg = 0;
  
  for (let i = 0; i < detalleAnual.length; i++) {
    const d = detalleAnual[i];
    
    const excPrevioTotal = excedenteBase + excedenteProg;
    d.excedente_previo = parseFloat(excPrevioTotal.toFixed(2));
    
    // Sumar excedente a los consumidos directos del periodo
    let totalConsBase = d.consumidos_base + excedenteBase;
    let totalConsProg = d.consumidos_prog + excedenteProg;
    
    excedenteBase = 0;
    excedenteProg = 0;

    // Cap at capacities (15 for base, d.progresivos for prog)
    if (totalConsBase > 15) {
      excedenteBase = totalConsBase - 15;
      totalConsBase = 15;
    }
    if (totalConsProg > d.progresivos) {
      excedenteProg = totalConsProg - d.progresivos;
      totalConsProg = d.progresivos;
    }
    
    d.consumidos_base = parseFloat(totalConsBase.toFixed(2));
    d.consumidos_prog = parseFloat(totalConsProg.toFixed(2));
    d.consumidos = parseFloat((totalConsBase + totalConsProg).toFixed(2));
    
    d.disponibles_base = parseFloat((d.base - d.consumidos_base).toFixed(2));
    d.disponibles_prog = parseFloat((d.progresivos - d.consumidos_prog).toFixed(2));
    d.disponibles = parseFloat((d.disponibles_base + d.disponibles_prog).toFixed(2));
    
    d.es_ultimo_periodo = (i === detalleAnual.length - 1);
  }

  // Generar periodos futuros si aún hay excedente o solicitudes asignadas a años futuros
  let currentStartYear = detalleAnual.length > 0 ? detalleAnual[detalleAnual.length - 1].startYear + 1 : ingreso.getFullYear();
  let baseYaAlcanzadaFuturo = baseYaAlcanzada;
  let anosEnEmpresaFuturo = anosEnEmpresa + 1;

  while (excedenteBase > 0 || excedenteProg > 0 || currentStartYear <= maxYearInSolicitudes) {
    if (detalleAnual.length > 0) {
      detalleAnual[detalleAnual.length - 1].es_ultimo_periodo = false;
    }

    let mesesParaBaseCalculo = 0;
    if (!tieneBaseDiezAnos) {
       mesesParaBaseCalculo = Math.max(0, (10 * 12) - mesesTotalExternos);
    }
    const mesesPostBaseEnAniversario = Math.max(0, (anosEnEmpresaFuturo * 12) - mesesParaBaseCalculo);
    const anosPostBaseEnAniversario = Math.floor(mesesPostBaseEnAniversario / 12);
    const progr = Math.floor(anosPostBaseEnAniversario / 3);

    let esPeriodoBase = false;
    const mesesTotalesAlFinal = (anosEnEmpresaFuturo * 12) + mesesTotalExternos;
    if (!baseYaAlcanzadaFuturo && mesesTotalesAlFinal >= 120) {
      esPeriodoBase = true;
      baseYaAlcanzadaFuturo = true;
    }

    const directConsBase = consumidosBasePorPeriodo[currentStartYear] || 0;
    const directConsProg = consumidosProgPorPeriodo[currentStartYear] || 0;

    let totalConsBase = excedenteBase + directConsBase;
    let totalConsProg = excedenteProg + directConsProg;

    const excPrevioTotal = excedenteBase + excedenteProg;

    excedenteBase = 0;
    excedenteProg = 0;

    if (totalConsBase > 15) {
      excedenteBase = totalConsBase - 15;
      totalConsBase = 15;
    }
    if (totalConsProg > progr) {
      excedenteProg = totalConsProg - progr;
      totalConsProg = progr;
    }

    const consumidos_base = parseFloat(totalConsBase.toFixed(2));
    const consumidos_prog = parseFloat(totalConsProg.toFixed(2));
    const consumidos = parseFloat((consumidos_base + consumidos_prog).toFixed(2));

    detalleAnual.push({
      startYear: currentStartYear,
      periodo: `${currentStartYear} - ${currentStartYear + 1} (Adelantado)`,
      base: 0,
      progresivos: 0, // Aún no ganados en tiempo real
      total: 0,
      consumidos: consumidos,
      consumidos_base: consumidos_base,
      consumidos_prog: consumidos_prog,
      disponibles: -consumidos,
      disponibles_base: -consumidos_base,
      disponibles_prog: -consumidos_prog,
      es_periodo_base: esPeriodoBase,
      excedente_previo: parseFloat(excPrevioTotal.toFixed(2)),
      es_ultimo_periodo: true
    });

    currentStartYear++;
    anosEnEmpresaFuturo++;
  }

  const diasLegalesAcumulados = parseFloat((mesesEnEmpresa * 1.25).toFixed(4));
  const diasProgresivosTotal = diasProgresivosAcumulados;
  const diasProgresivosAnuales = progresivosEmpresa;
  const consumido = parseFloat(total_consumido);
  const saldoActual = parseFloat((diasLegalesAcumulados + diasProgresivosTotal - consumido).toFixed(2));

  // Regla 6-8: Permitir saldo negativo – no clampar con Math.max(0, ...)
  const saldoBaseTotal = parseFloat((diasLegalesAcumulados - total_consumido_base).toFixed(2));
  const saldoProgresivoTotal = parseFloat((diasProgresivosTotal - total_consumido_prog).toFixed(2));

  return {
    diasLegalesAcumulados,
    total_consumido_base,
    total_consumido_prog,
    saldoBaseTotal,
    saldoProgresivoTotal,
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

// Lógica de validaciones para POST /api/solicitudes (Reglas 6-7-8)
async function validarYCrearSolicitud(empleado_id, fecha_inicio, fecha_fin, es_progresivo = false, periodo_asignado, forzar = false) {
  if (new Date(fecha_inicio) > new Date(fecha_fin)) {
    throw new Error('Fecha de inicio posterior a fecha de fin');
  }

  const dias_habiles = await calcularDiasHabiles(fecha_inicio, fecha_fin);
  if (dias_habiles === 0) {
    throw new Error('El rango seleccionado no contiene días hábiles');
  }

  if (!periodo_asignado) {
    throw new Error('Debe seleccionar un periodo disponible.');
  }

  const saldos = await calcularSaldo(empleado_id);
  const periodoInfo = saldos.detalleAnual.find(p => p.startYear === parseInt(periodo_asignado));

  if (!periodoInfo) {
    throw new Error('El periodo seleccionado no es válido.');
  }

  if (es_progresivo) {
    // Regla estricta: no se pueden usar más días progresivos de los que corresponden en el periodo
    if (dias_habiles > periodoInfo.disponibles_prog) {
      const err = new Error(`Los días solicitados (${dias_habiles}) exceden los días progresivos disponibles del periodo (${periodoInfo.disponibles_prog}). No se permite exceder los días progresivos asignados.`);
      err.code = 'PROG_EXCEEDED';
      throw err;
    }
  } else {
    const esUltimoPeriodo = periodoInfo.es_ultimo_periodo;

    // Periodos anteriores (no el último): bloqueo estricto
    if (!esUltimoPeriodo) {
      if (periodoInfo.disponibles <= 0) {
        throw new Error('Este periodo ya no tiene días disponibles. Todos los días legales y progresivos fueron consumidos.');
      }
      if (dias_habiles > periodoInfo.disponibles_base) {
        throw new Error(`Los días solicitados (${dias_habiles}) exceden el saldo base disponible del periodo (${periodoInfo.disponibles_base}).`);
      }
    } else {
      // Último periodo: Regla 6 – permitir saldo negativo con advertencia
      if (dias_habiles > periodoInfo.disponibles_base) {
        const nuevoSaldo = saldos.saldoActual - dias_habiles;

        // Regla 7: Límite máximo de -15 días negativos
        if (nuevoSaldo < -15) {
          const err = new Error(`No se puede procesar. El saldo resultante (${nuevoSaldo}) excedería el límite máximo de -15 días negativos permitidos.`);
          err.code = 'LIMIT_EXCEEDED';
          throw err;
        }

        // Si no se forzó, devolver advertencia para que el frontend pida confirmación
        if (!forzar) {
          const err = new Error(`Los días solicitados (${dias_habiles}) exceden el saldo base disponible del periodo (${periodoInfo.disponibles_base}). El saldo actual pasará a ${nuevoSaldo} días.`);
          err.code = 'SALDO_NEGATIVO';
          err.detalle = {
            dias_solicitados: dias_habiles,
            disponibles_periodo: periodoInfo.disponibles_base,
            saldo_actual: saldos.saldoActual,
            saldo_resultante: nuevoSaldo
          };
          throw err;
        }
        // Si forzar === true, continúa y procesa la solicitud con saldo negativo
      }
    }
  }

  const base_previo = es_progresivo ? saldos.saldoBaseTotal : saldos.saldoBaseTotal - dias_habiles;
  const prog_previo = es_progresivo ? saldos.saldoProgresivoTotal - dias_habiles : saldos.saldoProgresivoTotal;

  const [result] = await pool.query(
    'INSERT INTO solicitudes_vacaciones (empleado_id, fecha_inicio, fecha_fin, dias_habiles_consumidos, es_progresivo, periodo_asignado, saldo_base_previo, saldo_progresivo_previo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [empleado_id, fecha_inicio, fecha_fin, dias_habiles, es_progresivo, periodo_asignado, base_previo, prog_previo]
  );

  return { insertId: result.insertId, dias_habiles, saldos_previos: saldos };
}

async function crearSolicitudHistorica(empleado_id, year, dias) {
  const fecha_inicio = `${year}-01-01`;
  const fecha_fin = `${year}-12-31`;
  const dias_habiles = parseFloat(dias); // preserve 0.5-day precision

  const saldos = await calcularSaldo(empleado_id);

  // Regla 7: validar que el saldo no baje de -15
  const nuevoSaldo = saldos.saldoActual - dias_habiles;
  if (nuevoSaldo < -15) {
    throw new Error(`No se puede procesar. El saldo resultante (${nuevoSaldo}) excedería el límite máximo de -15 días negativos permitidos.`);
  }

  const base_previo = saldos.saldoBaseTotal - dias_habiles;
  const prog_previo = saldos.saldoProgresivoTotal;

  const [result] = await pool.query(
    'INSERT INTO solicitudes_vacaciones (empleado_id, fecha_inicio, fecha_fin, dias_habiles_consumidos, periodo_asignado, saldo_base_previo, saldo_progresivo_previo) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [empleado_id, fecha_inicio, fecha_fin, dias_habiles, year, base_previo, prog_previo]
  );

  return { insertId: result.insertId, dias_habiles, saldos_previos: saldos };
}

module.exports = {
  calcularDiasHabiles,
  calcularSaldo,
  validarYCrearSolicitud,
  crearSolicitudHistorica
};
