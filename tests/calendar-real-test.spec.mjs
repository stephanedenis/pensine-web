/**
 * Calendar Real Test with GitHub Authentication
 * Tests calendar with actual GitHub data
 *
 * Run with:
 *   GITHUB_TEST_OWNER=stephanedenis \
 *   GITHUB_TEST_TOKEN=ghp_xxx \
 *   npx playwright test calendar-real-test.spec.mjs
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:8000';
const GITHUB_OWNER = process.env.GITHUB_TEST_OWNER || 'stephanedenis';
const GITHUB_TOKEN = process.env.GITHUB_TEST_TOKEN;
const GITHUB_REPO = process.env.GITHUB_TEST_REPO || 'pensine-notes';

test.describe('Calendar Real Test with GitHub', () => {

  test.beforeEach(async ({ page }) => {
    if (!GITHUB_TOKEN) {
      throw new Error('GITHUB_TEST_TOKEN environment variable is required');
    }

    // Setup localStorage with valid GitHub config BEFORE loading page
    // Format expected by bootstrap.js: config.storageMode and config.credentials
    await page.addInitScript(({ owner, token, repo }) => {
      const config = {
        version: '1.0.0',
        storageMode: 'github', // Bootstrap expects this format
        credentials: {
          token: token,
          owner: owner,
          repo: repo
        },
        git: {
          owner: owner,
          repo: repo,
          repositories: [
            { name: repo, owner: owner }
          ]
        },
        storage: {
          mode: 'github'
        },
        editor: {
          defaultMode: 'rich',
          autoSave: true,
          autoSaveDelay: 2000
        },
        plugins: {
          calendar: { enabled: true, source: 'local' },
          journal: { enabled: true, source: 'local' }
        }
      };

      const bootstrap = {
        version: '1.0.0',
        configured: true,
        storageMode: 'github',
        timestamp: Date.now()
      };

      localStorage.setItem('pensine-config', JSON.stringify(config));
      localStorage.setItem('pensine-bootstrap', JSON.stringify(bootstrap));
      localStorage.setItem('pensine-storage-mode', 'github');

      console.log('✅ Test: localStorage configured with GitHub credentials');
      console.log(`   Owner: ${owner}, Repo: ${repo}`);
    }, { owner: GITHUB_OWNER, token: GITHUB_TOKEN, repo: GITHUB_REPO });
  });

  test('Full calendar initialization and markers test', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes for real GitHub calls

    let consoleMessages = [];
    let consoleErrors = [];
    let pageErrors = [];

    // Capture console
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push({ type: msg.type(), text });
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });

    page.on('pageerror', error => {
      pageErrors.push({ message: error.message, stack: error.stack });
    });

    console.log('\n=== LOADING PAGE WITH CONFIG ===\n');
    console.log(`GitHub: ${GITHUB_OWNER}/${GITHUB_REPO}`);
    console.log(`Token: ${GITHUB_TOKEN.substring(0, 10)}...`);

    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // Check localStorage was set correctly
    const storageCheck = await page.evaluate(() => {
      const config = localStorage.getItem('pensine-config');
      const bootstrap = localStorage.getItem('pensine-bootstrap');
      return {
        hasConfig: !!config,
        hasBootstrap: !!bootstrap,
        configParsed: config ? JSON.parse(config) : null,
        bootstrapParsed: bootstrap ? JSON.parse(bootstrap) : null
      };
    });

    console.log('\n=== LOCALSTORAGE VERIFICATION ===\n');
    console.log('Has config:', storageCheck.hasConfig);
    console.log('Has bootstrap:', storageCheck.hasBootstrap);
    if (storageCheck.configParsed) {
      console.log('Config storageMode:', storageCheck.configParsed.storageMode);
      console.log('Config has credentials.token:', !!storageCheck.configParsed.credentials?.token);
      console.log('Config has credentials.owner:', !!storageCheck.configParsed.credentials?.owner);
      console.log('Config has credentials.repo:', !!storageCheck.configParsed.credentials?.repo);
    }

    // Wait for app initialization (not wizard!)
    console.log('\n=== WAITING FOR APP INITIALIZATION ===\n');
    await page.waitForTimeout(5000);

    // Check that wizard is NOT shown
    const wizardVisible = await page.locator('#wizard-overlay').isVisible().catch(() => false);
    console.log(`Wizard visible: ${wizardVisible}`);
    expect(wizardVisible).toBe(false);

    // Check that main app is visible
    const appVisible = await page.locator('#app').isVisible();
    console.log(`App visible: ${appVisible}`);
    expect(appVisible).toBe(true);

    // Check for page errors
    console.log('\n=== PAGE ERRORS CHECK ===\n');
    if (pageErrors.length > 0) {
      console.log('❌ PAGE ERRORS:');
      pageErrors.forEach((err, idx) => {
        console.log(`[${idx + 1}] ${err.message}`);
      });
    } else {
      console.log('✅ No page errors');
    }

    // Check for calendar logs
    console.log('\n=== CALENDAR INITIALIZATION LOGS ===\n');
    const calendarLogs = consoleMessages.filter(msg =>
      msg.text.includes('Calendar') ||
      msg.text.includes('📚') ||
      msg.text.includes('📅') ||
      msg.text.includes('📌') ||
      msg.text.includes('➕') ||
      msg.text.includes('✅') ||
      msg.text.includes('⚙️') ||
      msg.text.includes('Scanning') ||
      msg.text.includes('events') ||
      msg.text.includes('journal') ||
      msg.text.includes('Storage') ||
      msg.text.includes('marker')
    );

    console.log(`Found ${calendarLogs.length} calendar-related logs:`);
    calendarLogs.forEach(log => {
      console.log(`  [${log.type}] ${log.text}`);
    });

    // Wait more for calendar to load data from GitHub
    console.log('\n=== WAITING FOR GITHUB DATA ===\n');
    await page.waitForTimeout(8000);

    // Check calendar structure
    console.log('\n=== CALENDAR STRUCTURE CHECK ===\n');

    const weekdaysCount = await page.locator('.linear-calendar-weekdays').count();
    console.log(`Weekdays header: ${weekdaysCount}`);
    expect(weekdaysCount).toBeGreaterThan(0);

    const weeksCount = await page.locator('.calendar-week').count();
    console.log(`Week rows: ${weeksCount}`);
    expect(weeksCount).toBeGreaterThan(0);

    const daysCount = await page.locator('.calendar-day').count();
    console.log(`Total days: ${daysCount}`);
    expect(daysCount).toBeGreaterThan(0);

    // Check for events in linearCalendar state
    console.log('\n=== CALENDAR STATE CHECK ===\n');

    const calendarState = await page.evaluate(() => {
      if (!window.app) {
        return { error: 'window.app not found' };
      }
      if (!window.app.linearCalendar) {
        return { error: 'window.app.linearCalendar not found' };
      }

      try {
        const allEvents = window.app.linearCalendar.getAllEvents();
        const eventArray = Array.from(allEvents.entries()).slice(0, 5);

        return {
          totalDatesWithEvents: allEvents.size,
          sampleEvents: eventArray.map(([date, events]) => ({
            date,
            eventCount: events.length,
            events: events.map(e => ({ type: e.type, color: e.color, label: e.label }))
          }))
        };
      } catch (error) {
        return { error: error.message, stack: error.stack };
      }
    });

    console.log('LinearCalendar state:');
    console.log(JSON.stringify(calendarState, null, 2));

    if (!calendarState.error) {
      expect(calendarState.totalDatesWithEvents).toBeGreaterThan(0);
    }

    // Check for visible event markers
    console.log('\n=== EVENT MARKERS CHECK ===\n');

    const daysWithEvents = await page.locator('.calendar-day.has-events').count();
    console.log(`Days with .has-events class: ${daysWithEvents}`);

    const eventDots = await page.locator('.event-dot').count();
    console.log(`Event dots: ${eventDots}`);

    // Get first day with events
    if (daysWithEvents > 0) {
      const firstEventDay = await page.locator('.calendar-day.has-events').first();
      const dayNumber = await firstEventDay.locator('.calendar-day-number').textContent();
      console.log(`First day with events: ${dayNumber}`);

      // Check dot styling
      const firstDot = await page.locator('.event-dot').first();
      const dotStyles = await firstDot.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          width: styles.width,
          height: styles.height,
          backgroundColor: styles.backgroundColor,
          borderRadius: styles.borderRadius,
          display: styles.display
        };
      });
      console.log('First dot styles:', dotStyles);
    }

    // Take screenshots
    await page.screenshot({
      path: 'test-results/calendar-real-test-full.png',
      fullPage: true
    });

    await page.locator('#calendar-container').screenshot({
      path: 'test-results/calendar-real-test-calendar.png'
    });

    // Summary
    console.log('\n=== TEST SUMMARY ===\n');
    console.log(`✅ App initialized (wizard not shown)`);
    console.log(`✅ Calendar structure created (${weeksCount} weeks, ${daysCount} days)`);

    if (!calendarState.error) {
      console.log(`✅ Events loaded: ${calendarState.totalDatesWithEvents} dates`);
    } else {
      console.log(`❌ Calendar state error: ${calendarState.error}`);
    }

    if (daysWithEvents > 0) {
      console.log(`✅ Event markers visible: ${daysWithEvents} days, ${eventDots} dots`);
    } else {
      console.log(`⚠️  No event markers visible (expected if repo is empty)`);
    }

    console.log(`📸 Screenshots saved:`);
    console.log(`   - test-results/calendar-real-test-full.png`);
    console.log(`   - test-results/calendar-real-test-calendar.png`);

    // Assertions
    expect(wizardVisible).toBe(false);
    expect(weekdaysCount).toBeGreaterThan(0);
    expect(weeksCount).toBeGreaterThan(0);

    // If calendar state loaded, expect events (unless repo is empty)
    if (!calendarState.error && calendarState.totalDatesWithEvents === 0) {
      console.log('\n⚠️  Note: No events found. This is OK if the repo has no journal files.');
    }
  });
});
