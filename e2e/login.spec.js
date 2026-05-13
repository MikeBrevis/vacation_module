const { test, expect } = require('@playwright/test');

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('debe mostrar la página de login correctamente', async ({ page }) => {
    await expect(page).toHaveTitle(/Login - AndeCorp/);
    await expect(page.locator('#usuario')).toBeVisible();
    await expect(page.locator('#contraseña')).toBeVisible();
  });

  test('debe fallar con credenciales incorrectas', async ({ page }) => {
    await page.fill('#usuario', 'usuario_erroneo');
    await page.fill('#contraseña', 'error123');
    await page.click('button[type="submit"]');

    const errorMsg = page.locator('#loginAlert');
    await expect(errorMsg).toBeVisible();
  });

  test('funcionalidad de mostrar/ocultar contraseña', async ({ page }) => {
    await page.fill('#contraseña', 'secreto123');
    await expect(page.locator('#contraseña')).toHaveAttribute('type', 'password');

    await page.click('#togglePassword');
    await expect(page.locator('#contraseña')).toHaveAttribute('type', 'text');
  });
});
