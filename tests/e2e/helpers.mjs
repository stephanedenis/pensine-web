/**
 * Helpers partagés pour les tests E2E Pensine
 *
 * Fournit :
 *  - setupGitHubMocks(page)     : intercepte les appels GitHub API avec des données de test
 *  - injectConfig(page)         : injecte une config valide dans localStorage (session retour)
 *  - TEST_OWNER / TEST_REPO     : constantes de test
 *  - JOURNAL_DATES              : dates de journal fictives pour les mocks
 */

export const TEST_OWNER = process.env.GITHUB_TEST_OWNER || 'testuser';
export const TEST_REPO  = process.env.GITHUB_TEST_REPO  || 'pensine-data';
export const TEST_TOKEN = process.env.GITHUB_TEST_TOKEN || 'ghp_test_token_placeholder';

/** Dates de journal pré-chargées dans les mocks (tri chronologique) */
export const JOURNAL_DATES = ['2025-12-15', '2025-12-16', '2025-12-17'];

/** Config localStorage complète simulant une session post-wizard */
export function makeConfig({ owner = TEST_OWNER, repo = TEST_REPO, token = TEST_TOKEN } = {}) {
  // 'local' est le seul mode accepté à la fois par bootstrap.isValidConfig()
  // ET par StorageManager.initialize(). Il évite le modal Settings en mode webdriver.
  return {
    storageMode: 'local',
    credentials: { token, owner, repo, branch: 'main', mode: 'pat' },
    version: '1.0',
  };
}

/**
 * Config remote (.pensine-config.json) avec le plugin journal activé.
 * Bootstrap la lit depuis IndexedDB pour charger les plugins.
 */
export function makeRemoteConfig() {
  return {
    version: '1.0.0',
    settings: { theme: 'auto', language: 'fr' },
    plugins: {
      journal: {
        enabled: true,
        source: 'local',
        name: 'Journal',
        icon: '📔',
        version: '0.1.0',
      },
    },
  };
}

/**
 * Intercepte tous les appels à l'API GitHub et renvoie des données de test.
 * Utiliser AVANT page.goto() pour couvrir le chargement initial.
 *
 * @param {import('@playwright/test').Page} page
 */
export async function setupGitHubMocks(page) {
  // 1. GET /user  (validation token + injection OAuthUser)
  await page.route('https://api.github.com/user', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        login: TEST_OWNER, id: 1, name: 'Test User',
        avatar_url: 'https://github.com/images/error/octocat_happy.gif',
        type: 'User',
      }),
    });
  });

  // 2. GET /user/repos  (liste des repos dans le wizard)
  await page.route('https://api.github.com/user/repos**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, name: TEST_REPO, full_name: `${TEST_OWNER}/${TEST_REPO}`,
          private: false, default_branch: 'main', description: 'Pensine data' },
      ]),
    });
  });

  // 3. GET /repos/{owner}/{repo}  (vérification repo)
  await page.route(`https://api.github.com/repos/${TEST_OWNER}/${TEST_REPO}`, route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 1, name: TEST_REPO, full_name: `${TEST_OWNER}/${TEST_REPO}`,
        default_branch: 'main', private: false,
      }),
    });
  });

  // 4. GET /repos/{owner}/{repo}/contents/journals  (liste des fichiers journal)
  await page.route(`https://api.github.com/repos/${TEST_OWNER}/${TEST_REPO}/contents/journals**`, route => {
    const url = route.request().url();
    // Si c'est une demande d'un fichier spécifique (ex: journals/2025-12-16.md)
    const fileMatch = url.match(/contents\/journals\/(\d{4}-\d{2}-\d{2}\.md)/);
    if (fileMatch) {
      const dateStr = fileMatch[1].replace('.md', '');
      const content = `# Journal du ${dateStr}\n\nEntrée de test pour ${dateStr}.\n`;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          name: `${dateStr}.md`,
          path: `journals/${dateStr}.md`,
          content: btoa(unescape(encodeURIComponent(content))),
          sha: `sha-${dateStr}`,
          size: content.length,
          type: 'file',
          encoding: 'base64',
        }),
      });
    } else {
      // Listing du dossier journals/
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          JOURNAL_DATES.map(d => ({
            name: `${d}.md`,
            path: `journals/${d}.md`,
            sha: `sha-${d}`,
            type: 'file',
            size: 50,
          }))
        ),
      });
    }
  });

  // 5. PUT /repos/{owner}/{repo}/contents/**  (sauvegarde)
  await page.route(`https://api.github.com/repos/${TEST_OWNER}/${TEST_REPO}/contents/**`, route => {
    if (route.request().method() === 'PUT') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: { name: 'file.md', path: 'file.md', sha: 'newsha123' },
          commit: { sha: 'commitsha123', message: 'update' },
        }),
      });
    } else {
      route.continue();
    }
  });

  // 6. GET .pensine-config.json dans le repo (404 = pas de config distante)
  await page.route(`https://api.github.com/repos/${TEST_OWNER}/${TEST_REPO}/contents/.pensine-config.json**`, route => {
    route.fulfill({ status: 404, contentType: 'application/json',
      body: JSON.stringify({ message: 'Not Found' }) });
  });

  // 7. GET /package.json  (version dynamique — route locale)
  await page.route('**/package.json', route => {
    const url = route.request().url();
    // Laisser passer les calls npm registry
    if (url.includes('registry.npmjs') || url.includes('npmjs.org')) {
      return route.continue();
    }
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ version: '0.0.22-test' }),
    });
  });
}

/**
 * Injecte une config Pensine dans localStorage — simule une session retour
 * (l'utilisateur a déjà complété le wizard).
 *
 * @param {import('@playwright/test').Page} page
 * @param {object} [opts]
 */
export async function injectConfig(page, opts = {}) {
  const cfg = makeConfig(opts);
  const remoteCfg = makeRemoteConfig();
  await page.evaluate(({ bootstrapCfg, remoteConfig }) => {
    // Clé lue par bootstrap.loadLocalConfig()
    localStorage.setItem('pensine-config', JSON.stringify(bootstrapCfg));
    // Clé lue par StorageManager.initialize() en fallback
    localStorage.setItem('pensine-bootstrap', JSON.stringify(bootstrapCfg));
    // Mode de stockage (lecture par certains composants legacy)
    localStorage.setItem('pensine-storage-mode', bootstrapCfg.storageMode);

    // Injecter .pensine-config.json dans IndexedDB 'pensine-local'
    // Bootstrap le lira dans loadRemoteConfig() pour activer les plugins
    return new Promise((resolve) => {
      const request = indexedDB.open('pensine-local', 1);
      request.onerror = () => resolve(); // Ne pas bloquer si erreur
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('files')) {
          const fs = db.createObjectStore('files', { keyPath: 'path' });
          fs.createIndex('type', 'type', { unique: false });
          fs.createIndex('modified', 'modified', { unique: false });
        }
        if (!db.objectStoreNames.contains('history')) {
          const hs = db.createObjectStore('history', { keyPath: 'id', autoIncrement: true });
          hs.createIndex('path', 'path', { unique: false });
          hs.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(['files'], 'readwrite');
        tx.objectStore('files').put({
          path: '.pensine-config.json',
          content: JSON.stringify(remoteConfig),
          sha: 'test-sha-config',
          modified: new Date().toISOString(),
          type: 'file',
          message: 'Test config injection',
        });
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); resolve(); };
      };
    });
  }, { bootstrapCfg: cfg, remoteConfig: remoteCfg });
}
