const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/db'); // Assuming db is here

const router = express.Router();

router.post(
  '/login',
  [
    body('usuario').notEmpty().withMessage('El usuario es requerido'),
    body('contraseña').notEmpty().withMessage('La contraseña es requerida')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { usuario, contraseña } = req.body;

    try {
      const [rows] = await db.query('SELECT * FROM usuarios WHERE usuario = ?', [usuario]);
      const user = rows[0];

      if (!user) {
        // Generic response
        return res.status(401).json({ message: 'Usuario o contraseña inválidos' });
      }

      const isMatch = await bcrypt.compare(contraseña, user.password_hash);
      
      if (!isMatch) {
        // Log failed attempt if needed, for now just reject
        return res.status(401).json({ message: 'Usuario o contraseña inválidos' });
      }

      // Update last login
      await db.query('UPDATE usuarios SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

      const token = jwt.sign(
        { userId: user.id, usuario: user.usuario },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({ token, message: 'Login exitoso' });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }
);

module.exports = router;
