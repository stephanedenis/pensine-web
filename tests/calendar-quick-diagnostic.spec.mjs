/**
 * Calendar Quick Diagnostic Test
 * Fast diagnostic of calendar errors and initialization
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:8000';

test.describe('Calendar Quick Diagnostic', () => {
  let consoleMessages = [];
  let consoleErrors = [];
  let pageErrors = [];

  test('Full diagnostic in one test', async ({ page }) => {
    // Increase timeout for this test
    test.setTimeout(90000);

    // Capture all console messages
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push({ type: msg.type(), text });
      
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });

    // Capture page errors
    page.on('pageerror', error => {
      pageErrors.push({
        message: error.message,
        stack: error.stack
      });
    });

    console.log('\n=== LOADING PAGE ===\n');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait for app to initialize
    await page.waitForTimeout(5000);

    console.log('\n=== PAGE ERRORS ===\n');
    if (pageErrors.length > 0) {
      console.log('❌ PAGE ERRORS DETECTED:');
      pageErrors.forEach((error, idx) => {
        console.log(`\n[Error ${idx + 1}]`);
        console.log(`Message: ${error.message}`);
        if (error.stack) {
          console.log(`Stack: ${error.stack.split('\n').slice(0, 3).join('\n')}`);
        }
      });
    } else {
      console.log('✅ No page errors');
    }

    console.log('\n=== CONSOLE ERRORS ===\n');
    if (consoleErrors.length > 0) {
      console.log(`❌ ${consoleErrors.length} CONSOLE ERRORS:`);
      consoleErrors.forEach((error, idx) => {
        console.log(`[${idx + 1}] ${error}`);
      });
    } else {
      console.log('✅ No console errors');
    }

    console.log('\n=== CALENDAR INITIALIZATION LOGS ===\n');
    const calendarLogs = consoleMessages.filter(msg => 
      msg.text.includes('Calendar') || 
      msg.text.includes('📚') ||
      msg.text.includes('📅') ||
      msg.text.includes('📌') ||
      msg.text.includes('➕') ||
      msg.text.includes('✅') ||
      msg.text.includes('⚙️')
    );

    if (calendarLogs.length > 0) {
      console.log(`Found ${calendarLogs.length} calendar-related logs:`);
      calendarLogs.forEach(log => {
        console.log(`  [${log.type}] ${log.text}`);
      });
    } else {
      console.log('⚠️  No calendar initialization logs found');
    }

    console.log('\n=== CALENDAR STRUCTURE ===\n');
    
    const calendarContainer = await page.locator('#calendar-container');
    const containerVisible = await calendarContainer.isVisible().catch(() => false);
    console.log(`Calendar container visible: ${containerVisible}`);

    const linearCalendar = await page.locator('#linear-calendar');
    const linearVisible = await linearCalendar.isVisible().catch(() => false);
    console.log(`Linear calendar visible: ${linearVisible}`);

    const weekdaysCount = await page.locator('.linear-calendar-weekdays').count();
    console.log(`Weekdays header count: ${weekdaysCount}`);

    const scrollCount = await page.locator('.linear-calendar-scroll').count();
    console.log(`Scroll container count: ${scrollCount}`);

    console.log('\n=== EVENT MARKERS CHECK ===\n');
    
    const daysWithEvents = await page.locator('.calendar-day.has-events').count();
    console.log(`Days with .has-events class: ${daysWithEvents}`);

    const eventDots = await page.locator('.event-dot').count();
    console.log(`Event dots: ${eventDots}`);

    // Check linearCalendar state
    const calendarState = await page.evaluate(() => {
      if (!window.app || !window.app.linearCalendar) {
        return { error: 'linearCalendar not found on window.app' };
      }
      
      try {
        const allEvents = window.app.linearCalendar.getAllEvents();
        const sampleDate = '2025-01-15';
        const sampleEvents = window.app.linearCalendar.getEvents(sampleDate);
        
        return {
          totalDatesWithEvents: allEvents.size,
          sampleDate: sampleDate,
          sampleEventsCount: sampleEvents.length,
          sampleEvents: sampleEvents
        };
      } catch (error) {
        return { error: error.message };
      }
    });

    console.log('\nLinearCalendar state:');
    console.log(JSON.stringify(calendarState, null, 2));

    console.log('\n=== LOCALSTORAGE ===\n');
    
    const storage = await page.evaluate(() => {
      return {
        bootstrap: localStorage.getItem('pensine-bootstrap'),
        config: localStorage.getItem('pensine-config'),
        storageMode: localStorage.getItem('pensine-storage-mode')
      };
    });

    Object.entries(storage).forEach(([key, value]) => {
      if (value) {
        console.log(`\n${key}:`);
        try {
          const parsed = JSON.parse(value);
          console.log(JSON.stringify(parsed, null, 2).substring(0, 200) + '...');
        } catch {
          console.log(value.substring(0, 200));
        }
      } else {
        console.log(`${key}: (empty)`);
      }
    });

    // Take screenshots
    await page.screenshot({ 
      path: 'test-results/diagnostic-full-page.png',
      fullPage: true 
    });
    
    if (containerVisible) {
      await page.locator('#calendar-container').screenshot({
        path: 'test-results/diagnostic-calendar.png'
      });
    }

    console.log('\n=== SUMMARY ===\n');
    console.log(`Total console messages: ${consoleMessages.length}`);
    console.log(`Console errors: ${consoleErrors.length}`);
    console.log(`Page errors: ${pageErrors.length}`);
    console.log(`Calendar initialized: ${linearVisible && weekdaysCount > 0}`);
    console.log(`Events visible: ${daysWithEvents > 0 || eventDots > 0}`);
    console.log('\nScreenshots:');
    console.log('  - test-results/diagnostic-full-page.png');
    console.log('  - test-results/diagnostic-calendar.png');
  });
});
