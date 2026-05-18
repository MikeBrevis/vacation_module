require('dotenv').config();
const { sincronizarFeriados } = require('../services/feriadosSync');
const pool = require('../config/db');

async function run() {
  console.log(`[Standalone Sync] Iniciando sincronización de feriados...`);
  try {
    const result = await sincronizarFeriados();
    console.log(`[Standalone Sync] Sincronización exitosa: ${result.mensaje}`);
  } catch (error) {
    console.error(`[Standalone Sync] ERROR: ${error.message}`);
  } finally {
    // Cerrar el pool de conexiones para asegurar que el proceso de Node finalice
    await pool.end();
    console.log(`[Standalone Sync] Conexión de base de datos cerrada. Proceso finalizado.`);
  }
}

run();
