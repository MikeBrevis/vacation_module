document.addEventListener('DOMContentLoaded', cargarTabla);

async function cargarTabla() {
  try {
    const empleados = await api.getEmpleados();
    renderTabla(empleados);
  } catch (err) { alert('Error: ' + err.message); }
}

// Avatar color palette – cycles through 3 brand-friendly hues
const AVATAR_COLORS = ['avatar-blue', 'avatar-yellow', 'avatar-gray'];

function getInitials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function renderTabla(empleados) {
  const tbody = document.querySelector('#tablaEmpleados tbody');
  tbody.innerHTML = '';
  empleados.forEach((emp, idx) => {
    const avatarClass = AVATAR_COLORS[idx % AVATAR_COLORS.length];
    const initials = getInitials(emp.nombre_completo);
    tbody.innerHTML += `
      <tr>
        <td class="td-rut">${emp.rut}</td>
        <td>
          <div class="name-cell">
            <span class="avatar ${avatarClass}">${initials}</span>
            <strong>${emp.nombre_completo}</strong>
          </div>
        </td>
        <td>${emp.cargo}</td>
        <td class="td-saldo">${parseFloat(emp.saldoActual).toFixed(2)}</td>
        <td class="text-center">
          <a href="empleado.html?id=${emp.id}" class="action-btn" title="Ver Detalle">
            <i class="bi bi-eye"></i>
          </a>
          <button class="action-btn btn-edit"
            data-id="${emp.id}"
            data-rut="${emp.rut}"
            data-nombre="${emp.nombre_completo}"
            data-cargo="${emp.cargo}"
            data-fechaingreso="${emp.fecha_ingreso ? emp.fecha_ingreso.split('T')[0] : ''}"
            data-cumple10="${emp.cumple_10_anos_base}"

            data-anosext="${emp.anos_externos || 0}"
            data-mesesext="${emp.meses_externos || 0}"
            title="Editar">
            <i class="bi bi-pencil"></i>
          </button>
        </td>
      </tr>
    `;
  });
}

document.getElementById('busqueda').addEventListener('input', e => {
  const q = e.target.value.toLowerCase();
  document.querySelectorAll('#tablaEmpleados tbody tr').forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
});

// Deshabilitar campos de experiencia externa si ya acredita 10 años base
document.getElementById('cumple10').addEventListener('change', e => {
  const anosInput = document.getElementById('anosExternos');
  const mesesInput = document.getElementById('mesesExternos');
  if (e.target.checked) {
    anosInput.disabled = true;
    mesesInput.disabled = true;
    anosInput.value = 0;
    mesesInput.value = 0;
  } else {
    anosInput.disabled = false;
    mesesInput.disabled = false;
  }
});

document.getElementById('formNuevoEmpleado').addEventListener('submit', async e => {
  e.preventDefault();
  const alertaContainer = document.getElementById('alertaNuevoEmpleado');
  alertaContainer.innerHTML = '';
  const data = {
    rut: document.getElementById('rut').value,
    nombre_completo: document.getElementById('nombre').value,
    cargo: document.getElementById('cargo').value,
    fecha_ingreso: document.getElementById('fechaIngreso').value,
    cumple_10_anos_base: document.getElementById('cumple10').checked,
    anos_externos: parseInt(document.getElementById('anosExternos').value || 0),
    meses_externos: parseInt(document.getElementById('mesesExternos').value || 0)
  };
  try {
    await api.crearEmpleado(data);
    bootstrap.Modal.getInstance(document.getElementById('modalNuevoEmpleado')).hide();
    e.target.reset();
    cargarTabla();
  } catch (err) {
    alertaContainer.innerHTML = `<div class="alert alert-danger alert-dismissible fade show" role="alert">${err.message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>`;
  }
});

// --- Modal Editar Empleado ---
let modalEditarInstancia;

document.addEventListener('DOMContentLoaded', () => {
  // Limpiar alerta al cerrar modal Nuevo Empleado
  const modalNuevo = document.getElementById('modalNuevoEmpleado');
  if (modalNuevo) {
    modalNuevo.addEventListener('hidden.bs.modal', () => {
      document.getElementById('alertaNuevoEmpleado').innerHTML = '';
    });
  }

  const modalEl = document.getElementById('modalEditarEmpleado');
  if (modalEl) {
    modalEditarInstancia = new bootstrap.Modal(modalEl);
    // Colapsar zona de peligro y limpiar alerta al cerrar el modal
    modalEl.addEventListener('hidden.bs.modal', () => {
      document.getElementById('alertaEditarEmpleado').innerHTML = '';
      const zona = document.getElementById('zonaEliminar');
      if (zona.classList.contains('show')) {
        bootstrap.Collapse.getInstance(zona)?.hide();
      }
    });
  }
});

document.querySelector('#tablaEmpleados').addEventListener('click', e => {
  const btn = e.target.closest('.btn-edit');
  if (btn) {
    document.getElementById('editarEmpleadoId').value = btn.dataset.id;
    document.getElementById('editRut').value = btn.dataset.rut;
    document.getElementById('editNombre').value = btn.dataset.nombre;
    document.getElementById('editCargo').value = btn.dataset.cargo;
    document.getElementById('editFechaIngreso').value = btn.dataset.fechaingreso || '';

    const cumple10 = btn.dataset.cumple10 === '1' || btn.dataset.cumple10 === 'true';
    document.getElementById('editCumple10').checked = cumple10;



    const editAnos = document.getElementById('editAnosExternos');
    const editMeses = document.getElementById('editMesesExternos');
    editAnos.value = btn.dataset.anosext;
    editMeses.value = btn.dataset.mesesext;
    editAnos.disabled = cumple10;
    editMeses.disabled = cumple10;

    if (modalEditarInstancia) modalEditarInstancia.show();
  }
});

document.getElementById('editCumple10').addEventListener('change', e => {
  const editAnos = document.getElementById('editAnosExternos');
  const editMeses = document.getElementById('editMesesExternos');

  if (e.target.checked) {
    editAnos.disabled = true;
    editMeses.disabled = true;
    editAnos.value = 0;
    editMeses.value = 0;

  } else {
    editAnos.disabled = false;
    editMeses.disabled = false;

  }
});

document.getElementById('formEditarEmpleado').addEventListener('submit', async e => {
  e.preventDefault();
  const alertaContainer = document.getElementById('alertaEditarEmpleado');
  alertaContainer.innerHTML = '';
  const empId = document.getElementById('editarEmpleadoId').value;
  const btn = document.getElementById('btnGuardarEdicion');
  const data = {
    rut: document.getElementById('editRut').value,
    nombre_completo: document.getElementById('editNombre').value,
    cargo: document.getElementById('editCargo').value,
    fecha_ingreso: document.getElementById('editFechaIngreso').value,
    cumple_10_anos_base: document.getElementById('editCumple10').checked,

    anos_externos: parseInt(document.getElementById('editAnosExternos').value || 0),
    meses_externos: parseInt(document.getElementById('editMesesExternos').value || 0)
  };
  try {
    btn.disabled = true;
    btn.textContent = 'Guardando...';
    await api.actualizarEmpleado(empId, data);
    if (modalEditarInstancia) modalEditarInstancia.hide();
    btn.disabled = false;
    btn.textContent = 'Guardar Cambios';
    cargarTabla();
  } catch (err) {
    alertaContainer.innerHTML = `<div class="alert alert-danger alert-dismissible fade show" role="alert">${err.message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>`;
    btn.disabled = false;
    btn.textContent = 'Guardar Cambios';
  }
});

document.getElementById('btnConfirmarEliminar')?.addEventListener('click', async () => {
  const empId = document.getElementById('editarEmpleadoId').value;
  const btn = document.getElementById('btnConfirmarEliminar');
  const zonaDiv = document.querySelector('#zonaEliminar .border-danger');
  
  // Si ya se mostró la advertencia (segundo clic), forzar eliminación
  if (btn.dataset.forceReady === 'true') {
    try {
      btn.disabled = true;
      btn.textContent = 'Eliminando...';
      await api.eliminarEmpleado(empId, true);
      if (modalEditarInstancia) modalEditarInstancia.hide();
      btn.disabled = false;
      btn.textContent = 'Eliminar Empleado';
      btn.dataset.forceReady = 'false';
      cargarTabla();
    } catch (err) { 
      alert(err.message); 
      btn.disabled = false;
      btn.textContent = 'Eliminar Empleado';
    }
    return;
  }

  // Primer clic: intentar sin force para verificar si tiene solicitudes
  try {
    btn.disabled = true;
    btn.textContent = 'Verificando...';
    await api.eliminarEmpleado(empId, false);
    // Si llega aquí, se eliminó sin conflicto
    if (modalEditarInstancia) modalEditarInstancia.hide();
    btn.disabled = false;
    btn.textContent = 'Eliminar Empleado';
    cargarTabla();
  } catch (err) {
    btn.disabled = false;
    if (err.status === 409 && err.data?.requiere_confirmacion) {
      // Mostrar advertencia dentro de la zona de peligro
      const alerta = document.getElementById('alertaEliminar');
      if (alerta) alerta.remove();
      
      const alertDiv = document.createElement('div');
      alertDiv.id = 'alertaEliminar';
      alertDiv.className = 'alert alert-warning mt-2 mb-2 small';
      alertDiv.innerHTML = `<strong>⚠ Advertencia:</strong> ${err.data.mensaje}`;
      zonaDiv.insertBefore(alertDiv, btn);
      
      btn.textContent = 'Confirmar Eliminación Completa';
      btn.classList.replace('btn-danger', 'btn-dark');
      btn.dataset.forceReady = 'true';
    } else {
      alert(err.message);
      btn.textContent = 'Eliminar Empleado';
    }
  }
});

// Resetear estado del botón eliminar al cerrar el modal
document.getElementById('modalEditarEmpleado')?.addEventListener('hidden.bs.modal', () => {
  const btn = document.getElementById('btnConfirmarEliminar');
  btn.textContent = 'Eliminar Empleado';
  btn.classList.replace('btn-dark', 'btn-danger');
  btn.dataset.forceReady = 'false';
  const alerta = document.getElementById('alertaEliminar');
  if (alerta) alerta.remove();
});

document.getElementById('btnSincronizar').addEventListener('click', async () => {
  if (confirm('¿Sincronizar feriados con API?')) {
    try {
      const res = await api.sincronizarFeriados();
      alert(res.mensaje);
    } catch(err) { alert(err.message); }
  }
});
