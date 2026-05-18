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

// Seguridad HTTP headers con Helmet (Dinámico: Estricto en Prod, Relajado en Dev)
if (process.env.NODE_ENV === 'production') {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        fontSrc: ["'self'", "data:", "https://cdn.jsdelivr.net"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"] // En producción solo se conecta a su propio origen
      }
    }
  }));
  console.log('🛡️  Seguridad: Helmet activado en modo ESTRICTO (Producción)');
} else {
  app.use(helmet({
    contentSecurityPolicy: false,      // Desactivado localmente para no interferir con Live Server
    crossOriginResourcePolicy: false,   // Permite peticiones de origen cruzado en desarrollo
    crossOriginOpenerPolicy: false
  }));
  console.log('⚠️  Seguridad: Helmet activado en modo RELAJADO (Desarrollo)');
}

// CORS Dinámico: Permitir todo en Desarrollo para no interferir con Live Server de diferentes puertos (5500, 5502, etc.), restringir en Producción
const allowedOrigin = process.env.NODE_ENV === 'production' ? (process.env.FRONTEND_ORIGIN || '*') : '*';
app.use(cors({ origin: allowedOrigin }));
app.use(express.json());

// Servir archivos estáticos de forma segura
if (process.env.NODE_ENV === 'production') {
  app.use('/assets', express.static(path.join(__dirname, '../assets')));
  app.use('/img', express.static(path.join(__dirname, '../img')));
  
  app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../index.html')));
  app.get('/index.html', (req, res) => res.sendFile(path.join(__dirname, '../index.html')));
  app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, '../login.html')));
  app.get('/empleado.html', (req, res) => res.sendFile(path.join(__dirname, '../empleado.html')));
  
  // Servir logo si existe
  app.get('/logo.png', (req, res) => {
    res.sendFile(path.join(__dirname, '../logo.png'));
  });
  console.log('🛡️  Estáticos: Modo de producción seguro activado');
} else {
  // En desarrollo local, permitir acceso general a la raíz para facilitar live reloading
  app.use(express.static(path.join(__dirname, '../')));
  console.log('⚠️  Estáticos: Modo de desarrollo local activo (raíz compartida)');
}

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
