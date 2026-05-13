const { test, expect } = require('@playwright/test');

async function doLogin(page) {
  await page.goto('/');
  await page.fill('#usuario', 'sandra'); 
  await page.fill('#contraseña', 'andecorp159*');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/index.html');
}

test.describe('Solicitudes de Vacaciones', () => {
  test.beforeEach(async ({ page }) => {
    await doLogin(page);
    
    // Asegurar que existe un empleado para la prueba
    // O navegar al detalle de uno existente
    const firstEmployeeLink = page.locator('#tablaEmpleados tbody tr td a').first();
    await firstEmployeeLink.click();
    await page.waitForURL('**/empleado.html*');
  });

  test('debe mostrar los saldos correctamente', async ({ page }) => {
    await expect(page.locator('#saldoActual')).toBeVisible();
    await expect(page.locator('#tablaDetalleAnual tr')).not.toHaveCount(0);
  });

  test('debe registrar una solicitud de vacaciones', async ({ page }) => {
    // Seleccionar primer periodo disponible
    await page.selectOption('#solPeriodo', { index: 1 });
    
    // Set dates using flatpickr instance
    await page.evaluate(() => {
      document.getElementById('fechaInicio')._flatpickr.setDate('2026-12-01', true);
      document.getElementById('fechaFin')._flatpickr.setDate('2026-12-05', true);
    });
    
    // Esperar cálculo de días
    await expect(page.locator('#infoDiasVal')).not.toHaveText('0');
    
    await page.click('#formSolicitud button[type="submit"]');
    
    // Verificar que aparezca en el historial
    await expect(page.locator('#tablaHistorial tbody')).toContainText('2026-12-01');
  });

  test('debe permitir anular una solicitud', async ({ page }) => {
    const lastRow = page.locator('#tablaHistorial tbody tr').first();
    await lastRow.locator('.btn-anular').click();
    await page.click('#btnConfirmarAnular');
    
    // Verificar que desaparezca o cambie estado si aplica
    await expect(page.locator('#tablaHistorial tbody')).not.toContainText('2026-12-01');
  });

  test('debe realizar una carga histórica', async ({ page }) => {
    await page.selectOption('#histAnio', { index: 1 });
    await page.fill('#histDias', '5');
    await page.click('#formHistorico button[type="submit"]');
    
    // Verificar descuento en saldo
    await expect(page.locator('#alertaHistorico')).toContainText('éxito');
  });
});
