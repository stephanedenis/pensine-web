/**
 * Smoke tests — vérifications post-déploiement
 *
 * Ces tests s'exécutent contre n'importe quelle URL (localhost ou pensine.org)
 * via la variable d'environnement BASE_URL ou la valeur par défaut du config.
 * Ils ne nécessitent pas de credentials GitHub.
 */
import { test, expect } from '@playwright/test';

test.describe('Smoke — chargement de base', () => {
  test('la page répond avec un titre correct', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Pensine/);
  });

  test('aucune erreur JavaScript au démarrage', async ({ page }) => {
    const jsErrors = [];
    page.on('pageerror', err => jsErrors.push(err.message));

    await page.goto('/');
    // Attendre que l'app initialise (wizard ou app principale)
    await page.waitForLoadState('networkidle');

    expect(jsErrors, `Erreurs JS: ${jsErrors.join(', ')}`).toHaveLength(0);
  });

  test('les ressources critiques se chargent (pas de 404)', async ({ page }) => {
    const failedRequests = [];
    page.on('response', response => {
      if (response.status() === 404 && !response.url().includes('favicon')) {
        failedRequests.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(
      failedRequests,
      `Ressources manquantes:\n${failedRequests.join('\n')}`
    ).toHaveLength(0);
  });
});

test.describe('Smoke — présence des éléments UI', () => {
  test('affiche le wizard ou l\'interface principale', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // L'app doit montrer soit le wizard de config, soit l'interface principale
    const hasWizard = await page.locator('#config-wizard, [data-wizard], .wizard-container').count() > 0;
    const hasApp = await page.locator('#app, #main-content, .app-container, header').count() > 0;

    expect(hasWizard || hasApp, 'Ni wizard ni interface principale visible').toBe(true);
  });

  test('les scripts principaux se chargent sans erreur réseau', async ({ page }) => {
    const scriptErrors = [];
    page.on('response', response => {
      if (
        response.status() >= 400 &&
        (response.url().includes('.js') || response.url().includes('.css'))
      ) {
        scriptErrors.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(
      scriptErrors,
      `Scripts/CSS en erreur:\n${scriptErrors.join('\n')}`
    ).toHaveLength(0);
  });
});

test.describe('Smoke — intégrité du déploiement', () => {
  test('index.html contient la version et les métadonnées', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    expect(title).toMatch(/Pensine/);

    // Vérifier qu'on n'est pas sur une page d'erreur GitHub Pages
    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/404|There isn't a GitHub Pages site here/i);
  });

  test('aucune ressource bloquée par CORS ou CSP', async ({ page }) => {
    const violations = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && (
        msg.text().includes('CORS') ||
        msg.text().includes('Content Security Policy') ||
        msg.text().includes('blocked')
      )) {
        violations.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(
      violations,
      `Violations CORS/CSP:\n${violations.join('\n')}`
    ).toHaveLength(0);
  });
});
