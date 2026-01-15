/**
 * Test E2E complet du wizard GitHub - Validation de l'absence d'erreur StorageAdapterBase
 */

import { test, expect } from '@playwright/test';

test.describe('Wizard GitHub E2E - No StorageAdapterBase errors', () => {

  let errors = [];

  test.beforeEach(async ({ page }) => {
    errors = [];

    // Clear localStorage
    await page.goto('http://localhost:8001/index-minimal.html');
    await page.evaluate(() => {
      localStorage.clear();
    });

    page.on('pageerror', error => {
      errors.push(error.message);
    });
  });

  test('Complete wizard flow without StorageAdapterBase error', async ({ page }) => {

    console.log('\n🧪 Starting complete wizard flow test...\n');

    // Step 1: Load page
    await page.goto('http://localhost:8001/index-minimal.html');
    await page.waitForTimeout(1500);

    console.log('✅ Step 1: Page loaded');

    // Step 2: Wait for wizard
    const wizardVisible = await page.isVisible('#config-wizard');
    expect(wizardVisible, 'Wizard should be visible').toBe(true);

    console.log('✅ Step 2: Wizard visible');

    // Step 3: Click "Commencer" if present
    try {
      const startBtn = await page.waitForSelector('button:has-text("Commencer")', { timeout: 2000 });
      if (startBtn) {
        await startBtn.click();
        await page.waitForTimeout(500);
        console.log('✅ Step 3: Clicked Commencer');
      }
    } catch (e) {
      console.log('⚠️  Step 3: No Commencer button (maybe already past welcome)');
    }

    // Step 4: Select GitHub mode
    const githubRadio = await page.$('input[value="github"]');
    if (githubRadio) {
      await githubRadio.check();
      await page.waitForTimeout(300);
      console.log('✅ Step 4: Selected GitHub mode');

      // Step 5: Click Next
      const nextBtn = await page.$('[data-action="next"]');
      if (nextBtn && await nextBtn.isEnabled()) {
        await nextBtn.click();
        await page.waitForTimeout(800);
        console.log('✅ Step 5: Clicked Next');

        // Step 6: Fill credentials
        await page.fill('input[name="git.owner"]', 'testuser');
        await page.fill('input[name="git.repo"]', 'test-repo');
        await page.fill('input[name="git.token"]', 'ghp_test123456');
        await page.waitForTimeout(300);
        console.log('✅ Step 6: Filled credentials');

        // Step 7: Try to validate (will fail but shouldn't crash)
        const validateBtn = await page.$('button#validate-token-btn');
        if (validateBtn && await validateBtn.isVisible()) {
          await validateBtn.click();
          console.log('✅ Step 7: Clicked Validate (expecting API error, not code error)');

          // Wait for validation attempt
          await page.waitForTimeout(2000);
        }
      }
    }

    // Check errors
    console.log('\n📊 Final Error Check:');
    console.log(`Total errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\nErrors captured:');
      errors.forEach(err => console.log(`  - ${err}`));
    }

    // Screenshot
    await page.screenshot({ path: '/tmp/wizard-e2e-final.png', fullPage: true });
    console.log('\n📸 Screenshot: /tmp/wizard-e2e-final.png\n');

    // Main assertion
    const hasStorageAdapterBaseError = errors.some(err =>
      err.includes('StorageAdapterBase is not defined') ||
      err.includes('StorageAdapterBase')
    );

    expect(hasStorageAdapterBaseError, 'Should NOT have StorageAdapterBase error').toBe(false);

    // Also check for constructor errors
    const hasConstructorError = errors.some(err =>
      err.includes('Cannot read properties of undefined (reading \'constructor\')')
    );

    expect(hasConstructorError, 'Should NOT have constructor error').toBe(false);

    console.log('✅ TEST PASSED: No StorageAdapterBase or constructor errors!\n');
  });

});
