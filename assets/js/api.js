const getBaseUrl = () => {
  if (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') {
    // If running on Live Server (port 5500 or similar), point to backend port 3000
    if (window.location.port !== '3000') {
      return 'http://127.0.0.1:3000';
    }
  }
  return '';
};

const BASE_URL = getBaseUrl();
const API_URL = `${BASE_URL}/api`;
const AUTH_URL = `${BASE_URL}/auth`;

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
