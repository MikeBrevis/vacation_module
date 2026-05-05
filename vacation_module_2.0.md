# Especificaciones del Proyecto: Módulo de Vacaciones — AndeCorp

**Subdominio:** `tools.andecorp.cl`
**Stack:** Vanilla JS + Bootstrap / Node.js + Express / MySQL o MariaDB

---

## Fase 1 — Definición de Alcance y Reglas de Negocio

### 1.1 Fórmula de Saldo de Vacaciones

El saldo se calcula en tiempo real con la siguiente fórmula:

```
Saldo = (Meses trabajados × 1.25) + días_progresivos_base + Días progresivos generados − Días utilizados
```

**Ingreso manual por trabajador:** Nombre completo, cargo, RUT y fecha de ingreso.

### 1.2 Días Progresivos (Normativa Chilena)

- El trabajador gana **1 día adicional por cada 3 años de antigüedad** en la empresa actual, pero **solo si acumula 10 años de cotizaciones previas** (en cualquier empleador).
- Como el sistema no se conecta a las AFP, el administrador ingresará manualmente:
  - `cumple_10_anos_base` (boolean): si el trabajador ya cumple los 10 años de cotizaciones al momento del registro.
  - `dias_progresivos_base` (int): días progresivos ya reconocidos externamente antes del ingreso a la empresa.
- El sistema calculará automáticamente los días progresivos generados desde la `fecha_ingreso`.

> **Optimización:** Separar claramente los días progresivos "externos" (base, ingresados manualmente) de los "internos" (calculados por el sistema) evita errores de doble conteo y facilita auditorías.

### 1.3 Feriados Legales y Días Hábiles

- Se utilizará la API pública: `https://feriados-cl.netlify.app/`
- Los feriados se almacenan en una **tabla caché local** (`feriados`).
- La sincronización se ejecuta **una vez al año** mediante un proceso programado (cron), o **bajo demanda** por el administrador.
- Todos los cálculos de días hábiles consultarán exclusivamente la tabla local.

> **Optimización:** Usar `INSERT INTO feriados ... ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion)` (UPSERT) en lugar de `INSERT IGNORE`, para mantener descripciones actualizadas si la API las modifica en el futuro.

---

## Fase 2 — Modelado de Base de Datos

### Tabla 1: `empleados`

| Campo | Tipo | Restricciones |
|---|---|---|
| `id` | INT | PK, AUTO_INCREMENT |
| `rut` | VARCHAR(12) | UNIQUE, NOT NULL |
| `nombre_completo` | VARCHAR(150) | NOT NULL |
| `cargo` | VARCHAR(100) | NOT NULL |
| `fecha_ingreso` | DATE | NOT NULL |
| `cumple_10_anos_base` | TINYINT(1) | DEFAULT 0 |
| `dias_progresivos_base` | INT | DEFAULT 0 |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

> **Optimización añadida:** Campo `created_at` para trazabilidad de registros.

### Tabla 2: `feriados` (Caché de API)

| Campo | Tipo | Restricciones |
|---|---|---|
| `fecha` | DATE | PK |
| `descripcion` | VARCHAR(100) | NOT NULL |

### Tabla 3: `solicitudes_vacaciones`

| Campo | Tipo | Restricciones |
|---|---|---|
| `id` | INT | PK, AUTO_INCREMENT |
| `empleado_id` | INT | FK → empleados.id |
| `fecha_inicio` | DATE | NOT NULL |
| `fecha_fin` | DATE | NOT NULL |
| `dias_habiles_consumidos` | INT | NOT NULL |
| `fecha_solicitud` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| `ruta_comprobante` | VARCHAR(255) | NULL |

> **Optimización:** Agregar `INDEX (empleado_id)` explícito en `solicitudes_vacaciones` para acelerar la consulta de historial y el cálculo de días consumidos por empleado.

### Script de índices recomendados

```sql
ALTER TABLE solicitudes_vacaciones ADD INDEX idx_empleado (empleado_id);
ALTER TABLE empleados ADD INDEX idx_rut (rut);
```

---

## Fase 3 — Desarrollo del Backend

### 3.1 Estructura de Archivos del Backend

```
vacation_module_api/
├── server.js
├── .env
├── config/
│   └── db.js               ← Pool de conexiones MySQL
├── models/
│   ├── empleadoModel.js
│   ├── feriadoModel.js
│   └── solicitudModel.js
├── services/
│   ├── vacacionesService.js ← Algoritmos de negocio
│   └── feriadosSync.js     ← Sincronización con API externa
├── controllers/
│   ├── empleadoController.js
│   ├── solicitudController.js
│   └── feriadoController.js
├── routes/
│   ├── empleados.js
│   ├── solicitudes.js
│   └── feriados.js
├── public/
│   └── comprobantes/       ← PDFs generados
└── cron/
    └── syncFeriados.js     ← Tarea programada anual
```

> **Optimización:** Separar `services/` de `controllers/` permite testear la lógica de negocio de forma completamente independiente de Express, y facilita la reutilización de algoritmos entre endpoints.

### 3.2 Configuración del Servidor (`server.js`)

```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({ origin: process.env.FRONTEND_ORIGIN }));
app.use(express.json());
app.use('/public', express.static('public'));

app.use('/api/empleados', require('./routes/empleados'));
app.use('/api/solicitudes', require('./routes/solicitudes'));
app.use('/api/feriados', require('./routes/feriados'));

app.listen(process.env.PORT || 3000);
```

> **Optimización:** Usar variables de entorno (`.env`) para `PORT`, `DB_*`, y `FRONTEND_ORIGIN` en lugar de valores hardcodeados. El CORS debe restringirse al dominio del frontend, no abrirse con `*`.

### 3.3 Pool de Conexiones (`config/db.js`)

```javascript
const mysql = require('mysql2/promise');
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
module.exports = pool;
```

> **Optimización:** Usar `mysql2/promise` (API de promesas nativa) en lugar de callbacks, lo que permite usar `async/await` de forma limpia en todos los modelos y servicios.

### 3.4 Módulo de Sincronización de Feriados (`services/feriadosSync.js`)

```javascript
const axios = require('axios');
const feriadoModel = require('../models/feriadoModel');

async function sincronizarFeriados() {
  const { data } = await axios.get('https://feriados-cl.netlify.app/');
  // La API retorna un array de objetos { fecha, nombre }
  for (const feriado of data) {
    await feriadoModel.upsert(feriado.fecha, feriado.nombre);
  }
  return { sincronizados: data.length };
}
module.exports = { sincronizarFeriados };
```

> **Optimización:** Usar `axios` en lugar de `fetch` nativo para mejor manejo de errores y compatibilidad. Usar UPSERT garantiza idempotencia: ejecutar la sincronización múltiples veces no genera duplicados ni registros obsoletos.

### 3.5 Tarea Programada (`cron/syncFeriados.js`)

```javascript
const cron = require('node-cron');
const { sincronizarFeriados } = require('../services/feriadosSync');

// Ejecutar el 2 de enero a las 03:00 AM cada año
cron.schedule('0 3 2 1 *', async () => {
  await sincronizarFeriados();
  console.log(`[CRON] Feriados sincronizados: ${new Date().toISOString()}`);
});
```

> **Optimización añadida:** Programar la sincronización automática anual con `node-cron` elimina la dependencia de que el administrador lo ejecute manualmente, sin bloquear el servidor.

### 3.6 Algoritmos de Negocio (`services/vacacionesService.js`)

#### Algoritmo 1: Días Hábiles Consumidos

```javascript
const pool = require('../config/db');

async function calcularDiasHabiles(fechaInicio, fechaFin) {
  const [feriados] = await pool.query(
    'SELECT fecha FROM feriados WHERE fecha BETWEEN ? AND ?',
    [fechaInicio, fechaFin]
  );
  const feriadosSet = new Set(feriados.map(f => f.fecha.toISOString().split('T')[0]));

  let dias = 0;
  const current = new Date(fechaInicio);
  const fin = new Date(fechaFin);

  while (current <= fin) {
    const dow = current.getDay();
    const iso = current.toISOString().split('T')[0];
    if (dow !== 0 && dow !== 6 && !feriadosSet.has(iso)) dias++;
    current.setDate(current.getDate() + 1);
  }
  return dias;
}
```

> **Optimización:** Cargar todos los feriados del rango en una sola consulta SQL y almacenarlos en un `Set` para lookups O(1), en lugar de hacer una consulta por día.

#### Algoritmo 2: Saldo en Tiempo Real

```javascript
async function calcularSaldo(empleadoId) {
  const [[empleado]] = await pool.query('SELECT * FROM empleados WHERE id = ?', [empleadoId]);
  const [[{ total_consumido }]] = await pool.query(
    'SELECT COALESCE(SUM(dias_habiles_consumidos), 0) AS total_consumido FROM solicitudes_vacaciones WHERE empleado_id = ?',
    [empleadoId]
  );

  const hoy = new Date();
  const ingreso = new Date(empleado.fecha_ingreso);

  // Meses exactos desde el ingreso
  const meses = (hoy.getFullYear() - ingreso.getFullYear()) * 12 + (hoy.getMonth() - ingreso.getMonth());

  // Días progresivos generados en la empresa actual
  let progresivosEmpresa = 0;
  if (empleado.cumple_10_anos_base) {
    const anosEnEmpresa = Math.floor(meses / 12);
    progresivosEmpresa = Math.floor(anosEnEmpresa / 3);
  }

  const diasLegalesAcumulados = parseFloat((meses * 1.25).toFixed(4));
  const diasProgresivosTotal = empleado.dias_progresivos_base + progresivosEmpresa;
  const saldoActual = parseFloat((diasLegalesAcumulados + diasProgresivosTotal - total_consumido).toFixed(2));

  return {
    diasLegalesAcumulados,
    diasProgresivosBase: empleado.dias_progresivos_base,
    progresivosEmpresa,
    diasProgresivosTotal,
    diasConsumidos: total_consumido,
    saldoActual
  };
}
```

> **Optimización:** Retornar todos los componentes del saldo (no solo el total) permite que el frontend muestre los 4 indicadores del panel de saldos directamente desde una sola llamada al backend.

### 3.7 API REST — Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/empleados` | Lista todos los empleados |
| POST | `/api/empleados` | Crea un nuevo empleado |
| PUT | `/api/empleados/:id` | Edita datos de un empleado |
| DELETE | `/api/empleados/:id` | Elimina un empleado (con validación: no eliminar si tiene solicitudes) |
| GET | `/api/empleados/:id` | Detalle + saldo en tiempo real + historial |
| POST | `/api/solicitudes` | Registra una solicitud, valida saldo, genera PDF |
| DELETE | `/api/solicitudes/:id` | Anula una solicitud (libera días consumidos) |
| POST | `/api/feriados/sincronizar` | Dispara sincronización manual con la API |

> **Optimizaciones añadidas:**
> - `PUT /api/empleados/:id` para corregir datos ingresados erróneamente.
> - `DELETE /api/empleados/:id` con validación de integridad referencial.
> - `DELETE /api/solicitudes/:id` para anular solicitudes incorrectas y revertir los días descontados.

### 3.8 Validación de Solicitudes (en `POST /api/solicitudes`)

Antes de insertar, el controlador debe:

1. Verificar que `fecha_inicio <= fecha_fin`.
2. Verificar que `fecha_inicio >= fecha actual` (no se pueden registrar vacaciones en el pasado retroactivamente sin un flag especial).
3. Calcular `dias_habiles_consumidos` con el algoritmo de días hábiles.
4. Calcular el `saldoActual` del empleado.
5. Validar que `dias_habiles_consumidos <= saldoActual`. Si no, devolver HTTP 422 con mensaje descriptivo.
6. Si todo es válido: insertar en `solicitudes_vacaciones`, generar el PDF y actualizar `ruta_comprobante`.

> **Optimización:** Centralizar estas validaciones en el servicio (no en el controlador) garantiza que se apliquen igualmente si en el futuro se agrega una ruta de importación masiva.

### 3.9 Generación de Comprobantes PDF

- Librería recomendada: **`pdfkit`**
- El archivo se nombra con un patrón determinístico: `comprobante_{empleado_id}_{solicitud_id}.pdf`
- Se guarda en: `/public/comprobantes/`
- Se actualiza `ruta_comprobante` en la base de datos con la ruta relativa: `/public/comprobantes/comprobante_X_Y.pdf`

> **Optimización:** Usar un nombre determinístico basado en IDs (en lugar de timestamps o UUIDs) permite regenerar el comprobante fácilmente si se extravía, consultando el registro en la base de datos.

El comprobante debe incluir:
- Logo y nombre de la empresa.
- Datos del trabajador (nombre, RUT, cargo).
- Fecha de solicitud, fecha inicio y fecha fin.
- Días hábiles consumidos.
- Saldo anterior y saldo resultante.
- Espacio para firma del trabajador y del administrador.

---

## Fase 4 — Desarrollo del Frontend

### 4.1 Jerarquía de Archivos

```
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

### 4.2 Módulo de Comunicación (`assets/js/api.js`)

```javascript
const API_URL = 'http://localhost:3000/api'; // Cambiar a producción en Fase 5

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

> **Optimización:** Un wrapper `request()` centraliza el manejo de errores HTTP para todos los endpoints. Exponer el objeto `api` como módulo evita funciones sueltas y facilita el mantenimiento.

### 4.3 Vista Principal (`index.html` + `main.js`)

**Interfaz (Bootstrap):**

- Barra superior con título del sistema y campo `<input>` de búsqueda en tiempo real.
- Botón "Nuevo Empleado" que activa el modal `#modalNuevoEmpleado`.
- Botón "Sincronizar Feriados" con confirmación antes de ejecutar.
- Tabla con columnas: RUT, Nombre, Cargo, Saldo Disponible, Acciones.
- Columna "Acciones": botón Ver Detalle + botón Eliminar (con confirmación).

> **Optimización:** Mostrar el **Saldo Disponible** directamente en la tabla principal permite al administrador identificar trabajadores con saldo crítico sin necesidad de entrar al detalle de cada uno.

**Modal de Registro:**

- Campos: RUT, Nombre Completo, Cargo, Fecha de Ingreso.
- Checkbox: "¿Cumple 10 años de cotizaciones base?"
- Input numérico: "Días progresivos base reconocidos" (visible y habilitado solo si el checkbox está marcado).

> **Optimización:** Ocultar/deshabilitar el campo de días progresivos base cuando el checkbox no está marcado reduce errores de ingreso y hace la interfaz más intuitiva.

**Lógica (`main.js`):**

```javascript
// Carga inicial
document.addEventListener('DOMContentLoaded', cargarTabla);

async function cargarTabla() {
  const empleados = await api.getEmpleados();
  renderTabla(empleados);
}

// Búsqueda local (sin nuevas peticiones al backend)
document.getElementById('busqueda').addEventListener('input', e => {
  const q = e.target.value.toLowerCase();
  document.querySelectorAll('#tablaEmpleados tbody tr').forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
});
```

### 4.4 Vista de Detalle (`empleado.html` + `empleado.js`)

**Interfaz (Bootstrap):**

- Botón de retroceso a `index.html`.
- Card de identificación: Nombre, RUT, Cargo.
- 4 indicadores numéricos destacados:
  1. Días Legales Acumulados
  2. Días Progresivos Totales
  3. Días Consumidos
  4. **Saldo Actual Disponible** (destacado con color verde/amarillo/rojo según umbral)
- Formulario de solicitud: campos `date` para Fecha Inicio y Fecha Fin + botón "Procesar Solicitud".
- Tabla de historial: Fecha solicitud, Período (inicio → fin), Días descontados, Comprobante PDF, Acción Anular.

> **Optimización:** Colorizar el saldo según umbrales (ej. verde > 10 días, amarillo 5–10, rojo < 5) da retroalimentación visual inmediata al administrador.

**Lógica (`empleado.js`):**

```javascript
const params = new URLSearchParams(window.location.search);
const id = params.get('id');
if (!id) window.location.href = 'index.html';

document.addEventListener('DOMContentLoaded', async () => {
  const datos = await api.getEmpleadoDetalle(id);
  renderPanelIdentificacion(datos.empleado);
  renderPanelSaldos(datos.saldo);
  renderHistorial(datos.solicitudes);
});

document.getElementById('formSolicitud').addEventListener('submit', async e => {
  e.preventDefault();
  const fechaInicio = document.getElementById('fechaInicio').value;
  const fechaFin = document.getElementById('fechaFin').value;
  try {
    await api.registrarSolicitud({ empleado_id: id, fecha_inicio: fechaInicio, fecha_fin: fechaFin });
    window.location.reload();
  } catch (err) {
    mostrarAlerta('error', err.message); // Bootstrap alert, no alert()
  }
});
```

> **Optimización:** Usar alertas de Bootstrap en lugar de `alert()` nativo mejora la experiencia de usuario y permite mensajes descriptivos (ej. "Saldo insuficiente: tienes 3.75 días disponibles y estás solicitando 5").

---

## Fase 5 — Despliegue en cPanel (`tools.andecorp.cl`)

Esta fase se ejecuta una vez completadas las pruebas locales.

**Checklist de despliegue:**

- [ ] Crear subdominio `tools.andecorp.cl` en cPanel apuntando a la carpeta del frontend.
- [ ] Crear base de datos MySQL en cPanel y ejecutar el script DDL de creación de tablas.
- [ ] Subir el backend Node.js y configurar el archivo `.env` de producción.
- [ ] Levantar el proceso Node.js con **PM2** (`pm2 start server.js --name vacation-api`) para que el proceso persista y se reinicie automáticamente.
- [ ] Configurar un **proxy inverso** (Apache `.htaccess` o cPanel Node.js App) para que las peticiones a `tools.andecorp.cl/api/*` se redirijan al puerto de Node.js.
- [ ] Actualizar `API_URL` en `assets/js/api.js` al dominio de producción.
- [ ] Verificar que la carpeta `/public/comprobantes/` tiene permisos de escritura para el proceso Node.js.
- [ ] Ejecutar manualmente la sincronización de feriados desde la interfaz para poblar la tabla caché.

> **Optimización añadida:** El uso de **PM2** es fundamental en producción para garantizar que el servidor Node.js se reinicie automáticamente tras un fallo o un reinicio del servidor, sin intervención manual.

---

## Resumen de Optimizaciones Introducidas

| Área | Optimización |
|---|---|
| Base de Datos | UPSERT en feriados en lugar de INSERT IGNORE |
| Base de Datos | Índices explícitos en `empleado_id` y `rut` |
| Base de Datos | Campo `created_at` en empleados para trazabilidad |
| Backend | Separación de capa `services/` para lógica de negocio aislada |
| Backend | `mysql2/promise` con async/await en todo el proyecto |
| Backend | Variables de entorno `.env` para configuración segura |
| Backend | CORS restringido al dominio del frontend |
| Backend | Cron automático anual para sincronización de feriados |
| Backend | Carga de feriados en Set para cálculo O(1) por día |
| Backend | Endpoints adicionales: PUT empleado, DELETE empleado, DELETE solicitud |
| Backend | Nombre determinístico de PDFs basado en IDs |
| Frontend | Wrapper `request()` centraliza manejo de errores HTTP |
| Frontend | Saldo visible en tabla principal (sin entrar al detalle) |
| Frontend | Campo "días progresivos base" condicional al checkbox |
| Frontend | Colores semáforo en indicador de saldo disponible |
| Frontend | Alertas Bootstrap en lugar de `alert()` nativo |
| Despliegue | PM2 para persistencia y auto-reinicio del proceso Node.js |
