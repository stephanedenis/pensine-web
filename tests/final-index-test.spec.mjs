/**
 * Test final avec index.html réel
 */

import { test, expect } from '@playwright/test';

test('Final test with real index.html', async ({ page }) => {
  
  const errors = [];
  
  page.on('pageerror', error => {
    errors.push(error.message);
    console.log(`❌ ERROR: ${error.message}`);
  });
  
  console.log('\n🚀 Testing with REAL index.html (not minimal)\n');
  
  // Test avec index.html
  await page.goto('http://localhost:8001/index.html');
  await page.waitForTimeout(3000);
  
  console.log(`✅ Page loaded`);
  console.log(`Errors captured: ${errors.length}`);
  
  const storageAdapterErrors = errors.filter(e => e.includes('StorageAdapterBase'));
  const constructorErrors = errors.filter(e => e.includes('constructor'));
  const requireErrors = errors.filter(e => e.includes('require is not defined'));
  
  console.log(`  - StorageAdapterBase errors: ${storageAdapterErrors.length}`);
  console.log(`  - Constructor errors: ${constructorErrors.length}`);
  console.log(`  - Require errors: ${requireErrors.length} (expected, from buffer CDN)`);
  
  if (storageAdapterErrors.length > 0) {
    console.log('\n❌ StorageAdapterBase errors found:');
    storageAdapterErrors.forEach(e => console.log(`  ${e}`));
  }
  
  await page.screenshot({ path: '/tmp/final-test-index.png', fullPage: true });
  console.log('\n📸 Screenshot: /tmp/final-test-index.png\n');
  
  expect(storageAdapterErrors.length, 'Should have ZERO StorageAdapterBase errors').toBe(0);
  expect(constructorErrors.length, 'Should have ZERO constructor errors').toBe(0);
  
  if (storageAdapterErrors.length === 0) {
    console.log('✅✅✅ SUCCESS! No StorageAdapterBase errors with index.html!\n');
  }
});
