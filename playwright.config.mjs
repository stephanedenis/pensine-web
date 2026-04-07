import { defineConfig, devices } from '@playwright/test';

// BASE_URL permet de pointer sur pensine.org en CI post-déploiement
// Exemple : BASE_URL=https://pensine.org npx playwright test tests/smoke.spec.mjs
const BASE_URL = process.env.BASE_URL || 'http://localhost:8000';
const isRemote = BASE_URL.startsWith('https://');

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.mjs',
  fullyParallel: false, // Tests séquentiels pour éviter conflits localStorage
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Un seul worker pour tests séquentiels
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report' }]
  ],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium-ci',
      use: {
        ...devices['Desktop Chrome'],
        headless: true,
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'msedge',
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge', // Utiliser Microsoft Edge installé localement
        headless: false,   // Mode visible pour débugger en local
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],

  // Serveur web local uniquement quand on ne pointe pas sur une URL distante
  webServer: isRemote ? undefined : {
    command: 'python3 -m http.server 8000',
    url: 'http://localhost:8000',
    reuseExistingServer: true,
    timeout: 10000,
  },
});
