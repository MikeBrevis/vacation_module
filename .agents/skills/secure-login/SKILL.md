---
name: secure-login
description: Úsala cuando el usuario necesite implementar autenticación segura en su proyecto. Cubre creación de tabla usuarios en MySQL, pantalla de login en HTML usando los lineamientos de ande_design, y autenticación con tokens JWT en el backend.
---

# Skill: Secure Login & Authentication

## When to use this skill

Use this skill when you need to implement or modify authentication features, including:
- Creating or updating the `usuarios` table in MySQL.
- Designing or implementing a login screen in HTML/CSS following `ande_design`.
- Setting up JWT (JSON Web Token) authentication in the backend.
- Securing routes with middleware.

## Agent Instructions

### 1. Database — MySQL `usuarios` Table
- **Schema Requirements:**
  - `id`: `INT AUTO_INCREMENT PRIMARY KEY`
  - `usuario`: `VARCHAR(255) UNIQUE NOT NULL`
  - `password_hash`: `CHAR(60) NOT NULL` (Storage for bcrypt hash)
  - `created_at`: `TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
  - `last_login`: `TIMESTAMP NULL DEFAULT NULL`
- **Security Rule:** Never store passwords in plain text. Always use bcrypt with salt rounds ≥ 10.
- **Example Insert:**
  ```sql
  -- Example: User 'sandra' with password 'ande159*' hashed with bcrypt
  INSERT INTO usuarios (usuario, password_hash) 
  VALUES ('sandra', '$2b$10$YourHashedPasswordFor_ande159*');
  ```

### 2. Frontend — `login.html` (Andecorp Design)
- **Design Reference:** You MUST read `.agents\skills\ande_design\SKILL.md` before generating any UI.
- **Form Requirements:**
  - Fields: `usuario` (type="text"), `contraseña` (type="password").
  - Submit Button: Use `.myButton` class and Andecorp yellow (`--yellow`).
  - CSS: All custom styles must go into `css/layout/` and be imported in `main.css`.
- **Interaction & Session Persistence:**
  - Use `fetch` to POST to `/auth/login`.
  - **Maintain Session:** To keep the user logged in on the computer, save the token to `localStorage.setItem('token', data.token)`.
  - **On Page Load:** Every protected page must check for the presence of the token. If missing or invalid, redirect to `login.html`.
- **Response Handling:**
  - Success: Redirect to dashboard.
  - Error: **MANDATORY** Show a generic message like "Usuario o contraseña inválidos" regardless of whether the user exists or the password was wrong.

### 3. Backend — JWT Authentication & Security
- **Endpoint:** `POST /auth/login`
- **Rate Limiting:** Implement `express-rate-limit` to block IPs after 5 failed attempts in 15 minutes.
- **Input Validation:** Use a library like `express-validator` to ensure `usuario` and `contraseña` meet minimum length and format requirements before processing.
- **CORS Policy:** Restrict `origin` to the application's domain to prevent unauthorized cross-site requests.
- **Validation Logic:**
  1. Fetch user by `usuario` from MySQL using parameterized queries.
  2. Compare incoming `contraseña` with `password_hash` using `bcrypt.compare()`.
  3. If matched, generate a JWT.
- **JWT Payload:** `{ "userId": user.id, "usuario": user.usuario }`
- **JWT Config:** Expiration `24h` (or longer if persistence is prioritized), signed with `process.env.JWT_SECRET`.
- **Security Logging:** Log failed attempts (IP, timestamp, username) for auditing. **NEVER** log the password.
- **Middleware:** Create a `verifyToken` function:
  ```javascript
  const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).send({ message: 'Acceso denegado.' });
    jwt.verify(token.split(' ')[1], process.env.JWT_SECRET, (err, decoded) => {
      if (err) return res.status(401).send({ message: 'Token inválido o expirado.' });
      req.userId = decoded.userId;
      next();
    });
  };
  ```

## Security Considerations

1. **Bcrypt:** Minimum 10 salt rounds.
2. **Generic Responses:** Prevent user enumeration by never revealing if a username exists.
3. **Brute Force:** Rate limiting is mandatory for any public-facing login.
4. **CORS:** Always whitelist only trusted domains.
5. **Environment Variables:** `JWT_SECRET` must stay in `.env`.
6. **SQL Injection:** Always use parameterized queries.
7. **HTTPS:** Mandatory for production to protect tokens and credentials.

## Activation Keywords
`login`, `autenticación`, `JWT`, `registro de usuarios`, `proteger rutas`, `sesión segura`, `mantener sesión`.
