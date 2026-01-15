/**
 * Test interactif - ouvre le browser et teste pas à pas
 */

import { test } from '@playwright/test';

test('Interactive test with slow-mo', async ({ page }) => {

  // Capture all errors
  page.on('pageerror', error => {
    console.log(`\n❌❌❌ PAGE ERROR: ${error.message}`);
    console.log(`Stack: ${error.stack}\n`);
  });

  // Open test page
  await page.goto('http://localhost:8001/test-direct-wizard.html');

  console.log('\n📖 Test page loaded. Running automated tests...\n');

  // Wait for page to load
  await page.waitForTimeout(1000);

  // Test 1: Imports
  console.log('=== Running Test 1: Imports ===');
  await page.click('button:has-text("1. Test Imports")');
  await page.waitForTimeout(2000);

  let output = await page.textContent('#output');
  console.log(output);

  // Test 2: Wizard Init
  console.log('\n=== Running Test 2: Wizard Init ===');
  await page.click('button:has-text("2. Test Wizard Init")');
  await page.waitForTimeout(2000);

  output = await page.textContent('#output');
  console.log(output.split('\n').slice(-15).join('\n'));

  // Test 3: Validate Token
  console.log('\n=== Running Test 3: Validate Token ===');
  await page.click('button:has-text("3. Test ValidateToken")');
  await page.waitForTimeout(3000);

  output = await page.textContent('#output');
  console.log(output.split('\n').slice(-20).join('\n'));

  // Screenshot
  await page.screenshot({ path: '/tmp/interactive-test-result.png', fullPage: true });
  console.log('\n📸 Screenshot: /tmp/interactive-test-result.png\n');

  // Keep browser open for manual inspection
  console.log('🔍 Check the output above for any StorageAdapterBase errors\n');

  await page.waitForTimeout(2000);
});
