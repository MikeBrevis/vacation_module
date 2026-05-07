require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vacation_db'
  });

  try {
    await pool.query('ALTER TABLE empleados ADD COLUMN fecha_certificado DATE NULL');
    await pool.query('ALTER TABLE empleados ADD COLUMN total_meses_cotizados INT NULL');
    console.log('Columnas agregadas');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Las columnas ya existen');
    } else {
      console.error(err);
    }
  }
  process.exit();
}

main();
