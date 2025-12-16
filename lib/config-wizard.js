/**
 * Configuration Wizard
 * Multi-step wizard for initial Pensine setup
 * Supports GitHub, Bitbucket, GitLab, Gitea
 */

class ConfigWizard {
    constructor() {
        this.currentStep = 0;
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
                id: 'credentials',
                title: 'Identifiants Git',
                render: () => this.renderCredentialsStep()
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

    renderCredentialsStep() {
        const platformInfo = this.getPlatformInfo();

        return `
            <div class="wizard-step-description">
                Connectez votre compte ${platformInfo.name} à Pensine.
            </div>

            <div class="wizard-info-box">
                <h4>📝 Comment obtenir un token d'accès :</h4>
                ${platformInfo.tokenInstructions}
            </div>

            <form class="wizard-form" id="credentials-form">
                <div class="wizard-field">
                    <label>
                        Token d'accès personnel
                        <span class="field-help">(requis)</span>
                    </label>
                    <input type="password"
                           id="wizard-token"
                           value="${this.config.git.token}"
                           placeholder="ghp_... ou autre selon plateforme"
                           required>
                </div>

                <div class="wizard-field">
                    <label>
                        Propriétaire du repository
                        <span class="field-help">(votre nom d'utilisateur)</span>
                    </label>
                    <input type="text"
                           id="wizard-owner"
                           value="${this.config.git.owner}"
                           placeholder="ex: stephanedenis"
                           required>
                </div>

                <div class="wizard-field">
                    <label>
                        Nom du repository
                        <span class="field-help">(ex: Pensine)</span>
                    </label>
                    <input type="text"
                           id="wizard-repo"
                           value="${this.config.git.repo}"
                           placeholder="ex: Pensine"
                           required>
                </div>

                <div class="wizard-field">
                    <label>
                        Branche principale
                        <span class="field-help">(généralement "master" ou "main")</span>
                    </label>
                    <input type="text"
                           id="wizard-branch"
                           value="${this.config.git.branch}"
                           placeholder="master">
                </div>
            </form>
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

        if (step.id === 'credentials') {
            return this.config.git.token &&
                this.config.git.owner &&
                this.config.git.repo;
        }

        return true;
    }

    attachListeners() {
        // Platform selection
        document.querySelectorAll('.wizard-platform-option').forEach(el => {
            el.addEventListener('click', () => {
                this.config.git.platform = el.dataset.platform;
                this.renderStep();
            });
        });

        // Form inputs
        const tokenInput = document.getElementById('wizard-token');
        if (tokenInput) {
            tokenInput.addEventListener('input', (e) => {
                this.config.git.token = e.target.value;
                this.updateNextButton();
            });
        }

        const ownerInput = document.getElementById('wizard-owner');
        if (ownerInput) {
            ownerInput.addEventListener('input', (e) => {
                this.config.git.owner = e.target.value;
                this.updateNextButton();
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

            // Encrypt and save token separately
            await window.tokenStorage.saveToken(this.config.git.token);
            
            console.log('✅ Configuration saved (token encrypted separately)');

            // Try to save config to GitHub (without token, safe to commit)
            try {
                githubAdapter.configure({
                    token: this.config.git.token,
                    owner: this.config.git.owner,
                    repo: this.config.git.repo,
                    branch: this.config.git.branch
                });

                await githubAdapter.saveFile('.pensine-config.json', configContent, 'Initial Pensine configuration');
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
