import { chromium } from 'playwright';

async function testPensineStartup() {
  console.log('🚀 Testing Pensine startup...\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Capture console messages
  const consoleMessages = [];
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    consoleMessages.push({ type, text });
    
    if (type === 'error') {
      console.log(`❌ Console Error: ${text}`);
    } else if (type === 'warning') {
      console.log(`⚠️  Console Warning: ${text}`);
    }
  });
  
  // Capture page errors
  const pageErrors = [];
  page.on('pageerror', error => {
    pageErrors.push(error);
    console.log(`❌ Page Error: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  });
  
  try {
    // Navigate to the page
    console.log('Loading http://localhost:8000...\n');
    await page.goto('http://localhost:8000', { 
      waitUntil: 'networkidle',
      timeout: 10000 
    });
    
    // Wait a bit for JS to execute
    await page.waitForTimeout(2000);
    
    // Check if app loaded
    const appElement = await page.$('#app');
    if (appElement) {
      console.log('✅ #app element found');
    } else {
      console.log('❌ #app element NOT found');
    }
    
    // Check for loading element (#loading)
    const loading = await page.$('#loading');
    if (loading) {
      const loadingClasses = await loading.evaluate(el => el.className);
      const isVisible = await loading.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none';
      });
      console.log(`${isVisible ? '❌' : '✅'} #loading ${isVisible ? 'STILL VISIBLE' : 'hidden'} (classes: "${loadingClasses}")`);
    }
    
    // Check for loading spinner (.loading-spinner)
    const spinner = await page.$('.loading-spinner');
    if (spinner) {
      const isVisible = await spinner.isVisible();
      console.log(`⚠️  .loading-spinner still visible: ${isVisible}`);
    }
    
    // Check for wizard
    const wizard = await page.$('#config-wizard');
    if (wizard) {
      const wizardClasses = await wizard.evaluate(el => el.className);
      const isVisible = await wizard.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none';
      });
      console.log(`${isVisible ? '✅' : '❌'} #config-wizard ${isVisible ? 'VISIBLE' : 'hidden'} (classes: "${wizardClasses}")`);
    }
    
    // Check for calendar
    const calendar = await page.$('#linear-calendar');
    if (calendar) {
      console.log('✅ LinearCalendar element found');
    } else {
      console.log('❌ LinearCalendar element NOT found');
    }
    
    // Check for specific errors
    console.log('\n📊 Summary:');
    console.log(`   Console errors: ${consoleMessages.filter(m => m.type === 'error').length}`);
    console.log(`   Console warnings: ${consoleMessages.filter(m => m.type === 'warning').length}`);
    console.log(`   Page errors: ${pageErrors.length}`);
    
    // Take screenshot
    await page.screenshot({ path: 'pensine-startup.png', fullPage: true });
    console.log('\n📸 Screenshot saved: pensine-startup.png');
    
    // Print all console messages for debugging
    if (consoleMessages.length > 0) {
      console.log('\n📝 All console messages:');
      consoleMessages.forEach(({ type, text }) => {
        const icon = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`   ${icon} [${type}] ${text}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testPensineStartup().catch(console.error);
