# 06. Plan de Implementación: Deploy en cPanel (Fase 5)

## Dependencias Previas
- El sistema ha sido probado con éxito en entorno local (Fases 1 a 4).

## Pasos Detallados

### 1. Configuración del Subdominio
- En cPanel, ir a **Subdominios**.
- Crear subdominio `tools` para el dominio `andecorp.cl`.
- Document Root: `public_html/tools` (o según corresponda a AndeCorpWeb).

### 2. Creación de la BD MySQL y Ejecución de DDL
- En cPanel, ir a **Bases de datos MySQL**.
- Crear base de datos (ej. `andecorp_vacaciones`).
- Crear usuario y asociarlo a la base de datos con todos los privilegios.
- Abrir **phpMyAdmin**, seleccionar la base de datos y ejecutar el código SQL (DDL) definido en `01_database.md`.

### 3. Subida del Backend y Configuración `.env`
- Crear directorio para la API fuera de `public_html`, por ejemplo `/home/andecorp/vacation_api`.
- Subir los archivos del backend (sin la carpeta `node_modules`).
- Crear archivo `.env` en la raíz del backend con las credenciales de producción:
  ```env
  PORT=3000
  DB_HOST=localhost
  DB_USER=usuario_cpanel
  DB_PASS=password_fuerte
  DB_NAME=andecorp_vacaciones
  FRONTEND_ORIGIN=https://tools.andecorp.cl
  ```

### 4. Configurar PM2 para la API
- Acceder mediante Terminal (SSH) en cPanel.
- Ejecutar `npm install` dentro del directorio del backend.
- Ejecutar `pm2 start server.js --name vacation-api`.
- Ejecutar `pm2 save` para persistencia.

### 5. Proxy Inverso Apache (.htaccess) para /api/*
- En la carpeta pública del frontend (`public_html/tools`), editar o crear `.htaccess`:
  ```apache
  RewriteEngine On
  RewriteRule ^api/(.*)$ http://127.0.0.1:3000/api/$1 [P,L]
  ```

### 6. Actualización de Frontend
- Modificar la constante `API_URL` en `assets/js/api.js`:
  ```javascript
  const API_URL = 'https://tools.andecorp.cl/api';
  ```
- Subir los archivos del frontend a `public_html/tools/`.

### 7. Permisos de Directorios
- Otorgar permisos de escritura `755` o `775` a `/home/andecorp/vacation_api/public/comprobantes/` para la generación de PDFs.

### 8. Sincronización Inicial
- Entrar a `https://tools.andecorp.cl`.
- Ejecutar la opción "Sincronizar Feriados" para descargar los datos a la tabla.

## Criterio de Éxito
- Acceder a `tools.andecorp.cl` muestra la tabla de empleados.
- Una solicitud completa genera y descarga el PDF, comunicándose con la base de datos y la API sin errores de CORS.
