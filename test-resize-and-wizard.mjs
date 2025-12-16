import { firefox } from 'playwright';

async function testResizeAndWizard() {
  console.log('🦊 Testing resize handle and wizard flow with Firefox...\n');

  const browser = await firefox.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  const consoleMessages = [];

  // Capture console messages
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    consoleMessages.push({ type, text });
    if (type === 'error') {
      console.log(`   ❌ [${type}] ${text}`);
    }
  });

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

    // Check if wizard is visible and close it first
    const wizardInitial = await page.$('#config-wizard');
    if (wizardInitial) {
      const wizardVisible = await wizardInitial.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none';
      });

      if (wizardVisible) {
        console.log('⚠️  Wizard is open, closing it to test resize handle...');
        // Try to find close button or dismiss wizard
        const closeBtn = await page.$('#config-wizard .wizard-close') ||
          await page.$('#config-wizard button:has-text("×")') ||
          await page.$('#config-wizard .close-btn');

        if (closeBtn) {
          await closeBtn.click();
          await page.waitForTimeout(500);
          console.log('   ✅ Wizard closed');
        } else {
          // Manually hide wizard for testing
          await page.evaluate(() => {
            const wizard = document.getElementById('config-wizard');
            if (wizard) wizard.classList.add('hidden');
          });
          console.log('   ✅ Wizard hidden via script');
        }
      }
    }

    // ===========================================
    // TEST 1: Resize Handle
    // ===========================================
    console.log('\n🎯 TEST 1: Resize Handle');
    console.log('─'.repeat(50));

    const sidebar = await page.$('#sidebar');
    const handle = await page.$('#sidebar-resize-handle');

    if (!handle) {
      console.log('❌ Resize handle not found!');
    } else {
      console.log('✅ Resize handle found');

      // Get initial width
      const initialWidth = await sidebar.evaluate(el => el.offsetWidth);
      console.log(`   Initial sidebar width: ${initialWidth}px`);

      // Get handle position
      const handleBox = await handle.boundingBox();
      console.log(`   Handle position: x=${handleBox.x}, width=${handleBox.width}`);

      // Test hover effect
      await handle.hover();
      await page.waitForTimeout(500);
      console.log('   ✅ Hovered over handle');

      // Drag handle to the right
      const dragDistance = 150;
      await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(handleBox.x + handleBox.width / 2 + dragDistance, handleBox.y + handleBox.height / 2, { steps: 10 });
      await page.mouse.up();

      await page.waitForTimeout(500);

      // Check new width
      const newWidth = await sidebar.evaluate(el => el.offsetWidth);
      console.log(`   New sidebar width: ${newWidth}px (delta: ${newWidth - initialWidth}px)`);

      if (Math.abs(newWidth - initialWidth - dragDistance) < 20) {
        console.log('   ✅ Resize working! Width increased as expected');
      } else {
        console.log(`   ⚠️  Resize may not be working properly (expected ~${initialWidth + dragDistance}px, got ${newWidth}px)`);
      }

      // Check if width is saved in localStorage
      const savedWidth = await page.evaluate(() => localStorage.getItem('sidebar-width'));
      console.log(`   localStorage sidebar-width: ${savedWidth}px`);
      if (savedWidth) {
        console.log('   ✅ Width saved to localStorage');
      }
    }

    // ===========================================
    // TEST 2: Wizard Flow
    // ===========================================
    console.log('\n🎯 TEST 2: Configuration Wizard');
    console.log('─'.repeat(50));

    const wizard = await page.$('#config-wizard');
    if (!wizard) {
      console.log('❌ Wizard not found!');
    } else {
      const wizardVisible = await wizard.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none';
      });

      if (!wizardVisible) {
        console.log('❌ Wizard not visible!');
      } else {
        console.log('✅ Wizard is visible');

        // Take screenshot of wizard
        await page.screenshot({ path: 'wizard-initial.png' });
        console.log('   📸 Screenshot: wizard-initial.png');

        // Check wizard step 1
        const step1 = await page.$('#wizard-steps');
        if (step1) {
          const step1Text = await step1.textContent();
          console.log(`   Current step content: "${step1Text.substring(0, 50)}..."`);
        }

        // Try to find and click "Suivant" or "Next" button
        const nextButton = await page.$('button:has-text("Suivant")') ||
          await page.$('button:has-text("Next")') ||
          await page.$('.wizard-nav button:last-child');

        if (nextButton) {
          const buttonText = await nextButton.textContent();
          console.log(`   Found button: "${buttonText}"`);

          // Check if there are any form fields to fill first
          const inputFields = await page.$$('#wizard-steps input, #wizard-steps select');
          console.log(`   Found ${inputFields.length} input field(s)`);

          if (inputFields.length > 0) {
            // Try to fill first field if it exists
            const firstInput = inputFields[0];
            const inputType = await firstInput.getAttribute('type');
            const inputName = await firstInput.getAttribute('name') || await firstInput.getAttribute('id');
            console.log(`   First input: type="${inputType}", name="${inputName}"`);

            // Fill with test data
            if (inputType === 'radio') {
              await firstInput.click();
              console.log('   ✅ Selected radio option');
            } else if (inputType === 'text' || !inputType) {
              await firstInput.fill('test-value');
              console.log('   ✅ Filled text input');
            }

            await page.waitForTimeout(500);
          }

          // Click next button
          console.log('   Clicking next button...');
          await nextButton.click();
          await page.waitForTimeout(1000);

          // Take screenshot after click
          await page.screenshot({ path: 'wizard-step2.png' });
          console.log('   📸 Screenshot: wizard-step2.png');

          // Check if we moved to next step
          const step2Text = await page.$eval('#wizard-steps', el => el.textContent);
          if (step2Text !== step1Text) {
            console.log('   ✅ Moved to next step!');
          } else {
            console.log('   ⚠️  Still on same step (may need to fill required fields)');
          }
        } else {
          console.log('   ⚠️  Could not find next button');
        }

        // List all visible buttons in wizard
        const allButtons = await page.$$('#config-wizard button');
        console.log(`\n   📋 All buttons in wizard: ${allButtons.length}`);
        for (let i = 0; i < allButtons.length; i++) {
          const btn = allButtons[i];
          const isVisible = await btn.isVisible();
          if (isVisible) {
            const btnText = await btn.textContent();
            console.log(`      ${i + 1}. "${btnText.trim()}"`);
          }
        }
      }
    }

    // Final summary
    console.log('\n📊 Summary:');
    console.log('─'.repeat(50));
    console.log(`   Page errors: ${errors.length}`);
    console.log(`   Console errors: ${consoleMessages.filter(m => m.type === 'error').length}`);

    // Keep browser open briefly for final checks
    await page.waitForTimeout(1000);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
    console.log('\n✅ Test completed');
  }
}

testResizeAndWizard();
