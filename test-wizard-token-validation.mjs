/**
 * Test: Token Validation in Wizard
 * Validates Phase 1 implementation
 */

import { chromium } from 'playwright';

const TEST_TOKEN = process.env.GITHUB_TEST_TOKEN;

if (!TEST_TOKEN) {
  console.error('❌ GITHUB_TEST_TOKEN environment variable required');
  process.exit(1);
}

(async () => {
  console.log('🚀 Starting token validation test...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to app
    await page.goto('http://localhost:8000');
    console.log('✅ Page loaded');

    // Wait for wizard
    await page.waitForSelector('#config-wizard', { state: 'visible', timeout: 5000 });
    console.log('✅ Wizard visible');

    // Step 1: Welcome - Click Next
    await page.click('[data-action="next"]');
    await page.waitForTimeout(500);
    console.log('✅ Step 1: Welcome → Next');

    // Step 2: Platform - Keep GitHub (default), Click Next
    await page.click('[data-action="next"]');
    await page.waitForTimeout(500);
    console.log('✅ Step 2: Platform → Next');

    // Step 3: Credentials - Token validation
    console.log('\n📝 Step 3: Testing token validation...');

    // Check that repo fields are disabled
    const ownerInput = await page.$('#wizard-owner');
    const repoInput = await page.$('#wizard-repo');
    const branchInput = await page.$('#wizard-branch');

    const ownerDisabled = await ownerInput.isDisabled();
    const repoDisabled = await repoInput.isDisabled();
    const branchDisabled = await branchInput.isDisabled();

    console.log(`  Owner field disabled: ${ownerDisabled ? '✅' : '❌'}`);
    console.log(`  Repo field disabled: ${repoDisabled ? '✅' : '❌'}`);
    console.log(`  Branch field disabled: ${branchDisabled ? '✅' : '❌'}`);

    // Fill token
    await page.fill('#wizard-token', TEST_TOKEN);
    console.log('  ✅ Token filled');

    // Click validate button
    const validateBtn = await page.$('#validate-token-btn');
    if (!validateBtn) {
      throw new Error('Validate button not found!');
    }

    await validateBtn.click();
    console.log('  🔍 Validating token...');

    // Wait for validation (max 10s)
    await page.waitForTimeout(2000);

    // Check for success message
    const successBox = await page.$('.wizard-success-box');
    const errorBox = await page.$('.wizard-error-box');

    if (successBox) {
      const successText = await successBox.innerText();
      console.log(`\n✅ Token validated successfully!`);
      console.log(`  ${successText.replace(/\n/g, '\n  ')}`);

      // Check that fields are now enabled
      const ownerEnabled = !(await ownerInput.isDisabled());
      const repoEnabled = !(await repoInput.isDisabled());
      console.log(`\n  Owner field enabled: ${ownerEnabled ? '✅' : '❌'}`);
      console.log(`  Repo field enabled: ${repoEnabled ? '✅' : '❌'}`);

      // Check owner field is auto-filled
      const ownerValue = await ownerInput.inputValue();
      console.log(`  Owner auto-filled: ${ownerValue ? '✅ ' + ownerValue : '❌'}`);

      // Check Next button is still disabled (repo not filled)
      const nextBtn = await page.$('[data-action="next"]');
      const nextDisabled = await nextBtn.isDisabled();
      console.log(`  Next button disabled (repo empty): ${nextDisabled ? '✅' : '❌'}`);

      // Fill repo name
      await page.fill('#wizard-repo', 'Pensine-Test');
      await page.waitForTimeout(500);

      // Check Next button is now enabled
      const nextEnabledAfter = !(await nextBtn.isDisabled());
      console.log(`  Next button enabled (repo filled): ${nextEnabledAfter ? '✅' : '❌'}`);

    } else if (errorBox) {
      const errorText = await errorBox.innerText();
      console.log(`\n❌ Token validation failed:`);
      console.log(`  ${errorText.replace(/\n/g, '\n  ')}`);
    } else {
      console.log(`\n⚠️ No success or error message found`);
    }

    // Take screenshot
    await page.screenshot({ path: 'wizard-token-validation.png', fullPage: true });
    console.log(`\n📸 Screenshot saved: wizard-token-validation.png`);

    console.log('\n⏸️  Browser will stay open for 10 seconds...');
    await page.waitForTimeout(10000);

    console.log('\n✅ Test completed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    await page.screenshot({ path: 'wizard-token-validation-error.png', fullPage: true });
    console.log('📸 Error screenshot saved');
  } finally {
    await browser.close();
  }
})();
