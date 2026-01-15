/**
 * Test exact du scénario utilisateur - Validation GitHub avec vrai token
 */

import { test, expect } from '@playwright/test';

test('Exact user scenario - GitHub validation', async ({ page }) => {
  
  const allErrors = [];
  const allLogs = [];
  
  // Capture TOUT
  page.on('console', msg => {
    const text = msg.text();
    allLogs.push(`[${msg.type()}] ${text}`);
    if (msg.type() === 'error') {
      console.log(`❌ CONSOLE ERROR: ${text}`);
    }
  });
  
  page.on('pageerror', error => {
    allErrors.push({
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    console.log(`\n❌❌❌ PAGE ERROR: ${error.message}`);
    if (error.stack) {
      console.log(`Stack: ${error.stack.substring(0, 200)}`);
    }
  });
  
  page.on('requestfailed', request => {
    console.log(`🔴 Request failed: ${request.url()}`);
  });
  
  console.log('\n🚀 Starting exact user scenario test...\n');
  
  // 1. Clear tout
  await page.goto('http://localhost:8001/index-minimal.html');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  
  console.log('✅ 1. Page loaded and cleared');
  
  // 2. Attendre wizard
  await page.waitForTimeout(2000);
  
  const wizardExists = await page.evaluate(() => {
    return !!document.getElementById('config-wizard');
  });
  
  console.log(`✅ 2. Wizard exists: ${wizardExists}`);
  
  if (!wizardExists) {
    console.log('❌ WIZARD NOT FOUND - Cannot continue test');
    await page.screenshot({ path: '/tmp/no-wizard.png', fullPage: true });
    throw new Error('Wizard not found');
  }
  
  // 3. Trouver et remplir le formulaire GitHub
  console.log('📝 3. Looking for GitHub form fields...');
  
  // Attendre que les inputs soient présents
  await page.waitForTimeout(1000);
  
  const formState = await page.evaluate(() => {
    const ownerInput = document.querySelector('input[name="git.owner"]');
    const repoInput = document.querySelector('input[name="git.repo"]'); 
    const tokenInput = document.querySelector('input[name="git.token"]');
    const validateBtn = document.querySelector('button#validate-token-btn');
    
    return {
      hasOwner: !!ownerInput,
      hasRepo: !!repoInput,
      hasToken: !!tokenInput,
      hasValidateBtn: !!validateBtn,
      ownerVisible: ownerInput ? !ownerInput.offsetParent === null : false,
      validateBtnVisible: validateBtn ? !validateBtn.offsetParent === null : false
    };
  });
  
  console.log('Form state:', formState);
  
  // Si les champs ne sont pas visibles, peut-être qu'on est à l'étape de bienvenue
  if (!formState.hasOwner) {
    console.log('📍 GitHub form not visible, maybe need to navigate wizard...');
    
    // Chercher bouton Commencer
    const welcomeBtn = await page.$('button:has-text("Commencer")');
    if (welcomeBtn) {
      console.log('  → Clicking Commencer...');
      await welcomeBtn.click();
      await page.waitForTimeout(800);
    }
    
    // Sélectionner GitHub mode
    const githubRadio = await page.$('input[value="github"]');
    if (githubRadio) {
      console.log('  → Selecting GitHub mode...');
      await githubRadio.click();
      await page.waitForTimeout(500);
      
      // Cliquer Next
      const nextBtn = await page.$('[data-action="next"]:not([disabled])');
      if (nextBtn) {
        console.log('  → Clicking Next...');
        await nextBtn.click();
        await page.waitForTimeout(1000);
      }
    }
  }
  
  // 4. Remplir credentials (comme l'utilisateur le fait)
  console.log('📝 4. Filling credentials...');
  
  await page.fill('input[name="git.owner"]', 'stephanedenis');
  await page.fill('input[name="git.repo"]', 'pensine-data');
  await page.fill('input[name="git.token"]', 'ghp_real_token_here');
  
  console.log('✅ Credentials filled');
  await page.waitForTimeout(500);
  
  // 5. Cliquer sur Valider le token - C'EST LÀ QUE L'ERREUR DEVRAIT APPARAÎTRE
  console.log('\n🔍 5. CLICKING VALIDATE TOKEN - This is where error happens...\n');
  
  const validateBtn = await page.$('button#validate-token-btn');
  
  if (!validateBtn) {
    console.log('❌ VALIDATE BUTTON NOT FOUND');
    await page.screenshot({ path: '/tmp/no-validate-btn.png', fullPage: true });
  } else {
    const isVisible = await validateBtn.isVisible();
    const isEnabled = await validateBtn.isEnabled();
    console.log(`Validate button: visible=${isVisible}, enabled=${isEnabled}`);
    
    if (isVisible) {
      // Clear errors before click
      allErrors.length = 0;
      
      console.log('👉 CLICKING VALIDATE NOW...');
      await validateBtn.click();
      
      console.log('⏳ Waiting 3 seconds for validation to complete or error to occur...');
      await page.waitForTimeout(3000);
      
      console.log('✅ Validation attempt completed (or timed out)');
    }
  }
  
  // 6. Rapport final
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL REPORT');
  console.log('='.repeat(60));
  
  console.log(`\nTotal page errors: ${allErrors.length}`);
  if (allErrors.length > 0) {
    console.log('\n❌ ERRORS CAPTURED:');
    allErrors.forEach((err, i) => {
      console.log(`\n  [${i + 1}] ${err.timestamp}`);
      console.log(`      Message: ${err.message}`);
      if (err.stack) {
        console.log(`      Stack: ${err.stack.substring(0, 300)}`);
      }
    });
  }
  
  // Chercher erreurs spécifiques
  const storageAdapterErrors = allErrors.filter(err => 
    err.message.includes('StorageAdapterBase')
  );
  
  const constructorErrors = allErrors.filter(err =>
    err.message.includes('constructor')
  );
  
  const otherErrors = allErrors.filter(err =>
    !err.message.includes('require is not defined') &&
    !err.message.includes('StorageAdapterBase') &&
    !err.message.includes('constructor')
  );
  
  if (storageAdapterErrors.length > 0) {
    console.log('\n⚠️ ⚠️ ⚠️  STORAGEADAPTERBASE ERRORS FOUND:');
    storageAdapterErrors.forEach(err => console.log(`  - ${err.message}`));
  }
  
  if (constructorErrors.length > 0) {
    console.log('\n⚠️ ⚠️ ⚠️  CONSTRUCTOR ERRORS FOUND:');
    constructorErrors.forEach(err => console.log(`  - ${err.message}`));
  }
  
  if (otherErrors.length > 0) {
    console.log('\n⚠️  OTHER ERRORS:');
    otherErrors.forEach(err => console.log(`  - ${err.message}`));
  }
  
  // Screenshot final
  await page.screenshot({ path: '/tmp/validation-final-state.png', fullPage: true });
  console.log('\n📸 Screenshot: /tmp/validation-final-state.png');
  
  // Dump les derniers logs
  console.log('\n📜 Last 20 console logs:');
  allLogs.slice(-20).forEach(log => console.log(`  ${log}`));
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // ASSERTIONS
  expect(storageAdapterErrors.length, 'Should have ZERO StorageAdapterBase errors').toBe(0);
  expect(constructorErrors.length, 'Should have ZERO constructor errors').toBe(0);
  
  if (storageAdapterErrors.length === 0 && constructorErrors.length === 0) {
    console.log('✅✅✅ SUCCESS - No StorageAdapterBase or constructor errors!\n');
  } else {
    console.log('❌❌❌ FAILED - Errors still present!\n');
  }
});
