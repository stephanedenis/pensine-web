/**
 * Test du système de configuration moderne
 */

import puppeteer from 'puppeteer';

async function testModernConfig() {
    console.log('🧪 Test du système de configuration moderne');
    console.log('='.repeat(50));

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();

        // Capture console messages
        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('Modern configuration') || 
                text.includes('Configuration') ||
                text.includes('Plugin') ||
                text.includes('Settings')) {
                console.log(`  📋 Console: ${text}`);
            }
        });

        // Capture errors
        page.on('pageerror', error => {
            console.error(`  ❌ Page error: ${error.message}`);
        });

        // Set localStorage config to skip wizard
        await page.evaluateOnNewDocument(() => {
            localStorage.setItem('pensine-config', 'true');
            localStorage.setItem('github-owner', 'test');
            localStorage.setItem('github-repo', 'test');
            localStorage.setItem('pensine-encrypted-token', 'test');
        });

        // Navigate to app
        console.log('\n📍 Navigating to http://localhost:8000...');
        await page.goto('http://localhost:8000', {
            waitUntil: 'networkidle0',
            timeout: 15000
        });

        // Wait a bit for initialization
        await page.waitForTimeout(2000);

        // Check if modern config system initialized
        const configSystemStatus = await page.evaluate(() => {
            return {
                hasModernConfigManager: !!window.app?.modernConfigManager,
                hasSettingsView: !!window.app?.settingsView,
                hasPluginSystem: !!window.pluginSystem,
                hasEventBus: !!window.eventBus,
                hasModernConfigGlobal: !!window.modernConfigManager
            };
        });

        console.log('\n📊 État du système de configuration:');
        console.log('  - modernConfigManager (app):', configSystemStatus.hasModernConfigManager ? '✅' : '❌');
        console.log('  - settingsView (app):', configSystemStatus.hasSettingsView ? '✅' : '❌');
        console.log('  - pluginSystem (global):', configSystemStatus.hasPluginSystem ? '✅' : '❌');
        console.log('  - eventBus (global):', configSystemStatus.hasEventBus ? '✅' : '❌');
        console.log('  - modernConfigManager (global):', configSystemStatus.hasModernConfigGlobal ? '✅' : '❌');

        // Try to open settings panel
        console.log('\n🖱️  Test d\'ouverture du panneau Settings...');
        
        try {
            await page.evaluate(() => {
                window.app.showSettings();
            });

            await page.waitForTimeout(1000);

            // Check if settings panel is visible
            const settingsVisible = await page.evaluate(() => {
                const settingsPanel = document.querySelector('.settings-view');
                return settingsPanel && !settingsPanel.classList.contains('hidden');
            });

            console.log('  Settings panel visible:', settingsVisible ? '✅' : '❌');

            if (settingsVisible) {
                // Check for tabs
                const tabsInfo = await page.evaluate(() => {
                    const tabs = document.querySelectorAll('.settings-tabs .tab');
                    return {
                        count: tabs.length,
                        labels: Array.from(tabs).map(t => t.textContent.trim())
                    };
                });

                console.log(`  Tabs trouvés: ${tabsInfo.count}`);
                console.log(`  Labels: ${tabsInfo.labels.join(', ')}`);
            }
        } catch (error) {
            console.error('  ❌ Erreur lors de l\'ouverture:', error.message);
        }

        // Summary
        console.log('\n' + '='.repeat(50));
        const allOk = Object.values(configSystemStatus).every(v => v);
        if (allOk) {
            console.log('✅ Système de configuration moderne complètement opérationnel');
        } else {
            console.log('⚠️  Système de configuration partiellement initialisé');
            console.log('   Vérifier les erreurs dans la console ci-dessus');
        }

    } catch (error) {
        console.error('\n❌ Erreur:', error.message);
        throw error;
    } finally {
        await browser.close();
    }
}

// Run test
testModernConfig().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});
