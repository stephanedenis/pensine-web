/**
 * Calendar Markers Diagnostic Test
 * Tests calendar initialization and event marker display
 *
 * Run with: npx playwright test calendar-markers-diagnostic.spec.mjs
 * Make sure to have a local server running on port 8000:
 *   python3 -m http.server 8000
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:8000';

test.describe('Calendar Markers Diagnostic', () => {
  let consoleMessages = [];
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    // Reset message arrays
    consoleMessages = [];
    consoleErrors = [];
    pageErrors = [];

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

    // Navigate to app via HTTP
    await page.goto(BASE_URL);
  });

  test('1. Capture initial page load and errors', async ({ page }) => {
    console.log('\n=== PAGE LOAD DIAGNOSTIC ===\n');

    // Wait for app to initialize
    await page.waitForTimeout(2000);

    // Report errors
    if (pageErrors.length > 0) {
      console.log('❌ PAGE ERRORS DETECTED:');
      pageErrors.forEach((error, idx) => {
        console.log(`\n[Error ${idx + 1}]`);
        console.log(`Message: ${error.message}`);
        console.log(`Stack: ${error.stack}`);
      });
    } else {
      console.log('✅ No page errors');
    }

    if (consoleErrors.length > 0) {
      console.log('\n❌ CONSOLE ERRORS:');
      consoleErrors.forEach((error, idx) => {
        console.log(`[${idx + 1}] ${error}`);
      });
    } else {
      console.log('✅ No console errors');
    }

    // Show all console logs
    console.log('\n📋 ALL CONSOLE MESSAGES:');
    consoleMessages.forEach(msg => {
      console.log(`[${msg.type}] ${msg.text}`);
    });

    // Take screenshot of initial state
    await page.screenshot({
      path: 'test-results/calendar-initial-load.png',
      fullPage: true
    });
    console.log('\n📸 Screenshot saved: test-results/calendar-initial-load.png');
  });

  test('2. Check if calendar container exists', async ({ page }) => {
    console.log('\n=== CALENDAR CONTAINER CHECK ===\n');

    await page.waitForTimeout(1000);

    const calendarContainer = await page.locator('#calendar-container');
    const isVisible = await calendarContainer.isVisible();

    console.log(`Calendar container visible: ${isVisible}`);
    expect(isVisible).toBe(true);

    const linearCalendar = await page.locator('#linear-calendar');
    const linearVisible = await linearCalendar.isVisible();

    console.log(`Linear calendar visible: ${linearVisible}`);
    expect(linearVisible).toBe(true);

    // Check if LinearCalendar created its structure
    const calendarWeekdays = await page.locator('.linear-calendar-weekdays');
    const weekdaysExists = await calendarWeekdays.count();

    console.log(`Weekdays header count: ${weekdaysExists}`);

    const calendarScroll = await page.locator('.linear-calendar-scroll');
    const scrollExists = await calendarScroll.count();

    console.log(`Scroll container count: ${scrollExists}`);

    await page.screenshot({
      path: 'test-results/calendar-structure.png',
      fullPage: true
    });
  });

  test('3. Check for calendar initialization logs', async ({ page }) => {
    console.log('\n=== CALENDAR INITIALIZATION LOGS ===\n');

    await page.waitForTimeout(2000);

    // Filter relevant logs
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
      console.log('Calendar-related logs found:');
      calendarLogs.forEach(log => {
        console.log(`  [${log.type}] ${log.text}`);
      });
    } else {
      console.log('⚠️  No calendar initialization logs found');
      console.log('Expected logs like:');
      console.log('  - 📚 Scanning repos for journal entries');
      console.log('  - 📅 Calendar range');
      console.log('  - 📌 Found X dates with journal entries');
      console.log('  - ➕ Adding X events to calendar');
    }
  });

  test('4. Check for days with events', async ({ page }) => {
    console.log('\n=== EVENT MARKERS CHECK ===\n');

    await page.waitForTimeout(2000);

    // Check for days with has-events class
    const daysWithEvents = await page.locator('.calendar-day.has-events');
    const count = await daysWithEvents.count();

    console.log(`Days with .has-events class: ${count}`);

    if (count > 0) {
      console.log('✅ Found days with events!');

      // Get first few days with events
      const first5 = await daysWithEvents.first().locator('.calendar-day-number').textContent();
      console.log(`  First day with events: ${first5}`);

      // Check for event indicators
      const eventIndicators = await page.locator('.event-indicators');
      const indicatorCount = await eventIndicators.count();
      console.log(`  Event indicator containers: ${indicatorCount}`);

      const eventDots = await page.locator('.event-dot');
      const dotCount = await eventDots.count();
      console.log(`  Event dots: ${dotCount}`);

      // Get color of first dot
      if (dotCount > 0) {
        const firstDot = eventDots.first();
        const bgColor = await firstDot.evaluate(el =>
          window.getComputedStyle(el).backgroundColor
        );
        console.log(`  First dot background color: ${bgColor}`);
      }

    } else {
      console.log('❌ No days with .has-events class found');

      // Check if events were added to linearCalendar
      const eventsInCalendar = await page.evaluate(() => {
        if (window.app && window.app.linearCalendar) {
          const allEvents = window.app.linearCalendar.getAllEvents();
          return allEvents.size;
        }
        return 0;
      });

      console.log(`  Events in linearCalendar state: ${eventsInCalendar}`);
    }

    // Take screenshot of calendar area
    await page.locator('#calendar-container').screenshot({
      path: 'test-results/calendar-area.png'
    });
    console.log('\n📸 Calendar area screenshot: test-results/calendar-area.png');
  });

  test('5. Inspect calendar HTML structure', async ({ page }) => {
    console.log('\n=== CALENDAR HTML STRUCTURE ===\n');

    await page.waitForTimeout(2000);

    // Get HTML of first week
    const firstWeek = await page.locator('.calendar-week').first();
    const weekHTML = await firstWeek.innerHTML();

    console.log('First week HTML (truncated):');
    console.log(weekHTML.substring(0, 500) + '...');

    // Get one day's full HTML
    const firstDay = await page.locator('.calendar-day').first();
    const dayHTML = await firstDay.innerHTML();

    console.log('\nFirst day HTML:');
    console.log(dayHTML);

    // Check computed styles of calendar container
    const containerStyles = await page.locator('#linear-calendar').evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        display: styles.display,
        width: styles.width,
        height: styles.height,
        overflow: styles.overflow
      };
    });

    console.log('\nLinear calendar computed styles:');
    console.log(containerStyles);
  });

  test('6. Test event adding directly', async ({ page }) => {
    console.log('\n=== MANUAL EVENT ADD TEST ===\n');

    await page.waitForTimeout(2000);

    // Try to add an event manually
    const result = await page.evaluate(() => {
      if (!window.app || !window.app.linearCalendar) {
        return { error: 'linearCalendar not found on window.app' };
      }

      try {
        // Add a test event
        window.app.linearCalendar.addEvent('2025-01-15', 'note', {
          color: '#ff0000',
          label: 'Test Event'
        });

        // Check if it was added
        const events = window.app.linearCalendar.getEvents('2025-01-15');

        return {
          success: true,
          eventsCount: events.length,
          events: events
        };
      } catch (error) {
        return {
          error: error.message,
          stack: error.stack
        };
      }
    });

    console.log('Manual event add result:');
    console.log(JSON.stringify(result, null, 2));

    if (result.success) {
      // Wait for DOM update
      await page.waitForTimeout(500);

      // Check if the day now has the marker
      const dayWithEvent = await page.locator('.calendar-day.has-events').first();
      const exists = await dayWithEvent.count() > 0;

      console.log(`Day with event exists after manual add: ${exists}`);

      if (exists) {
        await dayWithEvent.screenshot({
          path: 'test-results/calendar-day-with-event.png'
        });
        console.log('📸 Day with event screenshot: test-results/calendar-day-with-event.png');
      }
    }
  });

  test('7. Check localStorage and config', async ({ page }) => {
    console.log('\n=== LOCALSTORAGE AND CONFIG CHECK ===\n');

    await page.waitForTimeout(2000);

    const storage = await page.evaluate(() => {
      return {
        bootstrap: localStorage.getItem('pensine-bootstrap'),
        config: localStorage.getItem('pensine-config'),
        storageMode: localStorage.getItem('pensine-storage-mode'),
        weekStartDay: localStorage.getItem('weekStartDay'),
        dayHeight: localStorage.getItem('dayHeight')
      };
    });

    console.log('LocalStorage contents:');
    Object.entries(storage).forEach(([key, value]) => {
      if (value) {
        console.log(`\n${key}:`);
        try {
          const parsed = JSON.parse(value);
          console.log(JSON.stringify(parsed, null, 2));
        } catch {
          console.log(value);
        }
      } else {
        console.log(`${key}: (empty)`);
      }
    });
  });

  test.afterAll(async () => {
    console.log('\n\n=== DIAGNOSTIC SUMMARY ===\n');
    console.log(`Total console messages: ${consoleMessages.length}`);
    console.log(`Console errors: ${consoleErrors.length}`);
    console.log(`Page errors: ${pageErrors.length}`);
    console.log('\nScreenshots saved in test-results/');
    console.log('  - calendar-initial-load.png');
    console.log('  - calendar-structure.png');
    console.log('  - calendar-area.png');
    console.log('  - calendar-day-with-event.png');
  });
});
