#!/usr/bin/env node

/**
 * Test de démarrage de l'app en mode Local Git
 * Vérifie que l'app s'initialise correctement après configuration Local Git
 */

import { chromium } from 'playwright';

const TEST_CONFIG = {
    author: 'Test User',
    email: 'test@example.com',
    repo: 'pensine-test-startup',
    mode: 'local-git'
};

async function testLocalGitStartup() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Capture console messages
    const consoleMessages = [];
    page.on('console', msg => {
        const text = msg.text();
        consoleMessages.push(text);
        if (text.includes('✅') || text.includes('❌') || text.includes('⚠️') || 
            text.includes('Local Git') || text.includes('Storage') || 
            text.includes('initialized')) {
            console.log('  📋', text);
        }
    });

    try {
        console.log('\n🧪 Test de démarrage Local Git\n');
        console.log('═'.repeat(51));
        console.log('PARTIE 1: Configuration Local Git');
        console.log('═'.repeat(51) + '\n');

        // 1. Setup localStorage with Local Git config
        console.log('1️⃣  Préparation de la configuration Local Git...');
        await page.goto('http://localhost:8000');
        
        await page.evaluate((config) => {
            // Clear first
            localStorage.clear();
            
            // Set Local Git mode
            localStorage.setItem('pensine-storage-mode', config.mode);
            
            // Set Local Git config
            const localGitConfig = {
                author: config.author,
                email: config.email,
                repo: config.repo,
                remote: ''
            };
            localStorage.setItem('pensine-local-git-config', JSON.stringify(localGitConfig));
            
            // Set main config
            const mainConfig = {
                git: {
                    platform: 'local-git',
                    author: config.author,
                    email: config.email,
                    repo: config.repo,
                    branch: 'main'
                },
                langue: {
                    locale: 'fr-CA',
                    timezone: 'America/Toronto'
                },
                ergonomie: {
                    jourDebutSemaine: 1,
                    autoSync: true,
                    autoSave: false,
                    theme: 'auto'
                }
            };
            localStorage.setItem('pensine-config', JSON.stringify(mainConfig, null, 2));
            
        }, TEST_CONFIG);

        console.log(`   Mode: ${TEST_CONFIG.mode}`);
        console.log(`   Auteur: ${TEST_CONFIG.author}`);
        console.log(`   Email: ${TEST_CONFIG.email}`);
        console.log(`   Repo: ${TEST_CONFIG.repo}`);

        // 2. Reload and check app initialization
        console.log('\n2️⃣  Rechargement de l\'app...');
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(3000); // Give time for initialization

        await page.screenshot({ path: 'test-local-startup-1-loaded.png', fullPage: true });

        // 3. Check UI elements
        console.log('\n═'.repeat(51));
        console.log('PARTIE 2: Vérification de l\'interface');
        console.log('═'.repeat(51) + '\n');

        console.log('3️⃣  Vérification des éléments UI...');
        
        const wizardVisible = await page.isVisible('#config-wizard');
        console.log(`   Wizard caché: ${!wizardVisible ? '✅' : '❌'}`);
        
        const headerVisible = await page.isVisible('#header');
        console.log(`   Header visible: ${headerVisible ? '✅' : '❌'}`);
        
        const calendarVisible = await page.isVisible('#calendar');
        console.log(`   Calendrier visible: ${calendarVisible ? '✅' : '❌'}`);
        
        const editorContainerVisible = await page.isVisible('#editor-container');
        console.log(`   Éditeur présent: ${editorContainerVisible ? '✅' : '❌'}`);

        // 4. Check localStorage persistence
        console.log('\n4️⃣  Vérification localStorage...');
        const storageCheck = await page.evaluate(() => ({
            mode: localStorage.getItem('pensine-storage-mode'),
            hasConfig: !!localStorage.getItem('pensine-config'),
            hasLocalGitConfig: !!localStorage.getItem('pensine-local-git-config')
        }));

        console.log(`   Mode storage: ${storageCheck.mode} ${storageCheck.mode === 'local-git' ? '✅' : '❌'}`);
        console.log(`   Config présente: ${storageCheck.hasConfig ? '✅' : '❌'}`);
        console.log(`   Config Local Git présente: ${storageCheck.hasLocalGitConfig ? '✅' : '❌'}`);

        // 5. Check console for errors
        console.log('\n═'.repeat(51));
        console.log('PARTIE 3: Vérification des erreurs');
        console.log('═'.repeat(51) + '\n');

        console.log('5️⃣  Analyse des messages console...');
        const errors = consoleMessages.filter(msg => 
            msg.toLowerCase().includes('error') || 
            msg.toLowerCase().includes('failed') ||
            msg.toLowerCase().includes('cannot')
        );

        const criticalErrors = errors.filter(msg => 
            !msg.includes('Could not load config from GitHub') && // Expected
            !msg.includes('Error fetching journal files') // Expected if no files yet
        );

        if (criticalErrors.length === 0) {
            console.log('   Aucune erreur critique: ✅');
        } else {
            console.log(`   ⚠️  ${criticalErrors.length} erreurs détectées:`);
            criticalErrors.slice(0, 5).forEach(err => {
                console.log(`      - ${err.substring(0, 80)}...`);
            });
        }

        // 6. Check if Local Git was initialized
        const localGitInitialized = consoleMessages.some(msg => 
            msg.includes('Local Git') && msg.includes('initialized')
        );
        console.log(`   Local Git initialisé: ${localGitInitialized ? '✅' : '❌'}`);

        // 7. Try to create a test file
        console.log('\n═'.repeat(51));
        console.log('PARTIE 4: Test de création de fichier');
        console.log('═'.repeat(51) + '\n');

        console.log('6️⃣  Tentative de création de fichier...');
        
        const fileCreated = await page.evaluate(async () => {
            try {
                if (!window.storageManager || !window.storageManager.adapter) {
                    return { success: false, error: 'Storage adapter not initialized' };
                }

                const testContent = `# Test Local Git\n\nFichier de test créé à ${new Date().toISOString()}`;
                await window.storageManager.adapter.putFile(
                    'test-local-git.md',
                    testContent,
                    'Test: create file via Local Git'
                );

                return { success: true, error: null };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        if (fileCreated.success) {
            console.log('   Création de fichier: ✅');
        } else {
            console.log(`   Création de fichier: ❌ (${fileCreated.error})`);
        }

        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'test-local-startup-2-file-created.png', fullPage: true });

        // 8. Try to read the file back
        console.log('\n7️⃣  Lecture du fichier créé...');
        
        const fileRead = await page.evaluate(async () => {
            try {
                if (!window.storageManager || !window.storageManager.adapter) {
                    return { success: false, error: 'Storage adapter not initialized', content: null };
                }

                const content = await window.storageManager.adapter.getFile('test-local-git.md');
                return { success: true, error: null, content };
            } catch (error) {
                return { success: false, error: error.message, content: null };
            }
        });

        if (fileRead.success) {
            console.log('   Lecture de fichier: ✅');
            console.log(`   Contenu valide: ${fileRead.content?.includes('Test Local Git') ? '✅' : '❌'}`);
        } else {
            console.log(`   Lecture de fichier: ❌ (${fileRead.error})`);
        }

        // Summary
        console.log('\n═'.repeat(51));
        console.log('RÉSUMÉ DU TEST');
        console.log('═'.repeat(51) + '\n');

        const allChecks = {
            wizardHidden: !wizardVisible,
            uiVisible: headerVisible && calendarVisible,
            configPersisted: storageCheck.mode === 'local-git' && storageCheck.hasConfig,
            noCriticalErrors: criticalErrors.length === 0,
            localGitInit: localGitInitialized,
            fileWrite: fileCreated.success,
            fileRead: fileRead.success
        };

        console.log(`✅ Wizard caché: ${allChecks.wizardHidden ? 'OUI' : 'NON'}`);
        console.log(`✅ Interface visible: ${allChecks.uiVisible ? 'OUI' : 'NON'}`);
        console.log(`✅ Configuration persistée: ${allChecks.configPersisted ? 'OUI' : 'NON'}`);
        console.log(`✅ Pas d'erreurs critiques: ${allChecks.noCriticalErrors ? 'OUI' : 'NON'}`);
        console.log(`✅ Local Git initialisé: ${allChecks.localGitInit ? 'OUI' : 'NON'}`);
        console.log(`✅ Écriture fichier: ${allChecks.fileWrite ? 'OUI' : 'NON'}`);
        console.log(`✅ Lecture fichier: ${allChecks.fileRead ? 'OUI' : 'NON'}`);

        const allPassed = Object.values(allChecks).every(v => v);
        
        console.log('\n' + '═'.repeat(51));
        if (allPassed) {
            console.log('✅✅✅ TOUS LES TESTS RÉUSSIS! ✅✅✅');
        } else {
            console.log('❌ Certains tests ont échoué');
            console.log('\nDétails:');
            Object.entries(allChecks).forEach(([key, value]) => {
                if (!value) console.log(`  - ${key}: ÉCHOUÉ`);
            });
        }
        console.log('═'.repeat(51) + '\n');

        console.log('🏁 Test terminé\n');

        await page.waitForTimeout(2000);
        await browser.close();
        
        return allPassed ? 0 : 1;

    } catch (error) {
        console.error('❌ Erreur:', error);
        await page.screenshot({ path: 'test-local-startup-error.png', fullPage: true });
        await browser.close();
        return 1;
    }
}

// Run test
testLocalGitStartup()
    .then(exitCode => process.exit(exitCode))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
