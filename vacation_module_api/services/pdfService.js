const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function generarPDF(datos, responseStream) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(responseStream);

    const x = 50;
    let y = 50;
    const width = 512;

    // COMPROBANTE DE FERIADO LEGAL O PROGRESIVO
    const titulo = datos.es_progresivo ? 'COMPROBANTE DE FERIADO PROGRESIVO' : 'COMPROBANTE DE FERIADO LEGAL';
    doc.font('Helvetica-Bold').fontSize(16)
      .text(titulo, x, y + 25, { align: 'center', width: width });

    const logoPath = path.join(__dirname, '../../logo.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, x + 10, y + 10, { width: 70 });
    } else {
      doc.font('Helvetica-Bold').fontSize(18).text('ANDECORP', x + 30, y + 15);
    }

    y += 110;

    // Sección 1: Datos Empleado
    const leftCol = x + 15;
    const valCol = x + 160;

    const today = new Date();
    const formattedToday = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('Fecha de Comprobante:', leftCol, y);
    doc.font('Helvetica').text(formattedToday, valCol, y);

    y += 15;
    doc.font('Helvetica-Bold').text('Empresa:', leftCol, y);
    doc.font('Helvetica').text('ANDECORP', valCol, y);

    y += 15;
    doc.font('Helvetica-Bold').text('RUT:', leftCol, y);
    doc.font('Helvetica').text(datos.rut, valCol, y);

    y += 15;
    doc.font('Helvetica-Bold').text('Nombre:', leftCol, y);
    doc.font('Helvetica').text(datos.nombre_completo, valCol, y);

    y += 15;
    doc.font('Helvetica-Bold').text('Cargo:', leftCol, y);
    doc.font('Helvetica').text(datos.cargo, valCol, y);

    y += 15;
    doc.font('Helvetica-Bold').text('Fecha Contrato:', leftCol, y);
    doc.font('Helvetica').text(formatDate(datos.fecha_ingreso), valCol, y);

    y += 25;
    // Línea separadora 1
    doc.moveTo(x, y).lineTo(x + width, y).stroke();

    y += 15;
    // Sección 2: Declaración y Fechas
    doc.font('Helvetica').text('En cumplimiento de las disposiciones legales vigentes, se deja constancia que el trabajador', leftCol, y);
    y += 15;
    const usoDe = datos.es_progresivo ? 'hará uso de feriado progresivo con remuneración.' : 'hará uso de feriado legal con remuneración.';
    doc.text(usoDe, leftCol, y);

    y += 30;

    doc.font('Helvetica-Bold').text('Fecha Desde:', leftCol, y);
    doc.font('Helvetica').text(datos.es_historico ? `Año ${datos.anio}` : formatDate(datos.fecha_inicio), valCol, y);

    y += 15;
    doc.font('Helvetica-Bold').text('Fecha Hasta:', leftCol, y);
    doc.font('Helvetica').text(datos.es_historico ? `Año ${datos.anio}` : formatDate(datos.fecha_fin), valCol, y);

    y += 15;
    doc.font('Helvetica-Bold').text('Inhábiles entre fechas:', leftCol, y);
    doc.font('Helvetica').text(datos.dias_inhabiles.toString(), valCol, y);

    y += 25;
    doc.font('Helvetica-Bold').fontSize(15).text('Días Vacaciones:', leftCol, y);
    doc.font('Helvetica').fontSize(15).text(datos.dias_habiles.toString(), valCol, y);
    doc.fontSize(10);

    y += 40;
    // Firma Trabajador
    doc.text('_____________________________', x + 280, y, { align: 'center', width: 200 });
    y += 15;
    doc.text('FIRMA TRABAJADOR', x + 280, y, { align: 'center', width: 200 });

    y += 20;
    // Línea separadora 2
    doc.moveTo(x, y).lineTo(x + width, y).stroke();

    // Sección 3: Tabla Detalle
    const tableTop = y;
    const tableBottom = y + 130;
    const col1W = 220;
    const col2W = 80;

    // Líneas verticales de la tabla
    doc.moveTo(x + col1W, tableTop).lineTo(x + col1W, tableBottom).stroke();
    doc.moveTo(x + col1W + col2W, tableTop).lineTo(x + col1W + col2W, tableBottom).stroke();

    y += 15;
    doc.font('Helvetica-Bold').text('Detalle saldo de dias pendientes', x + 15, y);
    doc.text('Días', x + col1W, y, { width: col2W, align: 'center' });

    y += 15;
    // Línea horizontal de encabezado de tabla
    doc.moveTo(x, y).lineTo(x + col1W + col2W, y).stroke();

    y += 20;
    doc.font('Helvetica-Bold').text('Saldo Días Progresivos', x + 15, y);
    doc.text(datos.saldo_progresivo_total.toString(), x + col1W, y, { width: col2W, align: 'center' });

    y += 20;
    doc.text('Saldo Días Base Pendientes', x + 15, y);
    doc.text(datos.saldo_base_total.toString(), x + col1W, y, { width: col2W, align: 'center' });

    y += 20;
    doc.text('Total Pendiente', x + 15, y);
    doc.text((datos.saldo_base_total + datos.saldo_progresivo_total).toFixed(2), x + col1W, y, { width: col2W, align: 'center' });

    // Firma Empleador
    const signY = tableBottom - 45;
    doc.text('_____________________________', x + col1W + col2W, signY, { align: 'center', width: width - col1W - col2W });
    doc.text('FIRMA EMPLEADOR', x + col1W + col2W, signY + 15, { align: 'center', width: width - col1W - col2W });

    // Contorno exterior principal
    doc.rect(x, 50, width, tableBottom - 50).stroke();

    doc.end();

    responseStream.on('finish', resolve);
    responseStream.on('error', reject);
  });
}

module.exports = { generarPDF };
