/**
 * Test des imports ES6 des storage adapters
 * Vérifie que tous les adapters peuvent être importés sans erreur StorageAdapterBase
 */

import { test, expect } from '@playwright/test';

test.describe('Storage Adapter Imports', () => {
  
  test('Test all storage adapters can be imported', async ({ page }) => {
    
    const consoleErrors = [];
    const pageErrors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    page.on('pageerror', error => {
      pageErrors.push({
        message: error.message,
        stack: error.stack
      });
    });
    
    await page.goto('http://localhost:8001/index-minimal.html');
    await page.waitForTimeout(2000);
    
    // Test des imports dans le navigateur
    const importResults = await page.evaluate(async () => {
      const results = {
        base: { success: false, error: null },
        github: { success: false, error: null },
        local: { success: false, error: null },
        localGit: { success: false, error: null }
      };
      
      // Test StorageAdapterBase
      try {
        const { default: StorageAdapterBase } = await import('./src/lib/adapters/storage-adapter-base.js');
        results.base.success = true;
        results.base.type = typeof StorageAdapterBase;
        results.base.name = StorageAdapterBase.name;
      } catch (error) {
        results.base.error = error.message;
      }
      
      // Test GitHubStorageAdapter
      try {
        const { default: GitHubStorageAdapter } = await import('./src/lib/adapters/github-storage-adapter.js');
        results.github.success = true;
        results.github.type = typeof GitHubStorageAdapter;
        results.github.name = GitHubStorageAdapter.name;
        
        // Vérifier l'héritage
        const instance = new GitHubStorageAdapter();
        results.github.hasSuper = !!Object.getPrototypeOf(GitHubStorageAdapter.prototype);
        results.github.superName = Object.getPrototypeOf(GitHubStorageAdapter.prototype).constructor.name;
      } catch (error) {
        results.github.error = error.message;
        results.github.stack = error.stack;
      }
      
      // Test LocalStorageAdapter
      try {
        const { default: LocalStorageAdapter } = await import('./src/lib/adapters/local-storage-adapter.js');
        results.local.success = true;
        results.local.type = typeof LocalStorageAdapter;
        results.local.name = LocalStorageAdapter.name;
        
        const instance = new LocalStorageAdapter();
        results.local.hasSuper = !!Object.getPrototypeOf(LocalStorageAdapter.prototype);
        results.local.superName = Object.getPrototypeOf(LocalStorageAdapter.prototype).constructor.name;
      } catch (error) {
        results.local.error = error.message;
        results.local.stack = error.stack;
      }
      
      // Test LocalGitAdapter
      try {
        const { default: LocalGitAdapter } = await import('./src/lib/adapters/local-git-adapter.js');
        results.localGit.success = true;
        results.localGit.type = typeof LocalGitAdapter;
        results.localGit.name = LocalGitAdapter.name;
        
        const instance = new LocalGitAdapter();
        results.localGit.hasSuper = !!Object.getPrototypeOf(LocalGitAdapter.prototype);
        results.localGit.superName = Object.getPrototypeOf(LocalGitAdapter.prototype).constructor.name;
      } catch (error) {
        results.localGit.error = error.message;
        results.localGit.stack = error.stack;
      }
      
      return results;
    });
    
    console.log('\n📊 ========== IMPORT RESULTS ==========');
    console.log(JSON.stringify(importResults, null, 2));
    console.log('======================================\n');
    
    if (pageErrors.length > 0) {
      console.log('\n❌ ========== PAGE ERRORS ==========');
      pageErrors.forEach(err => {
        console.log(`Error: ${err.message}`);
        if (err.stack) console.log(`Stack: ${err.stack}`);
      });
      console.log('====================================\n');
    }
    
    if (consoleErrors.length > 0) {
      console.log('\n❌ ========== CONSOLE ERRORS ==========');
      consoleErrors.forEach(err => console.log(err));
      console.log('========================================\n');
    }
    
    // Assertions
    expect(importResults.base.success, 'StorageAdapterBase should import successfully').toBe(true);
    expect(importResults.github.success, 'GitHubStorageAdapter should import successfully').toBe(true);
    expect(importResults.local.success, 'LocalStorageAdapter should import successfully').toBe(true);
    expect(importResults.localGit.success, 'LocalGitAdapter should import successfully').toBe(true);
    
    // Vérifier l'héritage
    expect(importResults.github.superName).toBe('StorageAdapterBase');
    expect(importResults.local.superName).toBe('StorageAdapterBase');
    expect(importResults.localGit.superName).toBe('StorageAdapterBase');
    
    // Vérifier qu'il n'y a pas d'erreur StorageAdapterBase
    const hasStorageAdapterError = pageErrors.some(err => 
      err.message.includes('StorageAdapterBase is not defined')
    ) || consoleErrors.some(err => 
      err.includes('StorageAdapterBase is not defined')
    );
    
    expect(hasStorageAdapterError, 'Should not have StorageAdapterBase is not defined error').toBe(false);
  });
  
  test('Test wizard GitHub mode validation', async ({ page }) => {
    
    const consoleMessages = [];
    const pageErrors = [];
    
    page.on('console', msg => {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    });
    
    page.on('pageerror', error => {
      pageErrors.push({
        message: error.message,
        stack: error.stack
      });
    });
    
    await page.goto('http://localhost:8001/index-minimal.html');
    
    // Attendre que le wizard soit prêt
    await page.waitForSelector('#wizard-container', { timeout: 5000 });
    await page.waitForTimeout(1000);
    
    // Vérifier que le wizard s'affiche
    const wizardVisible = await page.evaluate(() => {
      const wizard = document.getElementById('config-wizard');
      return wizard && !wizard.classList.contains('hidden');
    });
    
    console.log(`Wizard visible: ${wizardVisible}`);
    
    if (wizardVisible) {
      // Cliquer sur "Commencer" si c'est l'étape de bienvenue
      const startBtn = await page.$('button:has-text("Commencer")');
      if (startBtn) {
        console.log('Clicking Commencer...');
        await startBtn.click();
        await page.waitForTimeout(500);
      }
      
      // Sélectionner mode GitHub
      const githubRadio = await page.$('input[value="github"]');
      if (githubRadio) {
        console.log('Selecting GitHub storage mode...');
        await githubRadio.click();
        await page.waitForTimeout(500);
        
        // Cliquer sur suivant
        const nextBtn = await page.$('[data-action="next"]');
        if (nextBtn) {
          console.log('Clicking Next...');
          await nextBtn.click();
          await page.waitForTimeout(1000);
          
          // Remplir les credentials
          await page.fill('input[name="git.owner"]', 'stephanedenis');
          await page.fill('input[name="git.repo"]', 'pensine-data');
          await page.fill('input[name="git.token"]', 'ghp_test_token');
          await page.waitForTimeout(500);
          
          // Cliquer sur valider le token
          const validateBtn = await page.$('button#validate-token-btn');
          if (validateBtn) {
            console.log('Clicking Validate Token...');
            await validateBtn.click();
            
            // Attendre 3 secondes pour voir si erreur apparaît
            await page.waitForTimeout(3000);
          }
        }
      }
    }
    
    // Capturer l'état final
    await page.screenshot({ path: '/tmp/wizard-github-test.png', fullPage: true });
    
    console.log('\n📊 ========== FINAL STATE ==========');
    console.log(`Page Errors: ${pageErrors.length}`);
    if (pageErrors.length > 0) {
      pageErrors.forEach(err => {
        console.log(`  - ${err.message}`);
      });
    }
    
    const storageAdapterErrors = consoleMessages.filter(msg => 
      msg.includes('StorageAdapterBase') || msg.includes('constructor')
    );
    
    if (storageAdapterErrors.length > 0) {
      console.log('\n❌ StorageAdapter related messages:');
      storageAdapterErrors.forEach(msg => console.log(`  ${msg}`));
    }
    
    console.log('====================================\n');
    
    // L'assertion principale
    const hasStorageAdapterError = pageErrors.some(err => 
      err.message.includes('StorageAdapterBase is not defined')
    );
    
    expect(hasStorageAdapterError, 'Should not have StorageAdapterBase is not defined error').toBe(false);
  });
  
});
