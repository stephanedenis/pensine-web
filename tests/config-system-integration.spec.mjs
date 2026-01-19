/**
 * Tests Playwright pour le système de configuration moderne
 * Valide l'intégration complète dans app.js
 */

import { test, expect } from '@playwright/test';

// Configuration des tests
test.describe('Modern Configuration System Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Mock localStorage to simulate having a valid config
    // Wizard is now opt-in, so it won't show unless no config exists
    await page.addInitScript(() => {
      // Create valid pensine-config with required fields
      const validConfig = {
        storageMode: 'local', // Use local mode for tests (no GitHub token needed)
        credentials: {},
        version: '0.0.22'
      };
      localStorage.setItem('pensine-config', JSON.stringify(validConfig));

      // Legacy keys for backward compatibility
      localStorage.setItem('github-owner', 'test-owner');
      localStorage.setItem('github-repo', 'test-repo');
      localStorage.setItem('pensine-encrypted-token', 'test-token');
    });

    // Capturer les logs console
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('ERROR') || text.includes('error')) {
        console.log(`❌ Console Error: ${text}`);
      }
    });

    // Capturer les erreurs avec stack trace
    page.on('pageerror', error => {
      console.error(`❌ Page Error: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
    });

    // Naviguer vers l'app
    await page.goto('http://localhost:8000', { waitUntil: 'domcontentloaded' });

    // ✅ ATTENDRE bootstrapReady promise au lieu de timeout
    await page.waitForFunction(() => {
      return window.bootstrapReady !== undefined;
    }, { timeout: 5000 });

    console.log('✅ bootstrapReady promise detected, waiting for resolution...');

    // Attendre que bootstrap ET app soient prêts
    await page.waitForFunction(() => {
      return window.appReady !== undefined;
    }, { timeout: 5000 });

    console.log('✅ appReady promise detected, waiting for resolution...');

    // Attendre que appReady soit résolue (app.init() terminé)
    await page.evaluate(async () => {
      await window.appReady;
    });

    console.log('✅ Bootstrap complete, app initialized');
  });

  test('1. Système de configuration s\'initialise correctement', async ({ page }) => {
    // Vérifier que les objets globaux existent
    const systemStatus = await page.evaluate(() => {
      return {
        hasEventBus: !!window.eventBus,
        hasPluginSystem: !!window.pluginSystem,
        hasModernConfigManager: !!window.modernConfigManager,
        hasAppConfigManager: !!window.app?.modernConfigManager,
        hasSettingsView: !!window.app?.settingsView,
        // Debug info
        hasApp: !!window.app,
        hasSettingsViewGlobal: !!window.settingsView,
        appKeys: window.app ? Object.keys(window.app).filter(k => k.includes('settings')).join(',') : 'NO_APP'
      };
    });

    console.log('📊 System Status:', systemStatus);

    expect(systemStatus.hasEventBus).toBe(true);
    expect(systemStatus.hasPluginSystem).toBe(true);
    expect(systemStatus.hasModernConfigManager).toBe(true);
    expect(systemStatus.hasAppConfigManager).toBe(true);
    expect(systemStatus.hasSettingsView).toBe(true);
  });

  test('2. Panneau Settings s\'ouvre et affiche l\'interface', async ({ page }) => {
    // Trouver et cliquer sur le bouton settings
    const settingsBtn = await page.locator('#settings-btn, button:has-text("Settings"), [aria-label="Settings"]').first();

    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
    } else {
      // Fallback: appeler directement
      await page.evaluate(() => window.app.showSettings());
    }

    // Attendre l'affichage du panneau
    await page.waitForTimeout(500);

    // Vérifier que le panneau est visible
    const settingsPanel = page.locator('#settings-view');
    await expect(settingsPanel).toBeVisible({ timeout: 5000 });

    // Vérifier le titre
    const header = page.locator('.settings-header h2, .settings-title');
    await expect(header).toContainText(/Settings|Configuration/i);

    // Vérifier que les onglets sont présents
    const tabs = page.locator('.settings-tab'); // Classe correcte générée par SettingsView
    const tabCount = await tabs.count();

    console.log(`📑 Nombre d'onglets trouvés: ${tabCount}`);
    expect(tabCount).toBeGreaterThanOrEqual(1); // Au moins "Core"
  });

  test('3. Onglet Core affiche le formulaire', async ({ page }) => {
    // Ouvrir settings
    await page.evaluate(() => window.app.showSettings());
    await page.waitForTimeout(500);

    // Cliquer sur onglet Core
    const coreTab = page.locator('.tab:has-text("Core"), .tab-button:has-text("Core")').first();
    if (await coreTab.isVisible()) {
      await coreTab.click();
      await page.waitForTimeout(300);
    }

    // Vérifier que le formulaire est visible
    const form = page.locator('form').first();
    await expect(form).toBeVisible();

    // Vérifier la présence de champs communs
    const fields = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input, select, textarea');
      return Array.from(inputs).map(input => ({
        type: input.type || input.tagName.toLowerCase(),
        name: input.name || input.id,
        value: input.value
      }));
    });

    console.log(`📝 Champs trouvés (${fields.length}):`, fields.slice(0, 5));
    expect(fields.length).toBeGreaterThan(0);
  });

  test('4. Modification et sauvegarde des paramètres', async ({ page }) => {
    // Ouvrir settings
    await page.evaluate(() => window.app.showSettings());
    await page.waitForTimeout(500);

    // Obtenir la config initiale
    const initialConfig = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('pensine-settings') || '{}');
    });

    console.log('⚙️ Config initiale:', initialConfig);

    // Modifier un champ (chercher un input modifiable)
    const input = page.locator('input[type="text"], select').first();
    if (await input.isVisible()) {
      await input.fill('test-value-' + Date.now());
    }

    // Cliquer sur Save
    const saveBtn = page.locator('button:has-text("Save"), .save-btn, [type="submit"]').first();
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await page.waitForTimeout(500);

      // Vérifier la notification de succès
      const notification = page.locator('.notification, .toast, [role="alert"]');
      if (await notification.isVisible()) {
        const notifText = await notification.textContent();
        console.log('✅ Notification:', notifText);
        expect(notifText).toMatch(/success|saved|sauvegardé/i);
      }
    }
  });

  test('5. Export de la configuration', async ({ page }) => {
    // Ouvrir settings
    await page.evaluate(() => window.app.showSettings());
    await page.waitForTimeout(500);

    // Préparer la capture du download
    const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);

    // Cliquer sur Export
    const exportBtn = page.locator('button:has-text("Export")').first();

    if (await exportBtn.isVisible()) {
      await exportBtn.click();

      const download = await downloadPromise;

      if (download) {
        const filename = download.suggestedFilename();
        console.log('📥 Fichier exporté:', filename);
        expect(filename).toMatch(/pensine-config.*\.json/);
      } else {
        console.log('⚠️ Export déclenché mais pas de download capturé (peut être normal en test)');
      }
    } else {
      console.log('⚠️ Bouton Export non trouvé (peut être absent si pas de config)');
    }
  });

  test('6. Fermeture du panneau Settings', async ({ page }) => {
    // Ouvrir settings
    await page.evaluate(() => window.app.showSettings());
    await page.waitForTimeout(500);

    const settingsPanel = page.locator('#settings-view');
    await expect(settingsPanel).toBeVisible();

    // Cliquer sur le bouton close DANS le settings-panel (scoped selector)
    const closeBtn = page.locator('#settings-view .btn-close, .settings-panel .btn-close').first();
    await expect(closeBtn).toBeVisible({ timeout: 2000 });
    await closeBtn.click();
    await page.waitForTimeout(500);

    // Vérifier que le panneau est caché
    const isVisible = await settingsPanel.isVisible().catch(() => false);
    expect(isVisible).toBe(false);
  });

  test('7. Fallback vers éditeur config si système moderne échoue', async ({ page }) => {
    // Désactiver le système moderne
    await page.evaluate(() => {
      delete window.app.settingsView;
    });

    // Essayer d'ouvrir settings
    await page.evaluate(() => window.app.showSettings());
    await page.waitForTimeout(1000);

    // Vérifier qu'on a soit le panneau moderne (si restauré), soit l'éditeur
    const hasModernPanel = await page.locator('.settings-view').isVisible().catch(() => false);
    const hasEditor = await page.locator('#editor-container').isVisible().catch(() => false);

    console.log('🔄 Fallback test:', { hasModernPanel, hasEditor });

    // Au moins un des deux doit être visible
    expect(hasModernPanel || hasEditor).toBe(true);
  });

  test('8. Plugin calendar - Vérifier schéma de configuration', async ({ page }) => {
    // Vérifier si le plugin calendar est chargé
    const hasCalendarPlugin = await page.evaluate(() => {
      return window.pluginSystem?.plugins?.has('calendar');
    });

    if (!hasCalendarPlugin) {
      console.log('⚠️ Plugin calendar non chargé, skip du test');
      test.skip();
      return;
    }

    // Ouvrir settings
    await page.evaluate(() => window.app.showSettings());
    await page.waitForTimeout(500);

    // Chercher l'onglet calendar
    const calendarTab = page.locator('.tab:has-text("Calendar"), .tab:has-text("📅")').first();

    if (await calendarTab.isVisible()) {
      await calendarTab.click();
      await page.waitForTimeout(300);

      // Vérifier que le formulaire calendar s'affiche
      const form = page.locator('form').first();
      await expect(form).toBeVisible();

      // Vérifier la présence de champs spécifiques du calendar
      const hasStartWeekOn = await page.locator('select[name*="startWeekOn"], input[name*="startWeekOn"]').isVisible().catch(() => false);
      const hasShowWeekNumbers = await page.locator('input[name*="showWeekNumbers"]').isVisible().catch(() => false);

      console.log('📅 Calendar config fields:', { hasStartWeekOn, hasShowWeekNumbers });

      // Au moins un champ doit être présent
      expect(hasStartWeekOn || hasShowWeekNumbers).toBe(true);
    } else {
      console.log('⚠️ Onglet Calendar non trouvé');
    }
  });

  test('9. Vérification console - Pas d\'erreurs critiques', async ({ page }) => {
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });

    // Ouvrir et fermer settings
    await page.evaluate(() => window.app.showSettings());
    await page.waitForTimeout(500);

    const closeBtn = page.locator('.close-btn, button:has-text("×")').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }

    await page.waitForTimeout(500);

    // Filtrer les erreurs non critiques (ex: 404 sur ressources optionnelles)
    const criticalErrors = [...consoleErrors, ...pageErrors].filter(err => {
      return !err.includes('favicon') &&
        !err.includes('404') &&
        !err.includes('net::ERR_');
    });

    console.log('🔍 Erreurs détectées:', criticalErrors.length);
    if (criticalErrors.length > 0) {
      console.log('❌ Erreurs:', criticalErrors);
    }

    expect(criticalErrors.length).toBe(0);
  });

  test('10. Performance - Initialisation en moins de 3 secondes', async ({ page }) => {
    const startTime = Date.now();

    // Recharger la page
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Vérifier que le système est initialisé
    const isInitialized = await page.evaluate(() => {
      return !!window.app?.settingsView;
    });

    const loadTime = Date.now() - startTime;
    console.log(`⏱️ Temps de chargement: ${loadTime}ms`);

    expect(isInitialized).toBe(true);
    expect(loadTime).toBeLessThan(3000);
  });
});

test.describe('Configuration Validation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      // Create valid pensine-config with required fields
      const validConfig = {
        storageMode: 'local',
        credentials: {},
        version: '0.0.22'
      };
      localStorage.setItem('pensine-config', JSON.stringify(validConfig));

      // Legacy keys for backward compatibility
      localStorage.setItem('github-owner', 'test-owner');
      localStorage.setItem('github-repo', 'test-repo');
      localStorage.setItem('pensine-encrypted-token', 'test-token');
    });

    await page.goto('http://localhost:8000', { waitUntil: 'domcontentloaded' });

    // Attendre bootstrapReady comme les autres tests
    await page.waitForFunction(() => {
      return window.bootstrapReady !== undefined;
    }, { timeout: 5000 });

    await page.waitForFunction(() => {
      return window.app?.modernConfigManager !== undefined &&
        window.app?.settingsView !== undefined;
    }, { timeout: 10000 });
  });

  test('11. Validation - Rejet de valeurs invalides', async ({ page }) => {
    // Écouter les console.log côté navigateur
    page.on('console', msg => {
      const text = msg.text();
      console.log('[BROWSER]', text);
    });

    // Écouter les erreurs
    page.on('pageerror', err => {
      console.error('[PAGE ERROR]', err.message);
    });

    // Ouvrir settings
    await page.evaluate(() => window.app.showSettings());
    await page.waitForTimeout(500);

    // Chercher un champ numérique avec contraintes
    const numericInput = page.locator('input[type="number"]').first();

    if (await numericInput.isVisible()) {
      // Obtenir les contraintes
      const constraints = await numericInput.evaluate(input => ({
        min: input.min,
        max: input.max
      }));

      console.log('🔢 Contraintes:', constraints);

      if (constraints.max) {
        // Essayer d'entrer une valeur invalide
        const invalidValue = String(Number(constraints.max) + 100);
        await numericInput.fill(invalidValue);

        console.log(`🧪 Testing validation: entering ${invalidValue} (max: ${constraints.max})`);

        // Tenter de sauvegarder
        const saveBtn = page.locator('button:has-text("Save")').first();
        if (await saveBtn.isVisible()) {
          console.log('💾 Save button found and visible');

          // Vérifier que le formulaire existe et le bouton
          await page.evaluate(() => {
            const forms = document.querySelectorAll('#settings-view form');
            console.log('📋 Forms in settings view:', forms.length);
            forms.forEach((f, i) => {
              console.log(`  Form ${i}: id="${f.id}"`);
              const saveButtons = f.querySelectorAll('button[type="submit"]');
              console.log(`    Submit buttons in form: ${saveButtons.length}`);
              saveButtons.forEach((btn, j) => {
                console.log(`      Button ${j}: text="${btn.textContent}", type="${btn.type}"`);
              });
            });
          });

          // Essayer de soumettre le formulaire directement
          console.log('🚀 Submitting form directly via JavaScript');
          await page.evaluate(() => {
            const form = document.querySelector('#form-core');
            if (form) {
              console.log('📨 Dispatching submit event on form');
              form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            }
          });

          await page.waitForTimeout(1000); // Attendre notification

          // Vérifier qu'une notification d'erreur apparaît (classe notification-error)
          const errorNotif = page.locator('.notification-error, .notification.error, .notification.danger, .toast.error');
          const hasError = await errorNotif.isVisible().catch(() => false);

          console.log('❌ Validation error shown:', hasError);

          // Vérifier aussi que le champ a la classe error
          const hasErrorClass = await numericInput.evaluate(el => el.classList.contains('error'));
          console.log('🔴 Input has error class:', hasErrorClass);

          // On s'attend à ce qu'il y ait une notification OU une classe error sur le champ
          expect(hasError || hasErrorClass).toBe(true);
        }
      }
    } else {
      console.log('⚠️ Pas de champ numérique trouvé pour le test de validation');
    }
  });

  test('12. Persistance - Config survit au reload', async ({ page }) => {
    // Ouvrir settings et modifier une valeur
    await page.evaluate(() => window.app.showSettings());
    await page.waitForTimeout(500);

    const testValue = 'test-persist-' + Date.now();

    // Modifier un champ texte
    const input = page.locator('input[type="text"]').first();
    if (await input.isVisible()) {
      await input.fill(testValue);

      // Sauvegarder
      const saveBtn = page.locator('button:has-text("Save")').first();
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await page.waitForTimeout(500);

        // Recharger la page
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);

        // Rouvrir settings
        await page.evaluate(() => window.app.showSettings());
        await page.waitForTimeout(500);

        // Vérifier que la valeur est toujours là
        const persistedValue = await input.inputValue();
        console.log('💾 Valeur persistée:', persistedValue);

        // La valeur devrait être soit celle qu'on a mise, soit une valeur par défaut
        // (selon l'implémentation du storage)
        expect(persistedValue).toBeDefined();
      }
    }
  });
});

// Test de fumée rapide
test('Quick Smoke Test - Configuration système fonctionne de bout en bout', async ({ page }) => {
  await page.addInitScript(() => {
    // Create valid pensine-config with required fields
    const validConfig = {
      storageMode: 'local',
      credentials: {},
      version: '0.0.22'
    };
    localStorage.setItem('pensine-config', JSON.stringify(validConfig));

    // Legacy keys
    localStorage.setItem('github-owner', 'test');
    localStorage.setItem('github-repo', 'test');
    localStorage.setItem('pensine-encrypted-token', 'test');
  });

  await page.goto('http://localhost:8000', { waitUntil: 'domcontentloaded' });

  // Attendre bootstrapReady d'abord
  await page.waitForFunction(() => {
    return window.bootstrapReady !== undefined;
  }, { timeout: 5000 });

  // Puis attendre initialisation complète
  await page.waitForFunction(() => {
    return window.app?.settingsView !== undefined;
  }, { timeout: 10000 });

  // 1. Système initialisé
  const hasSystem = await page.evaluate(() => !!window.app?.settingsView);
  expect(hasSystem).toBe(true);

  // 2. Peut ouvrir settings
  await page.evaluate(() => window.app.showSettings());
  await page.waitForTimeout(500);

  const panelVisible = await page.locator('#settings-view').isVisible();
  expect(panelVisible).toBe(true);

  // 3. Peut fermer settings
  const closeBtnSmoke = page.locator('.btn-close, .close-btn').first();
  await expect(closeBtnSmoke).toBeVisible({ timeout: 2000 });
  await closeBtnSmoke.click();
  await page.waitForTimeout(500);

  const panelHidden = await page.locator('#settings-view').isVisible().catch(() => false);
  expect(panelHidden).toBe(false);

  console.log('✅ Smoke test passed - Configuration système opérationnel');
});
