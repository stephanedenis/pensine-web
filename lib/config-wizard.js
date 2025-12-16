/**
 * Configuration Wizard
 * Multi-step wizard for initial Pensine setup
 * Supports GitHub, Bitbucket, GitLab, Gitea
 */

class ConfigWizard {
    constructor() {
        this.currentStep = 0;
        this.tokenValidated = false;
        this.isValidatingToken = false;
        this.validationError = null;
        this.authenticatedUser = null;
        
        this.config = {
            git: {
                platform: 'github',
                token: '',
                owner: '',
                repo: '',
                branch: 'master'
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
            },
            synchro: {
                calendriers: { enabled: false, services: [] },
                taches: { enabled: false, services: [] },
                email: { enabled: false, services: [] }
            }
        };

        this.availableRepos = [];
        this.selectedRepos = [];

        this.steps = [
            {
                id: 'welcome',
                title: 'Bienvenue',
                render: () => this.renderWelcomeStep()
            },
            {
                id: 'platform',
                title: 'Choix de la plateforme Git',
                render: () => this.renderPlatformStep()
            },
            {
                id: 'authentication',
                title: 'Authentification',
                render: () => this.renderAuthenticationStep()
            },
            {
                id: 'repository',
                title: 'Sélection des repositories',
                render: () => this.renderRepositoryStep()
            },
            {
                id: 'preferences',
                title: 'Préférences',
                render: () => this.renderPreferencesStep()
            },
            {
                id: 'complete',
                title: 'Configuration terminée',
                render: () => this.renderCompleteStep()
            }
        ];
    }

    show() {
        const wizard = document.getElementById('config-wizard');
        wizard.classList.remove('hidden');
        this.renderStep();
    }

    hide() {
        const wizard = document.getElementById('config-wizard');
        wizard.classList.add('hidden');
    }

    renderStep() {
        const container = document.getElementById('wizard-steps');
        const step = this.steps[this.currentStep];

        container.innerHTML = `
            ${this.renderProgress()}
            <div class="wizard-step">
                <div class="wizard-step-header">
                    <span class="wizard-step-number">${this.currentStep + 1}</span>
                    <h2 class="wizard-step-title">${step.title}</h2>
                </div>
                ${step.render()}
            </div>
            ${this.renderActions()}
        `;

        // Load repos when entering repository step
        if (step.id === 'repository' && this.tokenValidated && this.availableRepos.length === 0) {
            this.loadAvailableRepos();
        }

        // Attach event listeners
        this.attachListeners();
    }

    renderProgress() {
        const dots = this.steps.map((_, index) => {
            const state = index < this.currentStep ? 'completed' :
                index === this.currentStep ? 'active' : '';
            return `<div class="wizard-progress-dot ${state}"></div>`;
        }).join('');

        return `<div class="wizard-progress">${dots}</div>`;
    }

    renderWelcomeStep() {
        return `
            <div class="wizard-step-description">
                <p><strong>Pensine</strong> est votre second cerveau numérique. Pour commencer, nous devons configurer la synchronisation avec un service Git.</p>
                <p>Cette configuration vous permet de :</p>
                <ul>
                    <li>💾 Sauvegarder automatiquement vos notes</li>
                    <li>🔄 Synchroniser entre plusieurs appareils</li>
                    <li>📝 Garder un historique complet de vos modifications</li>
                    <li>🔒 Contrôler la confidentialité de vos données</li>
                </ul>
            </div>
        `;
    }

    renderPlatformStep() {
        const platforms = [
            { id: 'github', name: 'GitHub', icon: '🐙', url: 'github.com' },
            { id: 'bitbucket', name: 'Bitbucket', icon: '🪣', url: 'bitbucket.org' },
            { id: 'gitlab', name: 'GitLab', icon: '🦊', url: 'gitlab.com' },
            { id: 'gitea', name: 'Gitea', icon: '🍵', url: 'gitea.io' }
        ];

        return `
            <div class="wizard-step-description">
                Choisissez la plateforme où vous hébergez vos repositories Git :
            </div>
            <div class="wizard-platform-selector">
                ${platforms.map(p => `
                    <div class="wizard-platform-option ${this.config.git.platform === p.id ? 'selected' : ''}"
                         data-platform="${p.id}">
                        <div class="wizard-platform-icon">${p.icon}</div>
                        <div class="wizard-platform-name">${p.name}</div>
                        <div class="wizard-platform-url">${p.url}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderAuthenticationStep() {
        const platformInfo = this.getPlatformInfo();

        return `
            <div class="wizard-step-description">
                Connectez-vous à ${platformInfo.name} pour accéder à vos repositories.
            </div>

            <form class="wizard-form" id="auth-form">
                <div class="wizard-field">
                    <label>
                        Nom d'utilisateur / Organisation
                        <span class="field-help">(votre username GitHub)</span>
                    </label>
                    <input type="text"
                           id="wizard-owner"
                           value="${this.config.git.owner}"
                           placeholder="ex: stephanedenis"
                           ${this.tokenValidated ? 'readonly' : ''}
                           required>
                </div>

                <div class="wizard-info-box">
                    <h4>📝 Comment obtenir un token d'accès :</h4>
                    ${platformInfo.tokenInstructions}
                </div>

                <div class="wizard-field">
                    <label>
                        Token d'accès personnel
                        <span class="field-help">(requis, avec scope 'repo')</span>
                    </label>
                    <input type="password"
                           id="wizard-token"
                           value="${this.config.git.token}"
                           placeholder="ghp_..."
                           ${this.tokenValidated ? 'disabled' : ''}
                           required>
                    <button type="button" 
                            id="validate-token-btn"
                            class="wizard-btn wizard-btn-secondary"
                            style="margin-top: 10px; width: auto;"
                            ${this.isValidatingToken || this.tokenValidated ? 'disabled' : ''}>
                        ${this.isValidatingToken ? '⏳ Validation en cours...' : 
                          this.tokenValidated ? '✅ Token validé' : 
                          '🔍 Valider le token'}
                    </button>
                </div>

                ${this.validationError ? `
                    <div class="wizard-error-box" style="background: #fee; border-left: 4px solid #e33; padding: 15px; margin: 15px 0;">
                        <strong>❌ Erreur de validation</strong>
                        <p>${this.validationError}</p>
                    </div>
                ` : ''}

                ${this.tokenValidated && this.authenticatedUser ? `
                    <div class="wizard-success-box" style="background: #d1f4e0; border-left: 4px solid #0a0; padding: 15px; margin: 15px 0;">
                        <strong>✅ Authentifié avec succès!</strong>
                        <p>Connecté en tant que: <strong>${this.authenticatedUser.login}</strong></p>
                        ${this.authenticatedUser.name ? `<p>Nom: ${this.authenticatedUser.name}</p>` : ''}
                    </div>
                ` : ''}
            </form>
        `;
    }

    renderRepositoryStep() {
        return `
            <div class="wizard-step-description">
                Sélectionnez un ou plusieurs repositories existants, ou créez-en de nouveaux.
            </div>

            ${this.availableRepos.length > 0 ? `
                <div class="wizard-info-box">
                    <h4>📚 Vos repositories :</h4>
                    <div class="wizard-repo-list" style="max-height: 300px; overflow-y: auto;">
                        ${this.availableRepos.map(repo => {
                            const selected = this.selectedRepos.includes(repo.name);
                            return `
                            <div class="wizard-repo-item ${selected ? 'selected' : ''}"
                                 data-repo-name="${repo.name}"
                                 style="cursor: pointer; padding: 15px; margin: 10px 0; border: 2px solid ${selected ? '#0a0' : '#ddd'}; border-radius: 8px; background: ${selected ? '#d1f4e0' : '#f9f9f9'};">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <div class="wizard-repo-icon" style="font-size: 24px;">${repo.private ? '🔒' : '🌐'}</div>
                                    <div class="wizard-repo-info" style="flex: 1;">
                                        <div class="wizard-repo-name" style="font-weight: bold; font-size: 16px;">${repo.name}</div>
                                        <div class="wizard-repo-desc" style="color: #666; font-size: 14px;">${repo.description || 'Pas de description'}</div>
                                    </div>
                                    ${selected ? '<div style="color: #0a0; font-size: 20px;">✓</div>' : ''}
                                </div>
                            </div>
                        `}).join('')}
                    </div>
                </div>
            ` : `
                <div class="wizard-info-box" style="background: #fff5b1; border-left: 4px solid #fa0; padding: 15px;">
                    <p>⏳ Chargement des repositories...</p>
                </div>
            `}

            <div class="wizard-info-box" style="margin-top: 20px;">
                <h4>➕ Créer un nouveau repository :</h4>
                <p>Suggestions selon l'usage :</p>
                <ul>
                    <li><strong>Pensine-[VotreNom]</strong> - Notes personnelles privées</li>
                    <li><strong>Pensine-[Organisation]</strong> - Notes professionnelles privées</li>
                    <li><strong>Pensine-Public</strong> - Connaissances publiques partagées</li>
                </ul>
            </div>

            <form class="wizard-form" id="repo-form">
                <div class="wizard-field">
                    <label>
                        Nom du nouveau repository
                        <span class="field-help">(optionnel)</span>
                    </label>
                    <input type="text"
                           id="wizard-new-repo"
                           placeholder="ex: Pensine-StephaneDenis">
                </div>

                <div class="wizard-field">
                    <label>
                        <input type="checkbox" id="wizard-repo-private" checked>
                        Repository privé (recommandé pour notes personnelles)
                    </label>
                </div>

                <div class="wizard-field">
                    <label>
                        Description
                        <span class="field-help">(optionnelle)</span>
                    </label>
                    <input type="text"
                           id="wizard-repo-desc"
                           placeholder="ex: Mes notes personnelles Pensine">
                </div>

                <button type="button" 
                        id="create-repo-btn"
                        class="wizard-btn wizard-btn-secondary"
                        style="width: auto;">
                    ➕ Créer ce repository
                </button>
            </form>

            ${this.selectedRepos.length > 0 ? `
                <div class="wizard-success-box" style="background: #d1f4e0; border-left: 4px solid #0a0; padding: 15px; margin: 15px 0;">
                    <strong>✅ ${this.selectedRepos.length} repository(s) sélectionné(s)</strong>
                    <ul style="margin: 10px 0 0 20px;">
                        ${this.selectedRepos.map(name => `<li>${name}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        `;
    }

    renderPreferencesStep() {
        return `
            <div class="wizard-step-description">
                Personnalisez votre expérience Pensine :
            </div>

            <form class="wizard-form" id="preferences-form">
                <div class="wizard-field">
                    <label>Langue / Région</label>
                    <select id="wizard-locale">
                        <option value="fr-CA" ${this.config.langue.locale === 'fr-CA' ? 'selected' : ''}>Français (Canada)</option>
                        <option value="fr-FR" ${this.config.langue.locale === 'fr-FR' ? 'selected' : ''}>Français (France)</option>
                        <option value="en-US" ${this.config.langue.locale === 'en-US' ? 'selected' : ''}>English (US)</option>
                        <option value="en-CA" ${this.config.langue.locale === 'en-CA' ? 'selected' : ''}>English (Canada)</option>
                    </select>
                </div>

                <div class="wizard-field">
                    <label>Premier jour de la semaine</label>
                    <select id="wizard-week-start">
                        <option value="0" ${this.config.ergonomie.jourDebutSemaine === 0 ? 'selected' : ''}>Dimanche</option>
                        <option value="1" ${this.config.ergonomie.jourDebutSemaine === 1 ? 'selected' : ''}>Lundi</option>
                        <option value="6" ${this.config.ergonomie.jourDebutSemaine === 6 ? 'selected' : ''}>Samedi</option>
                    </select>
                </div>

                <div class="wizard-field">
                    <label>Thème</label>
                    <select id="wizard-theme">
                        <option value="auto" ${this.config.ergonomie.theme === 'auto' ? 'selected' : ''}>Automatique (système)</option>
                        <option value="light" ${this.config.ergonomie.theme === 'light' ? 'selected' : ''}>Clair</option>
                        <option value="dark" ${this.config.ergonomie.theme === 'dark' ? 'selected' : ''}>Sombre</option>
                    </select>
                </div>

                <div class="wizard-field">
                    <label>
                        <input type="checkbox"
                               id="wizard-auto-sync"
                               ${this.config.ergonomie.autoSync ? 'checked' : ''}>
                        Synchronisation automatique (toutes les 5 minutes)
                    </label>
                </div>

                <div class="wizard-field">
                    <label>
                        <input type="checkbox"
                               id="wizard-auto-save"
                               ${this.config.ergonomie.autoSave ? 'checked' : ''}>
                        Sauvegarde automatique lors de l'édition
                    </label>
                </div>
            </form>

            <div class="wizard-info-box">
                <h4>🔮 Fonctionnalités futures</h4>
                <p>Les options suivantes seront disponibles prochainement :</p>
                <ul>
                    <li>Synchronisation avec calendriers Office 365 / Gmail</li>
                    <li>Import automatique de tâches Outlook / Todoist</li>
                    <li>Archivage d'emails importants</li>
                </ul>
            </div>
        `;
    }

    renderCompleteStep() {
        return `
            <div class="wizard-step-description">
                <p>✅ Votre configuration est prête !</p>
                <p>Pensine va maintenant créer le fichier <code>.pensine-config.json</code> dans votre repository.</p>
                <p>Vous pourrez modifier cette configuration à tout moment depuis l'éditeur.</p>
            </div>

            <div class="wizard-info-box">
                <h4>📋 Résumé de votre configuration :</h4>
                <ul>
                    <li><strong>Plateforme :</strong> ${this.getPlatformInfo().name}</li>
                    <li><strong>Repository :</strong> ${this.config.git.owner}/${this.config.git.repo}</li>
                    <li><strong>Branche :</strong> ${this.config.git.branch}</li>
                    <li><strong>Langue :</strong> ${this.config.langue.locale}</li>
                    <li><strong>Début semaine :</strong> ${['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'][this.config.ergonomie.jourDebutSemaine]}</li>
                </ul>
            </div>
        `;
    }

    renderActions() {
        const isFirst = this.currentStep === 0;
        const isLast = this.currentStep === this.steps.length - 1;
        const canProceed = this.canProceedFromStep();

        return `
            <div class="wizard-actions">
                <div class="wizard-actions-left">
                    ${!isFirst ? `<button class="wizard-btn wizard-btn-secondary" data-action="prev">← Précédent</button>` : ''}
                </div>
                <div class="wizard-actions-right">
                    ${!isLast ? `
                        <button class="wizard-btn wizard-btn-primary"
                                data-action="next"
                                ${!canProceed ? 'disabled' : ''}>
                            Suivant →
                        </button>
                    ` : `
                        <button class="wizard-btn wizard-btn-primary" data-action="complete">
                            🎉 Terminer
                        </button>
                    `}
                </div>
            </div>
        `;
    }

    getPlatformInfo() {
        const infos = {
            github: {
                name: 'GitHub',
                icon: '🐙',
                tokenInstructions: `
                    <ol>
                        <li>Allez sur <a href="https://github.com/settings/tokens" target="_blank">github.com/settings/tokens</a></li>
                        <li>Cliquez sur "Generate new token (classic)"</li>
                        <li>Donnez un nom (ex: "Pensine")</li>
                        <li>Cochez: <code>repo</code> (Full control of private repositories)</li>
                        <li>Générez et copiez le token</li>
                    </ol>
                `
            },
            bitbucket: {
                name: 'Bitbucket',
                icon: '🪣',
                tokenInstructions: `
                    <ol>
                        <li>Allez sur <a href="https://bitbucket.org/account/settings/app-passwords/" target="_blank">Bitbucket App Passwords</a></li>
                        <li>Créez un nouveau "App Password"</li>
                        <li>Cochez: <code>Repositories: Read, Write</code></li>
                        <li>Copiez le mot de passe généré</li>
                    </ol>
                `
            },
            gitlab: {
                name: 'GitLab',
                icon: '🦊',
                tokenInstructions: `
                    <ol>
                        <li>Allez sur <a href="https://gitlab.com/-/profile/personal_access_tokens" target="_blank">GitLab Access Tokens</a></li>
                        <li>Créez un nouveau token personnel</li>
                        <li>Cochez: <code>api, read_repository, write_repository</code></li>
                        <li>Copiez le token</li>
                    </ol>
                `
            },
            gitea: {
                name: 'Gitea',
                icon: '🍵',
                tokenInstructions: `
                    <ol>
                        <li>Allez dans Settings → Applications</li>
                        <li>Créez un nouveau token d'accès</li>
                        <li>Cochez les permissions repository nécessaires</li>
                        <li>Copiez le token</li>
                    </ol>
                `
            }
        };

        return infos[this.config.git.platform] || infos.github;
    }

    canProceedFromStep() {
        const step = this.steps[this.currentStep];

        // Platform step requires selection
        if (step.id === 'platform') {
            return !!this.config.storageMode;
        }

        // Authentication step requires validated token
        if (step.id === 'authentication') {
            return this.tokenValidated && this.config.git.token && this.config.git.owner;
        }

        // Repository step requires at least one repo selected or configured
        if (step.id === 'repository') {
            return this.selectedRepos.length > 0 || 
                   (this.config.git.repo && this.config.git.branch);
        }

        // Preferences and other steps can proceed
        return true;
    }

    async validateToken() {
        if (!this.config.git.token) {
            this.validationError = 'Veuillez entrer un token d\'accès.';
            this.renderStep();
            return;
        }

        this.isValidatingToken = true;
        this.validationError = null;
        this.renderStep();

        try {
            // Configure temporary adapter to test token
            const tempAdapter = new (window.GitHubStorageAdapter || window.githubAdapter.constructor)();
            tempAdapter.configure({
                token: this.config.git.token,
                owner: 'test', // Temporary, will be replaced
                repo: 'test',
                branch: 'main'
            });

            // Call GitHub API to validate token and get user info
            const userInfo = await tempAdapter.request('/user');

            // Token is valid!
            this.tokenValidated = true;
            this.authenticatedUser = userInfo;
            this.config.git.owner = userInfo.login;
            this.validationError = null;

            console.log('✅ Token validated successfully:', userInfo.login);

        } catch (error) {
            console.error('Token validation failed:', error);
            this.tokenValidated = false;
            this.authenticatedUser = null;
            
            if (error.message.includes('401') || error.message.includes('Bad credentials')) {
                this.validationError = 'Token invalide. Vérifiez que vous avez copié le bon token.';
            } else if (error.message.includes('403')) {
                this.validationError = 'Token valide mais permissions insuffisantes. Assurez-vous que le scope "repo" est activé.';
            } else {
                this.validationError = `Erreur de connexion: ${error.message}`;
            }
        } finally {
            this.isValidatingToken = false;
            this.renderStep();
        }
    }

    async loadAvailableRepos() {
        if (this.availableRepos.length > 0) {
            return; // Already loaded
        }

        try {
            const tempAdapter = new (window.GitHubStorageAdapter || window.githubAdapter.constructor)();
            tempAdapter.configure({
                token: this.config.git.token,
                owner: this.config.git.owner,
                repo: 'test',
                branch: 'main'
            });

            // Get user's repositories
            const repos = await tempAdapter.request('/user/repos?type=all&per_page=100&sort=updated');
            
            // Filter repos containing "Pensine" (case insensitive) or show all
            this.availableRepos = repos.filter(repo => 
                repo.name.toLowerCase().includes('pensine')
            );

            // If no Pensine repos, show all repos
            if (this.availableRepos.length === 0) {
                this.availableRepos = repos.slice(0, 20); // Limit to 20 for UI
            }

            this.renderStep();
        } catch (error) {
            console.error('Failed to load repos:', error);
            this.availableRepos = []; // Empty list on error
            this.renderStep();
        }
    }

    async createRepository(name, isPrivate, description) {
        if (!name || name.trim() === '') {
            alert('Veuillez entrer un nom de repository.');
            return;
        }

        try {
            const tempAdapter = new (window.GitHubStorageAdapter || window.githubAdapter.constructor)();
            tempAdapter.configure({
                token: this.config.git.token,
                owner: this.config.git.owner,
                repo: 'test',
                branch: 'main'
            });

            const newRepo = await tempAdapter.request('/user/repos', {
                method: 'POST',
                body: JSON.stringify({
                    name: name.trim(),
                    private: isPrivate,
                    description: description || `Notes Pensine - ${name}`,
                    auto_init: true // Initialize with README
                })
            });

            // Add to available repos and select it
            this.availableRepos.unshift(newRepo);
            this.selectedRepos.push(newRepo.name);
            
            alert(`✅ Repository "${newRepo.name}" créé avec succès!`);
            this.renderStep();
        } catch (error) {
            console.error('Failed to create repo:', error);
            
            if (error.message.includes('422')) {
                alert(`❌ Ce repository existe déjà. Choisissez un autre nom.`);
            } else if (error.message.includes('401')) {
                alert(`❌ Token invalide. Veuillez vous ré-authentifier.`);
            } else {
                alert(`❌ Erreur lors de la création: ${error.message}`);
            }
        }
    }

    attachListeners() {
        // Platform selection
        document.querySelectorAll('.wizard-platform-option').forEach(el => {
            el.addEventListener('click', () => {
                this.config.git.platform = el.dataset.platform;
                this.config.storageMode = 'pat'; // Set storage mode for GitHub
                this.updateNextButton();
                this.renderStep();
            });
        });

        // Form inputs
        const tokenInput = document.getElementById('wizard-token');
        if (tokenInput) {
            tokenInput.addEventListener('input', (e) => {
                this.config.git.token = e.target.value;
                this.tokenValidated = false;
                this.validationError = null;
                this.updateNextButton();
            });
        }

        // Validate token button
        const validateTokenBtn = document.getElementById('validate-token-btn');
        if (validateTokenBtn) {
            validateTokenBtn.addEventListener('click', async () => {
                await this.validateToken();
            });
        }

        const ownerInput = document.getElementById('wizard-owner');
        if (ownerInput) {
            ownerInput.addEventListener('input', (e) => {
                this.config.git.owner = e.target.value;
                this.updateNextButton();
            });
        }

        // Repository selection (click on repo item)
        document.querySelectorAll('.wizard-repo-item').forEach(el => {
            el.addEventListener('click', () => {
                const repoName = el.dataset.repoName;
                const index = this.selectedRepos.indexOf(repoName);
                
                if (index === -1) {
                    // Select repo
                    this.selectedRepos.push(repoName);
                } else {
                    // Deselect repo
                    this.selectedRepos.splice(index, 1);
                }
                
                this.updateNextButton();
                this.renderStep();
            });
        });

        // Create repository button
        const createRepoBtn = document.getElementById('create-repo-btn');
        if (createRepoBtn) {
            createRepoBtn.addEventListener('click', async () => {
                const nameInput = document.getElementById('wizard-new-repo');
                const privateCheckbox = document.getElementById('wizard-repo-private');
                const descInput = document.getElementById('wizard-repo-desc');
                
                await this.createRepository(
                    nameInput.value,
                    privateCheckbox.checked,
                    descInput.value
                );
                
                // Clear form after creation
                nameInput.value = '';
                descInput.value = '';
                privateCheckbox.checked = true;
            });
        }

        const repoInput = document.getElementById('wizard-repo');
        if (repoInput) {
            repoInput.addEventListener('input', (e) => {
                this.config.git.repo = e.target.value;
                this.updateNextButton();
            });
        }

        const branchInput = document.getElementById('wizard-branch');
        if (branchInput) {
            branchInput.addEventListener('input', (e) => {
                this.config.git.branch = e.target.value;
            });
        }

        // Preferences
        const localeSelect = document.getElementById('wizard-locale');
        if (localeSelect) {
            localeSelect.addEventListener('change', (e) => {
                this.config.langue.locale = e.target.value;
            });
        }

        const weekStartSelect = document.getElementById('wizard-week-start');
        if (weekStartSelect) {
            weekStartSelect.addEventListener('change', (e) => {
                this.config.ergonomie.jourDebutSemaine = parseInt(e.target.value);
            });
        }

        const themeSelect = document.getElementById('wizard-theme');
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => {
                this.config.ergonomie.theme = e.target.value;
            });
        }

        const autoSyncCheck = document.getElementById('wizard-auto-sync');
        if (autoSyncCheck) {
            autoSyncCheck.addEventListener('change', (e) => {
                this.config.ergonomie.autoSync = e.target.checked;
            });
        }

        const autoSaveCheck = document.getElementById('wizard-auto-save');
        if (autoSaveCheck) {
            autoSaveCheck.addEventListener('change', (e) => {
                this.config.ergonomie.autoSave = e.target.checked;
            });
        }

        // Navigation buttons
        document.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                if (action === 'prev') this.previousStep();
                else if (action === 'next') this.nextStep();
                else if (action === 'complete') this.complete();
            });
        });
    }

    updateNextButton() {
        const nextBtn = document.querySelector('[data-action="next"]');
        if (nextBtn) {
            nextBtn.disabled = !this.canProceedFromStep();
        }
    }

    previousStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.renderStep();
        }
    }

    nextStep() {
        if (this.currentStep < this.steps.length - 1 && this.canProceedFromStep()) {
            this.currentStep++;
            this.renderStep();
        }
    }

    async complete() {
        try {
            // Use first selected repo as primary (or existing config)
            if (this.selectedRepos.length > 0) {
                this.config.git.repo = this.selectedRepos[0];
                this.config.git.branch = 'main'; // Default branch
            }

            // IMPORTANT: Do NOT include token in config JSON (security)
            const configForStorage = {
                ...this.config,
                git: {
                    ...this.config.git,
                    token: undefined // Never store token in config file
                }
            };

            const configContent = JSON.stringify(configForStorage, null, 2);

            // Save configuration to localStorage (WITHOUT token)
            localStorage.setItem('pensine-config', configContent);
            localStorage.setItem('github-owner', this.config.git.owner);
            localStorage.setItem('github-repo', this.config.git.repo);
            localStorage.setItem('github-branch', this.config.git.branch);
            
            // CRITICAL: Set storage mode to PAT (Personal Access Token)
            localStorage.setItem('pensine-storage-mode', 'pat');
            
            // Save GitHub config for storage manager
            const githubConfig = {
                owner: this.config.git.owner,
                repo: this.config.git.repo,
                branch: this.config.git.branch,
                authMode: 'pat'
            };
            localStorage.setItem('pensine-github-config', JSON.stringify(githubConfig));

            // Save selected repos for future multi-repo support
            if (this.selectedRepos.length > 0) {
                localStorage.setItem('pensine-selected-repos', JSON.stringify(this.selectedRepos));
            }

            // Encrypt and save token separately
            await window.tokenStorage.saveToken(this.config.git.token);

            console.log('✅ Configuration saved (token encrypted separately)');
            console.log('✅ Selected repos:', this.selectedRepos);

            // Try to save config to GitHub (without token, safe to commit)
            try {
                githubAdapter.configure({
                    token: this.config.git.token,
                    owner: this.config.git.owner,
                    repo: this.config.git.repo,
                    branch: this.config.git.branch
                });

                // Force = true: will fetch SHA automatically if file exists
                await githubAdapter.saveFile('.pensine-config.json', configContent, 'Initial Pensine configuration', true);
                console.log('✅ Configuration saved to GitHub (without token)');
            } catch (githubError) {
                console.warn('⚠️ Could not save config to GitHub (will use localStorage):', githubError.message);
                // Continue anyway - localStorage is enough to start
            }

            // Hide wizard and reload page to initialize with new config
            this.hide();

            // Reload the page to reinitialize the app with new config
            window.location.reload();

        } catch (error) {
            console.error('Error completing wizard:', error);
            alert('Erreur lors de la création de la configuration: ' + error.message);
        }
    }
}

// Export as global
window.configWizard = new ConfigWizard();
