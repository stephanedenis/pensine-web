import { test, expect } from '@playwright/test';

/**
 * Test avec credentials GitHub réels pour diagnostiquer erreur validation
 */
test.describe('Debug GitHub Authentication', () => {
  const consoleLogs = [];
  const consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    // Réinitialiser les logs
    consoleLogs.length = 0;
    consoleErrors.length = 0;

    // Capture TOUS les messages console
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      const timestamp = new Date().toISOString();

      const logEntry = { timestamp, type, text };
      consoleLogs.push(logEntry);

      const prefix = {
        'log': '📘',
        'info': 'ℹ️',
        'warn': '⚠️',
        'error': '❌',
        'debug': '🔍'
      }[type] || '📄';

      console.log(`${prefix} [${type}] ${text}`);
    });

    // Capture erreurs page
    page.on('pageerror', error => {
      const errorEntry = {
        timestamp: new Date().toISOString(),
        message: error.message,
        stack: error.stack
      };
      consoleErrors.push(errorEntry);
      console.error('❌ PAGE ERROR:', error.message);
      if (error.stack) {
        console.error('   Stack:', error.stack);
      }
    });

    // Capture requêtes réseau échouées
    page.on('requestfailed', request => {
      console.error('🌐 REQUEST FAILED:', request.url(), request.failure()?.errorText);
    });

    // Capture réponses réseau
    page.on('response', response => {
      if (!response.ok() && response.url().includes('api.github.com')) {
        console.error('🌐 API ERROR:', response.status(), response.url());
      }
    });
  });

  test('Test with real GitHub credentials', async ({ page, context }) => {
    console.log('\n🚀 Testing with real GitHub credentials...\n');

    const username = 'stephanedenis';
    const token = 'REMOVED_TOKEN';

    // 1. Aller sur la page
    await page.goto('http://localhost:8001/index-minimal.html');
    console.log('✅ Page loaded\n');

    // Attendre que la page soit prête
    await page.waitForTimeout(1000);

    // 2. Vérifier si le wizard s'affiche
    const wizardVisible = await page.isVisible('#wizard-container');
    console.log('Wizard visible:', wizardVisible);

    if (wizardVisible) {
      console.log('\n📝 Filling wizard form...\n');

      // Attendre que le formulaire soit prêt
      await page.waitForSelector('[data-step="storage-mode"]', { timeout: 5000 });

      // Étape 1: Mode storage - sélectionner GitHub
      const githubRadio = await page.$('input[value="github"]');
      if (githubRadio) {
        await githubRadio.click();
        console.log('✅ Selected GitHub storage mode');
        await page.waitForTimeout(500);
      }

      // Cliquer sur Suivant
      const nextButton = await page.$('button:has-text("Suivant")');
      if (nextButton) {
        await nextButton.click();
        console.log('✅ Clicked Next');
        await page.waitForTimeout(500);
      }

      // Étape 2: Credentials GitHub
      await page.waitForSelector('input[name="github.owner"]', { timeout: 5000 });

      console.log('Filling credentials...');
      await page.fill('input[name="github.owner"]', username);
      await page.fill('input[name="github.repo"]', 'pensine-data');
      await page.fill('input[name="github.token"]', token);

      console.log('✅ Credentials filled');
      await page.waitForTimeout(500);

      // Cliquer sur Valider
      const validateButton = await page.$('button:has-text("Valider")');
      if (validateButton) {
        console.log('Clicking Validate button...');
        await validateButton.click();
        console.log('✅ Clicked Validate');

        // Attendre la validation
        await page.waitForTimeout(3000);
      }
    }

    // 3. Extraire le contenu de la boot console
    console.log('\n📟 ========== BOOT CONSOLE CONTENT ==========\n');

    const bootConsoleLines = await page.evaluate(() => {
      const lines = document.querySelectorAll('#boot-console-content .boot-line');
      return Array.from(lines).map(line => ({
        class: line.className,
        text: line.textContent
      }));
    });

    bootConsoleLines.forEach(line => {
      const icon = {
        'boot-line info': '💬',
        'boot-line success': '✅',
        'boot-line warning': '⚠️',
        'boot-line error': '❌',
        'boot-line debug': '🔍'
      }[line.class] || '📄';

      console.log(`${icon} ${line.text}`);
    });

    console.log('\n============================================\n');

    // 4. Vérifier état des objets globaux
    const globalState = await page.evaluate(() => {
      return {
        hasStorageManager: !!window.storageManager,
        storageMode: window.storageManager?.mode,
        hasPluginSystem: !!window.pluginSystem,
        hasEventBus: !!window.eventBus,
        hasConfigManager: !!window.configManager,
        bootstrapConfig: localStorage.getItem('pensine-bootstrap'),
        wizardVisible: document.getElementById('wizard-container')?.style.display !== 'none'
      };
    });

    console.log('🔍 ========== GLOBAL STATE ==========\n');
    console.log('StorageManager:', globalState.hasStorageManager);
    console.log('Storage mode:', globalState.storageMode);
    console.log('PluginSystem:', globalState.hasPluginSystem);
    console.log('EventBus:', globalState.hasEventBus);
    console.log('ConfigManager:', globalState.hasConfigManager);
    console.log('Wizard visible:', globalState.wizardVisible);
    console.log('Bootstrap config:', globalState.bootstrapConfig?.substring(0, 100));
    console.log('\n====================================\n');

    // 5. Résumé des erreurs capturées
    if (consoleErrors.length > 0) {
      console.log('\n❌ ========== ERRORS CAPTURED ==========\n');
      consoleErrors.forEach(err => {
        console.log(`[${err.timestamp}] ${err.message}`);
        if (err.stack) {
          console.log(`Stack: ${err.stack}`);
        }
      });
      console.log('\n========================================\n');
    } else {
      console.log('\n✅ No page errors captured\n');
    }

    // 6. Filtrer les logs importants
    console.log('\n🔍 ========== KEY LOGS ==========\n');

    const errorLogs = consoleLogs.filter(log =>
      log.type === 'error' ||
      log.text.includes('Error') ||
      log.text.includes('FAIL') ||
      log.text.includes('undefined') ||
      log.text.includes('constructor')
    );

    if (errorLogs.length > 0) {
      console.log('ERROR LOGS:');
      errorLogs.forEach(log => {
        console.log(`[${log.type}] ${log.text}`);
      });
    } else {
      console.log('No error logs found');
    }

    console.log('\n=================================\n');

    // Attendre un peu avant de finir
    await page.waitForTimeout(2000);

    // Screenshot pour debug visuel
    await page.screenshot({ path: '/tmp/github-auth-debug.png', fullPage: true });
    console.log('📸 Screenshot saved to /tmp/github-auth-debug.png\n');
  });
});
