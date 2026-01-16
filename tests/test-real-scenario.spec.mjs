import { test, expect } from '@playwright/test';

test('Test real scenario page', async ({ page }) => {
  console.log('\n🧪 Testing real scenario page...\n');

  const errors = [];
  page.on('pageerror', error => {
    errors.push({ message: error.message, stack: error.stack });
    console.log(`❌ PAGE ERROR: ${error.message}`);
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`❌ CONSOLE ERROR: ${msg.text()}`);
    }
  });

  console.log('📍 Loading test page...');
  await page.goto('http://localhost:8001/test-real-scenario.html');
  await page.waitForTimeout(1000);

  console.log('🖱️  Clicking test button...');
  await page.click('button');

  console.log('⏳ Waiting for validation...');
  await page.waitForTimeout(4000);

  // Get result
  const result = await page.evaluate(() => {
    return document.getElementById('result').innerHTML;
  });

  console.log('\n📊 Result HTML:');
  console.log(result);

  // Check for errors
  const hasStorageAdapterError = errors.some(e => 
    e.message.includes('StorageAdapterBase') && e.message.includes('not defined')
  );

  console.log(`\n🔍 StorageAdapterBase error: ${hasStorageAdapterError ? '❌ FOUND' : '✅ NOT FOUND'}`);
  
  if (hasStorageAdapterError) {
    console.log('\n⚠️  ERROR DETAILS:');
    errors.filter(e => e.message.includes('StorageAdapterBase')).forEach(err => {
      console.log(`   Message: ${err.message}`);
      console.log(`   Stack: ${err.stack?.split('\n').slice(0, 5).join('\n')}`);
    });
  }

  expect(hasStorageAdapterError).toBe(false);
  expect(result).toContain('SUCCESS');
});
