const cron = require('node-cron');
const { sincronizarFeriados } = require('../services/feriadosSync');

cron.schedule('0 3 2 1 *', async () => {
  try {
    await sincronizarFeriados();
    console.log(`[CRON] Feriados sincronizados: ${new Date().toISOString()}`);
  } catch (error) {
    console.error(`[CRON] Error: ${error.message}`);
  }
});

module.exports = cron;
