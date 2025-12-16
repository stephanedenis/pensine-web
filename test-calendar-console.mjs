import { chromium } from 'playwright';

(async () => {
  console.log('🚀 Starting calendar demo test...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const consoleLogs = [];
  const errors = [];

  // Capture console
  page.on('console', msg => {
    const log = `[${msg.type()}] ${msg.text()}`;
    consoleLogs.push(log);
    console.log(log);
  });

  // Capture errors
  page.on('pageerror', error => {
    const err = `[ERROR] ${error.message}`;
    errors.push(err);
    console.log(err);
  });

  try {
    console.log('📄 Loading http://localhost:8000/demo.html...');
    await page.goto('http://localhost:8000/demo.html', { waitUntil: 'networkidle', timeout: 10000 });

    await page.waitForTimeout(2000);

    // Check calendar structure
    console.log('\n📊 Analyzing calendar structure...');
    const weeks = await page.locator('.calendar-week, .linear-calendar-week').count();
    const days = await page.locator('.calendar-day').count();
    const labels = await page.locator('.calendar-month-label').count();

    console.log(`  ✓ Weeks: ${weeks}`);
    console.log(`  ✓ Days: ${days}`);
    console.log(`  ✓ Month labels: ${labels}`);

    // Check label positions
    if (labels > 0) {
      console.log('\n🏷️  Checking label positions...');
      const firstLabel = page.locator('.calendar-month-label').first();
      const box = await firstLabel.boundingBox();
      const styles = await firstLabel.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          position: computed.position,
          left: computed.left,
          zIndex: computed.zIndex,
          width: computed.width,
          height: computed.height
        };
      });
      console.log('  First label styles:', styles);
      console.log('  First label bounding box:', box);

      // Check column widths consistency
      console.log('\n📐 Checking column widths consistency...');
      const firstWeek = await page.locator('.calendar-week, .linear-calendar-week').first();
      const dayCells = await firstWeek.locator('.calendar-day').all();
      const widths = [];
      const computedWidths = [];
      for (let i = 0; i < dayCells.length; i++) {
        const cellBox = await dayCells[i].boundingBox();
        const computed = await dayCells[i].evaluate(el => {
          const style = window.getComputedStyle(el);
          return {
            width: style.width,
            minWidth: style.minWidth,
            maxWidth: style.maxWidth,
            flexBasis: style.flexBasis,
            position: style.position
          };
        });
        if (cellBox) widths.push(Math.round(cellBox.width));
        computedWidths.push(computed);
      }
      const uniqueWidths = [...new Set(widths)];
      console.log(`  Bounding box widths: ${widths.join(', ')}`);
      console.log(`  Unique widths: ${uniqueWidths.join(', ')}`);
      console.log(`  First cell computed:`, computedWidths[0]);
      console.log(`  Second cell computed:`, computedWidths[1]);
      if (uniqueWidths.length === 1) {
        console.log('  ✅ All columns have consistent width');
      } else {
        console.log('  ❌ Columns have inconsistent widths!');
      }

      // Check row heights consistency
      console.log('\n📏 Checking row heights consistency...');
      const allWeeks = await page.locator('.calendar-week, .linear-calendar-week').all();
      const heights = [];
      for (let i = 0; i < Math.min(10, allWeeks.length); i++) {
        const weekBox = await allWeeks[i].boundingBox();
        if (weekBox) heights.push(Math.round(weekBox.height));
      }
      const uniqueHeights = [...new Set(heights)];
      console.log(`  Heights of first 10 rows: ${heights.join(', ')}`);
      console.log(`  Unique heights: ${uniqueHeights.join(', ')}`);
      if (uniqueHeights.length === 1) {
        console.log('  ✅ All rows have consistent height');
      } else {
        console.log('  ❌ Rows have inconsistent heights!');
      }
    }

    // Take screenshots
    console.log('\n📸 Taking screenshots...');
    await page.screenshot({ path: '/home/stephane/GitHub/pensine-web/calendar-full.png', fullPage: true });
    console.log('  ✓ Full page: calendar-full.png');

    await page.screenshot({ path: '/home/stephane/GitHub/pensine-web/calendar-viewport.png' });
    console.log('  ✓ Viewport: calendar-viewport.png');

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📋 SUMMARY');
    console.log('='.repeat(50));
    console.log(`Console logs: ${consoleLogs.length}`);
    console.log(`Errors: ${errors.length}`);
    if (errors.length > 0) {
      console.log('\n❌ ERRORS FOUND:');
      errors.forEach(err => console.log('  ' + err));
    } else {
      console.log('✅ No errors detected');
    }

  } catch (error) {
    console.log('\n❌ TEST FAILED:', error.message);
  } finally {
    await browser.close();
    console.log('\n✅ Test completed');
  }
})();
