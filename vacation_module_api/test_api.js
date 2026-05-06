const axios = require('axios');
const fs = require('fs');

const API = 'http://localhost:3000/api';
let empId, solId;

async function run() {
  try {
    console.log('--- 1. POST /api/empleados ---');
    const res1 = await axios.post(`${API}/empleados`, {
      rut: '99999999-9',
      nombre_completo: 'API Tester',
      cargo: 'QA',
      fecha_ingreso: '2022-01-01',
      cumple_10_anos_base: false
    });
    console.log(res1.data);
    empId = res1.data.id;

    console.log('\n--- 2. GET /api/empleados ---');
    const res2 = await axios.get(`${API}/empleados`);
    console.log(`Empleados en la base de datos: ${res2.data.length}`);
    const myEmp = res2.data.find(e => e.id === empId);
    console.log('Mi empleado (saldoActual incluido):', myEmp);

    console.log('\n--- 3. POST /api/solicitudes ---');
    // Using current year/month but future days to pass the validation 'not in the past'
    const today = new Date();
    today.setDate(today.getDate() + 5);
    const start = today.toISOString().split('T')[0];
    today.setDate(today.getDate() + 3);
    const end = today.toISOString().split('T')[0];

    const res3 = await axios.post(`${API}/solicitudes`, {
      empleado_id: empId,
      fecha_inicio: start,
      fecha_fin: end
    });
    console.log(res3.data);
    solId = res3.data.solicitud_id;

    console.log('\n--- 4. GET /api/empleados/:id ---');
    const res4 = await axios.get(`${API}/empleados/${empId}`);
    console.log('Empleado:', res4.data.empleado);
    console.log('Saldo:', res4.data.saldo);
    console.log(`Solicitudes: ${res4.data.solicitudes.length}`);

    // Verificar archivo PDF
    const pdfFile = `.${res3.data.ruta_comprobante}`;
    console.log('\n--- VERIFICAR PDF ---');
    if (fs.existsSync(pdfFile)) {
      console.log(`OK: El archivo ${pdfFile} se creó correctamente.`);
    } else {
      console.log(`ERROR: El archivo ${pdfFile} NO existe.`);
    }

    console.log('\n--- 5. DELETE /api/empleados/:id (DEBE FALLAR por la FK) ---');
    try {
      await axios.delete(`${API}/empleados/${empId}`);
    } catch(err) {
      console.log('Error esperado:', err.response.data);
    }

    console.log('\n--- 6. DELETE /api/solicitudes/:id ---');
    const res6 = await axios.delete(`${API}/solicitudes/${solId}`);
    console.log(res6.data);

    console.log('\n--- 7. DELETE /api/empleados/:id ---');
    const res7 = await axios.delete(`${API}/empleados/${empId}`);
    console.log(res7.data);

  } catch(err) {
    console.error('Test falló:', err.response ? err.response.data : err.message);
  }
}

run();
