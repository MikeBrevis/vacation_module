const axios = require('axios');
const feriadoModel = require('../models/feriadoModel');

async function sincronizarFeriados() {
  const currentYear = new Date().getFullYear();
  const yearsToFetch = [currentYear, currentYear + 1]; // Año actual y próximo año
  const API_KEY = process.env.FERIADOS_API_KEY;
  if (!API_KEY) throw new Error('FERIADOS_API_KEY no configurada en .env');
  
  let count = 0;

  for (const year of yearsToFetch) {
    try {
      const { data } = await axios.get(`https://api.feriados.io/v1/CL/holidays/${year}`, {
        headers: { 'Authorization': `Bearer ${API_KEY}` }
      });
      
      if (data && data.success && data.data) {
        for (const f of data.data) {
          await feriadoModel.upsert(f.date, f.name);
          count++;
        }
      }
    } catch (err) {
      console.error(`Error al sincronizar feriados para el año ${year}:`, err.message);
      // Continuamos con el siguiente año si uno falla
    }
  }
  
  return { sincronizados: count, mensaje: `Se sincronizaron ${count} feriados para los años ${currentYear} y ${currentYear + 1}.` };
}

module.exports = { sincronizarFeriados };
