# 02. Plan de Implementación: Setup del Backend (Fase 3.1, 3.2, 3.4, 3.5)

## Dependencias Previas
- `01_database.md` (Base de datos y tablas ya creadas localmente).

## Dependencias a Instalar (npm)

```bash
npm init -y
npm install express mysql2 axios dotenv cors node-cron pdfkit
```

## Estructura de Carpetas a Crear

```text
vacation_module_api/
├── server.js
├── .env
├── .env.example
├── config/
│   └── db.js
├── models/
│   ├── empleadoModel.js
│   ├── feriadoModel.js
│   └── solicitudModel.js
├── services/
│   ├── vacacionesService.js
│   └── feriadosSync.js
├── controllers/
│   ├── empleadoController.js
│   ├── solicitudController.js
│   └── feriadoController.js
├── routes/
│   ├── empleados.js
│   ├── solicitudes.js
│   └── feriados.js
├── public/
│   └── comprobantes/
└── cron/
    └── syncFeriados.js
```

## Archivos a Generar

### `.env.example`
```env
PORT=3000
DB_HOST=127.0.0.1
DB_USER=root
DB_PASS=
DB_NAME=vacation_db
FRONTEND_ORIGIN=http://127.0.0.1:5500
```

### `server.js`
```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
require('./cron/syncFeriados'); // Inicializar cron job

const app = express();

app.use(cors({ origin: process.env.FRONTEND_ORIGIN }));
app.use(express.json());
app.use('/public', express.static('public'));

app.use('/api/empleados', require('./routes/empleados'));
app.use('/api/solicitudes', require('./routes/solicitudes'));
app.use('/api/feriados', require('./routes/feriados'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor iniciado en puerto ${PORT}`);
});
```

### `config/db.js`
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

### `models/feriadoModel.js`
```javascript
const pool = require('../config/db');

async function upsert(fecha, descripcion) {
  await pool.query(
    'INSERT INTO feriados (fecha, descripcion) VALUES (?, ?) ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion)',
    [fecha, descripcion]
  );
}

module.exports = { upsert };
```

*(Crear `empleadoModel.js` y `solicitudModel.js` vacíos por ahora).*

### `services/feriadosSync.js`
```javascript
const axios = require('axios');
const feriadoModel = require('../models/feriadoModel');

async function sincronizarFeriados() {
  const { data } = await axios.get('https://feriados-cl.netlify.app/');
  for (const feriado of data) {
    await feriadoModel.upsert(feriado.fecha, feriado.nombre);
  }
  return { sincronizados: data.length };
}

module.exports = { sincronizarFeriados };
```

### `cron/syncFeriados.js`
```javascript
const cron = require('node-cron');
const { sincronizarFeriados } = require('../services/feriadosSync');

cron.schedule('0 3 2 1 *', async () => {
  try {
    await sincronizarFeriados();
    console.log(`[CRON] Feriados sincronizados: ${new Date().toISOString()}`);
  } catch (error) {
    console.error(`[CRON] Error: ${error.message}`);
  }
});

module.exports = cron;
```

### `routes/feriados.js` (Ruta Básica para sincronización)
```javascript
const express = require('express');
const router = express.Router();
const { sincronizarFeriados } = require('../services/feriadosSync');

router.post('/sincronizar', async (req, res) => {
  try {
    const resultado = await sincronizarFeriados();
    res.json({ mensaje: 'Feriados sincronizados', ...resultado });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
});

module.exports = router;
```

## Criterio de Éxito
- Servidor levanta en puerto 3000 sin errores.
- `POST /api/feriados/sincronizar` puebla la tabla local correctamente.
