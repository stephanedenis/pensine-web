/**
 * Test du wizard restructuré avec authentification et repository séparés
 * Phase 2 - Nouveau flux: Owner → Token → Validation → Liste repos → Sélection
 */

import { chromium } from 'playwright';

const TEST_CONFIG = {
    token: process.env.GITHUB_TEST_TOKEN || '',
    owner: process.env.GITHUB_TEST_OWNER || 'stephanedenis',
    timeout: 90000
};

if (!TEST_CONFIG.token) {
    console.error('❌ GITHUB_TEST_TOKEN non défini');
    process.exit(1);
}

async function testWizardRestructuredFlow() {
    console.log('🧪 Test du wizard restructuré - Phase 2\n');
    
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        // Activer la console pour debug
        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('✅') || text.includes('❌') || text.includes('Token')) {
                console.log(`  📋 Console: ${text}`);
            }
        });

        page.on('pageerror', err => {
            console.error(`  ❌ Erreur page: ${err.message}`);
        });

        // 1. Charger l'application
        console.log('1️⃣  Chargement de l\'application...');
        await page.goto('http://localhost:8000', { waitUntil: 'networkidle' });
        
        // Effacer localStorage pour forcer le wizard
        await page.evaluate(() => {
            localStorage.clear();
        });
        await page.reload({ waitUntil: 'networkidle' });

        // Attendre que le wizard s'affiche
        console.log('2️⃣  Attente du wizard...');
        await page.waitForSelector('#config-wizard', { state: 'visible', timeout: 10000 });
        console.log('   ✅ Wizard visible');

        // 3. Étape Welcome
        console.log('\n3️⃣  Étape Welcome');
        const welcomeTitle = await page.textContent('.wizard-step-title');
        console.log(`   📝 Titre: "${welcomeTitle}"`);
        
        await page.click('button[data-action="next"]');
        await page.waitForTimeout(500);

        // 4. Étape Platform - Sélectionner GitHub
        console.log('\n4️⃣  Étape Platform - Sélection GitHub');
        await page.waitForSelector('.wizard-platform-option[data-platform="github"]', { timeout: 5000 });
        await page.click('.wizard-platform-option[data-platform="github"]');
        await page.waitForTimeout(500);
        
        await page.click('button[data-action="next"]');
        await page.waitForTimeout(500);

        // 5. Étape Authentication (NOUVELLE) - Owner AVANT token
        console.log('\n5️⃣  Étape Authentication (owner + token)');
        
        // Vérifier que l'étape authentication existe
        const authTitle = await page.textContent('.wizard-step-title');
        console.log(`   📝 Titre: "${authTitle}"`);
        
        // Vérifier présence des champs
        const hasOwnerField = await page.isVisible('#wizard-owner');
        const hasTokenField = await page.isVisible('#wizard-token');
        const hasValidateBtn = await page.isVisible('#validate-token-btn');
        
        console.log(`   Owner field: ${hasOwnerField ? '✅' : '❌'}`);
        console.log(`   Token field: ${hasTokenField ? '✅' : '❌'}`);
        console.log(`   Validate button: ${hasValidateBtn ? '✅' : '❌'}`);

        // Remplir owner d'abord
        console.log(`   👤 Remplissage owner: ${TEST_CONFIG.owner}`);
        await page.fill('#wizard-owner', TEST_CONFIG.owner);
        
        // Puis le token
        console.log('   🔑 Remplissage token...');
        await page.fill('#wizard-token', TEST_CONFIG.token);
        
        // Cliquer sur Valider le token
        console.log('   🔍 Validation du token...');
        await page.click('#validate-token-btn');
        
        // Attendre la validation (max 10s)
        await page.waitForTimeout(2000);
        
        // Vérifier le résultat de la validation
        const hasSuccessBox = await page.isVisible('.wizard-success-box');
        const hasErrorBox = await page.isVisible('.wizard-error-box');
        
        if (hasSuccessBox) {
            const successText = await page.textContent('.wizard-success-box');
            console.log(`   ✅ Validation réussie: ${successText.substring(0, 100)}...`);
        } else if (hasErrorBox) {
            const errorText = await page.textContent('.wizard-error-box');
            console.log(`   ❌ Erreur validation: ${errorText}`);
            throw new Error('Token validation failed');
        } else {
            console.log('   ⏳ Validation en cours...');
            await page.waitForTimeout(3000);
            
            // Revérifier
            const hasSuccessBox2 = await page.isVisible('.wizard-success-box');
            if (hasSuccessBox2) {
                console.log('   ✅ Validation réussie après attente');
            } else {
                throw new Error('Validation timeout');
            }
        }
        
        // Vérifier que owner est auto-rempli
        const ownerValue = await page.inputValue('#wizard-owner');
        console.log(`   👤 Owner auto-rempli: "${ownerValue}"`);
        
        // Vérifier que le bouton Next est activé
        const isNextEnabled = await page.isEnabled('button[data-action="next"]');
        console.log(`   Next button enabled: ${isNextEnabled ? '✅' : '❌'}`);
        
        await page.click('button[data-action="next"]');
        await page.waitForTimeout(1000);

        // 6. Étape Repository (NOUVELLE) - Liste et sélection
        console.log('\n6️⃣  Étape Repository (liste et sélection)');
        
        const repoTitle = await page.textContent('.wizard-step-title');
        console.log(`   📝 Titre: "${repoTitle}"`);
        
        // Attendre que les repos se chargent
        console.log('   ⏳ Chargement de la liste des repositories...');
        await page.waitForTimeout(3000);
        
        // Vérifier présence de la liste de repos
        const hasRepoList = await page.isVisible('.wizard-repo-list');
        console.log(`   Liste repos visible: ${hasRepoList ? '✅' : '❌'}`);
        
        if (hasRepoList) {
            // Compter les repos
            const repoItems = await page.$$('.wizard-repo-item');
            console.log(`   📚 ${repoItems.length} repositories trouvés`);
            
            // Afficher les premiers repos
            for (let i = 0; i < Math.min(3, repoItems.length); i++) {
                const repoName = await repoItems[i].getAttribute('data-repo-name');
                console.log(`      - ${repoName}`);
            }
            
            // Sélectionner le premier repo
            if (repoItems.length > 0) {
                console.log('   👆 Sélection du premier repository...');
                await repoItems[0].click();
                await page.waitForTimeout(500);
                
                // Vérifier que le repo est sélectionné
                const selectedRepoName = await repoItems[0].getAttribute('data-repo-name');
                const isSelected = await repoItems[0].evaluate(el => el.classList.contains('selected'));
                console.log(`   ${isSelected ? '✅' : '❌'} Repository "${selectedRepoName}" sélectionné`);
                
                // Vérifier le box de confirmation
                const hasSelectedBox = await page.isVisible('.wizard-success-box');
                if (hasSelectedBox) {
                    const selectedText = await page.textContent('.wizard-success-box');
                    console.log(`   ✅ ${selectedText.substring(0, 80)}...`);
                }
            }
        } else {
            console.log('   ⚠️  Aucune liste de repos affichée (chargement en cours?)');
        }
        
        // Vérifier présence du formulaire de création
        const hasCreateForm = await page.isVisible('#wizard-new-repo');
        console.log(`   Formulaire création: ${hasCreateForm ? '✅' : '❌'}`);
        
        // Vérifier que le bouton Next est activé
        const isNextEnabled2 = await page.isEnabled('button[data-action="next"]');
        console.log(`   Next button enabled: ${isNextEnabled2 ? '✅' : '❌'}`);
        
        if (isNextEnabled2) {
            await page.click('button[data-action="next"]');
            await page.waitForTimeout(500);
        }

        // 7. Étape Preferences
        console.log('\n7️⃣  Étape Preferences');
        const prefTitle = await page.textContent('.wizard-step-title');
        console.log(`   📝 Titre: "${prefTitle}"`);
        
        await page.click('button[data-action="next"]');
        await page.waitForTimeout(500);

        // 8. Étape Complete
        console.log('\n8️⃣  Étape Complete');
        const completeTitle = await page.textContent('.wizard-step-title');
        console.log(`   📝 Titre: "${completeTitle}"`);
        
        console.log('   💾 Sauvegarde de la configuration...');
        await page.click('button[data-action="complete"]');
        
        // Attendre la sauvegarde et le rechargement
        console.log('   ⏳ Attente du rechargement...');
        await page.waitForTimeout(3000);

        // 9. Vérification de la configuration sauvegardée
        console.log('\n9️⃣  Vérification localStorage');
        
        const savedConfig = await page.evaluate(() => {
            return {
                hasConfig: !!localStorage.getItem('pensine-config'),
                hasToken: !!localStorage.getItem('pensine-encrypted-token'),
                hasOwner: !!localStorage.getItem('github-owner'),
                hasRepo: !!localStorage.getItem('github-repo'),
                hasStorageMode: !!localStorage.getItem('pensine-storage-mode'),
                hasSelectedRepos: !!localStorage.getItem('pensine-selected-repos'),
                owner: localStorage.getItem('github-owner'),
                repo: localStorage.getItem('github-repo'),
                storageMode: localStorage.getItem('pensine-storage-mode'),
                selectedRepos: localStorage.getItem('pensine-selected-repos')
            };
        });
        
        console.log(`   pensine-config: ${savedConfig.hasConfig ? '✅' : '❌'}`);
        console.log(`   encrypted-token: ${savedConfig.hasToken ? '✅' : '❌'}`);
        console.log(`   github-owner: ${savedConfig.hasOwner ? '✅' : '❌'} (${savedConfig.owner})`);
        console.log(`   github-repo: ${savedConfig.hasRepo ? '✅' : '❌'} (${savedConfig.repo})`);
        console.log(`   storage-mode: ${savedConfig.hasStorageMode ? '✅' : '❌'} (${savedConfig.storageMode})`);
        console.log(`   selected-repos: ${savedConfig.hasSelectedRepos ? '✅' : '❌'} (${savedConfig.selectedRepos})`);

        // 10. Vérifier que le wizard ne réapparaît pas
        console.log('\n🔟 Vérification que le wizard ne réapparaît pas');
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);
        
        const isWizardVisible = await page.isVisible('#config-wizard');
        console.log(`   Wizard visible après reload: ${isWizardVisible ? '❌ (ne devrait pas)' : '✅ (correct)'}`);

        // Screenshot final
        await page.screenshot({ path: 'wizard-restructured-complete.png', fullPage: true });
        console.log('\n📸 Screenshot sauvegardé: wizard-restructured-complete.png');

        console.log('\n✅ Test du wizard restructuré réussi!\n');
        
        return true;

    } catch (error) {
        console.error('\n❌ Erreur durant le test:', error.message);
        await page.screenshot({ path: 'wizard-restructured-error.png', fullPage: true });
        console.log('📸 Screenshot erreur: wizard-restructured-error.png\n');
        return false;
    } finally {
        await browser.close();
    }
}

// Exécution
testWizardRestructuredFlow()
    .then(success => process.exit(success ? 0 : 1))
    .catch(err => {
        console.error('💥 Erreur fatale:', err);
        process.exit(1);
    });
