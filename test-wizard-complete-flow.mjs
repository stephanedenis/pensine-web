import { firefox } from 'playwright';

/**
 * Test complet du wizard avec vraies credentials GitHub
 * Ce test crée réellement la configuration sur GitHub
 *
 * Usage:
 *   export GITHUB_TEST_TOKEN="ghp_your_token"
 *   export GITHUB_TEST_OWNER="your_username"
 *   export GITHUB_TEST_REPO="your_repo"
 *   node test-wizard-complete-flow.mjs
 */

async function testWizardCompleteFlow() {
  console.log('🧙 Testing Complete Wizard Flow with Real GitHub Credentials...\n');

  // Credentials from environment variables (NEVER HARDCODE TOKENS)
  const GITHUB_TOKEN = process.env.GITHUB_TEST_TOKEN;
  const GITHUB_OWNER = process.env.GITHUB_TEST_OWNER || 'stephanedenis';
  const GITHUB_REPO = process.env.GITHUB_TEST_REPO || 'pensine-web';

  if (!GITHUB_TOKEN) {
    console.error('❌ Missing GITHUB_TEST_TOKEN environment variable');
    console.log('Usage: export GITHUB_TEST_TOKEN="ghp_..." && node test-wizard-complete-flow.mjs');
    process.exit(1);
  }

  const browser = await firefox.launch({
    headless: false,
    slowMo: 500
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', error => {
    errors.push(error.message);
    console.log('   ❌ [page error]', error.message);
  });

  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      errors.push(text);
      console.log('   ❌ [console error]', text);
    } else if (type === 'warning') {
      console.log('   ⚠️  [console warning]', text);
    } else if (type === 'log' && (text.includes('Error') || text.includes('completing'))) {
      console.log('   ℹ️  [console log]', text);
    }
  });

  try {
    console.log('📍 Navigating to http://localhost:8000...');
    await page.goto('http://localhost:8000', { waitUntil: 'networkidle' });

    // Wait for wizard to appear
    console.log('⏳ Waiting for wizard to appear...');
    await page.waitForSelector('#config-wizard', { state: 'visible', timeout: 10000 });
    console.log('✅ Wizard is visible\n');

    let stepNumber = 1;

    while (true) {
      console.log(`📝 Step ${stepNumber}:`);
      console.log('──────────────────────────────────────────────────');

      // Take screenshot
      await page.screenshot({ path: `wizard-complete-step-${stepNumber}.png` });
      console.log(`   📸 Screenshot: wizard-complete-step-${stepNumber}.png`);

      // Get all visible inputs in wizard
      const inputs = await page.$$('#config-wizard input:visible, #config-wizard select:visible, #config-wizard textarea:visible');
      console.log(`   Input fields: ${inputs.length}`);

      // Fill inputs based on field id or name
      for (const input of inputs) {
        const type = await input.getAttribute('type');
        const id = await input.getAttribute('id');
        const name = await input.getAttribute('name') || id;
        const tagName = await input.evaluate(el => el.tagName.toLowerCase());

        if (tagName === 'select') {
          // Select first non-empty option
          const options = await input.$$('option');
          if (options.length > 1) {
            const value = await options[1].getAttribute('value');
            if (value) {
              await input.selectOption(value);
              console.log(`   ✏️  Selected option in "${id || 'select'}"`);
            }
          }
        } else if (type === 'checkbox') {
          // Keep checkboxes as-is (user choice)
          const isChecked = await input.isChecked();
          console.log(`   ℹ️  Checkbox "${id || 'checkbox'}" is ${isChecked ? 'checked' : 'unchecked'}`);
        } else if (type === 'radio') {
          // Select first radio if none selected
          const isChecked = await input.isChecked();
          if (!isChecked) {
            await input.check();
            console.log(`   ✏️  Selected radio "${id || 'radio'}"`);
          }
        } else {
          // Text input - use real credentials for GitHub fields
          let value = 'test-value';

          if (id && id.includes('token')) {
            value = GITHUB_TOKEN;
          } else if (id && id.includes('owner')) {
            value = GITHUB_OWNER;
          } else if (id && id.includes('repo')) {
            value = GITHUB_REPO;
          } else if (id && id.includes('branch')) {
            value = 'main'; // Use main branch
          } else if (type === 'email') {
            value = 'test@example.com';
          } else if (type === 'password' && id && !id.includes('token')) {
            value = 'TestPassword123';
          }

          await input.fill(value);
          const displayValue = value.includes('ghp_') ? '[TOKEN]' : value;
          console.log(`   ✏️  Filled "${id || 'field'}" with "${displayValue}"`);
        }
      }

      // Find next button
      const nextButton = await page.$('#config-wizard button:has-text("Suivant"), #config-wizard button:has-text("Next")');
      const finishButton = await page.$('#config-wizard button:has-text("Terminer"), #config-wizard button:has-text("Finish"), #config-wizard button:has-text("Complete")');

      if (finishButton) {
        console.log('   ✅ Found finish button!');
        const buttonText = await finishButton.textContent();
        console.log(`   📍 Button text: "${buttonText}"`);

        console.log('   🎉 Clicking finish button...');
        await finishButton.click();

        // Wait for either:
        // 1. Page reload (new navigation)
        // 2. Wizard to hide
        // 3. Success message
        console.log('   ⏳ Waiting for configuration to complete...');

        try {
          // Wait for wizard to disappear OR page to reload
          await Promise.race([
            page.waitForSelector('#config-wizard', { state: 'hidden', timeout: 10000 }),
            page.waitForNavigation({ timeout: 10000 }),
            page.waitForLoadState('networkidle', { timeout: 10000 })
          ]);
          console.log('   ✅ Configuration completed successfully!');
        } catch (error) {
          console.log('   ⚠️  Timeout waiting for completion, checking status...');

          // Check if wizard is still visible
          const wizardVisible = await page.isVisible('#config-wizard');
          if (!wizardVisible) {
            console.log('   ✅ Wizard is hidden - configuration likely succeeded');
          } else {
            console.log('   ❌ Wizard still visible - may have error');

            // Look for error messages
            const errorMsg = await page.$('.error-message, .alert-error');
            if (errorMsg) {
              const errorText = await errorMsg.textContent();
              console.log(`   ❌ Error message: ${errorText}`);
            }
          }
        }

        break;
      } else if (nextButton) {
        const isDisabled = await nextButton.isDisabled();
        console.log(`   ▶️  Found button: "Suivant →" ${isDisabled ? '(disabled)' : ''}`);

        if (!isDisabled) {
          console.log('   ⏭️  Clicking next...\n');
          await nextButton.click();
          await page.waitForTimeout(500); // Wait for transition
          stepNumber++;
        } else {
          console.log('   ⚠️  Next button is disabled - may need to fill required fields');
          break;
        }
      } else {
        console.log('   ℹ️  No next or finish button found');
        break;
      }

      // Safety: max 10 steps
      if (stepNumber > 10) {
        console.log('   ⚠️  Max steps reached (10), stopping');
        break;
      }
    }

    // Final screenshot
    await page.screenshot({ path: 'wizard-complete-final.png' });
    console.log('\n📸 Final screenshot: wizard-complete-final.png');

    // Check if app loaded successfully
    console.log('\n🔍 Checking app state...');
    const loadingHidden = await page.isHidden('#loading');
    const wizardHidden = await page.isHidden('#config-wizard');
    const editorVisible = await page.isVisible('#editor-container');

    console.log(`   Loading indicator: ${loadingHidden ? '✅ hidden' : '❌ visible'}`);
    console.log(`   Wizard: ${wizardHidden ? '✅ hidden' : '❌ visible'}`);
    console.log(`   Editor: ${editorVisible ? '✅ visible' : '❌ hidden'}`);

    // Check localStorage
    const localStorageData = await page.evaluate(() => {
      return {
        hasConfig: !!localStorage.getItem('pensine-config'),
        hasEncryptedToken: !!localStorage.getItem('pensine-encrypted-token'),
        hasOwner: !!localStorage.getItem('github-owner'),
        hasRepo: !!localStorage.getItem('github-repo'),
        hasStorageMode: !!localStorage.getItem('pensine-storage-mode'),
        hasGithubConfig: !!localStorage.getItem('pensine-github-config'),
        // Debug: get actual values
        config: localStorage.getItem('pensine-config'),
        owner: localStorage.getItem('github-owner'),
        repo: localStorage.getItem('github-repo'),
        storageMode: localStorage.getItem('pensine-storage-mode'),
        githubConfig: localStorage.getItem('pensine-github-config')
      };
    });

    console.log('\n💾 LocalStorage:');
    console.log(`   Config: ${localStorageData.hasConfig ? '✅ saved' : '❌ missing'}`);
    console.log(`   Token: ${localStorageData.hasEncryptedToken ? '✅ saved (encrypted)' : '❌ missing'}`);
    console.log(`   Owner: ${localStorageData.hasOwner ? '✅ saved' : '❌ missing'} (${localStorageData.owner})`);
    console.log(`   Repo: ${localStorageData.hasRepo ? '✅ saved' : '❌ missing'} (${localStorageData.repo})`);
    console.log(`   Storage Mode: ${localStorageData.hasStorageMode ? '✅ saved' : '❌ missing'} (${localStorageData.storageMode})`);
    console.log(`   GitHub Config: ${localStorageData.hasGithubConfig ? '✅ saved' : '❌ missing'}`);
    if (localStorageData.hasGithubConfig) {
      console.log(`     → ${localStorageData.githubConfig}`);
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  }

  console.log('\n📊 Summary:');
  console.log('────────────────────────────────────────────────────────────');
  console.log(`   Page errors: ${errors.length}`);
  if (errors.length > 0) {
    console.log('   Errors:');
    errors.forEach(err => console.log(`     - ${err}`));
  }

  console.log('\n⏸️  Browser will stay open for 15 seconds for inspection...');
  await page.waitForTimeout(15000);

  await browser.close();
  console.log('\n✅ Test completed');
}

testWizardCompleteFlow().catch(console.error);
