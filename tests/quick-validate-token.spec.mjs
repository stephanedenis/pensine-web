/**
 * Quick Validate Token Test
 *
 * Simple test that directly calls validateToken() to see if validation works
 * without the complexity of full wizard navigation.
 *
 * This bypasses UI interaction and directly tests the validation logic.
 */

import { test, expect } from '@playwright/test';

test.describe('Quick Token Validation', () => {

  test('Direct validateToken() call with real credentials', async ({ page }) => {

    // Capture console logs
    const consoleLogs = [];
    page.on('console', msg => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Capture page errors
    const pageErrors = [];
    page.on('pageerror', error => {
      pageErrors.push({
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    });

    // Go to app
    console.log('🚀 Loading app...');
    await page.goto('http://localhost:8001/index-minimal.html');

    // Wait for wizard to be ready
    console.log('⏳ Waiting for wizard initialization...');
    await page.waitForSelector('#wizard-container', { timeout: 5000 });
    await page.waitForTimeout(1000);

    // Inject test credentials and call validateToken() directly via page.evaluate
    console.log('🔐 Calling validateToken() directly with credentials...');
    const validationResult = await page.evaluate(async () => {
      try {
        // Get wizard instance
        const wizard = window.configWizard;
        if (!wizard) {
          return { error: 'Wizard not found in window.configWizard' };
        }

        // Set credentials in wizard state
        wizard.config = wizard.config || {};
        wizard.config.github = {
          owner: 'stephanedenis',
          repo: 'pensine-data',
          token: 'REMOVED_TOKEN'
        };

        // Call validateToken() method directly
        console.log('Calling wizard.validateToken()...');
        const result = await wizard.validateToken();

        return {
          success: true,
          validationResult: result,
          wizardState: {
            hasConfig: !!wizard.config,
            hasGitHub: !!wizard.config.github,
            owner: wizard.config.github?.owner,
            repo: wizard.config.github?.repo,
            tokenPresent: !!wizard.config.github?.token
          }
        };

      } catch (error) {
        return {
          error: error.message,
          stack: error.stack,
          name: error.name
        };
      }
    });

    // Log result
    console.log('\n📊 ========== VALIDATION RESULT ==========');
    console.log(JSON.stringify(validationResult, null, 2));
    console.log('==========================================\n');

    // Check for errors
    if (validationResult.error) {
      console.log('❌ VALIDATION FAILED:');
      console.log('Error:', validationResult.error);
      if (validationResult.stack) {
        console.log('Stack:', validationResult.stack);
      }
    } else if (validationResult.success) {
      console.log('✅ VALIDATION SUCCEEDED');
      console.log('Wizard State:', validationResult.wizardState);
      console.log('Result:', validationResult.validationResult);
    }

    // Log page errors
    if (pageErrors.length > 0) {
      console.log('\n❌ ========== PAGE ERRORS ==========');
      pageErrors.forEach(err => {
        console.log(`[${err.timestamp}] ${err.message}`);
        if (err.stack) {
          console.log('Stack:', err.stack);
        }
      });
      console.log('====================================\n');
    }

    // Log key console messages (errors, warnings, validation-related)
    console.log('\n🔍 ========== KEY CONSOLE LOGS ==========');
    const keyLogs = consoleLogs.filter(log =>
      log.includes('error') ||
      log.includes('Error') ||
      log.includes('validation') ||
      log.includes('Validation') ||
      log.includes('validateToken') ||
      log.includes('GitHub') ||
      log.includes('StorageAdapter')
    );
    if (keyLogs.length > 0) {
      keyLogs.forEach(log => console.log(log));
    } else {
      console.log('(No key logs found)');
    }
    console.log('=========================================\n');

    // Take screenshot
    await page.screenshot({ path: '/tmp/quick-validate-test.png', fullPage: true });
    console.log('📸 Screenshot: /tmp/quick-validate-test.png');

    // Assertions
    if (pageErrors.length > 0) {
      console.warn('⚠️  Page errors detected but test continues');
    }

    // Main assertion: validation should not throw "StorageAdapterBase is not defined"
    if (validationResult.error) {
      expect(validationResult.error).not.toContain('StorageAdapterBase is not defined');
      expect(validationResult.error).not.toContain('constructor');
    }

  });

});
