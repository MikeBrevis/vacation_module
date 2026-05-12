const API_URL = 'http://localhost:3000/api';
const AUTH_URL = 'http://localhost:3000/auth';

// Verificación de sesión en páginas protegidas
if (!window.location.pathname.endsWith('login.html')) {
  if (!localStorage.getItem('token')) {
    window.location.href = 'login.html';
  }
}

async function request(url, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    headers,
    ...options
  });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('token');
      window.location.href = 'login.html';
    }
    const err = await res.json().catch(() => ({ mensaje: 'Error desconocido' }));
    const error = new Error(err.mensaje || `HTTP ${res.status}`);
    error.status = res.status;
    error.data = err;
    throw error;
  }
  return res.json();
}

const api = {
  getEmpleados:        ()       => request(`${API_URL}/empleados`),
  crearEmpleado:       (datos)  => request(`${API_URL}/empleados`, { method: 'POST', body: JSON.stringify(datos) }),
  actualizarEmpleado:  (id, d)  => request(`${API_URL}/empleados/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  eliminarEmpleado:    (id, force) => request(`${API_URL}/empleados/${id}${force ? '?force=true' : ''}`, { method: 'DELETE' }),
  getEmpleadoDetalle:  (id)     => request(`${API_URL}/empleados/${id}`),
  registrarSolicitud:  (datos)  => request(`${API_URL}/solicitudes`, { method: 'POST', body: JSON.stringify(datos) }),
  registrarHistorico:  (datos)  => request(`${API_URL}/solicitudes/historico`, { method: 'POST', body: JSON.stringify(datos) }),
  anularSolicitud:     (id)     => request(`${API_URL}/solicitudes/${id}`, { method: 'DELETE' }),
  sincronizarFeriados: ()       => request(`${API_URL}/feriados/sincronizar`, { method: 'POST' }),
  getFeriados:         ()       => request(`${API_URL}/feriados`),
};
