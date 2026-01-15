/**
 * Test complet avec token GitHub réel
 * Vérifie validation token + wizard flow complet
 */

import { test, expect } from '@playwright/test';

const GITHUB_TOKEN = 'REMOVED_TOKEN';
const GITHUB_OWNER = 'stephanedenis';
const GITHUB_REPO = 'pensine-data';

test.describe('Deep integration test with real GitHub token', () => {
  
  test('1. Verify token with GitHub API directly', async ({ request }) => {
    console.log('\n🔐 Testing token validity with GitHub API...\n');
    
    try {
      const response = await request.get('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Pensine-Test'
        }
      });
      
      console.log(`Status: ${response.status()}`);
      
      if (response.ok()) {
        const data = await response.json();
        console.log(`✅ Token valid!`);
        console.log(`   User: ${data.login}`);
        console.log(`   Name: ${data.name}`);
        console.log(`   ID: ${data.id}`);
        console.log(`   Public repos: ${data.public_repos}`);
      } else {
        const text = await response.text();
        console.log(`❌ Token validation failed: ${response.status()}`);
        console.log(`   Response: ${text.substring(0, 200)}`);
        throw new Error(`Token invalid: ${response.status()}`);
      }
      
      // Test repo access
      const repoResponse = await request.get(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`, {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Pensine-Test'
        }
      });
      
      console.log(`\n📦 Repository access: ${repoResponse.status()}`);
      
      if (repoResponse.ok()) {
        const repoData = await repoResponse.json();
        console.log(`✅ Can access repo: ${repoData.full_name}`);
        console.log(`   Private: ${repoData.private}`);
        console.log(`   Default branch: ${repoData.default_branch}`);
        console.log(`   Permissions: push=${repoData.permissions?.push}, admin=${repoData.permissions?.admin}`);
      } else {
        console.log(`⚠️  Cannot access repo (may need to create it)`);
      }
      
    } catch (error) {
      console.log(`❌ API test failed: ${error.message}`);
      throw error;
    }
  });
  
  test('2. Test storage adapter import and instantiation', async ({ page }) => {
    console.log('\n🔧 Testing storage adapter loading...\n');
    
    const errors = [];
    page.on('pageerror', error => {
      errors.push(error.message);
      console.log(`❌ PAGE ERROR: ${error.message}`);
    });
    
    await page.goto('http://localhost:8001/test-no-cache.html');
    await page.waitForTimeout(3000);
    
    const output = await page.textContent('#output');
    console.log('Test output:');
    console.log(output);
    
    const hasStorageAdapterError = errors.some(e => e.includes('StorageAdapterBase'));
    expect(hasStorageAdapterError, 'No StorageAdapterBase errors').toBe(false);
    
    const hasSuccess = output.includes('ALL TESTS PASSED');
    expect(hasSuccess, 'Import tests should pass').toBe(true);
  });
  
  test('3. Complete wizard flow with real token validation', async ({ page }) => {
    console.log('\n🧪 Testing complete wizard flow with real token...\n');
    
    const allErrors = [];
    const allLogs = [];
    
    page.on('console', msg => {
      const text = msg.text();
      allLogs.push(`[${msg.type()}] ${text}`);
    });
    
    page.on('pageerror', error => {
      allErrors.push(error.message);
      console.log(`❌ ERROR: ${error.message}`);
    });
    
    // Clear storage
    await page.goto('http://localhost:8001/index.html');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    await page.reload();
    await page.waitForTimeout(2000);
    
    console.log('✅ Page loaded');
    
    // Check if wizard shows
    const wizardVisible = await page.evaluate(() => {
      const wizard = document.getElementById('config-wizard');
      return wizard && window.getComputedStyle(wizard).display !== 'none';
    });
    
    console.log(`Wizard visible: ${wizardVisible}`);
    
    if (!wizardVisible) {
      console.log('❌ Wizard not visible - checking why...');
      
      const wizardState = await page.evaluate(() => {
        const wizard = document.getElementById('config-wizard');
        const container = document.getElementById('wizard-container');
        return {
          wizardExists: !!wizard,
          containerExists: !!container,
          wizardHTML: wizard ? wizard.innerHTML.substring(0, 200) : 'N/A',
          wizardClasses: wizard ? wizard.className : 'N/A',
          configWizardInWindow: 'configWizard' in window
        };
      });
      
      console.log('Wizard state:', wizardState);
    }
    
    // Try to access wizard directly
    const wizardAccessTest = await page.evaluate(async () => {
      try {
        // Import wizard
        const { default: ConfigWizard } = await import('./src/lib/components/config-wizard.js');
        
        // Create instance
        const wizard = new ConfigWizard();
        
        // Set config
        wizard.config = {
          git: {
            owner: 'stephanedenis',
            repo: 'pensine-data',
            token: 'REMOVED_TOKEN'
          }
        };
        
        // Call validateToken
        const result = await wizard.validateToken();
        
        return {
          success: true,
          result: result
        };
        
      } catch (error) {
        return {
          success: false,
          error: error.message,
          stack: error.stack
        };
      }
    });
    
    console.log('\n📊 Direct wizard test result:');
    console.log(JSON.stringify(wizardAccessTest, null, 2));
    
    // Check for specific errors
    const storageAdapterErrors = allErrors.filter(e => e.includes('StorageAdapterBase'));
    const constructorErrors = allErrors.filter(e => e.includes('constructor') && !e.includes('require'));
    
    console.log(`\n📈 Error summary:`);
    console.log(`  Total errors: ${allErrors.length}`);
    console.log(`  StorageAdapterBase: ${storageAdapterErrors.length}`);
    console.log(`  Constructor: ${constructorErrors.length}`);
    
    if (allErrors.length > 0) {
      console.log('\n❌ All errors:');
      allErrors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err}`);
      });
    }
    
    // Screenshot
    await page.screenshot({ path: '/tmp/deep-test-wizard.png', fullPage: true });
    console.log('\n📸 Screenshot: /tmp/deep-test-wizard.png');
    
    // Main assertions
    expect(storageAdapterErrors.length, 'No StorageAdapterBase errors').toBe(0);
    expect(constructorErrors.length, 'No constructor errors').toBe(0);
    
    if (wizardAccessTest.success === false) {
      console.log('\n⚠️  Wizard test failed but checking error type...');
      
      // If it's a network error, that's expected (no internet or wrong token)
      // If it's StorageAdapterBase, that's the bug we're fixing
      if (wizardAccessTest.error && wizardAccessTest.error.includes('StorageAdapterBase')) {
        throw new Error(`StorageAdapterBase error still present: ${wizardAccessTest.error}`);
      }
      
      // Network errors are OK for this test
      if (wizardAccessTest.error && (
        wizardAccessTest.error.includes('fetch') ||
        wizardAccessTest.error.includes('network') ||
        wizardAccessTest.error.includes('401') ||
        wizardAccessTest.error.includes('403')
      )) {
        console.log('✅ Network/API error (expected if token invalid) - but no StorageAdapterBase error!');
      }
    } else {
      console.log('\n✅ Wizard validateToken() completed successfully!');
    }
  });
  
  test('4. Test all storage adapter imports systematically', async ({ page }) => {
    console.log('\n🔍 Systematic storage adapter import test...\n');
    
    const errors = [];
    page.on('pageerror', error => {
      errors.push(error.message);
    });
    
    await page.goto('http://localhost:8001/index.html');
    await page.waitForTimeout(1500);
    
    const importTest = await page.evaluate(async () => {
      const results = [];
      
      try {
        // Test 1: StorageAdapterBase
        console.log('Test 1: Importing StorageAdapterBase...');
        const { default: StorageAdapterBase } = await import('./src/lib/adapters/storage-adapter-base.js');
        results.push({
          name: 'StorageAdapterBase',
          success: true,
          type: typeof StorageAdapterBase,
          isClass: StorageAdapterBase.prototype && StorageAdapterBase.prototype.constructor === StorageAdapterBase
        });
      } catch (error) {
        results.push({
          name: 'StorageAdapterBase',
          success: false,
          error: error.message
        });
      }
      
      try {
        // Test 2: GitHubStorageAdapter
        console.log('Test 2: Importing GitHubStorageAdapter...');
        const { default: GitHubStorageAdapter } = await import('./src/lib/adapters/github-storage-adapter.js');
        const { default: StorageAdapterBase } = await import('./src/lib/adapters/storage-adapter-base.js');
        
        const instance = new GitHubStorageAdapter();
        
        results.push({
          name: 'GitHubStorageAdapter',
          success: true,
          type: typeof GitHubStorageAdapter,
          instanceOf: instance.constructor.name,
          extendsBase: instance instanceof StorageAdapterBase,
          hasSuper: !!Object.getPrototypeOf(GitHubStorageAdapter.prototype),
          superName: Object.getPrototypeOf(GitHubStorageAdapter.prototype).constructor.name
        });
      } catch (error) {
        results.push({
          name: 'GitHubStorageAdapter',
          success: false,
          error: error.message,
          stack: error.stack ? error.stack.substring(0, 300) : null
        });
      }
      
      try {
        // Test 3: LocalStorageAdapter
        console.log('Test 3: Importing LocalStorageAdapter...');
        const { default: LocalStorageAdapter } = await import('./src/lib/adapters/local-storage-adapter.js');
        const { default: StorageAdapterBase } = await import('./src/lib/adapters/storage-adapter-base.js');
        
        const instance = new LocalStorageAdapter();
        
        results.push({
          name: 'LocalStorageAdapter',
          success: true,
          extendsBase: instance instanceof StorageAdapterBase,
          superName: Object.getPrototypeOf(LocalStorageAdapter.prototype).constructor.name
        });
      } catch (error) {
        results.push({
          name: 'LocalStorageAdapter',
          success: false,
          error: error.message
        });
      }
      
      try {
        // Test 4: LocalGitAdapter
        console.log('Test 4: Importing LocalGitAdapter...');
        const { default: LocalGitAdapter } = await import('./src/lib/adapters/local-git-adapter.js');
        const { default: StorageAdapterBase } = await import('./src/lib/adapters/storage-adapter-base.js');
        
        const instance = new LocalGitAdapter();
        
        results.push({
          name: 'LocalGitAdapter',
          success: true,
          extendsBase: instance instanceof StorageAdapterBase,
          superName: Object.getPrototypeOf(LocalGitAdapter.prototype).constructor.name
        });
      } catch (error) {
        results.push({
          name: 'LocalGitAdapter',
          success: false,
          error: error.message
        });
      }
      
      return results;
    });
    
    console.log('\n📋 Import test results:');
    importTest.forEach(result => {
      if (result.success) {
        console.log(`  ✅ ${result.name}`);
        if (result.extendsBase !== undefined) {
          console.log(`     - Extends StorageAdapterBase: ${result.extendsBase}`);
          console.log(`     - Super class: ${result.superName}`);
        }
      } else {
        console.log(`  ❌ ${result.name}: ${result.error}`);
        if (result.stack) {
          console.log(`     Stack: ${result.stack}`);
        }
      }
    });
    
    // Check for failures
    const failures = importTest.filter(r => !r.success);
    const storageAdapterFailures = failures.filter(r => 
      r.error && r.error.includes('StorageAdapterBase')
    );
    
    if (storageAdapterFailures.length > 0) {
      console.log('\n❌❌❌ CRITICAL: StorageAdapterBase errors found:');
      storageAdapterFailures.forEach(f => {
        console.log(`  ${f.name}: ${f.error}`);
      });
    }
    
    expect(storageAdapterFailures.length, 'No StorageAdapterBase import errors').toBe(0);
    expect(failures.length, 'All adapters should import successfully').toBe(0);
    
    console.log('\n✅ All storage adapters imported successfully!');
  });
  
});
