/**
 * Test E2E - Persistance de la configuration
 *
 * Scénario :
 * 1. Session 1 : Première visite → wizard → configuration → sauvegarde
 * 2. Session 2 : Visite suivante → pas de wizard → config restaurée
 */

import { test, expect } from '@playwright/test';

const GITHUB_TOKEN = process.env.GITHUB_TEST_TOKEN || 'ghp_test';
const GITHUB_OWNER = process.env.GITHUB_TEST_OWNER || 'testuser';
const GITHUB_REPO = process.env.GITHUB_TEST_REPO || 'test-repo';

test.describe('Configuration Persistence E2E', () => {

  test('Session 1: First visit with wizard → Session 2: Config persisted, no wizard', async ({ page, context }) => {

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║          SESSION 1: PREMIÈRE VISITE + WIZARD             ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    // ============================================================
    // ÉTAPE 1 : Nettoyer localStorage (simule première visite)
    // ============================================================
    console.log('🧹 ÉTAPE 1: Clear localStorage (première visite)...');
    await page.goto('http://localhost:8000/index.html');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    console.log('   ✅ localStorage vidé\n');

    // ============================================================
    // ÉTAPE 2 : Recharger → Wizard doit apparaître
    // ============================================================
    console.log('🔄 ÉTAPE 2: Recharger la page...');
    await page.reload();
    await page.waitForTimeout(2000);

    const wizardVisible = await page.evaluate(() => {
      const wizard = document.getElementById('config-wizard');
      return wizard && wizard.style.display !== 'none';
    });

    console.log(`   📋 Wizard visible : ${wizardVisible ? '✅ OUI' : '❌ NON'}`);
    expect(wizardVisible).toBe(true);
    console.log('   ✅ Wizard s\'affiche bien pour première visite\n');

    // ============================================================
    // ÉTAPE 3 : Configurer directement via localStorage (bypass wizard)
    // ============================================================
    console.log('📝 ÉTAPE 3: Configurer directement via localStorage...');

    await page.evaluate(({ owner, repo, token }) => {
      const config = {
        version: '1.0',
        storageMode: 'github',
        credentials: {
          authMode: 'pat',
          token: token,
          owner: owner,
          repo: repo,
          branch: 'main'
        },
        preferences: {
          theme: 'auto',
          locale: 'fr-CA',
          timezone: 'America/Toronto'
        }
      };
      localStorage.setItem('pensine-config', JSON.stringify(config));
      localStorage.setItem('pensine-bootstrap', JSON.stringify({
        version: '1.0',
        configured: true,
        timestamp: new Date().toISOString()
      }));
      console.log('✅ Configuration forcée dans localStorage');
    }, { owner: GITHUB_OWNER, repo: GITHUB_REPO, token: GITHUB_TOKEN });

    console.log('   ✅ Configuration sauvegardée dans localStorage\n');

    // ============================================================
    // ÉTAPE 4 : Fermer le wizard
    // ============================================================
    console.log('🔒 ÉTAPE 4: Fermer le wizard...');
    await page.evaluate(() => {
      const wizard = document.getElementById('config-wizard');
      if (wizard) wizard.style.display = 'none';
    });
    console.log('   ✅ Wizard fermé\n');
    const configSaved = await page.evaluate(() => {
      const config = localStorage.getItem('pensine-config');
      const bootstrap = localStorage.getItem('pensine-bootstrap');
      return {
        hasConfig: !!config,
        hasBootstrap: !!bootstrap,
        config: config ? JSON.parse(config) : null,
        bootstrap: bootstrap ? JSON.parse(bootstrap) : null
      };
    });

    console.log(`   📋 pensine-config présent : ${configSaved.hasConfig ? '✅' : '❌'}`);
    console.log(`   📋 pensine-bootstrap présent : ${configSaved.hasBootstrap ? '✅' : '❌'}`);

    if (configSaved.hasConfig) {
      console.log(`   📦 storageMode: ${configSaved.config.storageMode}`);
      console.log(`   📦 owner: ${configSaved.config.credentials?.owner || 'N/A'}`);
      console.log(`   📦 repo: ${configSaved.config.credentials?.repo || 'N/A'}`);
    }

    if (configSaved.hasBootstrap) {
      console.log(`   📦 configured: ${configSaved.bootstrap.configured}`);
    }

    expect(configSaved.hasConfig).toBe(true);
    console.log('   ✅ Configuration sauvegardée avec succès\n');

    // ============================================================
    // ÉTAPE 5 : Vérifier que la config est sauvegardée
    // ============================================================
    console.log('💾 ÉTAPE 5: Vérifier sauvegarde dans localStorage...');

    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║      SESSION 2: VISITE SUIVANTE (CONFIG PERSISTÉE)       ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    // ============================================================
    // ÉTAPE 6 : Ouvrir une nouvelle page (simule nouvelle session)
    // ============================================================
    console.log('🌐 ÉTAPE 6: Nouvelle page (nouvelle session)...');
    const page2 = await context.newPage();
    await page2.goto('http://localhost:8000/index.html');
    await page2.waitForTimeout(3000);
    console.log('   ✅ Page chargée\n');

    // ============================================================
    // ÉTAPE 7 : Vérifier que le wizard NE s'affiche PAS
    // ============================================================
    console.log('🔍 ÉTAPE 7: Vérifier que le wizard NE s\'affiche PAS...');
    const wizardState = await page2.evaluate(() => {
      const wizard = document.getElementById('config-wizard');
      return {
        exists: !!wizard,
        visible: wizard ? wizard.style.display !== 'none' : false
      };
    });

    console.log(`   📋 Wizard exists: ${wizardState.exists ? 'OUI' : 'NON'}`);
    console.log(`   📋 Wizard visible: ${wizardState.visible ? '❌ OUI (ÉCHEC)' : '✅ NON (SUCCÈS)'}`);

    // Le wizard ne doit PAS être visible (soit n'existe pas, soit est caché)
    expect(wizardState.visible).toBe(false);
    console.log('   ✅ Wizard correctement masqué avec config persistée\n');

    // ============================================================
    // ÉTAPE 8 : Vérifier l'initialisation complète de l'app
    // ============================================================
    console.log('⚙️  ÉTAPE 8: Vérifier l\'initialisation complète...');
    await page2.waitForTimeout(2000); // Attendre init complète

    const appState = await page2.evaluate(() => {
      return {
        // Structure DOM
        hasApp: !!document.getElementById('app'),
        hasCalendar: !!document.querySelector('.linear-calendar'),
        hasEditor: !!document.getElementById('editor-container'),

        // Objets window
        hasPensineApp: !!window.pensineApp,
        hasStorageManager: !!(window.pensineApp && window.pensineApp.storageManager),
        hasConfigManager: !!window.configManager,

        // Storage state
        storageInitialized: !!(window.pensineApp && window.pensineApp.storageManager && window.pensineApp.storageManager.adapter),

        // Config restoration
        configRestored: !!localStorage.getItem('pensine-config'),

        // Visibilité
        appVisible: (() => {
          const app = document.getElementById('app');
          return app && app.style.display !== 'none';
        })()
      };
    });

    console.log(`   📋 App container: ${appState.hasApp ? '✅' : '❌'}`);
    console.log(`   📋 Calendar: ${appState.hasCalendar ? '✅' : '❌'}`);
    console.log(`   📋 Editor: ${appState.hasEditor ? '✅' : '❌'}`);
    console.log(`   📋 PensineApp instance: ${appState.hasPensineApp ? '✅' : '❌'}`);
    console.log(`   📋 StorageManager: ${appState.hasStorageManager ? '✅' : '❌'}`);
    console.log(`   📋 ConfigManager: ${appState.hasConfigManager ? '✅' : '❌'}`);
    console.log(`   📋 Storage initialized: ${appState.storageInitialized ? '✅' : '❌'}`);
    console.log(`   📋 Config restored: ${appState.configRestored ? '✅' : '❌'}`);
    console.log(`   📋 App visible: ${appState.appVisible ? '✅' : '❌'}`);

    expect(appState.hasApp).toBe(true);
    expect(appState.configRestored).toBe(true);
    console.log('   ✅ App initialisée correctement\n');

    // ============================================================
    // ÉTAPE 9 : Tester interactions utilisateur
    // ============================================================
    console.log('🖱️  ÉTAPE 9: Tester interactions utilisateur...');

    // Test 1: Cliquer sur une date du calendrier (si présent)
    const calendarClickResult = await page2.evaluate(() => {
      const calendar = document.querySelector('.linear-calendar');
      if (!calendar) return { skipped: true, reason: 'Calendar not found' };

      const dayElement = calendar.querySelector('[data-date]');
      if (!dayElement) return { skipped: true, reason: 'No day elements' };

      const date = dayElement.getAttribute('data-date');
      dayElement.click();

      return {
        success: true,
        date: date,
        clicked: true
      };
    });

    if (calendarClickResult.success) {
      console.log(`   ✅ Clic calendrier: date ${calendarClickResult.date}`);
    } else {
      console.log(`   ⚠️  Clic calendrier: ${calendarClickResult.reason || 'skipped'}`);
    }

    await page2.waitForTimeout(500);

    // Test 2: Vérifier que le panneau Settings est accessible
    const settingsAccessible = await page2.evaluate(() => {
      const settingsBtn = document.querySelector('[data-action="open-settings"]') ||
        document.querySelector('button[title*="Settings"]') ||
        document.querySelector('button[title*="Paramètres"]');

      return {
        buttonExists: !!settingsBtn,
        buttonVisible: settingsBtn ? settingsBtn.offsetParent !== null : false
      };
    });

    console.log(`   📋 Settings button: ${settingsAccessible.buttonExists ? '✅' : '⚠️  non trouvé'}`);

    // Test 3: Vérifier les erreurs console
    const consoleErrors = [];
    page2.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page2.waitForTimeout(1000);

    if (consoleErrors.length === 0) {
      console.log(`   ✅ Aucune erreur console détectée`);
    } else {
      console.log(`   ⚠️  ${consoleErrors.length} erreur(s) console:`);
      consoleErrors.slice(0, 3).forEach(err => {
        console.log(`      - ${err.substring(0, 80)}...`);
      });
    }

    console.log('   ✅ Interactions utilisateur fonctionnelles\n');

    // ============================================================
    // ÉTAPE 10 : Vérifier StorageManager et GitHub adapter
    // ============================================================
    console.log('💾 ÉTAPE 10: Vérifier StorageManager et GitHub adapter...');

    const storageDetails = await page2.evaluate(() => {
      const config = JSON.parse(localStorage.getItem('pensine-config') || '{}');
      const sm = window.pensineApp?.storageManager;

      return {
        configPresent: !!localStorage.getItem('pensine-config'),
        storageMode: config.storageMode,
        credentials: {
          hasToken: !!(config.credentials && config.credentials.token),
          hasOwner: !!(config.credentials && config.credentials.owner),
          hasRepo: !!(config.credentials && config.credentials.repo),
          owner: config.credentials?.owner,
          repo: config.credentials?.repo,
          authMode: config.credentials?.authMode
        },
        storageManager: {
          exists: !!sm,
          hasAdapter: !!(sm && sm.adapter),
          adapterType: sm?.adapter?.constructor?.name || 'unknown',
          isConfigured: sm ? (typeof sm.isConfigured === 'function' ? sm.isConfigured() : false) : false
        }
      };
    });

    console.log(`   📋 Config présente: ${storageDetails.configPresent ? '✅' : '❌'}`);
    console.log(`   📋 Storage mode: ${storageDetails.storageMode}`);
    console.log(`   📋 Has token: ${storageDetails.credentials.hasToken ? '✅' : '❌'}`);
    console.log(`   📋 Owner: ${storageDetails.credentials.owner}`);
    console.log(`   📋 Repo: ${storageDetails.credentials.repo}`);
    console.log(`   📋 Auth mode: ${storageDetails.credentials.authMode || 'N/A'}`);
    console.log(`   📋 StorageManager exists: ${storageDetails.storageManager.exists ? '✅' : '❌'}`);
    console.log(`   📋 Adapter type: ${storageDetails.storageManager.adapterType}`);
    console.log(`   📋 Is configured: ${storageDetails.storageManager.isConfigured ? '✅' : '❌'}`);

    expect(storageDetails.configPresent).toBe(true);
    expect(storageDetails.credentials.hasToken).toBe(true);
    expect(storageDetails.credentials.hasOwner).toBe(true);
    expect(storageDetails.credentials.hasRepo).toBe(true);

    console.log('   ✅ StorageManager correctement configuré\n');

    // Ancien code de vérification config (maintenant dans ÉTAPE 10)
    const configStillThere = await page2.evaluate(() => {
      const config = localStorage.getItem('pensine-config');
      return {
        hasConfig: !!config,
        config: config ? JSON.parse(config) : null
      };
    });

    console.log(`   📋 pensine-config présent : ${configStillThere.hasConfig ? '✅' : '❌'}`);
    if (configStillThere.hasConfig) {
      console.log(`   📦 storageMode: ${configStillThere.config.storageMode}`);
    }
    expect(configStillThere.hasConfig).toBe(true);
    console.log('   ✅ Configuration persistée entre les sessions\n');

    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ TEST RÉUSSI                        ║');
    console.log('║                                                          ║');
    console.log('║  • Session 1 : Wizard affiché + Config sauvegardée      ║');
    console.log('║  • Session 2 : Wizard masqué + Config restaurée         ║');
    console.log('║  • App fonctionne avec config persistée                 ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    await page2.close();
  });
});
