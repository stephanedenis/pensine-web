/**
 * Test simple et rapide du wizard GitHub
 */

import { test, expect } from '@playwright/test';

test('Quick wizard GitHub error test', async ({ page }) => {

  const errors = [];

  page.on('pageerror', error => {
    errors.push(error.message);
    console.log(`❌ PAGE ERROR: ${error.message}`);
  });

  await page.goto('http://localhost:8001/index-minimal.html');

  // Attendre juste 2 secondes
  await page.waitForTimeout(2000);

  // Appeler loadAvailableRepos si possible
  const result = await page.evaluate(async () => {
    try {
      if (window.configWizard && window.configWizard.loadAvailableRepos) {
        // Setup test config
        window.configWizard.config = { git: { token: 'test', owner: 'test' } };
        await window.configWizard.loadAvailableRepos();
        return { success: true };
      }
      return { skipped: true, reason: 'configWizard not available' };
    } catch (error) {
      return { error: error.message, stack: error.stack };
    }
  });

  console.log('Result:', result);
  console.log('Errors caught:', errors);

  const hasStorageAdapterBaseError = errors.some(err =>
    err.includes('StorageAdapterBase is not defined')
  );

  expect(hasStorageAdapterBaseError).toBe(false);
});
