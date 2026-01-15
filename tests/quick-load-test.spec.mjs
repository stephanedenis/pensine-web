import { test, expect } from '@playwright/test';

test('Quick page load test', async ({ page }) => {
  console.log('\n🧪 Quick test: loading index.html...');
  
  const errors = [];
  page.on('pageerror', (error) => {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      name: error.name
    };
    errors.push(errorInfo);
    console.log(`❌ ERROR: ${error.message}`);
    console.log(`   Stack: ${error.stack?.split('\n')[1] || 'N/A'}`);
  });

  // Load page
  await page.goto('http://localhost:8001/index.html');
  await page.waitForTimeout(3000);

  console.log(`\n📊 Total errors: ${errors.length}`);
  errors.forEach((err, i) => console.log(`  ${i + 1}. ${err.message || err}`));

  // Check for specific errors
  const hasStorageAdapterBase = errors.some(e => (e.message || e).includes('StorageAdapterBase'));
  const hasRequire = errors.some(e => (e.message || e).includes('require is not defined'));
  const hasExport = errors.some(e => (e.message || e).includes('Unexpected token'));
  const hasStorageManager = errors.some(e => (e.message || e).includes('storageManager is not defined'));

  console.log(`\n🔍 Error analysis:`);
  console.log(`  StorageAdapterBase errors: ${hasStorageAdapterBase ? '❌' : '✅'}`);
  console.log(`  require errors: ${hasRequire ? '❌' : '✅'}`);
  console.log(`  export errors: ${hasExport ? '❌' : '✅'}`);
  console.log(`  storageManager errors: ${hasStorageManager ? '❌' : '✅'}`);

  expect(hasStorageAdapterBase).toBe(false);
  expect(errors.length).toBeLessThan(5);
});
