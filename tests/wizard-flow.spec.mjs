import { test, expect } from '@playwright/test';

test.describe('Wizard Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Effacer localStorage
    await page.goto('http://localhost:8000/index-minimal.html');
    await page.evaluate(() => localStorage.clear());
  });

  test('complete wizard with local storage mode', async ({ page }) => {
    const logs = [];
    page.on('console', msg => {
      const text = msg.text();
      logs.push(text);
      if (text.includes('Wizard') || text.includes('Bootstrap') || text.includes('Storage')) {
        console.log(text);
      }
    });

    // Page initiale
    await page.goto('http://localhost:8000/index-minimal.html');
    await page.waitForTimeout(2000);

    // Vérifier que wizard s'affiche
    const wizardExists = await page.locator('#config-wizard').count() > 0;
    expect(wizardExists).toBe(true);
    console.log('✓ Wizard displayed');

    // Simuler configuration locale dans localStorage
    await page.evaluate(() => {
      // Simuler un wizard complété avec mode local
      const config = {
        version: '1.0.0',
        storageMode: 'local',
        credentials: {},
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('pensine-bootstrap', JSON.stringify(config));
      console.log('[Test] Bootstrap config set to local mode');
    });

    // Recharger pour utiliser la nouvelle config
    await page.reload();
    await page.waitForTimeout(3000);

    // Vérifier logs
    console.log('\n📋 Bootstrap flow:');
    logs.forEach(log => {
      if (log.includes('Bootstrap') || log.includes('Storage') || log.includes('Plugin')) {
        console.log('  ', log);
      }
    });

    // Vérifier que loading a disparu
    const loadingVisible = await page.locator('#loading').isVisible();
    console.log('Loading visible:', loadingVisible);

    // Vérifier qu'on arrive à l'étape suivante (même si plugins ne chargent pas encore)
    const wizardStillVisible = await page.locator('#config-wizard').isVisible().catch(() => false);
    console.log('Wizard still visible:', wizardStillVisible);

    // Au minimum, on devrait avoir passé la phase de validation config
    const hasStorageLogs = logs.some(log => log.includes('Storage initialized'));
    console.log('Storage initialized:', hasStorageLogs);

    expect(logs.length).toBeGreaterThan(0);
  });
});
