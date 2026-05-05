document.addEventListener('DOMContentLoaded', cargarTabla);

async function cargarTabla() {
  try {
    const empleados = await api.getEmpleados();
    renderTabla(empleados);
  } catch (err) { alert('Error: ' + err.message); }
}

function renderTabla(empleados) {
  const tbody = document.querySelector('#tablaEmpleados tbody');
  tbody.innerHTML = '';
  empleados.forEach(emp => {
    const color = emp.saldoActual < 5 ? 'danger' : emp.saldoActual <= 10 ? 'warning' : 'success';
    tbody.innerHTML += `
      <tr>
        <td>${emp.rut}</td>
        <td>${emp.nombre_completo}</td>
        <td>${emp.cargo}</td>
        <td class="fw-bold text-${color}">${emp.saldoActual}</td>
        <td>
          <a href="empleado.html?id=${emp.id}" class="btn btn-sm btn-info">Ver Detalle</a>
          <button class="btn btn-sm btn-warning btn-edit" data-id="${emp.id}" data-rut="${emp.rut}" data-nombre="${emp.nombre_completo}" data-cargo="${emp.cargo}" data-cumple10="${emp.cumple_10_anos_base}" data-anosext="${emp.anos_externos || 0}" data-mesesext="${emp.meses_externos || 0}">Editar</button>
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
