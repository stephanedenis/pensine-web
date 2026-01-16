import { test, expect } from '@playwright/test';

/**
 * Test complet du chargement de la page et des erreurs console
 */

test('Full browser load - Check all errors', async ({ page }) => {
  console.log('\n🧪 Testing full page load with error tracking...\n');

  const allErrors = [];
  const consoleErrors = [];
  
  // Track page errors
  page.on('pageerror', error => {
    const errorInfo = {
      type: 'pageerror',
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n') || 'N/A'
    };
    allErrors.push(errorInfo);
    console.log(`❌ PAGE ERROR: ${error.message}`);
    console.log(`   Stack: ${errorInfo.stack}`);
  });

  // Track console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      consoleErrors.push(text);
      allErrors.push({
        type: 'console',
        message: text
      });
      console.log(`❌ CONSOLE ERROR: ${text}`);
    }
  });

  console.log('📍 Navigating to http://localhost:8001/index.html...');
  await page.goto('http://localhost:8001/index.html');
  
  console.log('⏳ Waiting 5 seconds for full initialization...');
  await page.waitForTimeout(5000);
  
  console.log('\n📊 ERROR SUMMARY:');
  console.log(`   Total errors: ${allErrors.length}`);
  
  // Group errors by type
  const storageAdapterBaseErrors = allErrors.filter(e => 
    e.message.includes('StorageAdapterBase') && e.message.includes('not defined')
  );
  
  const requireErrors = allErrors.filter(e => 
    e.message.includes('require is not defined')
  );
  
  const exportErrors = allErrors.filter(e => 
    e.message.includes('Unexpected token') && e.message.includes('export')
  );
  
  const storageManagerErrors = allErrors.filter(e => 
    e.message.includes('storageManager') && e.message.includes('not defined')
  );

  console.log(`\n📋 Error breakdown:`);
  console.log(`   StorageAdapterBase errors: ${storageAdapterBaseErrors.length} ${storageAdapterBaseErrors.length === 0 ? '✅' : '❌'}`);
  console.log(`   require errors: ${requireErrors.length} ${requireErrors.length <= 1 ? '✅' : '❌'} (external CDN)`);
  console.log(`   export errors: ${exportErrors.length} ${exportErrors.length <= 1 ? '✅' : '❌'} (external)`);
  console.log(`   storageManager errors: ${storageManagerErrors.length} ${storageManagerErrors.length === 0 ? '✅' : '❌'}`);

  if (storageAdapterBaseErrors.length > 0) {
    console.log('\n⚠️  STORAGE ADAPTER BASE ERRORS DETAILS:');
    storageAdapterBaseErrors.forEach((err, i) => {
      console.log(`\n   ${i + 1}. ${err.message}`);
      console.log(`      Stack: ${err.stack}`);
    });
  }

  // Check page state
  const pageState = await page.evaluate(() => {
    return {
      storageManager: !!window.storageManager,
      configWizard: !!window.ConfigWizard,
      app: !!window.app,
      pensineApp: !!window.pensineApp,
      wizardVisible: document.getElementById('config-wizard')?.style.display !== 'none'
    };
  });

  console.log('\n🔍 Page state:');
  console.log(JSON.stringify(pageState, null, 2));

  // Main assertions
  expect(storageAdapterBaseErrors.length).toBe(0);
  expect(storageManagerErrors.length).toBe(0);
});
