/**
 * E2E — Calendrier : Navigation et création d'entrées journal
 *
 * Scénario (storageMode: 'local' — pas de GitHub requis) :
 *   1. App chargée avec config injectée, calendrier visible par défaut
 *   2. Cliquer sur un jour → journal plugin ouvre #journal-plugin-editor
 *   3. Barre de navigation (prev/next) après ouverture via loadJournalByDate
 *   4. Navigation prev/next entre entrées (journalDates injectées)
 *   5. Créer une nouvelle entrée depuis aujourd'hui
 *   6. Documenter un événement structuré
 *   7. Fermer et rouvrir le même jour
 *
 * Architecture réelle :
 *   - calendar:day-click via eventBus → journal plugin (#journal-plugin-editor)
 *   - window.app.loadJournalByDate() → #editor-container (#journal-nav)
 *   - storageMode 'local' → pas de GitHub requis
 */

import { test, expect } from '@playwright/test';
import { setupGitHubMocks, injectConfig, JOURNAL_DATES } from './helpers.mjs';

/** Émettre calendar:day-click pour une date donnée */
async function clickCalendarDay(page, dateStr) {
  await page.evaluate((d) => {
    if (window.eventBus) {
      const [y, m, day] = d.split('-').map(Number);
      window.eventBus.emit('calendar:day-click', {
        date: new Date(y, m - 1, day),
        dateStr: d
      }, 'test');
    }
  }, dateStr);
}

/** Ouvrir journal via loadJournalByDate (chemin #editor-container) */
async function openJournalByDate(page, dateStr) {
  await page.evaluate((d) => {
    if (window.app && window.app.loadJournalByDate) {
      const [y, m, day] = d.split('-').map(Number);
      window.app.loadJournalByDate(new Date(y, m - 1, day), []);
    }
  }, dateStr);
}

test.describe('Calendrier — Entrées journal + Navigation', () => {

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
  test('1. Le calendrier linéaire est visible dans la sidebar', async ({ page }) => {
    await expect(page.locator('#sidebar')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#linear-calendar')).toBeVisible({ timeout: 8000 });
    console.log('✅ Calendrier linéaire visible dans la sidebar');

    // Des cellules de jours sont rendues
    const dayCells = page.locator('#linear-calendar [cursor="pointer"], #linear-calendar .calendar-day, #linear-calendar [class*="day"]');
    const count = await dayCells.count();
    expect(count, 'Le calendrier doit avoir des cellules de jours').toBeGreaterThan(20);
    console.log(`✅ ${count} cellules de jours rendues`);
  });

  // ---------------------------------------------------------------
  test('2. Cliquer sur un jour → journal plugin ouvre une entrée', async ({ page }) => {
    const today = new Date().toISOString().split('T')[0];
    await clickCalendarDay(page, today);
    console.log(`✅ calendar:day-click émis pour ${today}`);

    const pluginEditor = page.locator('#journal-plugin-editor');
    await expect(pluginEditor).toBeVisible({ timeout: 8000 });
    console.log('✅ Panneau journal plugin ouvert');

    const title = await pluginEditor.locator('.journal-title').textContent();
    expect(title).toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(title).toContain(today);
    console.log(`✅ Titre : "${title}"`);

    await expect(pluginEditor.locator('#journal-textarea')).toBeVisible({ timeout: 3000 });
    console.log('✅ Textarea du journal accessible');
  });

  // ---------------------------------------------------------------
  test('3. Barre de navigation journal après ouverture via openInEditor', async ({ page }) => {
    const today = new Date().toISOString().split('T')[0];
    await page.evaluate(async (dateStr) => {
      if (window.app && window.app.openInEditor) {
        // Injecter journalDates pour que _updateJournalNav affiche le label
        window.app.journalDates = [dateStr];
        window.app.journalDatesMap = new Map([[dateStr, [{ repo: 'test', color: '#0e639c' }]]]);
        await window.app.openInEditor(`journals/${dateStr}.md`, `# ${dateStr}\n\n`);
      }
    }, today);
    await expect(page.locator('#editor-container')).not.toHaveClass(/hidden/, { timeout: 10000 });
    console.log('✅ Éditeur principal ouvert');

    await expect(page.locator('#journal-nav')).toBeAttached({ timeout: 3000 });
    await expect(page.locator('#journal-nav-prev')).toBeAttached({ timeout: 3000 });
    await expect(page.locator('#journal-nav-next')).toBeAttached({ timeout: 3000 });

    const label = await page.locator('#journal-nav-label').textContent();
    expect(label).toMatch(/\d{4}-\d{2}-\d{2}/);
    console.log(`✅ Navigation journal présente — date : "${label}"`);
  });

  // ---------------------------------------------------------------
  test('4. Naviguer prev/next entre entrées journal (dates injectées)', async ({ page }) => {
    // Injecter journalDates pour activer la navigation
    await page.evaluate((dates) => {
      if (window.app) {
        window.app.journalDates = dates;
        window.app.journalDatesMap = new Map(
          dates.map(d => [d, [{ repo: 'pensine-data', color: '#0e639c' }]])
        );
      }
    }, JOURNAL_DATES);

    const midDate = JOURNAL_DATES[1];
    await page.evaluate(async (dateStr) => {
      if (window.app && window.app.openInEditor) {
        await window.app.openInEditor(`journals/${dateStr}.md`, `# ${dateStr}\n\n`);
      }
    }, midDate);
    await expect(page.locator('#editor-container')).not.toHaveClass(/hidden/, { timeout: 10000 });

    const midLabel = await page.locator('#journal-nav-label').textContent();
    expect(midLabel).toBe(midDate);
    console.log(`✅ Date médiane ouverte : ${midLabel}`);

    const prevBtn = page.locator('#journal-nav-prev');
    const nextBtn = page.locator('#journal-nav-next');
    await expect(prevBtn).not.toBeDisabled({ timeout: 3000 });
    await expect(nextBtn).not.toBeDisabled({ timeout: 3000 });
    console.log('✅ Boutons ◀ ▶ actifs pour la date médiane');

    // Navigation ◀
    await prevBtn.click();
    await page.waitForTimeout(500);
    const prevLabel = await page.locator('#journal-nav-label').textContent();
    expect(prevLabel).toBe(JOURNAL_DATES[0]);
    console.log(`✅ Navigation ◀ → ${prevLabel}`);
    await expect(prevBtn).toBeDisabled({ timeout: 3000 });
    console.log('✅ Bouton ◀ disabled en début de liste');

    // Navigation ▶ × 2
    await nextBtn.click();
    await page.waitForTimeout(500);
    await nextBtn.click();
    await page.waitForTimeout(500);
    const lastLabel = await page.locator('#journal-nav-label').textContent();
    expect(lastLabel).toBe(JOURNAL_DATES[2]);
    console.log(`✅ Navigation ▶▶ → ${lastLabel} (dernière entrée)`);
    await expect(nextBtn).toBeDisabled({ timeout: 3000 });
    console.log('✅ Bouton ▶ disabled en fin de liste');
  });

  // ---------------------------------------------------------------
  test('5. Créer une nouvelle entrée journal via le panneau plugin', async ({ page }) => {
    const today = new Date().toISOString().split('T')[0];
    await clickCalendarDay(page, today);
    await expect(page.locator('#journal-plugin-editor')).toBeVisible({ timeout: 8000 });

    const textarea = page.locator('#journal-textarea');
    const newEntry = `# Nouvelle entrée — ${today}\n\nCrée via le calendrier — test Playwright.`;
    await textarea.fill(newEntry);

    const content = await textarea.inputValue();
    expect(content).toContain('Nouvelle entrée');
    console.log('✅ Nouvelle entrée rédigée');

    const saveBtn = page.locator('#journal-save-btn');
    await expect(saveBtn).toBeVisible({ timeout: 3000 });
    await saveBtn.click();
    await expect(saveBtn).toHaveText(/enregistr/i, { timeout: 3000 });
    console.log('✅ Feedback de sauvegarde affiché');
  });

  // ---------------------------------------------------------------
  test('6. Documenter un événement structuré (titre, participants, décisions)', async ({ page }) => {
    const today = new Date().toISOString().split('T')[0];
    await clickCalendarDay(page, today);
    await expect(page.locator('#journal-plugin-editor')).toBeVisible({ timeout: 8000 });

    const eventEntry = [
      `# 🗓️ Réunion de lancement — ${today}`,
      ``,
      `## Participants`,
      `- Alice, Bob, Charlie`,
      ``,
      `## Points abordés`,
      `1. Roadmap Q2 validée`,
      `2. Prise en charge du module X`,
      ``,
      `## Décisions`,
      `- [ ] Alice prépare le Figma`,
      `- [ ] Bob rédige les specs`,
      `- [x] Charlie livre le fix ✅`,
    ].join('\n');

    const textarea = page.locator('#journal-textarea');
    await textarea.fill(eventEntry);

    const content = await textarea.inputValue();
    expect(content).toContain('Réunion de lancement');
    expect(content).toContain('Participants');
    expect(content).toContain('Décisions');
    expect(content).toContain('[ ]');
    console.log('✅ Événement structuré documenté dans le journal');

    await page.locator('#journal-save-btn').click();
    await expect(page.locator('#journal-save-btn')).toHaveText(/enregistr/i, { timeout: 3000 });
    console.log('✅ Événement sauvegardé');
  });

  // ---------------------------------------------------------------
  test('7. Fermer et rouvrir le panneau journal', async ({ page }) => {
    const today = new Date().toISOString().split('T')[0];

    // Ouvrir
    await clickCalendarDay(page, today);
    await expect(page.locator('#journal-plugin-editor')).toBeVisible({ timeout: 8000 });
    console.log('✅ Panneau journal ouvert');

    // Fermer
    await page.locator('#journal-close-btn').click();
    await expect(page.locator('#journal-plugin-editor')).toBeHidden({ timeout: 5000 });
    console.log('✅ Panneau journal fermé');

    // Rouvrir le même jour
    await clickCalendarDay(page, today);
    await expect(page.locator('#journal-plugin-editor')).toBeVisible({ timeout: 8000 });
    console.log('✅ Panneau journal rouvert pour le même jour');

    await expect(page.locator('#journal-textarea')).toBeVisible({ timeout: 3000 });
    console.log('✅ Textarea accessible au réouverture');
  });

});
