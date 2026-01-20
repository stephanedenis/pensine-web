import { defineConfig, devices } from '@playwright/test';

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
    baseURL: 'http://localhost:8000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'msedge',
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge', // Utiliser Microsoft Edge installé
        headless: false, // Mode visible pour débugger
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],

  // Démarrer le serveur web avant les tests
  webServer: {
    command: 'python3 -m http.server 8000',
    url: 'http://localhost:8000',
    reuseExistingServer: true, // Réutiliser si déjà démarré
    timeout: 10000,
  },
});
