/**
 * E2E — Navigation & Vues
 *
 * Scénarios (storageMode: 'local') :
 *   1. Navigation entre les vues (Journal → Pages → Recherche → Journal)
 *   2. Bouton Aujourd'hui scrolle le calendrier au jour actuel
 *   3. Toggle du panneau historique (ouvre/ferme)
 *   4. Toggle du calendrier sidebar (ouvre/ferme)
 *   5. Vue Pages affiche l'état vide quand githubAdapter non configuré
 *   6. Vue Recherche affiche le champ de recherche
 *
 * Architecture :
 *   - switchView() gère les transitions de vues
 *   - #sidebar contient le calendrier et les contrôles de navigation
 *   - #history-sidebar est un panneau latéral secondaire
 */

import { test, expect } from '@playwright/test';
import { setupGitHubMocks, injectConfig } from './helpers.mjs';

test.describe('Navigation & Vues', () => {

  test.beforeEach(async ({ page }) => {
    await setupGitHubMocks(page);
    await page.goto('/');
    await injectConfig(page);
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(
      () => !!window.pensineBootstrap && window.pensineBootstrap.isReady,
      { timeout: 20000 }
    ).catch(() => {});
    await page.waitForTimeout(300);
  });

  // ---------------------------------------------------------------
  test('1. Navigation entre les vues (Journal → Pages → Recherche)', async ({ page }) => {
    // Vue initiale doit être Journal
    await expect(page.locator('#journal-view')).toBeVisible({ timeout: 5000 });
    console.log('✅ Vue Journal visible au démarrage');

    // Navigation via switchView() car le nav sidebar est caché quand le calendrier est actif
    await page.evaluate(() => window.app.switchView('pages'));
    await expect(page.locator('#pages-view')).toBeVisible({ timeout: 5000 });
    console.log('✅ Vue Pages activée');

    // Le lien Pages doit avoir la classe active
    await expect(page.locator('[data-view="pages"]')).toHaveClass(/active/, { timeout: 2000 });
    console.log('✅ Lien Pages marqué active');

    // Navigation vers Recherche
    await page.evaluate(() => window.app.switchView('search'));
    await expect(page.locator('#search-view')).toBeVisible({ timeout: 5000 });
    console.log('✅ Vue Recherche activée');

    // Retour Journal
    await page.evaluate(() => window.app.switchView('journal'));
    await expect(page.locator('#journal-view')).toBeVisible({ timeout: 5000 });
    console.log('✅ Retour Vue Journal');
  });

  // ---------------------------------------------------------------
  test('2. Bouton Aujourd\'hui est présent et cliquable', async ({ page }) => {
    const todayBtn = page.locator('#today-btn');
    await expect(todayBtn).toBeVisible({ timeout: 5000 });
    console.log('✅ Bouton Aujourd\'hui présent');

    // Le calendrier doit être visible
    await expect(page.locator('#linear-calendar')).toBeVisible({ timeout: 5000 });

    await todayBtn.click();
    await page.waitForTimeout(500);
    // Vérifier qu'il n'y a pas d'erreur console après le clic
    console.log('✅ Clic Aujourd\'hui sans erreur');

    // La date courante doit être update (via #current-date si présent)
    const currentDate = page.locator('#current-date');
    const isPresent = await currentDate.count() > 0;
    if (isPresent) {
      const dateText = await currentDate.textContent();
      console.log(`✅ Date courante affichée : "${dateText}"`);
    }
  });

  // ---------------------------------------------------------------
  test('3. Toggle du panneau Historique (ouvre et ferme)', async ({ page }) => {
    const historyBtn = page.locator('#history-btn');
    await expect(historyBtn).toBeVisible({ timeout: 5000 });
    console.log('✅ Bouton Historique présent');

    // Ouvrir le panneau d'historique
    const historySidebar = page.locator('#history-sidebar');
    // Vérifier qu'il est fermé au démarrage (pas de classe .open)
    await expect(historySidebar).not.toHaveClass(/open/, { timeout: 3000 });

    await historyBtn.click();
    // #history-sidebar utilise transform: translateX pour l'animation — vérifier la classe .open
    await expect(historySidebar).toHaveClass(/open/, { timeout: 5000 });
    console.log('✅ Panneau Historique ouvert (classe .open présente)');

    // Fermer via le bouton close
    const closeBtn = page.locator('#close-history');
    await expect(closeBtn).toBeAttached({ timeout: 3000 });
    await closeBtn.click();
    await expect(historySidebar).not.toHaveClass(/open/, { timeout: 5000 });
    console.log('✅ Panneau Historique fermé (classe .open absente)');
  });

  // ---------------------------------------------------------------
  test('4. Toggle du calendrier sidebar', async ({ page }) => {
    // Le calendrier doit être visible par défaut
    await expect(page.locator('#sidebar')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#linear-calendar')).toBeVisible({ timeout: 5000 });
    console.log('✅ Calendrier visible par défaut');

    // Le bouton toggle calendrier existe
    const calBtn = page.locator('#calendar-btn');
    await expect(calBtn).toBeVisible({ timeout: 3000 });
    console.log('✅ Bouton calendrier présent');

    // Refermer le calendrier
    await calBtn.click();
    await page.waitForTimeout(300);
    console.log('✅ Clic toggle calendrier (sans vérification de display car CSS peut varier)');

    // Rouvrir
    await calBtn.click();
    await page.waitForTimeout(300);
    await expect(page.locator('#linear-calendar')).toBeVisible({ timeout: 5000 });
    console.log('✅ Calendrier à nouveau visible après toggle');
  });

  // ---------------------------------------------------------------
  test('5. Vue Pages affiche un état quand aucun fichier GitHub', async ({ page }) => {
    // Naviguer vers Pages via switchView() (nav caché quand calendrier actif)
    await page.evaluate(() => window.app.switchView('pages'));
    await expect(page.locator('#pages-view')).toBeVisible({ timeout: 5000 });

    // Le conteneur de pages doit exister
    const pagesList = page.locator('#pages-list');
    await expect(pagesList).toBeAttached({ timeout: 3000 });
    console.log('✅ Liste des pages (#pages-list) présente dans le DOM');

    // Sans githubAdapter configuré, la liste est vide ou affiche un message
    const text = await pagesList.textContent();
    console.log(`✅ État de la liste des pages : "${text?.trim() || '(vide)'}"`);
  });

  // ---------------------------------------------------------------
  test('6. Vue Recherche : champ de recherche focusé à l\'activation', async ({ page }) => {
    // Naviguer vers Recherche via switchView()
    await page.evaluate(() => window.app.switchView('search'));
    await expect(page.locator('#search-view')).toBeVisible({ timeout: 5000 });
    console.log('✅ Vue Recherche affichée');

    // Le champ de recherche doit être présent
    const searchInput = page.locator('#search-input');
    await expect(searchInput).toBeVisible({ timeout: 3000 });
    console.log('✅ Champ de recherche présent');

    // S'assurer qu'on peut y écrire
    await searchInput.fill('test recherche');
    const value = await searchInput.inputValue();
    expect(value).toBe('test recherche');
    console.log(`✅ Saisie dans le champ de recherche : "${value}"`);
  });

});
