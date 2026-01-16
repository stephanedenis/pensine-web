import { test } from '@playwright/test';

test('Test bootstrap wizard import', async ({ page }) => {
  console.log('\n🧪 Testing bootstrap wizard import...\n');

  await page.goto('http://localhost:8001/index.html');
  await page.waitForTimeout(2000);

  const importTest = await page.evaluate(async () => {
    const results = { imports: [], baseLocation: window.location.href };

    // Test different paths from bootstrap.js perspective
    const paths = [
      '../src/lib/components/config-wizard.js',
      '/src/lib/components/config-wizard.js',
      './src/lib/components/config-wizard.js',
      'src/lib/components/config-wizard.js'
    ];

    for (const path of paths) {
      try {
        const start = Date.now();
        const module = await import(path);
        const duration = Date.now() - start;
        results.imports.push({
          path,
          success: true,
          hasDefault: !!module.default,
          className: module.default?.name,
          duration: `${duration}ms`
        });
      } catch (error) {
        results.imports.push({
          path,
          success: false,
          error: error.message,
          errorType: error.constructor.name
        });
      }
    }

    return results;
  });

  console.log('📦 Import test results:');
  console.log(`   Base location: ${importTest.baseLocation}`);
  console.log('\n   Results:');
  
  importTest.imports.forEach((imp, i) => {
    console.log(`\n   ${i + 1}. Path: ${imp.path}`);
    if (imp.success) {
      console.log(`      ✅ SUCCESS`);
      console.log(`      - Has default: ${imp.hasDefault}`);
      console.log(`      - Class name: ${imp.className}`);
      console.log(`      - Duration: ${imp.duration}`);
    } else {
      console.log(`      ❌ FAILED`);
      console.log(`      - Error: ${imp.error}`);
      console.log(`      - Type: ${imp.errorType}`);
    }
  });

  // Find working path
  const workingPath = importTest.imports.find(i => i.success);
  if (workingPath) {
    console.log(`\n✅ Working import path: "${workingPath.path}"`);
  } else {
    console.log('\n❌ No working import path found!');
  }
});
