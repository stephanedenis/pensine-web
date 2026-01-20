import { test, expect } from '@playwright/test';

/**
 * Test wizard validateToken avec le vrai token PAT
 * Token: REMOVED_TOKEN
 * User: stephanedenis
 */

test.describe('Wizard Token Validation - Real PAT', () => {
  test.beforeEach(async ({ page }) => {
    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`❌ CONSOLE ERROR: ${msg.text()}`);
      }
    });

    // Capture page errors
    page.on('pageerror', error => {
      console.log(`❌ PAGE ERROR: ${error.message}`);
      console.log(`   Stack: ${error.stack?.split('\n').slice(0, 3).join('\n')}`);
    });
  });

  test('Validate real PAT token via wizard', async ({ page }) => {
    console.log('\n🧪 Testing wizard with REAL PAT token...\n');

    const TOKEN = process.env.GITHUB_TEST_TOKEN || 'REMOVED_TOKEN';
    const OWNER = process.env.GITHUB_TEST_OWNER || 'stephanedenis';

    if (TOKEN === 'REMOVED_TOKEN') {
      throw new Error('GITHUB_TEST_TOKEN environment variable is required. Run: source .env before testing');
    }

    // Collect console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to index.html
    console.log('📍 Navigating to http://localhost:8000/index.html...');
    await page.goto('http://localhost:8000/index.html');

    // Wait for page to load
    await page.waitForTimeout(2000);
    console.log('✅ Page loaded\n');

    // Try to call validateToken directly via page evaluation
    console.log('🔍 Testing validateToken() directly...\n');

    const result = await page.evaluate(async (token) => {
      // Wait for ConfigWizard to be available
      let attempts = 0;
      while (!window.ConfigWizard && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!window.ConfigWizard) {
        return { success: false, error: 'ConfigWizard not loaded' };
      }

      // Create wizard instance
      const wizard = new window.ConfigWizard();
      wizard.config.git.token = token;

      // Try validateToken
      try {
        await wizard.validateToken();

        return {
          success: true,
          tokenValidated: wizard.tokenValidated,
          authenticatedUser: wizard.authenticatedUser,
          validationError: wizard.validationError,
          configWizardExists: true
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          stack: error.stack,
          tokenValidated: wizard.tokenValidated,
          validationError: wizard.validationError,
          configWizardExists: true
        };
      }
    }, TOKEN);

    console.log('📊 Validation result:');
    console.log(JSON.stringify(result, null, 2));

    // Check for StorageAdapterBase errors in console
    const hasStorageAdapterBaseError = consoleErrors.some(e =>
      e.includes('StorageAdapterBase') && e.includes('not defined')
    );

    console.log(`\n🔍 StorageAdapterBase errors in console: ${hasStorageAdapterBaseError ? '❌' : '✅'}`);
    if (hasStorageAdapterBaseError) {
      console.log('   Console errors:', consoleErrors.filter(e => e.includes('StorageAdapterBase')));
    }

    // Check if validation succeeded
    if (result.success && result.tokenValidated) {
      console.log('\n✅ Token validation SUCCEEDED!');
      console.log(`   Owner: ${result.authenticatedUser?.login}`);
      console.log(`   User name: ${result.authenticatedUser?.name}`);
    } else if (result.success && !result.tokenValidated) {
      console.log('\n⚠️  validateToken() completed but token NOT validated');
      console.log(`   Validation error: ${result.validationError}`);
    } else {
      console.log('\n❌ Token validation FAILED!');
      console.log(`   Error: ${result.error}`);
      if (result.stack) {
        console.log(`   Stack: ${result.stack.split('\n').slice(0, 5).join('\n')}`);
      }
    }

    // Additional diagnostics
    const diagnostics = await page.evaluate(() => {
      return {
        storageManagerExists: !!window.storageManager,
        configWizardExists: !!window.ConfigWizard,
        windowKeys: Object.keys(window).filter(k => k.includes('storage') || k.includes('wizard')).sort()
      };
    });

    console.log('\n🔍 Diagnostics:');
    console.log(`   storageManager exists: ${diagnostics.storageManagerExists}`);
    console.log(`   ConfigWizard exists: ${diagnostics.configWizardExists}`);
    console.log(`   Relevant window keys: ${diagnostics.windowKeys.join(', ')}`);

    // Assert NO StorageAdapterBase errors
    expect(hasStorageAdapterBaseError).toBe(false);

    // Assert validation succeeded
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.tokenValidated).toBe(true);
  });

  test('Open wizard UI and test token input', async ({ page }) => {
    console.log('\n🧪 Testing wizard UI with token input...\n');

    const TOKEN = process.env.GITHUB_TEST_TOKEN || 'REMOVED_TOKEN';
    if (TOKEN === 'REMOVED_TOKEN') {
      console.log('⚠️  GITHUB_TEST_TOKEN not set, skipping test');
      return;
    }

    // Navigate
    await page.goto('http://localhost:8000/index.html');
    await page.waitForTimeout(3000);

    // Check if wizard is visible
    const wizardVisible = await page.evaluate(() => {
      const wizard = document.getElementById('config-wizard');
      return wizard && wizard.style.display !== 'none';
    });

    console.log(`📋 Wizard visible: ${wizardVisible}`);

    if (wizardVisible) {
      // Try to fill token input
      const tokenInput = page.locator('input[name="token"]').first();
      if (await tokenInput.count() > 0) {
        await tokenInput.fill(TOKEN);
        console.log('✅ Token filled in input');

        // Look for validate button
        const validateBtn = page.locator('button:has-text("Valider")').first();
        if (await validateBtn.count() > 0) {
          await validateBtn.click();
          console.log('🔘 Clicked validate button');

          // Wait for result
          await page.waitForTimeout(3000);

          // Check for success/error message
          const messages = await page.evaluate(() => {
            const msgElements = document.querySelectorAll('.wizard-message, .error, .success');
            return Array.from(msgElements).map(el => el.textContent);
          });

          console.log('📬 Messages:', messages);
        } else {
          console.log('⚠️  Validate button not found');
        }
      } else {
        console.log('⚠️  Token input not found');
      }
    } else {
      console.log('⚠️  Wizard not visible, checking bootstrap status...');

      const bootstrapStatus = await page.evaluate(() => {
        return {
          hasBootstrapConfig: !!localStorage.getItem('pensine-bootstrap'),
          hasConfig: !!localStorage.getItem('pensine-config'),
          storageManager: !!window.storageManager
        };
      });

      console.log('Bootstrap status:', bootstrapStatus);
    }
  });

  test('Check adapter imports accessibility', async ({ page }) => {
    console.log('\n🧪 Testing adapter imports from wizard context...\n');

    await page.goto('http://localhost:8000/index.html');
    await page.waitForTimeout(2000);

    const importTest = await page.evaluate(async () => {
      const results = {
        baseDir: window.location.pathname,
        attempts: []
      };

      // Try different import paths
      const paths = [
        './lib/github-storage-adapter.js',
        '/lib/github-storage-adapter.js'
      ];

      for (const path of paths) {
        try {
          const module = await import(path);
          results.attempts.push({
            path,
            success: true,
            hasDefault: !!module.default,
            exports: Object.keys(module)
          });
        } catch (error) {
          results.attempts.push({
            path,
            success: false,
            error: error.message
          });
        }
      }

      return results;
    });

    console.log('📦 Import test results:');
    console.log(JSON.stringify(importTest, null, 2));

    // Find successful import
    const successfulImport = importTest.attempts.find(a => a.success);
    if (successfulImport) {
      console.log(`\n✅ Successful import path: ${successfulImport.path}`);
    } else {
      console.log('\n❌ No successful import found');
    }
  });
});
