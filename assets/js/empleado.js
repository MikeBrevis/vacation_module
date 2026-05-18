const params = new URLSearchParams(window.location.search);
const id = params.get('id');
if (!id) window.location.href = 'index.html';

// Estado global para el modal de confirmación de saldo negativo
let solicitudPendiente = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const datos = await api.getEmpleadoDetalle(id);
    document.getElementById('empNombre').textContent = datos.empleado.nombre_completo;
    document.getElementById('empRut').textContent = datos.empleado.rut;
    document.getElementById('empCargo').textContent = datos.empleado.cargo;

    const ingreso = new Date(datos.empleado.fecha_ingreso);
    const hoy = new Date();
    const mesesAndecorp = (hoy.getFullYear() - ingreso.getFullYear()) * 12 + (hoy.getMonth() - ingreso.getMonth());
    const mesesPrevios = (datos.empleado.anos_externos * 12) + datos.empleado.meses_externos;

    const formatFecha = (f) => {
      if (!f) return null;
      const d = typeof f === 'string' ? f.split('T')[0] : f.toISOString().split('T')[0];
      return d.split('-').reverse().join('-');
    };

    const fechaCert = datos.empleado.fecha_certificado ? formatFecha(datos.empleado.fecha_certificado) : 'No registrado';
    const totalCotizados = (datos.empleado.total_meses_cotizados !== null && datos.empleado.total_meses_cotizados !== undefined) ? `${datos.empleado.total_meses_cotizados} meses` : 'No registrado';
    const fechaFormat = formatFecha(datos.empleado.fecha_ingreso);

    document.getElementById('empIngreso').textContent = fechaFormat;
    document.getElementById('empFechaCert').textContent = fechaCert;
    document.getElementById('empTotalCot').textContent = totalCotizados;
    document.getElementById('empCotPrevio').textContent = `${mesesPrevios} meses`;
    document.getElementById('empCotAndecorp').textContent = `${mesesAndecorp} meses`;

    // Años que ya tienen carga histórica registrada
    const anosRegistrados = new Set(
      datos.solicitudes
        .filter(s => s.fecha_inicio.includes('-01-01') && s.fecha_fin.includes('-12-31'))
        .map(s => s.fecha_inicio.split('-')[0])
    );

    // Poblar el selector de años históricos (desde su ingreso hasta el año actual)
    const selectAnio = document.getElementById('histAnio');
    selectAnio.innerHTML = '<option value="" disabled selected hidden></option>';
    for (let y = hoy.getFullYear() - 1; y >= ingreso.getFullYear(); y--) {
      const option = document.createElement('option');
      option.value = y;
      if (anosRegistrados.has(String(y))) {
        option.textContent = `${y}-${y + 1} (registrado)`;
        option.disabled = true;
      } else {
        option.textContent = `${y}-${y + 1}`;
      }
      selectAnio.appendChild(option);
    }

    // Poblar el selector de periodos disponibles para nueva solicitud
    // Solo periodos con días disponibles + el último periodo (permite adelantadas)
    const selectSolPeriodo = document.getElementById('solPeriodo');
    selectSolPeriodo.innerHTML = '<option value="" disabled selected hidden>Seleccione un periodo disponible...</option>';
    if (datos.saldo && datos.saldo.detalleAnual) {
      datos.saldo.detalleAnual.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.startYear;
        if (p.disponibles > 0 || p.disponibles_base > 0 || p.disponibles_prog > 0) {
          opt.textContent = `${p.periodo} (${p.disponibles} días disp.)`;
          selectSolPeriodo.appendChild(opt);
        } else if (p.es_ultimo_periodo) {
          // Último periodo: siempre visible, permite vacaciones adelantadas
          opt.textContent = `${p.periodo} (${p.disponibles} días disp.) — Adelantadas`;
          selectSolPeriodo.appendChild(opt);
        } else {
          // Periodo agotado: mostrar deshabilitado
          opt.textContent = `${p.periodo} (Agotado)`;
          opt.disabled = true;
          selectSolPeriodo.appendChild(opt);
        }
      });
    }

    renderPanelSaldos(datos.saldo);
    if (datos.saldo.detalleAnual) renderDetalleAnual(datos.saldo.detalleAnual);
    renderHistorial(datos.solicitudes);

    // Cargar feriados
    const feriados = await api.getFeriados();
    const fechasFeriados = feriados.map(f => f.fecha.split('T')[0]); // Formato YYYY-MM-DD

    // ═══ Premium Double Calendar Selector Logic ═══
    let selectedStartDate = null;
    let selectedEndDate = null;
    let calendarMonth = new Date().getMonth(); // 0-11
    let calendarYear = new Date().getFullYear();
    const calendarModal = new bootstrap.Modal(document.getElementById('modalCalendarioDoble'));

    const monthNames = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];

    // Triggers for opening the modal
    document.getElementById('fechaInicio').addEventListener('click', abrirCalendario);
    document.getElementById('fechaFin').addEventListener('click', abrirCalendario);

    function abrirCalendario() {
      const valInicio = document.getElementById('fechaInicio').value;
      const valFin = document.getElementById('fechaFin').value;

      if (valInicio) {
        selectedStartDate = new Date(valInicio + 'T00:00:00');
      } else {
        selectedStartDate = null;
      }

      if (valFin) {
        selectedEndDate = new Date(valFin + 'T00:00:00');
      } else {
        selectedEndDate = null;
      }

      // Al abrir el calendario, siempre posicionarlo mostrando el mes actual de hoy
      const hoy = new Date();
      calendarMonth = hoy.getMonth();
      calendarYear = hoy.getFullYear();

      renderDualCalendar();
      updateFooterSummary();
      calendarModal.show();
    }

    // Navigation Controls
    document.getElementById('btnPrevMonth').addEventListener('click', (e) => {
      e.stopPropagation();
      calendarMonth--;
      if (calendarMonth < 0) {
        calendarMonth = 11;
        calendarYear--;
      }
      renderDualCalendar();
    });

    document.getElementById('btnNextMonth').addEventListener('click', (e) => {
      e.stopPropagation();
      calendarMonth++;
      if (calendarMonth > 11) {
        calendarMonth = 0;
        calendarYear++;
      }
      renderDualCalendar();
    });

    // Formatting Helpers
    function toISODateString(date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    function formatDisplayDate(date) {
      if (!date) return '';
      return `${date.getDate()} de ${monthNames[date.getMonth()]}`;
    }

    function renderDualCalendar() {
      // Month 1
      const m1 = calendarMonth;
      const y1 = calendarYear;

      // Month 2
      let m2 = calendarMonth + 1;
      let y2 = calendarYear;
      if (m2 > 11) {
        m2 = 0;
        y2 = calendarYear + 1;
      }

      renderMonth(m1, y1, 'monthTitle1', 'monthDays1');
      renderMonth(m2, y2, 'monthTitle2', 'monthDays2');
    }

    function renderMonth(month, year, titleId, daysGridId) {
      document.getElementById(titleId).textContent = `${monthNames[month]} de ${year}`;
      
      const grid = document.getElementById(daysGridId);
      grid.innerHTML = '';

      const totalDays = new Date(year, month + 1, 0).getDate();
      const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Lunes=0 ... Domingo=6

      // Empty padding cells
      for (let i = 0; i < firstDayIndex; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day-box empty';
        grid.appendChild(emptyCell);
      }

      for (let d = 1; d <= totalDays; d++) {
        const curDate = new Date(year, month, d);
        const curStr = toISODateString(curDate);
        const dow = curDate.getDay(); // 0=Domingo, 6=Sábado
        const isWeekend = (dow === 0 || dow === 6);
        const isFeriado = fechasFeriados.includes(curStr);

        const cell = document.createElement('div');
        cell.className = 'calendar-day-box';
        cell.textContent = d;
        cell.dataset.date = curStr;

        if (isWeekend) {
          cell.classList.add('weekend', 'disabled');
        } else if (isFeriado) {
          cell.classList.add('feriado', 'disabled');
          const feriadoObj = feriados.find(f => f.fecha.split('T')[0] === curStr);
          if (feriadoObj) {
            cell.title = feriadoObj.descripcion;
          }
        }

        // Selected highlights
        if (selectedStartDate && curStr === toISODateString(selectedStartDate)) {
          cell.classList.add('selected-start');
        }
        if (selectedEndDate && curStr === toISODateString(selectedEndDate)) {
          cell.classList.add('selected-end');
        }
        if (selectedStartDate && selectedEndDate && curDate > selectedStartDate && curDate < selectedEndDate && !isWeekend && !isFeriado) {
          cell.classList.add('in-range');
        }

        // Active triggers
        if (!isWeekend && !isFeriado) {
          cell.addEventListener('click', () => handleDayClick(curDate));
          cell.addEventListener('mouseenter', () => handleDayMouseEnter(curDate));
        }

        grid.appendChild(cell);
      }
    }

    function handleDayClick(date) {
      if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
        selectedStartDate = date;
        selectedEndDate = null;
      } else if (selectedStartDate && !selectedEndDate) {
        if (date < selectedStartDate) {
          selectedStartDate = date;
        } else {
          selectedEndDate = date;
        }
      }
      renderDualCalendar();
      updateFooterSummary();
    }

    function handleDayMouseEnter(hoveredDate) {
      if (selectedStartDate && !selectedEndDate) {
        const allCells = document.querySelectorAll('.calendar-days-grid .calendar-day-box[data-date]');
        allCells.forEach(cell => {
          const cellDate = new Date(cell.dataset.date + 'T00:00:00');
          
          cell.classList.remove('in-range', 'selected-end');

          if (cellDate > selectedStartDate && cellDate < hoveredDate && !cell.classList.contains('disabled')) {
            cell.classList.add('in-range');
          } else if (toISODateString(cellDate) === toISODateString(hoveredDate)) {
            cell.classList.add('selected-end');
          }
        });

        if (hoveredDate >= selectedStartDate) {
          const daysCount = calcularDiasHabiles(selectedStartDate, hoveredDate);
          document.getElementById('selectionDaysSummary').textContent = `${daysCount} ${daysCount === 1 ? 'día hábil' : 'días hábiles'}`;
          document.getElementById('selectionDatesSummary').textContent = `${formatDisplayDate(selectedStartDate)} - ${formatDisplayDate(hoveredDate)}`;
        }
      }
    }

    function updateFooterSummary() {
      const summaryDays = document.getElementById('selectionDaysSummary');
      const summaryDates = document.getElementById('selectionDatesSummary');
      const btnAplicar = document.getElementById('btnAplicarFechas');

      if (selectedStartDate && selectedEndDate) {
        const daysCount = calcularDiasHabiles(selectedStartDate, selectedEndDate);
        summaryDays.textContent = `${daysCount} ${daysCount === 1 ? 'día hábil' : 'días hábiles'}`;
        summaryDates.textContent = `${formatDisplayDate(selectedStartDate)} - ${formatDisplayDate(selectedEndDate)}`;
        btnAplicar.removeAttribute('disabled');
      } else if (selectedStartDate) {
        summaryDays.textContent = 'Selecciona fecha de término';
        summaryDates.textContent = `Inicio: ${formatDisplayDate(selectedStartDate)}`;
        btnAplicar.setAttribute('disabled', 'true');
      } else {
        summaryDays.textContent = 'Selecciona tus fechas';
        summaryDates.textContent = 'Haz clic en el día de inicio';
        btnAplicar.setAttribute('disabled', 'true');
      }
    }

    // Apply Dates Selection
    document.getElementById('btnAplicarFechas').addEventListener('click', () => {
      if (selectedStartDate && selectedEndDate) {
        document.getElementById('fechaInicio').value = toISODateString(selectedStartDate);
        document.getElementById('fechaFin').value = toISODateString(selectedEndDate);
        
        actualizarDiasSeleccionados();
        calendarModal.hide();
      }
    });

    function calcularDiasHabiles(start, end) {
      let count = 0;
      let cur = new Date(start);
      while (cur <= end) {
        const dow = cur.getDay();
        const iso = toISODateString(cur);
        if (dow !== 0 && dow !== 6 && !fechasFeriados.includes(iso)) {
          count++;
        }
        cur.setDate(cur.getDate() + 1);
      }
      return count;
    }

    function actualizarDiasSeleccionados() {
      const startStr = document.getElementById('fechaInicio').value;
      const endStr = document.getElementById('fechaFin').value;
      const box = document.getElementById('infoDiasBox');
      const val = document.getElementById('infoDiasVal');

      if (!startStr || !endStr) {
        box.classList.add('d-none');
        return;
      }

      const count = calcularDiasHabiles(new Date(startStr + 'T00:00:00'), new Date(endStr + 'T00:00:00'));
      val.textContent = count;
      box.classList.remove('d-none');
    }

    // Selector de Periodos handler
    document.getElementById('solPeriodo').addEventListener('change', e => {
      const startYear = e.target.value;
      if (startYear) {
        calendarYear = parseInt(startYear);
        calendarMonth = ingreso.getMonth(); // Mes de ingreso del empleado
        
        // Reset selections to avoid inconsistent states
        selectedStartDate = null;
        selectedEndDate = null;
        document.getElementById('fechaInicio').value = '';
        document.getElementById('fechaFin').value = '';
        actualizarDiasSeleccionados();
      }
    });

  } catch (err) { alert(err.message); }
});

function renderPanelSaldos(saldo) {
  // Regla 6-8: Saldo puede ser negativo, reflejar con color rojo
  let color;
  if (saldo.saldoActual < 0) {
    color = 'danger';
  } else if (saldo.saldoActual < 5) {
    color = 'warning';
  } else if (saldo.saldoActual <= 10) {
    color = 'warning';
  } else {
    color = 'success';
  }

  const saldoEl = document.getElementById('saldoActual');
  saldoEl.textContent = saldo.saldoActual;
  saldoEl.className = `text-${color} fw-bold display-4`;

  document.getElementById('saldoLegales').textContent = saldo.diasLegalesAcumulados;
  document.getElementById('saldoProgresivosAcumulados').textContent = saldo.diasProgresivosTotal;
  document.getElementById('saldoProgresivos').textContent = saldo.diasProgresivosAnuales;
  document.getElementById('saldoConsumidos').textContent = saldo.diasConsumidos;
}

function renderDetalleAnual(detalle) {
  const tbody = document.getElementById('tablaDetalleAnual');
  if (!tbody) return;
  tbody.innerHTML = '';
  const detalleReverso = [...detalle].reverse();
  detalleReverso.forEach(d => {
    const isProgresivo = d.progresivos > 0;

    let rowClass = '';
    if (d.es_periodo_base) {
      rowClass = 'table-primary fw-bold'; // Hito 10 años: AZUL
    } else if (d.disponibles > 0) {
      rowClass = 'table-success';         // Disponible: VERDE
    } else if (d.disponibles < 0) {
      rowClass = 'table-danger';          // Saldo negativo: ROJO
    } else {
      rowClass = 'table-danger text-muted'; // Agotado: ROJO atenuado
    }

    const spanProgresivo = isProgresivo ? `<span class="badge bg-primary text-white ms-1">+${d.progresivos}</span>` : '0';

    // Mostrar disponibles en rojo si son negativos
    const dispClass = d.disponibles < 0 ? 'text-danger fw-bold' : '';
    const dispText = d.disponibles < 0 ? `${d.disponibles}` : d.disponibles;

    // Excedente: mostrar en naranja si > 0
    const excText = d.excedente_previo > 0 ? `<span class="fw-bold text-danger">${d.excedente_previo}</span>` : '-';

    tbody.innerHTML += `
      <tr class="${rowClass}" ${d.es_periodo_base ? 'title="Base de 10 años cumplida"' : ''}>
        <td>${d.periodo}</td>
        <td>${d.base}</td>
        <td>${spanProgresivo}</td>
        <td>${d.total}</td>
        <td>${d.consumidos_base}</td>
        <td>${d.consumidos_prog}</td>
        <td>${excText}</td>
        <td class="${dispClass}">${dispText}</td>
      </tr>
    `;
  });
}

function renderHistorial(solicitudes) {
  const tbody = document.querySelector('#tablaHistorial tbody');
  tbody.innerHTML = '';
  solicitudes.forEach(s => {
    // Aseguramos formato DD-MM-YYYY para la fecha de solicitud también
    const dateSol = new Date(s.fecha_solicitud);
    const d = String(dateSol.getDate()).padStart(2, '0');
    const m = String(dateSol.getMonth() + 1).padStart(2, '0');
    const y = dateSol.getFullYear();
    const fechaSol = `${d}-${m}-${y}`;
    const token = localStorage.getItem('token');
    const pdfUrl = `${API_URL}/solicitudes/${s.id}/pdf?token=${token}`;

    const fecha_inicio = s.fecha_inicio.split('T')[0];
    const fecha_fin = s.fecha_fin.split('T')[0];
    const anio = fecha_inicio.split('-')[0];

    const formatDDMMYYYY = (dateStr) => dateStr.split('-').reverse().join('-');

    let tdInicio = `<td>${formatDDMMYYYY(fecha_inicio)}</td>`;
    let tdTermino = `<td>${formatDDMMYYYY(fecha_fin)}</td>`;
    let tdProgresivo = `<td></td>`;

    if (fecha_inicio.endsWith('-01-01') && fecha_fin.endsWith('-12-31')) {
      const startYear = parseInt(anio);
      tdInicio = `<td class="text-muted fw-bold">Periodo ${startYear}-${startYear + 1}</td>`;
      tdTermino = `<td class="text-muted fw-bold">(Histórico)</td>`;
      tdProgresivo = `<td></td>`;
    } else if (s.es_progresivo) {
      tdProgresivo = `<td><i class="bi bi-check-circle-fill text-success fs-5"></i></td>`;
    }

    tbody.innerHTML += `
      <tr class="align-middle">
        <td>${fechaSol}</td>
        ${tdInicio}
        ${tdTermino}
        <td>${s.dias_habiles_consumidos}</td>
        ${tdProgresivo}
        <td>
          <a href="${pdfUrl}" target="_blank" class="btn btn-sm btn-outline-primary">Ver PDF</a>
        </td>
        <td>
          <button class="btn btn-sm btn-danger btn-anular" data-id="${s.id}">Anular</button>
        </td>
      </tr>
    `;
  });
}

// ─── Enviar solicitud con soporte para confirmación de saldo negativo ───
async function enviarSolicitud(datos, forzar = false) {
  const payload = { ...datos, forzar };
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/solicitudes`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  const body = await res.json();

  if (res.status === 409 && body.code === 'SALDO_NEGATIVO') {
    // Mostrar modal de confirmación con los detalles
    return { tipo: 'advertencia', body, datos };
  }

  if (!res.ok) {
    throw new Error(body.mensaje || `Error HTTP ${res.status}`);
  }

  return { tipo: 'exito', body };
}

document.getElementById('formSolicitud').addEventListener('submit', async e => {
  e.preventDefault();
  const fechaInicio = document.getElementById('fechaInicio').value;
  const fechaFin = document.getElementById('fechaFin').value;
  const esProgresivo = document.getElementById('esProgresiva').checked;
  const periodoAsignado = document.getElementById('solPeriodo').value;
  const container = document.getElementById('alertaSolicitud');
  container.innerHTML = '';

  try {
    const datos = { empleado_id: id, fecha_inicio: fechaInicio, fecha_fin: fechaFin, es_progresivo: esProgresivo, periodo_asignado: periodoAsignado };
    const resultado = await enviarSolicitud(datos);

    if (resultado.tipo === 'advertencia') {
      // Guardar datos para reenviar con forzar=true si el usuario confirma
      solicitudPendiente = datos;
      const det = resultado.body.detalle;

      // Poblar el modal de confirmación
      document.getElementById('saldoNegDiasSolicitados').textContent = det.dias_solicitados;
      document.getElementById('saldoNegDisponibles').textContent = det.disponibles_periodo;
      document.getElementById('saldoNegActual').textContent = det.saldo_actual;
      document.getElementById('saldoNegResultante').textContent = det.saldo_resultante;

      const modal = new bootstrap.Modal(document.getElementById('modalSaldoNegativo'));
      modal.show();
      return;
    }

    // Éxito: recargar
    window.location.reload();
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger alert-dismissible fade show">${err.message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>`;
  }
});

// Confirmar solicitud con saldo negativo
document.getElementById('btnConfirmarSaldoNeg')?.addEventListener('click', async () => {
  if (!solicitudPendiente) return;
  const btn = document.getElementById('btnConfirmarSaldoNeg');
  const container = document.getElementById('alertaSolicitud');
  try {
    btn.disabled = true;
    btn.textContent = 'Procesando...';
    const resultado = await enviarSolicitud(solicitudPendiente, true);
    if (resultado.tipo === 'exito') {
      window.location.reload();
    }
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger alert-dismissible fade show">${err.message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>`;
    btn.disabled = false;
    btn.textContent = 'Sí, Procesar Solicitud';
    bootstrap.Modal.getInstance(document.getElementById('modalSaldoNegativo'))?.hide();
  }
});

document.getElementById('formHistorico').addEventListener('submit', async e => {
  e.preventDefault();
  const anio = document.getElementById('histAnio').value;
  const dias = parseFloat(document.getElementById('histDias').value);
  const container = document.getElementById('alertaHistorico');
  container.innerHTML = '';

  if (dias > 15) {
    container.innerHTML = `<div class="alert alert-danger alert-dismissible fade show">Los días tomados no pueden superar 15 por año.<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>`;
    return;
  }

  try {
    await api.registrarHistorico({ empleado_id: id, anio, dias });
    window.location.reload();
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger alert-dismissible fade show">${err.message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>`;
  }
});

let modalAnularInstancia;

document.addEventListener('DOMContentLoaded', () => {
  const modalEl = document.getElementById('modalAnular');
  if (modalEl) modalAnularInstancia = new bootstrap.Modal(modalEl);
});

document.querySelector('#tablaHistorial').addEventListener('click', e => {
  if (e.target.classList.contains('btn-anular')) {
    const solicitudId = e.target.dataset.id;
    document.getElementById('anularSolicitudId').value = solicitudId;
    if (modalAnularInstancia) modalAnularInstancia.show();
  }
});

document.getElementById('btnConfirmarAnular')?.addEventListener('click', async () => {
  const solicitudId = document.getElementById('anularSolicitudId').value;
  const btn = document.getElementById('btnConfirmarAnular');
  try {
    btn.disabled = true;
    btn.textContent = 'Anulando...';
    await api.anularSolicitud(solicitudId);
    window.location.reload();
  } catch (err) {
    alert(err.message);
    btn.disabled = false;
    btn.textContent = 'Sí, Anular';
    if (modalAnularInstancia) modalAnularInstancia.hide();
  }
});
