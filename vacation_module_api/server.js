require('dotenv').config();
const express = require('express');
const cors = require('cors');
if (process.env.NODE_ENV !== 'test') {
  require('./cron/syncFeriados'); // Inicializar cron job
}

const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();

// Seguridad HTTP headers con Helmet
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

app.use(cors({ origin: '*' }));
app.use(express.json());

// Servir archivos estáticos del frontend (desde la raíz del proyecto)
app.use(express.static(path.join(__dirname, '../')));

// Rate limiting para prevenir fuerza bruta en el login
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Limita cada IP a 5 peticiones por ventana
  message: { message: 'Demasiados intentos de inicio de sesión, por favor intente de nuevo en 15 minutos.' }
});

app.use('/auth', authLimiter, require('./routes/auth'));

// Middleware JWT
const jwt = require('jsonwebtoken');
const verifyToken = (req, res, next) => {
  let token = null;
  const authHeader = req.headers['authorization'];
  
  if (authHeader) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }
  
  if (!token) return res.status(403).send({ message: 'Acceso denegado.' });
  
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
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor iniciado en puerto ${PORT}`);
  });
}

module.exports = app;
