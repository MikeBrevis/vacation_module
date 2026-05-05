# 05. Plan de Implementación: Frontend (Fase 4)

## Dependencias Previas
- API backend documentada en `04_backend_api.md` debe estar corriendo localmente en el puerto 3000.

## Archivos a Crear

```text
AndecorpWeb/vacation_module/
├── index.html
├── empleado.html
└── assets/
    ├── css/
    │   └── style.css
    └── js/
        ├── api.js
        ├── main.js
        └── empleado.js
```

## 1. `assets/js/api.js`
```javascript
const API_URL = 'http://localhost:3000/api';

async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ mensaje: 'Error desconocido' }));
    throw new Error(err.mensaje || `HTTP ${res.status}`);
  }
  return res.json();
}

const api = {
  getEmpleados:        ()       => request(`${API_URL}/empleados`),
  crearEmpleado:       (datos)  => request(`${API_URL}/empleados`, { method: 'POST', body: JSON.stringify(datos) }),
  actualizarEmpleado:  (id, d)  => request(`${API_URL}/empleados/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  eliminarEmpleado:    (id)     => request(`${API_URL}/empleados/${id}`, { method: 'DELETE' }),
  getEmpleadoDetalle:  (id)     => request(`${API_URL}/empleados/${id}`),
  registrarSolicitud:  (datos)  => request(`${API_URL}/solicitudes`, { method: 'POST', body: JSON.stringify(datos) }),
  anularSolicitud:     (id)     => request(`${API_URL}/solicitudes/${id}`, { method: 'DELETE' }),
  sincronizarFeriados: ()       => request(`${API_URL}/feriados/sincronizar`, { method: 'POST' }),
};
```

## 2. `assets/js/main.js`
```javascript
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
          <button class="btn btn-sm btn-danger btn-delete" data-id="${emp.id}">Eliminar</button>
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

document.getElementById('cumple10').addEventListener('change', e => {
  const inputDias = document.getElementById('diasProgresivos');
  inputDias.disabled = !e.target.checked;
  if (!e.target.checked) inputDias.value = 0;
});

// modal nuevo empleado
document.getElementById('formNuevoEmpleado').addEventListener('submit', async e => {
  e.preventDefault();
  const data = {
    rut: document.getElementById('rut').value,
    nombre_completo: document.getElementById('nombre').value,
    cargo: document.getElementById('cargo').value,
    fecha_ingreso: document.getElementById('fechaIngreso').value,
    cumple_10_anos_base: document.getElementById('cumple10').checked,
    dias_progresivos_base: parseInt(document.getElementById('diasProgresivos').value || 0)
  };
  try {
    await api.crearEmpleado(data);
    bootstrap.Modal.getInstance(document.getElementById('modalNuevoEmpleado')).hide();
    e.target.reset();
    cargarTabla();
  } catch (err) { alert(err.message); }
});
```

## 3. `assets/js/empleado.js`
```javascript
const params = new URLSearchParams(window.location.search);
const id = params.get('id');
if (!id) window.location.href = 'index.html';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const datos = await api.getEmpleadoDetalle(id);
    renderPanelSaldos(datos.saldo);
    renderHistorial(datos.solicitudes);
  } catch(err) { alert(err.message); }
});

function renderPanelSaldos(saldo) {
  const color = saldo.saldoActual < 5 ? 'danger' : saldo.saldoActual <= 10 ? 'warning' : 'success';
  document.getElementById('saldoActual').textContent = saldo.saldoActual;
  document.getElementById('saldoActual').className = `text-${color} fw-bold display-4`;
  // (Inyectar el resto de indicadores: legales, progresivos, consumidos...)
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
```

## `index.html`, `empleado.html`, `style.css`
Incluyen la estructura de Bootstrap, modal de registro con campo de días progresivos que se habilita solo si está chequeada la casilla, campos visuales de tarjetas, colores según rangos de saldo.

## Criterio de Éxito
- Flujo completo funcionando: crear empleado → ver detalle → registrar solicitud → descargar PDF.
- Los paneles de saldo respetan colores (verde >10, amarillo 5-10, rojo <5).
