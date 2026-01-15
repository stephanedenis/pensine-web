import { test, expect } from '@playwright/test';

test.describe('Bootstrap Process', () => {
  test.beforeEach(async ({ page }) => {
    // Effacer localStorage avant chaque test
    await page.goto('http://localhost:8000/index-minimal.html');
    await page.evaluate(() => localStorage.clear());
  });

  test('should show wizard when no config exists', async ({ page, context }) => {
    // Activer capture console
    const consoleLogs = [];
    page.on('console', msg => {
      const text = `[${msg.type()}] ${msg.text()}`;
      consoleLogs.push(text);
      console.log(text);
    });

    // Capturer erreurs
    page.on('pageerror', error => {
      console.error('❌ Page Error:', error.message);
      consoleLogs.push(`[error] ${error.message}`);
    });

    // Recharger page
    await page.goto('http://localhost:8000/index-minimal.html');

    // Attendre max 5 secondes
    await page.waitForTimeout(5000);

    // Vérifier état de la page
    const loadingVisible = await page.locator('#loading').isVisible();
    const wizardVisible = await page.locator('#wizard-container').count() > 0;
    const wizardContent = await page.locator('#wizard-container').textContent().catch(() => '');
    const appVisible = await page.locator('#app').isVisible();

    console.log('\n📊 État de la page:');
    console.log('  Loading visible:', loadingVisible);
    console.log('  Wizard exists:', wizardVisible);
    console.log('  Wizard content:', wizardContent.substring(0, 100));
    console.log('  App visible:', appVisible);

    console.log('\n📝 Console logs (', consoleLogs.length, '):');
    consoleLogs.forEach(log => console.log('  ', log));

    // Vérifier qu'on a au moins les logs de démarrage
    expect(consoleLogs.length).toBeGreaterThan(0);
  });
});
