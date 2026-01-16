import { test, expect } from '@playwright/test';

test('Bootstrap execution trace', async ({ page }) => {
  console.log('\n🧪 Tracing bootstrap.js execution...\n');

  const logs = [];
  
  page.on('console', msg => {
    const text = msg.text();
    logs.push({ type: msg.type(), text });
    
    // Log bootstrap messages
    if (text.includes('bootstrap') || text.includes('Bootstrap') || 
        text.includes('storageManager') || text.includes('StorageManager')) {
      console.log(`📝 ${msg.type().toUpperCase()}: ${text}`);
    }
  });

  console.log('📍 Loading page...');
  await page.goto('http://localhost:8001/index.html');
  
  await page.waitForTimeout(3000);

  // Check what happened
  const bootstrapStatus = await page.evaluate(() => {
    return {
      storageManagerExists: !!window.storageManager,
      bootstrapClass: typeof window.PensineBootstrap,
      bootstrapInstance: !!window.pensineBootstrap,
      appExists: !!window.app,
      configWizardExists: !!window.ConfigWizard,
      localStorageBootstrap: localStorage.getItem('pensine-bootstrap')
    };
  });

  console.log('\n📊 Bootstrap status:');
  console.log(JSON.stringify(bootstrapStatus, null, 2));

  // Search logs for bootstrap activity
  const bootstrapLogs = logs.filter(l => 
    l.text.toLowerCase().includes('bootstrap') ||
    l.text.toLowerCase().includes('storagemanager')
  );

  console.log(`\n📋 Bootstrap-related logs (${bootstrapLogs.length}):`);
  bootstrapLogs.forEach(log => {
    console.log(`   ${log.type}: ${log.text}`);
  });
});
