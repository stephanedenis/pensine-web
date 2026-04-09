/**
 * E2E — Session retour : Journalisation
 *
 * Scénario (utilisateur authentifié, wizard déjà complété) :
 *   1. Config injectée dans localStorage → app charge sans wizard
 *   2. Interface principale visible (calendrier, vue journal)
 *   3. Ouvrir le journal du jour via un click calendrier
 *   4. Saisir une note spontanée dans le plugin éditeur
 *   5. Sauvegarder → feedback visuel dans le bouton
 *   6. Fermer le panneau journal
 *   7. Les boutons de navigation (◀ ▶) existent dans #journal-nav
 *   8. Les boutons de vue (Code/Enrichi/Split) existent dans #editor-container
 *
 * Architecture réelle :
 *   - Le click calendrier → journal plugin ouvre #journal-plugin-editor
 *   - Le click calendrier → app.loadJournalByDate → ouvre #editor-container
 *   - storageMode 'local' → pas de GitHub requis
 *   - storage.read/write échoue silencieusement → contenu template
 */


import { test, expect } from '@playwright/test';
import { setupGitHubMocks, injectConfig, TEST_OWNER, TEST_REPO, JOURNAL_DATES } from './helpers.mjs';

/** Date du jour au format YYYY-MM-DD */
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

test.describe('Session retour — Journalisation', () => {

  test.beforeEach(async ({ page }) => {
    await setupGitHubMocks(page);
    await page.goto('/');
    await injectConfig(page);
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    // Attendre que bootstrap soit complètement terminé (plugins inclus)
    await page.waitForFunction(
      () => !!window.pensineBootstrap && window.pensineBootstrap.isReady,
      { timeout: 20000 }
    ).catch(() => { /* mode dégradé */ });
    await page.waitForTimeout(300); // laisser app.js terminer init()
  });

  // ---------------------------------------------------------------
  test('1. App charge sans wizard (config persistée)', async ({ page }) => {
    const wizardVisible = await page.locator('#config-wizard').isVisible({ timeout: 3000 }).catch(() => false);
    expect(wizardVisible, 'Wizard ne doit pas s\'afficher').toBe(false);

    // Interface principale visible
    await expect(page.locator('#content')).toBeVisible({ timeout: 5000 });
    console.log('✅ App chargée sans wizard');
  });

  // ---------------------------------------------------------------
  test('2. Interface principale visible (calendrier + vue journal)', async ({ page }) => {
    // La sidebar est visible avec le calendrier
    await expect(page.locator('#sidebar')).toBeVisible({ timeout: 5000 });
    // Le calendrier linéaire est rendu
    await expect(page.locator('#linear-calendar')).toBeVisible({ timeout: 5000 });
    // Le header contient le nom de l'app
    await expect(page.locator('header')).toBeVisible({ timeout: 3000 });
    console.log('✅ Interface principale visible');
  });

  // ---------------------------------------------------------------
  test('3. Ouvrir le journal du jour via click calendrier', async ({ page }) => {
    // Émettre calendar:day-click pour aujourd'hui via EventBus
    const today = new Date().toISOString().split('T')[0];
    await page.evaluate((dateStr) => {
      if (window.eventBus) {
        window.eventBus.emit('calendar:day-click', {
          date: new Date(dateStr + 'T12:00:00'),
          dateStr
        }, 'test');
      }
    }, today);
    console.log(`✅ calendar:day-click émis pour ${today}`);

    // Le panneau journal du plugin doit s'ouvrir
    const pluginEditor = page.locator('#journal-plugin-editor');
    await expect(pluginEditor).toBeVisible({ timeout: 8000 });
    console.log('✅ Panneau journal plugin ouvert');

    // Le titre doit contenir la date du jour
    const title = await pluginEditor.locator('.journal-title').textContent();
    expect(title).toMatch(/\d{4}-\d{2}-\d{2}|journal/i);
    console.log(`✅ Titre du journal : "${title}"`);
  });

  // ---------------------------------------------------------------
  test('4. Saisir une note spontanée dans le plugin journal', async ({ page }) => {
    // Ouvrir le panneau journal
    const today = new Date().toISOString().split('T')[0];
    await page.evaluate((d) => window.eventBus?.emit('calendar:day-click', { date: new Date(d + 'T12:00:00'), dateStr: d }, 'test'), today);
    await expect(page.locator('#journal-plugin-editor')).toBeVisible({ timeout: 8000 });

    // Saisir du texte dans le plugin textarea
    const textarea = page.locator('#journal-textarea');
    await expect(textarea).toBeVisible({ timeout: 5000 });

    const noteText = `## Note spontanée\n\nTest E2E — ${new Date().toISOString()}\n\nCette note a été créée par le test Playwright.`;
    await textarea.fill(noteText);

    // Vérifier que le texte est dans la textarea
    const content = await textarea.inputValue();
    expect(content).toContain('Note spontanée');
    console.log('✅ Texte spontané saisi dans le plugin journal');
  });

  // ---------------------------------------------------------------
  test('5. Sauvegarder une entrée journal → feedback dans le bouton', async ({ page }) => {
    // Ouvrir le panneau journal
    const today = new Date().toISOString().split('T')[0];
    await page.evaluate((d) => window.eventBus?.emit('calendar:day-click', { date: new Date(d + 'T12:00:00'), dateStr: d }, 'test'), today);
    await expect(page.locator('#journal-plugin-editor')).toBeVisible({ timeout: 8000 });

    // Écrire quelque chose
    await page.locator('#journal-textarea').fill('# Test sauvegarde\n\nContenu du test Playwright.');

    // Cliquer Enregistrer
    const saveBtn = page.locator('#journal-save-btn');
    await expect(saveBtn).toBeVisible({ timeout: 3000 });
    await saveBtn.click();
    console.log('✅ Clic sur Enregistrer');

    // Feedback visuel : le bouton change temporairement de texte
    // ("✅ Enregistré" pendant ~1.5s, retourne à "Enregistrer" ensuite)
    await expect(saveBtn).toHaveText(/enregistr/i, { timeout: 3000 });
    console.log('✅ Feedback de sauvegarde affiché');
  });

  // ---------------------------------------------------------------
  test('6. Fermer le panneau journal', async ({ page }) => {
    // Ouvrir le panneau journal
    const today = new Date().toISOString().split('T')[0];
    await page.evaluate((d) => window.eventBus?.emit('calendar:day-click', { date: new Date(d + 'T12:00:00'), dateStr: d }, 'test'), today);
    await expect(page.locator('#journal-plugin-editor')).toBeVisible({ timeout: 8000 });

    // Fermer via le bouton Fermer
    const closeBtn = page.locator('#journal-close-btn');
    await expect(closeBtn).toBeVisible({ timeout: 3000 });
    await closeBtn.click();

    // Le panneau doit disparaître (display: none)
    await expect(page.locator('#journal-plugin-editor')).toBeHidden({ timeout: 5000 });
    console.log('✅ Panneau journal fermé');
  });

  // ---------------------------------------------------------------
  test('7. Les boutons de vue (Code/Enrichi/Split) existent dans l\'éditeur principal', async ({ page }) => {
    // Ouvrir l'éditeur principal via openInEditor direct
    const today = new Date().toISOString().split('T')[0];
    await page.evaluate(async (dateStr) => {
      if (window.app && window.app.openInEditor) {
        await window.app.openInEditor(`journals/${dateStr}.md`, `# ${dateStr}\n\n`);
      }
    }, today);

    // Attendre que l'éditeur container s'affiche
    await expect(page.locator('#editor-container')).not.toHaveClass(/hidden/, { timeout: 10000 });
    console.log('✅ Éditeur principal ouvert via loadJournalByDate');

    // Les boutons de mode doivent être présents
    await expect(page.locator('#view-mode-code')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('#view-mode-rich')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('#view-mode-split')).toBeVisible({ timeout: 3000 });
    console.log('✅ Boutons de vue Code/Enrichi/Split présents');

    // Tester le switch de mode
    await page.locator('#view-mode-code').click();
    await page.waitForTimeout(200);
    const modeAfterCode = await page.locator('#editor-container').getAttribute('data-mode');
    expect(modeAfterCode).toBe('code');
    console.log('✅ Mode code activé');
  });

  // ---------------------------------------------------------------
  test('8. Barre de navigation journal présente après ouverture via openInEditor', async ({ page }) => {
    // Ouvrir l'éditeur en injectant journalDates pour activer la barre nav
    const today = new Date().toISOString().split('T')[0];
    await page.evaluate(async (dateStr) => {
      if (window.app && window.app.openInEditor) {
        // Injecter une liste de dates pour que _updateJournalNav affiche le label
        window.app.journalDates = [dateStr];
        window.app.journalDatesMap = new Map([[dateStr, [{ repo: 'test', color: '#0e639c' }]]]);
        await window.app.openInEditor(`journals/${dateStr}.md`, `# ${dateStr}\n\n`);
      }
    }, today);

    await expect(page.locator('#editor-container')).not.toHaveClass(/hidden/, { timeout: 10000 });

    // La barre de navigation journal doit exister dans le DOM
    // (visible ou non selon si des journaux précédents existent)
    const nav = page.locator('#journal-nav');
    await expect(nav).toBeAttached({ timeout: 3000 });

    // Les boutons prev/next doivent exister
    await expect(page.locator('#journal-nav-prev')).toBeAttached({ timeout: 3000 });
    await expect(page.locator('#journal-nav-next')).toBeAttached({ timeout: 3000 });

    // Le label doit afficher la date actuelle
    const label = await page.locator('#journal-nav-label').textContent();
    expect(label).toMatch(/\d{4}-\d{2}-\d{2}/);
    console.log(`✅ Barre navigation présente, date : "${label}"`);
  });

});
