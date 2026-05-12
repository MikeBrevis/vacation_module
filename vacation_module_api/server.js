require('dotenv').config();
const express = require('express');
const cors = require('cors');
require('./cron/syncFeriados'); // Inicializar cron job

const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

// Servir archivos estáticos del frontend (desde la raíz del proyecto)
app.use(express.static(path.join(__dirname, '../')));

// Rate limiting for auth (Desactivado temporalmente)
// const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 5, // Limit each IP to 5 requests per windowMs
//   message: { message: 'Demasiados intentos de inicio de sesión, por favor intente de nuevo en 15 minutos.' }
// });

app.use('/auth', /* authLimiter, */ require('./routes/auth'));

// Middleware JWT
const jwt = require('jsonwebtoken');
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(403).send({ message: 'Acceso denegado.' });
  
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).send({ message: 'Token inválido o expirado.' });
    req.userId = decoded.userId;
    next();
  });
};

app.use('/api/empleados', verifyToken, require('./routes/empleados'));
app.use('/api/solicitudes', verifyToken, require('./routes/solicitudes'));
app.use('/api/feriados', verifyToken, require('./routes/feriados'));


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor iniciado en puerto ${PORT}`);
});
