const { test, expect } = require('@playwright/test');

async function doLogin(page) {
  await page.goto('/');
  await page.fill('#usuario', 'sandra'); 
  await page.fill('#contraseña', 'andecorp159*');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/index.html');
}

test.describe('Generación de Comprobantes PDF', () => {
  test.beforeEach(async ({ page }) => {
    await doLogin(page);
    // Ir al detalle del primer empleado
    await page.locator('#tablaEmpleados tbody tr td a').first().click();
    await page.waitForURL('**/empleado.html*');
  });

  test('debe abrir el PDF de una solicitud en una nueva pestaña', async ({ page, context }) => {
    // Esperar a que cargue el historial
    const pdfButton = page.locator('#tablaHistorial tbody tr td a:has-text("Ver PDF")').first();
    
    // Al hacer clic en un link con target="_blank", capturamos la nueva página
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      pdfButton.click()
    ]);

    await newPage.waitForLoadState();
    
    // Verificar que la URL contenga el endpoint de PDF
    expect(newPage.url()).toContain('/pdf');
    
    // Playwright no puede "leer" el PDF fácilmente, pero verificamos que no sea un 404/500
    const response = await newPage.request.get(newPage.url());
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('application/pdf');
  });
});
