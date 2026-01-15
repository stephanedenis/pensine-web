import { test, expect } from '@playwright/test';

/**
 * Test de debug avec boot console visible
 * Capture TOUS les logs pour diagnostiquer le problème d'activation des plugins
 */
test.describe('Debug Boot Console', () => {
  const consoleLogs = [];
  const consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    // Réinitialiser les logs
    consoleLogs.length = 0;
    consoleErrors.length = 0;

    // Capture TOUS les messages console (y compris debug)
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      const timestamp = new Date().toISOString();

      const logEntry = {
        timestamp,
        type,
        text
      };

      consoleLogs.push(logEntry);

      // Afficher en temps réel avec couleur
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
      console.error('🌐 REQUEST FAILED:', request.url());
    });
  });

  test('Debug plugin activation with boot console', async ({ page, context }) => {
    console.log('\n🚀 Starting debug test with boot console...\n');

    // 1. Nettoyer localStorage
    await context.clearCookies();
    await page.goto('http://localhost:8001/index-minimal.html');
    await page.evaluate(() => localStorage.clear());

    console.log('✅ localStorage cleared\n');

    // 2. Configurer bootstrap en mode local
    await page.evaluate(() => {
      const bootstrapConfig = {
        version: '1.0.0',
        storageMode: 'local',
        credentials: {},
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('pensine-bootstrap', JSON.stringify(bootstrapConfig));
    });

    console.log('✅ Bootstrap config set to local mode\n');

    // 3. Recharger pour initialiser
    await page.reload();

    // Attendre un peu pour que les logs se stabilisent
    await page.waitForTimeout(2000);

    console.log('✅ Page reloaded\n');

    // 4. Attendre que le storage soit initialisé
    try {
      await page.waitForFunction(() => {
        return window.storageManager && window.storageManager.mode === 'local';
      }, { timeout: 5000 });
      console.log('✅ Storage initialized\n');
    } catch (e) {
      console.error('❌ Storage not initialized:', e.message);
    }

    // 5. Injecter la config des plugins
    await page.evaluate(async () => {
      const remoteConfig = {
        version: '1.0.0',
        settings: {
          theme: 'auto',
          language: 'fr'
        },
        plugins: {
          'hello-world': {
            enabled: true,
            source: 'local',
            path: '/plugins/pensine-plugin-hello/plugin.js',
            name: 'Hello World',
            version: '0.1.0',
            icon: '👋',
            config: {
              message: 'Test Debug Console',
              showIcon: true
            }
          }
        }
      };

      await window.storageManager.writeJSON('.pensine-config.json', remoteConfig);
      console.log('📝 Plugin config written to storage');
    });

    console.log('✅ Plugin config written\n');

    // 6. Recharger pour déclencher le chargement complet
    console.log('🔄 Reloading page to trigger full bootstrap...\n');
    await page.reload();

    // Attendre plus longtemps pour capturer tous les logs
    await page.waitForTimeout(3000);

    // 7. Extraire le contenu de la boot console
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

    // 8. Vérifier état des objets globaux
    const globalState = await page.evaluate(() => {
      return {
        hasStorageManager: !!window.storageManager,
        hasPluginSystem: !!window.pluginSystem,
        hasEventBus: !!window.eventBus,
        hasConfigManager: !!window.configManager,
        pluginSystemInitialized: window.pluginSystem?.initialized || false,
        registeredPlugins: window.pluginSystem ? Array.from(window.pluginSystem.plugins.keys()) : [],
        activePlugins: window.pluginSystem ? Array.from(window.pluginSystem.activePlugins) : [],
        pluginDetails: window.pluginSystem ?
          Array.from(window.pluginSystem.plugins.entries()).map(([id, data]) => ({
            id,
            name: data.manifest.name,
            version: data.manifest.version,
            isPaniniPlugin: data.isPaniniPlugin,
            enabled: data.enabled,
            hasActivateMethod: typeof data.plugin.activate === 'function',
            hasEnableMethod: typeof data.plugin.enable === 'function',
            pluginInstance: data.plugin.constructor.name
          })) : []
      };
    });

    console.log('🔍 ========== GLOBAL STATE ==========\n');
    console.log('StorageManager:', globalState.hasStorageManager);
    console.log('PluginSystem:', globalState.hasPluginSystem);
    console.log('EventBus:', globalState.hasEventBus);
    console.log('ConfigManager:', globalState.hasConfigManager);
    console.log('PluginSystem initialized:', globalState.pluginSystemInitialized);
    console.log('Registered plugins:', globalState.registeredPlugins);
    console.log('Active plugins:', globalState.activePlugins);
    console.log('\nPlugin Details:');
    globalState.pluginDetails.forEach(p => {
      console.log(`  - ${p.id}:`);
      console.log(`    Name: ${p.name} v${p.version}`);
      console.log(`    Type: ${p.isPaniniPlugin ? 'Panini' : 'Legacy'}`);
      console.log(`    Enabled: ${p.enabled}`);
      console.log(`    Has activate(): ${p.hasActivateMethod}`);
      console.log(`    Has enable(): ${p.hasEnableMethod}`);
      console.log(`    Instance: ${p.pluginInstance}`);
    });
    console.log('\n====================================\n');

    // 9. Vérifier si le plugin a créé son élément DOM
    const helloPlugin = await page.$('#hello-plugin');
    console.log('🔍 Plugin DOM element (#hello-plugin):', helloPlugin ? '✅ FOUND' : '❌ NOT FOUND');

    if (helloPlugin) {
      const text = await helloPlugin.textContent();
      console.log('   Content:', text);
    }

    // 10. Résumé des erreurs capturées
    if (consoleErrors.length > 0) {
      console.log('\n❌ ========== ERRORS CAPTURED ==========\n');
      consoleErrors.forEach(err => {
        console.log(`[${err.timestamp}] ${err.message}`);
        if (err.stack) {
          console.log(`Stack: ${err.stack}`);
        }
      });
      console.log('\n========================================\n');
    }

    // 11. Filtrer les logs importants pour le diagnostic
    console.log('\n🔍 ========== KEY LOGS FOR DIAGNOSIS ==========\n');

    const keyLogs = consoleLogs.filter(log =>
      log.text.includes('[PluginSystem') ||
      log.text.includes('activate') ||
      log.text.includes('enable') ||
      log.text.includes('Plugin') ||
      log.text.includes('hello-world')
    );

    keyLogs.forEach(log => {
      console.log(`[${log.type}] ${log.text}`);
    });

    console.log('\n===============================================\n');

    // Attendre un peu avant de finir
    await page.waitForTimeout(1000);

    // Assertion finale (devrait passer une fois le bug corrigé)
    // Pour l'instant on veut juste les logs, donc on ne fait pas échouer le test
    if (!helloPlugin) {
      console.log('\n⚠️ TEST RESULT: Plugin not activated (expected - this is what we\'re debugging)\n');
    } else {
      console.log('\n✅ TEST RESULT: Plugin successfully activated!\n');
    }
  });
});
