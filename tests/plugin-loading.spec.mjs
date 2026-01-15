import { test, expect } from '@playwright/test';

test.describe('Plugin Loading', () => {
  test.beforeEach(async ({ page }) => {
    // Capture des logs console
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'log' || type === 'warn' || type === 'error') {
        console.log(`[${type}] ${text}`);
      }
    });

    // Capture des erreurs
    page.on('pageerror', error => {
      console.error('❌ Page error:', error.message);
    });
  });

  test('load hello-world plugin in local mode', async ({ page, context }) => {
    // 1. Nettoyer localStorage
    await context.clearCookies();
    await page.goto('http://localhost:8000/index-minimal.html');
    await page.evaluate(() => localStorage.clear());

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

    console.log('[Test] Bootstrap config set to local mode');

    // 3. Recharger pour initialiser le storage
    await page.reload();

    // 4. Attendre que le storage soit initialisé
    await page.waitForFunction(() => {
      return window.storageManager && window.storageManager.mode === 'local';
    }, { timeout: 5000 });

    console.log('[Test] Storage initialized');

    // 5. Injecter la config des plugins via l'API storage
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
            config: {
              message: 'Bienvenue dans Pensine!',
              showIcon: true
            }
          }
        }
      };

      // Sauvegarder via StorageManager
      await window.storageManager.writeJSON('.pensine-config.json', remoteConfig);
      console.log('📝 Config file written to storage');
    });

    console.log('[Test] Plugin config written');

    // 6. Recharger pour que bootstrap charge la config et les plugins
    await page.reload();

    // 7. Attendre explicitement que l'app soit prête
    await page.waitForFunction(() => {
      const app = document.getElementById('app');
      const loading = document.getElementById('loading');
      return app && !app.classList.contains('hidden') &&
        loading && loading.classList.contains('hidden');
    }, { timeout: 5000 });

    console.log('[Test] App ready, looking for plugin...');

    // 8. Attendre que le plugin soit chargé
    await page.waitForFunction(() => {
      return document.getElementById('hello-plugin') !== null;
    }, { timeout: 10000 }).catch(() => {
      console.log('⚠️ Plugin not loaded in time');
    });

    // 9. Vérifier que le plugin est visible
    const helloPlugin = await page.$('#hello-plugin');
    expect(helloPlugin).toBeTruthy();

    if (helloPlugin) {
      const text = await helloPlugin.textContent();
      console.log('✅ Plugin content:', text);
      expect(text).toContain('Hello from Pensine Plugin System');
    }

    // 10. Vérifier les logs
    console.log('\n📋 Bootstrap + Plugin flow:');
    const logs = await page.evaluate(() => {
      return {
        storage: window.storageManager ? 'initialized' : 'not initialized',
        plugins: window.pluginSystem ? 'initialized' : 'not initialized',
        helloVisible: document.getElementById('hello-plugin') ? 'yes' : 'no'
      };
    });
    console.log('   Storage:', logs.storage);
    console.log('   Plugins:', logs.plugins);
    console.log('   Hello plugin visible:', logs.helloVisible);
  });
});
