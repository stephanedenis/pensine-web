import { test, expect } from '@playwright/test';

/**
 * Test manuel wizard GitHub avec vraies credentials
 * Simule parcours utilisateur complet
 */
test.describe('Manual Wizard Flow with GitHub', () => {
  test('Complete wizard flow with real credentials', async ({ page, context }) => {
    console.log('\n🎯 Starting manual wizard flow test...\n');

    const username = 'stephanedenis';
    const token = 'REMOVED_TOKEN';

    // Capture logs et erreurs
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('❌ Console error:', msg.text());
      }
    });

    page.on('pageerror', error => {
      errors.push(error.message);
      console.error('❌ Page error:', error.message);
    });

    // 1. Aller sur la page et nettoyer localStorage
    await page.goto('http://localhost:8001/index-minimal.html');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    console.log('✅ Page loaded and localStorage cleared\n');

    // 2. Attendre que le wizard s'affiche
    try {
      await page.waitForSelector('#wizard-container', { state: 'visible', timeout: 3000 });
      console.log('✅ Wizard visible\n');
    } catch (e) {
      console.error('❌ Wizard not visible after 3s');

      // Debug: vérifier l'état du DOM
      const wizardState = await page.evaluate(() => {
        const wizard = document.getElementById('wizard-container');
        return {
          exists: !!wizard,
          display: wizard?.style.display,
          classList: wizard?.className,
          innerHTML: wizard?.innerHTML.substring(0, 200)
        };
      });

      console.log('Wizard state:', wizardState);
      throw e;
    }

    // 3. Étape 1 - Bienvenue
    await page.waitForSelector('[data-step="welcome"]', { timeout: 3000 });
    console.log('Step 1: Welcome');

    // Cliquer sur Commencer
    await page.click('button:has-text("Commencer")');
    await page.waitForTimeout(500);
    console.log('✅ Clicked Commencer\n');

    // 4. Étape 2 - Choix du mode storage
    await page.waitForSelector('[data-step="storage-mode"]', { timeout: 3000 });
    console.log('Step 2: Storage Mode');

    // Sélectionner GitHub
    await page.click('input[value="github"]');
    await page.waitForTimeout(500);
    console.log('✅ Selected GitHub mode\n');

    // Cliquer sur Suivant
    await page.click('button:has-text("Suivant")');
    await page.waitForTimeout(500);
    console.log('✅ Clicked Suivant\n');

    // 5. Étape 3 - Authentication
    await page.waitForSelector('[data-step="github-authentication"]', { timeout: 3000 });
    console.log('Step 3: GitHub Authentication');

    // Remplir les credentials
    await page.fill('input#wizard-owner', username);
    await page.fill('input#wizard-token', token);
    console.log('✅ Filled credentials\n');

    // Attendre un peu et vérifier qu'il n'y a pas d'erreur
    await page.waitForTimeout(500);

    if (errors.length > 0) {
      console.error('\n❌ Errors detected:');
      errors.forEach(err => console.error('  -', err));
      throw new Error('Errors occurred during wizard flow');
    }

    // Cliquer sur "Valider le token"
    console.log('Clicking "Valider le token" button...');

    // Attendre que le bouton soit visible et enabled
    await page.waitForSelector('button#validate-token-btn', { state: 'visible', timeout: 5000 });

    const validateBtn = await page.$('button#validate-token-btn');

    if (!validateBtn) {
      console.error('❌ Validate button not found');

      // Debug: afficher tous les boutons disponibles
      const buttons = await page.$$eval('button', btns =>
        btns.map(b => ({ id: b.id, text: b.textContent, disabled: b.disabled }))
      );
      console.log('Available buttons:', buttons);

      throw new Error('Validate button not found');
    }

    console.log('Found validate button, clicking...');
    await validateBtn.click();
    console.log('✅ Clicked Valider button\n');

    // Attendre la validation (appel API GitHub)
    console.log('Waiting for validation...');
    await page.waitForTimeout(3000);

    // Vérifier s'il y a eu des erreurs
    if (errors.length > 0) {
      console.error('\n❌ Validation errors:');
      errors.forEach(err => console.error('  -', err));
    } else {
      console.log('✅ No errors during validation\n');
    }

    // Vérifier l'état après validation
    const validationState = await page.evaluate(() => {
      const errorDiv = document.querySelector('.wizard-error');
      const successMsg = document.querySelector('.wizard-success, [class*="success"]');

      return {
        hasError: !!errorDiv,
        errorText: errorDiv?.textContent,
        hasSuccess: !!successMsg,
        successText: successMsg?.textContent
      };
    });

    console.log('Validation state:', validationState);

    if (validationState.hasError) {
      console.error('❌ Validation failed:', validationState.errorText);
    }

    if (validationState.hasSuccess) {
      console.log('✅ Validation successful:', validationState.successText);
    }

    // Screenshot pour debug
    await page.screenshot({ path: '/tmp/wizard-after-validation.png', fullPage: true });
    console.log('📸 Screenshot saved to /tmp/wizard-after-validation.png\n');

    // Résumé final
    console.log('\n========== TEST SUMMARY ==========');
    console.log('Errors encountered:', errors.length);
    console.log('Validation state:', validationState.hasError ? '❌ ERROR' : validationState.hasSuccess ? '✅ SUCCESS' : '⚠️ UNKNOWN');
    console.log('==================================\n');
  });
});
