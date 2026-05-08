require('dotenv').config();
const express = require('express');
const cors = require('cors');
require('./cron/syncFeriados'); // Inicializar cron job

const path = require('path');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, 'public')));

// Servir archivos estáticos del frontend (desde la raíz del proyecto)
app.use(express.static(path.join(__dirname, '../')));

app.use('/api/empleados', require('./routes/empleados'));
app.use('/api/solicitudes', require('./routes/solicitudes'));
app.use('/api/feriados', require('./routes/feriados'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor iniciado en puerto ${PORT}`);
});
