/**
 * E2E — Première visite : Création de compte via le wizard
 *
 * Scénario :
 *   1. Page vierge (localStorage vide) → le wizard s'affiche
 *   2. Bienvenue → clic Suivant
 *   3. Choix plateforme → sélectionner GitHub → Suivant
 *   4. Authentification → entrer owner + token → Valider → Suivant
 *   5. Sélection repository → choisir le repo → Suivant
 *   6. Préférences → laisser par défaut → Terminer
 *   7. App chargée : pas de wizard, calendrier visible
 *
 * Variables d'environnement (optionnelles pour override) :
 *   GITHUB_TEST_TOKEN, GITHUB_TEST_OWNER, GITHUB_TEST_REPO
 */

import { test, expect } from '@playwright/test';
import { setupGitHubMocks, TEST_OWNER, TEST_TOKEN, TEST_REPO } from './helpers.mjs';

test.describe('Première visite — Wizard de configuration', () => {

  test.beforeEach(async ({ page }) => {
    // Intercepter GitHub API avant le chargement de la page
    await setupGitHubMocks(page);

    await page.goto('/');

    // Vider la config pour simuler une vraie première visite
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  // ---------------------------------------------------------------
  test('1. Le wizard s\'affiche à la première visite', async ({ page }) => {
    const wizard = page.locator('#config-wizard');
    await expect(wizard).toBeVisible({ timeout: 8000 });
  });

  // ---------------------------------------------------------------
  test('2. Aucune erreur JavaScript au démarrage du wizard', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    // Attendre le wizard
    await expect(page.locator('#config-wizard')).toBeVisible({ timeout: 8000 });

    const critical = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('net::ERR_ABORTED')
    );
    expect(critical, `Erreurs JS : ${critical.join('\n')}`).toHaveLength(0);
  });

  // ---------------------------------------------------------------
  test('3. Flux complet : wizard → app chargée', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    // ── Étape 0 : Wizard visible ─────────────────────────────────
    await expect(page.locator('#config-wizard')).toBeVisible({ timeout: 8000 });
    console.log('✅ Wizard visible');

    // ── Étape 1 : Bienvenue → Suivant ────────────────────────────
    const firstNext = page.locator('[data-action="next"]').first();
    await expect(firstNext).toBeEnabled({ timeout: 5000 });
    await firstNext.click();
    await page.waitForTimeout(500);
    console.log('✅ Étape Bienvenue → Suivant cliqué');

    // ── Étape 2 : Choisir GitHub ──────────────────────────────────
    // La plateforme GitHub peut être un bouton radio ou une carte cliquable
    const githubOption = page.locator('[data-platform="github"], input[value="github"], .platform-card:has-text("GitHub")').first();
    if (await githubOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await githubOption.click();
      console.log('✅ GitHub sélectionné');
    }

    const nextPlatform = page.locator('[data-action="next"]').first();
    await expect(nextPlatform).toBeEnabled({ timeout: 5000 });
    await nextPlatform.click();
    await page.waitForTimeout(500);
    console.log('✅ Étape Plateforme → Suivant cliqué');

    // ── Étape 3 : Authentification ────────────────────────────────
    const ownerInput = page.locator('#wizard-owner');
    const tokenInput = page.locator('#wizard-token');

    await expect(ownerInput).toBeVisible({ timeout: 5000 });
    await ownerInput.fill(TEST_OWNER);
    await tokenInput.fill(TEST_TOKEN);
    console.log('✅ Credentials remplis');

    // Valider le token (appel GitHub /user — mocké)
    const validateBtn = page.locator('#validate-token-btn');
    await expect(validateBtn).toBeEnabled({ timeout: 3000 });
    await validateBtn.click();

    // Attendre la validation (icône ✅ ou bouton disabled indique succès)
    await expect(validateBtn).toHaveText(/Token validé|✅/, { timeout: 10000 });
    console.log('✅ Token validé');

    // Passer à l'étape suivante
    const nextAuth = page.locator('[data-action="next"]').first();
    await expect(nextAuth).toBeEnabled({ timeout: 5000 });
    await nextAuth.click();
    await page.waitForTimeout(800);
    console.log('✅ Étape Auth → Suivant cliqué');

    // ── Étape 4 : Sélection du repository ────────────────────────
    // Le repo chargé depuis l'API (mocké) doit apparaître
    const repoItem = page.locator(`[data-repo-name="${TEST_REPO}"], .repo-item:has-text("${TEST_REPO}")`).first();
    if (await repoItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await repoItem.click();
      console.log(`✅ Repository "${TEST_REPO}" sélectionné`);
    } else {
      // Fallback: saisir manuellement si champ visible
      const manualRepofField = page.locator('input[placeholder*="repository"], input[id*="repo"]').first();
      if (await manualRepofField.isVisible({ timeout: 2000 }).catch(() => false)) {
        await manualRepofField.fill(TEST_REPO);
        console.log(`✅ Repository "${TEST_REPO}" saisi manuellement`);
      }
    }

    const nextRepo = page.locator('[data-action="next"]').first();
    await expect(nextRepo).toBeEnabled({ timeout: 5000 });
    await nextRepo.click();
    await page.waitForTimeout(500);
    console.log('✅ Étape Repos → Suivant cliqué');

    // ── Étape 5 : Préférences + Terminer ─────────────────────────
    // Soit bouton Suivant si des prefs existent, soit Terminer directement
    const completeBtn = page.locator('[data-action="complete"]').first();
    const nextPref = page.locator('[data-action="next"]').first();

    if (await nextPref.isVisible({ timeout: 2000 }).catch(() => false) &&
        await nextPref.isEnabled({ timeout: 1000 }).catch(() => false)) {
      await nextPref.click();
      await page.waitForTimeout(500);
    }

    // Cliquer Terminer
    await expect(completeBtn).toBeVisible({ timeout: 5000 });
    await expect(completeBtn).toBeEnabled({ timeout: 5000 });
    await completeBtn.click();
    console.log('✅ Terminer cliqué');

    // ── Vérification finale : App chargée ─────────────────────────
    // Le wizard doit disparaître et l'app charger
    await expect(page.locator('#config-wizard')).toBeHidden({ timeout: 10000 });
    console.log('✅ Wizard fermé');

    // La config doit être en localStorage
    const savedConfig = await page.evaluate(() => localStorage.getItem('pensine-config'));
    expect(savedConfig, 'Config doit être sauvegardée dans localStorage').toBeTruthy();

    const config = JSON.parse(savedConfig);
    expect(config.storageMode).toBe('github');
    expect(config.credentials.owner).toBe(TEST_OWNER);
    console.log('✅ Config sauvegardée dans localStorage');

    // Pas d'erreurs JS critiques
    const critical = errors.filter(e =>
      !e.includes('favicon') && !e.includes('net::ERR_ABORTED')
    );
    expect(critical, `Erreurs JS : ${critical.join('\n')}`).toHaveLength(0);
  });

  // ---------------------------------------------------------------
  test('4. Deuxième visite après wizard → pas de wizard', async ({ page }) => {
    // Injecter une config typique post-wizard
    await page.evaluate(({ owner, repo, token }) => {
      const cfg = {
        storageMode: 'github',
        credentials: { token, owner, repo, branch: 'main', mode: 'pat' },
        version: '1.0',
      };
      localStorage.setItem('pensine-config', JSON.stringify(cfg));
      localStorage.setItem('pensine-bootstrap', JSON.stringify(cfg));
      localStorage.setItem('github-owner', owner);
      localStorage.setItem('github-repo', repo);
      localStorage.setItem('pensine-storage-mode', 'github');
      sessionStorage.setItem('pensine-oauth-token', token);
    }, { owner: TEST_OWNER, repo: TEST_REPO, token: TEST_TOKEN });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Le wizard ne doit PAS s'afficher
    const wizard = page.locator('#config-wizard');
    const wizardVisible = await wizard.isVisible({ timeout: 3000 }).catch(() => false);
    expect(wizardVisible, 'Le wizard ne doit pas s\'afficher en session retour').toBe(false);
    console.log('✅ Pas de wizard en session retour');
  });

});
