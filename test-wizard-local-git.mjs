#!/usr/bin/env node

/**
 * Test du wizard avec mode Local Git
 * Vérifie la sélection de la plateforme Local Git et la configuration
 */

import { chromium } from 'playwright';

const TEST_CONFIG = {
    author: 'Stéphane Denis',
    email: 'stephane.denis@example.com',
    repo: 'pensine-test-local',
    remote: 'https://github.com/stephanedenis/pensine-test-local.git'
};

async function testLocalGitWizard() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Capture console messages
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('✅') || text.includes('❌') || text.includes('⚠️') || 
            text.includes('Configuration') || text.includes('Local Git')) {
            console.log('  📋', text);
        }
    });

    try {
        console.log('\n🧪 Test du wizard Local Git\n');
        console.log('═'.repeat(51));
        console.log('PARTIE 1: Configuration Local Git via Wizard');
        console.log('═'.repeat(51) + '\n');

        // 1. Clear localStorage and load app
        console.log('1️⃣  Chargement avec localStorage vide...');
        await page.goto('http://localhost:8000');
        await page.evaluate(() => localStorage.clear());
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);

        // 2. Check wizard is visible
        console.log('2️⃣  Vérification du wizard...');
        const wizardVisible = await page.isVisible('#config-wizard');
        console.log(`   Wizard visible: ${wizardVisible ? '✅' : '❌'}`);
        await page.screenshot({ path: 'test-local-git-1-wizard.png', fullPage: true });

        // 3. Welcome step
        console.log('3️⃣  Étape Welcome');
        await page.click('button:has-text("Suivant")');
        await page.waitForTimeout(500);

        // 4. Platform step - Select Local Git
        console.log('4️⃣  Étape Platform - Sélection Local Git');
        await page.click('[data-platform="local-git"]');
        await page.waitForTimeout(500);
        
        const localGitSelected = await page.isVisible('[data-platform="local-git"].selected');
        console.log(`   Local Git sélectionné: ${localGitSelected ? '✅' : '❌'}`);
        await page.screenshot({ path: 'test-local-git-2-platform.png', fullPage: true });
        
        await page.click('button:has-text("Suivant")');
        await page.waitForTimeout(500);

        // 5. Authentication step (Local Git configuration)
        console.log('5️⃣  Étape Authentication (Config Local Git)');
        
        // Fill author
        await page.fill('#wizard-git-author', TEST_CONFIG.author);
        console.log(`   Auteur: ${TEST_CONFIG.author}`);
        
        // Fill email
        await page.fill('#wizard-git-email', TEST_CONFIG.email);
        console.log(`   Email: ${TEST_CONFIG.email}`);
        
        // Fill repo name
        await page.fill('#wizard-local-repo', TEST_CONFIG.repo);
        console.log(`   Repo: ${TEST_CONFIG.repo}`);
        
        // Fill remote (optional)
        await page.fill('#wizard-git-remote', TEST_CONFIG.remote);
        console.log(`   Remote: ${TEST_CONFIG.remote}`);
        
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'test-local-git-3-config.png', fullPage: true });
        
        // Check Next button is enabled
        const nextEnabled = await page.isEnabled('button:has-text("Suivant")');
        console.log(`   Bouton Suivant actif: ${nextEnabled ? '✅' : '❌'}`);
        
        await page.click('button:has-text("Suivant")');
        await page.waitForTimeout(500);

        // 6. Repository step (should show summary for Local Git)
        console.log('6️⃣  Étape Repository (résumé)');
        await page.screenshot({ path: 'test-local-git-4-summary.png', fullPage: true });
        await page.click('button:has-text("Suivant")');
        await page.waitForTimeout(500);

        // 7. Preferences step
        console.log('7️⃣  Étape Preferences');
        await page.click('button:has-text("Suivant")');
        await page.waitForTimeout(500);

        // 8. Complete step - Save configuration
        console.log('8️⃣  Étape Complete - Sauvegarde...');
        await page.click('button:has-text("Terminer")');
        await page.waitForTimeout(2000);

        // Check localStorage
        console.log('\n═'.repeat(51));
        console.log('PARTIE 2: Vérification de la configuration');
        console.log('═'.repeat(51) + '\n');

        const config = await page.evaluate(() => ({
            mode: localStorage.getItem('pensine-storage-mode'),
            config: localStorage.getItem('pensine-config'),
            localGitConfig: localStorage.getItem('pensine-local-git-config')
        }));

        console.log('9️⃣  Vérification localStorage...');
        console.log(`   Mode: ${config.mode}`);
        console.log(`   Mode correct: ${config.mode === 'local-git' ? '✅' : '❌'}`);
        
        if (config.localGitConfig) {
            const localGitConfig = JSON.parse(config.localGitConfig);
            console.log(`   Auteur: ${localGitConfig.author} ${localGitConfig.author === TEST_CONFIG.author ? '✅' : '❌'}`);
            console.log(`   Email: ${localGitConfig.email} ${localGitConfig.email === TEST_CONFIG.email ? '✅' : '❌'}`);
            console.log(`   Repo: ${localGitConfig.repo} ${localGitConfig.repo === TEST_CONFIG.repo ? '✅' : '❌'}`);
            console.log(`   Remote: ${localGitConfig.remote} ${localGitConfig.remote === TEST_CONFIG.remote ? '✅' : '❌'}`);
        } else {
            console.log('   ❌ Config Local Git non trouvée');
        }

        // Check wizard is hidden
        const wizardStillVisible = await page.isVisible('#config-wizard');
        console.log(`   Wizard caché: ${!wizardStillVisible ? '✅' : '❌'}`);

        await page.screenshot({ path: 'test-local-git-5-final.png', fullPage: true });

        // Summary
        console.log('\n═'.repeat(51));
        console.log('RÉSUMÉ DU TEST');
        console.log('═'.repeat(51) + '\n');

        const allChecks = {
            wizardShown: wizardVisible,
            localGitSelected: localGitSelected,
            nextEnabled: nextEnabled,
            modeCorrect: config.mode === 'local-git',
            configSaved: !!config.localGitConfig,
            wizardHidden: !wizardStillVisible
        };

        console.log(`✅ Wizard affiché: ${allChecks.wizardShown ? 'OUI' : 'NON'}`);
        console.log(`✅ Local Git sélectionné: ${allChecks.localGitSelected ? 'OUI' : 'NON'}`);
        console.log(`✅ Formulaire validé: ${allChecks.nextEnabled ? 'OUI' : 'NON'}`);
        console.log(`✅ Mode correct: ${allChecks.modeCorrect ? 'OUI' : 'NON'}`);
        console.log(`✅ Config sauvegardée: ${allChecks.configSaved ? 'OUI' : 'NON'}`);
        console.log(`✅ Wizard caché: ${allChecks.wizardHidden ? 'OUI' : 'NON'}`);

        const allPassed = Object.values(allChecks).every(v => v);
        
        console.log('\n' + '═'.repeat(51));
        if (allPassed) {
            console.log('✅✅✅ TOUS LES TESTS RÉUSSIS! ✅✅✅');
        } else {
            console.log('❌ Certains tests ont échoué');
        }
        console.log('═'.repeat(51) + '\n');

        console.log('🏁 Test terminé avec succès\n');

        await page.waitForTimeout(2000);
        await browser.close();
        
        return allPassed ? 0 : 1;

    } catch (error) {
        console.error('❌ Erreur:', error);
        await page.screenshot({ path: 'test-local-git-error.png', fullPage: true });
        await browser.close();
        return 1;
    }
}

// Run test
testLocalGitWizard()
    .then(exitCode => process.exit(exitCode))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
