const { test, expect } = require('@playwright/test');

// Helper para login rápido
async function doLogin(page) {
  await page.goto('/');
  // Usar credenciales reales o mockeadas si el backend lo permite
  await page.fill('#usuario', 'sandra'); 
  await page.fill('#contraseña', 'andecorp159*');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/index.html');
}

test.describe('Gestión de Empleados', () => {
  test.beforeEach(async ({ page }) => {
    await doLogin(page);
  });

  test('debe crear un nuevo empleado exitosamente', async ({ page }) => {
    await page.click('button:has-text("Nuevo Empleado")');
    
    const testRut = '12345678-5';
    await page.fill('#rut', testRut);
    await page.fill('#nombre', 'Empleado de Prueba Playwright');
    await page.fill('#cargo', 'Tester Automático');
    await page.selectOption('#sucursal', 'Santiago');
    await page.fill('#fechaIngreso', '2023-01-01');
    
    await page.click('#formNuevoEmpleado button[type="submit"]');
    
    // Verificar que aparezca en la tabla
    await expect(page.locator('#tablaEmpleados tbody')).toContainText(testRut);
  });

  test('debe buscar un empleado en la tabla', async ({ page }) => {
    await page.fill('#busqueda', 'Playwright');
    await expect(page.locator('#tablaEmpleados tbody tr')).toHaveCount(1);
    await expect(page.locator('#tablaEmpleados tbody tr')).toContainText('Playwright');
  });

  test('debe editar un empleado existente', async ({ page }) => {
    // Buscar el botón editar del empleado creado
    const row = page.locator('#tablaEmpleados tbody tr', { hasText: '12345678-5' });
    await row.locator('.btn-edit').click();
    
    await page.fill('#editNombre', 'Empleado Editado');
    await page.click('#btnGuardarEdicion');
    
    await expect(page.locator('#tablaEmpleados tbody')).toContainText('Empleado Editado');
  });

  test('debe permitir eliminar un empleado (Zona de Peligro)', async ({ page }) => {
    const row = page.locator('#tablaEmpleados tbody tr', { hasText: '12345678-5' });
    await row.locator('.btn-edit').click(); // Abrir modal edición
    
    await page.click('button:has-text("Zona de Peligro")');
    await page.click('#btnConfirmarEliminar');
    
    await expect(page.locator('#tablaEmpleados tbody')).not.toContainText('12345678-5');
  });
});
