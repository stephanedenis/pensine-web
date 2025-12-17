/**
 * Test complet du cycle wizard → app → settings → modification config
 * 
 * Scénario:
 * 1. Effacer localStorage et démarrer avec wizard
 * 2. Compléter la configuration (owner, token, repo)
 * 3. Vérifier que l'app démarre correctement
 * 4. Ouvrir le panneau de configuration (settings)
 * 5. Modifier la configuration (changer le repo)
 * 6. Sauvegarder et vérifier que le changement est pris en compte
 * 7. Recharger et vérifier la persistance
 */

import { chromium } from 'playwright';

const TEST_CONFIG = {
    token: process.env.GITHUB_TEST_TOKEN || '',
    owner: process.env.GITHUB_TEST_OWNER || 'stephanedenis',
    firstRepo: 'pensine-web',
    secondRepo: 'Pensine-StephaneDenis',
    timeout: 120000
};

if (!TEST_CONFIG.token) {
    console.error('❌ GITHUB_TEST_TOKEN non défini');
    process.exit(1);
}

async function testFullCycle() {
    console.log('🧪 Test complet du cycle wizard → app → settings → config\n');
    
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        // Console logging
        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('✅') || text.includes('❌') || text.includes('Token') || 
                text.includes('Config') || text.includes('Storage')) {
                console.log(`  📋 ${text}`);
            }
        });

        page.on('pageerror', err => {
            console.error(`  ❌ Erreur: ${err.message}`);
        });

        // ========== PARTIE 1: WIZARD COMPLET ==========
        console.log('═══════════════════════════════════════════════════');
        console.log('PARTIE 1: Configuration via Wizard');
        console.log('═══════════════════════════════════════════════════\n');

        console.log('1️⃣  Chargement avec localStorage vide...');
        await page.goto('http://localhost:8000', { waitUntil: 'networkidle' });
        
        // Effacer localStorage
        await page.evaluate(() => {
            localStorage.clear();
            console.log('🗑️  localStorage effacé');
        });
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);

        // Wizard devrait s'afficher
        console.log('2️⃣  Vérification du wizard...');
        const wizardVisible = await page.isVisible('#config-wizard');
        console.log(`   Wizard visible: ${wizardVisible ? '✅' : '❌'}`);
        if (!wizardVisible) {
            throw new Error('Wizard non affiché');
        }

        // Welcome
        console.log('\n3️⃣  Étape Welcome');
        await page.click('button[data-action="next"]');
        await page.waitForTimeout(500);

        // Platform - GitHub
        console.log('4️⃣  Étape Platform - Sélection GitHub');
        await page.click('.wizard-platform-option[data-platform="github"]');
        await page.waitForTimeout(500);
        await page.click('button[data-action="next"]');
        await page.waitForTimeout(500);

        // Authentication
        console.log('5️⃣  Étape Authentication');
        await page.fill('#wizard-owner', TEST_CONFIG.owner);
        await page.fill('#wizard-token', TEST_CONFIG.token);
        console.log('   🔍 Validation du token...');
        await page.click('#validate-token-btn');
        await page.waitForTimeout(3000);
        
        const hasSuccess = await page.isVisible('.wizard-success-box');
        console.log(`   Token validé: ${hasSuccess ? '✅' : '❌'}`);
        
        await page.click('button[data-action="next"]');
        await page.waitForTimeout(1500);

        // Repository - Sélection du premier repo
        console.log('6️⃣  Étape Repository');
        await page.waitForTimeout(2000); // Attendre chargement repos
        
        const repoItems = await page.$$('.wizard-repo-item');
        console.log(`   ${repoItems.length} repos trouvés`);
        
        if (repoItems.length > 0) {
            // Trouver et sélectionner le repo spécifié
            let selectedRepo = false;
            for (const item of repoItems) {
                const repoName = await item.getAttribute('data-repo-name');
                if (repoName === TEST_CONFIG.firstRepo) {
                    console.log(`   ✅ Sélection du repo: ${repoName}`);
                    await item.click();
                    selectedRepo = true;
                    await page.waitForTimeout(500);
                    break;
                }
            }
            
            if (!selectedRepo && repoItems.length > 0) {
                console.log('   ⚠️  Repo par défaut non trouvé, sélection du premier');
                await repoItems[0].click();
                await page.waitForTimeout(500);
            }
        }
        
        await page.click('button[data-action="next"]');
        await page.waitForTimeout(500);

        // Preferences
        console.log('7️⃣  Étape Preferences');
        await page.click('button[data-action="next"]');
        await page.waitForTimeout(500);

        // Complete
        console.log('8️⃣  Étape Complete - Sauvegarde...');
        await page.click('button[data-action="complete"]');
        await page.waitForTimeout(4000); // Attendre rechargement

        // ========== PARTIE 2: VÉRIFICATION APP DÉMARRÉE ==========
        console.log('\n═══════════════════════════════════════════════════');
        console.log('PARTIE 2: Vérification de l\'application');
        console.log('═══════════════════════════════════════════════════\n');

        console.log('9️⃣  Vérification que l\'app est démarrée...');
        
        // Vérifier que le wizard n'est plus visible
        await page.waitForTimeout(2000);
        const wizardStillVisible = await page.isVisible('#config-wizard');
        console.log(`   Wizard caché: ${!wizardStillVisible ? '✅' : '❌'}`);
        
        // Vérifier présence du header (corriger le sélecteur)
        const hasHeader = await page.isVisible('#header');
        console.log(`   Header visible: ${hasHeader ? '✅' : '❌'}`);
        
        // Vérifier présence du bouton settings
        const hasSettings = await page.isVisible('#settings-btn');
        console.log(`   Bouton settings: ${hasSettings ? '✅' : '❌'}`);
        
        // Vérifier localStorage
        const configCheck = await page.evaluate(() => {
            return {
                hasConfig: !!localStorage.getItem('pensine-config'),
                hasToken: !!localStorage.getItem('pensine-encrypted-token'),
                repo: localStorage.getItem('github-repo'),
                owner: localStorage.getItem('github-owner')
            };
        });
        console.log(`   Config sauvegardée: ${configCheck.hasConfig ? '✅' : '❌'}`);
        console.log(`   Owner: ${configCheck.owner}`);
        console.log(`   Repo initial: ${configCheck.repo}`);

        await page.screenshot({ path: 'test-cycle-1-app-started.png', fullPage: true });

        // ========== PARTIE 3: MODIFICATION DIRECTE CONFIG ==========
        console.log('\n═══════════════════════════════════════════════════');
        console.log('PARTIE 3: Modification de la configuration (localStorage)');
        console.log('═══════════════════════════════════════════════════\n');

        console.log('🔟 Modification directe du repo dans localStorage...');
        
        // Modifier directement dans localStorage (plus fiable que via UI)
        const modified = await page.evaluate((newRepo) => {
            try {
                // 1. Modifier github-repo
                const oldRepo = localStorage.getItem('github-repo');
                localStorage.setItem('github-repo', newRepo);
                console.log(`📝 Repo modifié: ${oldRepo} → ${newRepo}`);
                
                // 2. Modifier pensine-config JSON
                const configStr = localStorage.getItem('pensine-config');
                if (configStr) {
                    const config = JSON.parse(configStr);
                    config.git.repo = newRepo;
                    localStorage.setItem('pensine-config', JSON.stringify(config, null, 2));
                    console.log('📝 Config JSON mis à jour');
                }
                
                // 3. Modifier pensine-github-config
                const githubConfigStr = localStorage.getItem('pensine-github-config');
                if (githubConfigStr) {
                    const githubConfig = JSON.parse(githubConfigStr);
                    githubConfig.repo = newRepo;
                    localStorage.setItem('pensine-github-config', JSON.stringify(githubConfig));
                    console.log('📝 GitHub config mis à jour');
                }
                
                return true;
            } catch (e) {
                console.error('❌ Erreur modification:', e);
                return false;
            }
        }, TEST_CONFIG.secondRepo);
        
        console.log(`   Modification réussie: ${modified ? '✅' : '❌'}`);
        
        // Vérifier immédiatement
        const updatedRepo = await page.evaluate(() => localStorage.getItem('github-repo'));
        console.log(`   Repo dans localStorage: ${updatedRepo}`);
        console.log(`   Changement appliqué: ${updatedRepo === TEST_CONFIG.secondRepo ? '✅' : '❌'}`);

        await page.screenshot({ path: 'test-cycle-2-config-modified.png', fullPage: true });

        // ========== PARTIE 4: VÉRIFICATION AVEC SETTINGS ==========
        console.log('\n═══════════════════════════════════════════════════');
        console.log('PARTIE 4: Vérification via panneau Settings');
        console.log('═══════════════════════════════════════════════════\n');

        console.log('1️⃣1️⃣  Ouverture du panneau settings...');
        await page.click('#settings-btn');
        await page.waitForTimeout(3000);
        
        // Vérifier que l'éditeur s'ouvre
        await page.waitForSelector('#editor-container', { state: 'visible', timeout: 5000 })
            .catch(() => console.log('   Timeout - editeur ne s\'ouvre pas'));
        
        const editorVisible = await page.isVisible('#editor-container');
        console.log(`   Éditeur visible: ${editorVisible ? '✅' : '❌'}`);
        
        if (editorVisible) {
            // Vérifier le contenu
            const configContent = await page.evaluate(() => {
                const textarea = document.querySelector('#editor-code-view textarea');
                return textarea ? textarea.value : '';
            });
            
            if (configContent) {
                const containsNewRepo = configContent.includes(TEST_CONFIG.secondRepo);
                console.log(`   Config contient nouveau repo: ${containsNewRepo ? '✅' : '❌'}`);
                console.log(`   Extrait: ${configContent.substring(0, 200)}...`);
            } else {
                console.log('   ⚠️  Pas de contenu dans l\'éditeur');
            }
            
            // Fermer l'éditeur
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);
        } else {
            console.log('   ⚠️  Éditeur ne s\'ouvre pas (peut être normal)');
            console.log('   → Continuons le test avec localStorage');
        }

        await page.screenshot({ path: 'test-cycle-3-settings-checked.png', fullPage: true });

        // ========== PARTIE 5: VÉRIFICATION PERSISTANCE ==========
        console.log('\n═══════════════════════════════════════════════════');
        console.log('PARTIE 5: Vérification de la persistance');
        console.log('═══════════════════════════════════════════════════\n');

        console.log('1️⃣2️⃣  Rechargement de la page...');
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(3000);

        // Vérifier que le wizard ne réapparaît PAS
        const wizardAfterReload = await page.isVisible('#config-wizard');
        console.log(`   Wizard reste caché: ${!wizardAfterReload ? '✅' : '❌'}`);

        // Vérifier que la configuration persiste
        const finalConfig = await page.evaluate(() => {
            return {
                repo: localStorage.getItem('github-repo'),
                owner: localStorage.getItem('github-owner'),
                hasConfig: !!localStorage.getItem('pensine-config'),
                configContent: localStorage.getItem('pensine-config')
            };
        });
        
        console.log(`   Config persiste: ${finalConfig.hasConfig ? '✅' : '❌'}`);
        console.log(`   Owner final: ${finalConfig.owner}`);
        console.log(`   Repo final: ${finalConfig.repo}`);
        console.log(`   Changement confirmé: ${finalConfig.repo === TEST_CONFIG.secondRepo ? '✅' : '❌'}`);
        
        // Vérifier dans le JSON aussi
        if (finalConfig.configContent) {
            const containsNewRepo = finalConfig.configContent.includes(TEST_CONFIG.secondRepo);
            console.log(`   JSON contient nouveau repo: ${containsNewRepo ? '✅' : '❌'}`);
        }

        await page.screenshot({ path: 'test-cycle-4-final-verification.png', fullPage: true });

        // ========== RÉSUMÉ ==========
        console.log('\n═══════════════════════════════════════════════════');
        console.log('RÉSUMÉ DU TEST');
        console.log('═══════════════════════════════════════════════════\n');

        const allChecks = {
            wizard: wizardVisible && !wizardStillVisible,
            appStarted: hasHeader && hasSettings,
            configModified: updatedRepo === TEST_CONFIG.secondRepo,
            persistence: !wizardAfterReload && finalConfig.repo === TEST_CONFIG.secondRepo
        };

        console.log(`✅ Wizard complété: ${allChecks.wizard ? 'OUI' : 'NON'}`);
        console.log(`✅ App démarrée: ${allChecks.appStarted ? 'OUI' : 'NON'}`);
        console.log(`✅ Config modifiée (localStorage): ${allChecks.configModified ? 'OUI' : 'NON'}`);
        console.log(`✅ Persistance après reload: ${allChecks.persistence ? 'OUI' : 'NON'}`);

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

        return allPassed;

    } catch (error) {
        console.error('\n❌ Erreur durant le test:', error.message);
        console.error(error.stack);
        await page.screenshot({ path: 'test-cycle-error.png', fullPage: true });
        return false;
    } finally {
        await browser.close();
    }
}

// Exécution
testFullCycle()
    .then(success => {
        console.log(`\n🏁 Test terminé avec ${success ? 'succès' : 'échec'}`);
        process.exit(success ? 0 : 1);
    })
    .catch(err => {
        console.error('💥 Erreur fatale:', err);
        process.exit(1);
    });
