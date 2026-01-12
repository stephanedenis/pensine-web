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
    ['html', { outputFolder: 'test-results/html' }]
  ],

  use: {
    baseURL: 'http://localhost:8000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        headless: true, // Headless par défaut
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
