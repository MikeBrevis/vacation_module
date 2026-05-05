const axios = require('axios');
const feriadoModel = require('../models/feriadoModel');

async function sincronizarFeriados() {
  const yearToFetch = new Date().getFullYear();
  const API_KEY = process.env.FERIADOS_API_KEY || 'frd_d4b64b805dd34403a5cc9c2ba3be8c35';
  
  const { data } = await axios.get(`https://api.feriados.io/v1/CL/holidays/${yearToFetch}`, {
    headers: { 'Authorization': `Bearer ${API_KEY}` }
  });
  
  let count = 0;
  if (data && data.success && data.data) {
    for (const f of data.data) {
      await feriadoModel.upsert(f.date, f.name);
      count++;
    }
  }
  return { sincronizados: count };
}

module.exports = { sincronizarFeriados };
