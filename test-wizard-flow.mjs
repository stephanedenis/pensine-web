import { firefox } from 'playwright';

async function testWizardFlow() {
  console.log('🦊 Testing Configuration Wizard Flow with Firefox...\n');

  const browser = await firefox.launch({ headless: false, slowMo: 800 });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];

  // Capture page errors
  page.on('pageerror', error => {
    errors.push(error.message);
    console.log(`   ❌ Page Error: ${error.message}`);
  });

  try {
    // Navigate to app
    console.log('📍 Navigating to http://localhost:8000...');
    await page.goto('http://localhost:8000', {
      waitUntil: 'networkidle',
      timeout: 10000
    });

    await page.waitForTimeout(2000);

    // ===========================================
    // Wizard Flow Test
    // ===========================================
    console.log('\n🎯 Configuration Wizard Flow');
    console.log('─'.repeat(60));

    const wizard = await page.$('#config-wizard');
    if (!wizard) {
      console.log('❌ Wizard not found!');
      return;
    }

    const wizardVisible = await wizard.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none';
    });

    if (!wizardVisible) {
      console.log('❌ Wizard not visible!');
      return;
    }

    console.log('✅ Wizard is visible\n');

    // Take initial screenshot
    await page.screenshot({ path: 'wizard-step-0.png', fullPage: true });
    console.log('📸 Screenshot: wizard-step-0.png');

    // Get wizard steps container
    const stepsContainer = await page.$('#wizard-steps');

    // Function to capture current step info
    async function captureStepInfo(stepNum) {
      console.log(`\n📝 Step ${stepNum}:`);
      console.log('─'.repeat(50));

      const stepText = await stepsContainer.textContent();
      const firstLine = stepText.split('\n')[0].trim();
      console.log(`   Title: "${firstLine}"`);

      // Find all inputs
      const inputs = await page.$$('#wizard-steps input, #wizard-steps select, #wizard-steps textarea');
      console.log(`   Input fields: ${inputs.length}`);

      for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i];
        const tagName = await input.evaluate(el => el.tagName.toLowerCase());
        const type = await input.evaluate(el => el.type || el.tagName.toLowerCase());
        const name = await input.evaluate(el => el.name || el.id || '(unnamed)');
        const label = await input.evaluate(el => {
          const id = el.id;
          if (id) {
            const labelEl = document.querySelector(`label[for="${id}"]`);
            if (labelEl) return labelEl.textContent.trim();
          }
          return '';
        });

        console.log(`      ${i + 1}. ${tagName}[type=${type}] name="${name}" label="${label}"`);
      }

      // Find buttons
      const buttons = await page.$$('#config-wizard button:visible');
      console.log(`   Buttons: ${buttons.length}`);
      for (let i = 0; i < buttons.length; i++) {
        const btn = buttons[i];
        const btnText = await btn.textContent();
        const disabled = await btn.isDisabled();
        console.log(`      ${i + 1}. "${btnText.trim()}" ${disabled ? '(disabled)' : ''}`);
      }
    }

    // Capture initial step
    await captureStepInfo(1);

    // Try to fill and progress through steps
    let stepNum = 1;
    const maxSteps = 5;

    while (stepNum <= maxSteps) {
      // Take screenshot
      await page.screenshot({ path: `wizard-step-${stepNum}.png`, fullPage: true });
      console.log(`   📸 Screenshot: wizard-step-${stepNum}.png`);

      // Find "Next" or "Suivant" button
      const nextButton = await page.$('button:has-text("Suivant")') ||
        await page.$('button:has-text("Next")') ||
        await page.$('.wizard-nav button:last-child:not(:disabled)');

      if (!nextButton) {
        console.log('   ℹ️  No next button found (might be last step)');

        // Check for finish/complete button
        const finishButton = await page.$('button:has-text("Terminer")') ||
          await page.$('button:has-text("Finish")') ||
          await page.$('button:has-text("Complete")');

        if (finishButton) {
          console.log('   ✅ Found finish button!');
          const btnText = await finishButton.textContent();
          console.log(`   📍 Button text: "${btnText.trim()}"`);

          // Don't click finish in test mode
          console.log('   ⏭️  Stopping here (would finish wizard)');
        }
        break;
      }

      const nextBtnText = await nextButton.textContent();
      console.log(`   ▶️  Found button: "${nextBtnText.trim()}"`);

      // Try to fill required fields before clicking next
      const inputs = await page.$$('#wizard-steps input:not([type="hidden"]), #wizard-steps select, #wizard-steps textarea');

      for (const input of inputs) {
        const tagName = await input.evaluate(el => el.tagName.toLowerCase());
        const type = await input.evaluate(el => el.type || tagName);
        const required = await input.evaluate(el => el.required || el.hasAttribute('required'));
        const name = await input.evaluate(el => el.name || el.id);

        if (tagName === 'select') {
          // Select first non-empty option
          const options = await input.$$('option');
          if (options.length > 1) {
            const firstValue = await options[1].evaluate(el => el.value);
            if (firstValue) {
              await input.selectOption(firstValue);
              console.log(`   ✏️  Selected option in "${name}"`);
            }
          }
        } else if (type === 'radio') {
          // Click first radio button in group
          const checked = await input.isChecked();
          if (!checked) {
            await input.click();
            console.log(`   ✏️  Selected radio "${name}"`);
            break; // Only select one radio per group
          }
        } else if (type === 'checkbox') {
          // Check if required
          if (required) {
            const checked = await input.isChecked();
            if (!checked) {
              await input.click();
              console.log(`   ✏️  Checked "${name}"`);
            }
          }
        } else if (type === 'text' || type === 'email' || type === 'password' || tagName === 'textarea') {
          const value = await input.inputValue();
          if (!value && required) {
            const testValue = type === 'email' ? 'test@example.com' :
              type === 'password' ? 'TestPassword123' :
                name.includes('token') ? 'ghp_test1234567890' :
                  name.includes('owner') ? 'testuser' :
                    name.includes('repo') ? 'testrepo' :
                      'test-value';
            await input.fill(testValue);
            console.log(`   ✏️  Filled "${name}" with "${testValue}"`);
          }
        }
      }

      await page.waitForTimeout(500);

      // Check if next button is still disabled
      const isDisabled = await nextButton.isDisabled();
      if (isDisabled) {
        console.log('   ⚠️  Next button is disabled (missing required fields?)');
        break;
      }

      // Click next
      console.log('   ⏭️  Clicking next...');
      await nextButton.click();
      await page.waitForTimeout(1000);

      stepNum++;

      // Capture next step
      await captureStepInfo(stepNum);
    }

    console.log('\n📊 Summary:');
    console.log('─'.repeat(60));
    console.log(`   Steps completed: ${stepNum - 1}`);
    console.log(`   Page errors: ${errors.length}`);
    console.log(`   Screenshots saved: ${stepNum}`);

    // Keep browser open for inspection
    console.log('\n⏸️  Browser will stay open for 10 seconds for inspection...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
    console.log('\n✅ Test completed');
  }
}

testWizardFlow();
