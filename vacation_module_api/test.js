require('dotenv').config();
const pool = require('./config/db');
const { calcularSaldo } = require('./services/vacacionesService');

async function run() {
  try {
    // Insertar empleado
    const [result] = await pool.query(`
      INSERT INTO empleados (rut, nombre_completo, cargo, fecha_ingreso, cumple_10_anos_base, dias_progresivos_base)
      VALUES ('12345678-9', 'Usuario Prueba', 'Desarrollador', '2020-01-01', 1, 5)
    `);
    
    const empleadoId = result.insertId;
    console.log('Empleado insertado con ID:', empleadoId);
    
    // Calcular saldo
    const saldo = await calcularSaldo(empleadoId);
    console.log('Objeto de respuesta de calcularSaldo():');
    console.log(JSON.stringify(saldo, null, 2));
    
  } catch(err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
