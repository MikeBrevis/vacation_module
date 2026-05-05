const params = new URLSearchParams(window.location.search);
const id = params.get('id');
if (!id) window.location.href = 'index.html';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const datos = await api.getEmpleadoDetalle(id);
    document.getElementById('empNombre').textContent = datos.empleado.nombre_completo;
    document.getElementById('empRut').textContent = datos.empleado.rut;
    document.getElementById('empCargo').textContent = datos.empleado.cargo;
    
    const ingreso = new Date(datos.empleado.fecha_ingreso);
    const hoy = new Date();
    const mesesTotales = (hoy.getFullYear() - ingreso.getFullYear()) * 12 + (hoy.getMonth() - ingreso.getMonth());
    const anos = Math.floor(mesesTotales / 12);
    const mesesRestantes = Math.max(0, mesesTotales % 12);
    
    // Calcular experiencia total (cotizados)
    let mesesCotizadosTotales = mesesTotales;
    if (datos.empleado.cumple_10_anos_base) {
      mesesCotizadosTotales += (10 * 12);
    } else {
      mesesCotizadosTotales += (datos.empleado.anos_externos * 12) + datos.empleado.meses_externos;
    }
    const anosCot = Math.floor(mesesCotizadosTotales / 12);
    const mesesCot = Math.max(0, mesesCotizadosTotales % 12);

    const fechaFormat = ingreso.toISOString().split('T')[0].split('-').reverse().join('-');
    
    document.getElementById('empIngreso').textContent = fechaFormat;
    document.getElementById('empAnios').textContent = anos;
    document.getElementById('empMeses').textContent = mesesRestantes;
    document.getElementById('empAniosCot').textContent = datos.empleado.cumple_10_anos_base ? `${anosCot}+` : anosCot;
    document.getElementById('empMesesCot').textContent = mesesCot;
    
    // Años que ya tienen carga histórica registrada
    const anosRegistrados = new Set(
      datos.solicitudes
        .filter(s => s.fecha_inicio.includes('-01-01') && s.fecha_fin.includes('-12-31'))
        .map(s => s.fecha_inicio.split('-')[0])
    );

    // Poblar el selector de años históricos (desde su ingreso hasta el año actual)
    const selectAnio = document.getElementById('histAnio');
    selectAnio.innerHTML = '<option value="">Seleccione un año...</option>';
    for (let y = hoy.getFullYear(); y > ingreso.getFullYear(); y--) {
      const option = document.createElement('option');
      option.value = y;
      if (anosRegistrados.has(String(y))) {
        option.textContent = `${y} (registrado)`;
        option.disabled = true;
      } else {
        option.textContent = y;
      }
      selectAnio.appendChild(option);
    }

    renderPanelSaldos(datos.saldo);
    renderHistorial(datos.solicitudes);

    // Cargar feriados e inicializar Flatpickr
    const feriados = await api.getFeriados();
    const fechasFeriados = feriados.map(f => f.fecha.split('T')[0]); // Formato YYYY-MM-DD
    
    const flatpickrConfig = {
      locale: 'es',
      dateFormat: 'Y-m-d',
      disable: [
        function(date) { return (date.getDay() === 0 || date.getDay() === 6); } // Deshabilitar fines de semana
      ],
      onDayCreate: function(dObj, dStr, fp, dayElem) {
        // Obtenemos la fecha en formato YYYY-MM-DD de forma segura ajustando la zona horaria local
        const year = dayElem.dateObj.getFullYear();
        const month = String(dayElem.dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dayElem.dateObj.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        if (fechasFeriados.includes(dateStr)) {
          dayElem.classList.add('feriado');
          // También podemos añadir un tooltip con el nombre del feriado si lo buscamos
          const feriadoObj = feriados.find(f => f.fecha.split('T')[0] === dateStr);
          if(feriadoObj) dayElem.title = feriadoObj.descripcion;
        }
      }
    };
    
    flatpickr('#fechaInicio', flatpickrConfig);
    flatpickr('#fechaFin', flatpickrConfig);
    
  } catch(err) { alert(err.message); }
});

function renderPanelSaldos(saldo) {
  const color = saldo.saldoActual < 5 ? 'danger' : saldo.saldoActual <= 10 ? 'warning' : 'success';
  document.getElementById('saldoActual').textContent = saldo.saldoActual;
  document.getElementById('saldoActual').className = `text-${color} fw-bold display-4`;
  
  document.getElementById('saldoLegales').textContent = saldo.diasLegalesAcumulados;
  document.getElementById('saldoProgresivos').textContent = saldo.diasProgresivosTotal;
  document.getElementById('saldoConsumidos').textContent = saldo.diasConsumidos;
}

function renderHistorial(solicitudes) {
  const tbody = document.querySelector('#tablaHistorial tbody');
  tbody.innerHTML = '';
  solicitudes.forEach(s => {
    const fechaSol = new Date(s.fecha_solicitud).toLocaleDateString();
    const pdfUrl = `http://localhost:3000/api/solicitudes/${s.id}/pdf`;
    
    const fecha_inicio = s.fecha_inicio.split('T')[0];
    const fecha_fin = s.fecha_fin.split('T')[0];
    const anio = fecha_inicio.split('-')[0];
    
    let tdInicio = `<td>${fecha_inicio}</td>`;
    let tdTermino = `<td>${fecha_fin}</td>`;
    
    if (fecha_inicio.endsWith('-01-01') && fecha_fin.endsWith('-12-31')) {
      tdInicio = `<td colspan="2" class="text-center text-muted fw-bold">Año ${anio} (Histórico)</td>`;
      tdTermino = ``;
    }
    
    tbody.innerHTML += `
      <tr>
        <td>${fechaSol}</td>
        ${tdInicio}
        ${tdTermino}
        <td>${s.dias_habiles_consumidos}</td>
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

document.getElementById('formSolicitud').addEventListener('submit', async e => {
  e.preventDefault();
  const fechaInicio = document.getElementById('fechaInicio').value;
  const fechaFin = document.getElementById('fechaFin').value;
  try {
    await api.registrarSolicitud({ empleado_id: id, fecha_inicio: fechaInicio, fecha_fin: fechaFin });
    window.location.reload();
  } catch (err) {
    const container = document.getElementById('alertaSolicitud');
    container.innerHTML = `<div class="alert alert-danger alert-dismissible fade show">${err.message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>`;
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
