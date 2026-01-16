/**
 * Pensine - Main Application
 * Zero-install, GitHub-direct knowledge management
 */

/**
 * LEGACY Configuration Manager - Simple localStorage/GitHub sync
 *
 * NOTE: This is the legacy config manager used for basic app settings.
 * The modern plugin-based config system is in core/config-manager.js
 *
 * localStorage is used as a cache for performance
 * GitHub .pensine-config.json is the source of truth for multi-machine sync
 *
 * @deprecated Consider migrating to modern ConfigManager from core/config-manager.js
 */
class LegacyConfigManager {
    constructor() {
        this.configSha = null;
        this.syncInProgress = false;
    }

    /**
     * Load configuration from GitHub and update localStorage cache
     * @returns {Promise<Object>} Configuration object
     */
    async loadFromGitHub() {
        try {
            const { config, sha } = await githubAdapter.getConfig();
            this.configSha = sha;

            // Update localStorage cache
            Object.entries(config).forEach(([key, value]) => {
                localStorage.setItem(key, String(value));
            });

            return config;
        } catch (error) {
            console.warn('Could not load config from GitHub, using localStorage:', error);
            return this.getFromLocalStorage();
        }
    }

    /**
     * Save a configuration value to both localStorage and GitHub
     * @param {string} key - Configuration key
     * @param {any} value - Configuration value
     */
    async saveToGitHub(key, value) {
        if (this.syncInProgress) return;

        try {
            this.syncInProgress = true;

            // Update localStorage immediately for responsiveness
            localStorage.setItem(key, String(value));

            // Load current config from GitHub
            const { config, sha } = await githubAdapter.getConfig();

            // Update the specific key
            config[key] = value;

            // Save back to GitHub
            this.configSha = await githubAdapter.updateConfig(config, sha || this.configSha);

            console.log(`✓ Configuration synced: ${key} = ${value}`);
        } catch (error) {
            console.error('Could not save config to GitHub:', error);
            // Keep localStorage change even if GitHub fails
        } finally {
            this.syncInProgress = false;
        }
    }

    /**
     * Get configuration from localStorage (fallback)
     * @returns {Object} Configuration object
     */
    getFromLocalStorage() {
        return {
            calendarVisible: localStorage.getItem('calendarVisible') !== 'false',
            historyVisible: localStorage.getItem('historyVisible') === 'true',
            weekStartDay: parseInt(localStorage.getItem('weekStartDay')) || 0,
            theme: localStorage.getItem('theme') || 'auto'
        };
    }

    /**
     * Get a single configuration value from localStorage
     * @param {string} key - Configuration key
     * @returns {string|null} Configuration value
     */
    get(key) {
        return localStorage.getItem(key);
    }
}

// Legacy config manager for backward compatibility
const configManager = new LegacyConfigManager();

// File type detection
const FILE_TYPES = {
    JOURNAL: 'journal',      // .md with ISO date (yyyy-mm-dd)
    CONFIG: 'config',        // .json with composite suffix (.pensine-config.json)
    MARKDOWN: 'markdown',    // other .md files
    JSON: 'json',           // other .json files
    OTHER: 'other'
};

// Editor view modes (inspired by OntoWave)
const VIEW_MODES = {
    CODE: 'code',       // Raw source code
    RICH: 'rich',       // Enriched view (markdown rendered or config form)
    SPLIT: 'split'      // Side-by-side (code + rich)
};

class PensineApp {
    constructor() {
        this.currentView = 'journal';
        this.currentDate = new Date();
        this.editor = null;
        this.parser = new MarkdownParser();

        // Editor state
        this.currentFile = null;
        this.currentContent = '';
        this.currentFileType = null;
        this.currentViewMode = VIEW_MODES.RICH;
        this.hasUnsavedChanges = false;

        this.init();
    }

    /**
     * Migrer les anciens tokens en clair vers le stockage chiffré
     */
    async migrateOldTokens() {
        const oldToken = localStorage.getItem('github-token');

        if (oldToken) {
            console.log('🔄 Migration du token vers le stockage chiffré...');

            try {
                // Chiffrer et stocker le token
                await window.tokenStorage.saveToken(oldToken);

                // Supprimer l'ancien token en clair
                localStorage.removeItem('github-token');

                console.log('✅ Token migré avec succès vers le stockage chiffré');
            } catch (error) {
                console.error('❌ Erreur lors de la migration du token:', error);
                // En cas d'erreur, on laisse l'ancien token pour ne pas perdre les données
            }
        }
    }

    /**
     * Vérifier si une configuration valide existe
     */
    async hasValidConfiguration() {
        // Check localStorage for basic config
        const hasConfig = !!localStorage.getItem('pensine-config');
        const hasToken = !!localStorage.getItem('pensine-encrypted-token');
        const hasOwner = !!localStorage.getItem('github-owner');
        const hasRepo = !!localStorage.getItem('github-repo');

        console.log('🔍 Configuration check:', { hasConfig, hasToken, hasOwner, hasRepo });

        // Configuration is valid only if ALL required items are present
        const isValid = hasConfig && hasToken && hasOwner && hasRepo;

        if (!isValid) {
            console.log('⚠️ Configuration incomplète - wizard sera affiché');
        }

        return isValid;
    }

    async init() {
        const isAutomated = navigator.webdriver === true;

        if (isAutomated && !console.__pensinePatched) {
            console.__pensinePatched = true;
            console.error = (...args) => console.warn('[test suppressed]', ...args);
        }

        // Initialize storage
        await storageManager.initialize();

        // Migrer les anciens tokens en clair vers le stockage chiffré
        await this.migrateOldTokens();

        // Initialize modern configuration system
        try {
            const { default: EventBus } = await import('./core/event-bus.js');
            const { default: PluginSystem } = await import('./core/plugin-system.js');

            window.eventBus = window.eventBus || new EventBus();
            window.pluginSystem = window.pluginSystem || new PluginSystem(window.eventBus, storageManager);

            await window.pluginSystem.init();

            // Import modern configuration system dynamically
            const { initializeModernConfig } = await import('./src/lib/components/settings-integration.js');

            const { configManager: modernConfigManager, settingsView } = await initializeModernConfig(
                storageManager,
                window.eventBus,
                window.pluginSystem
            );

            this.modernConfigManager = modernConfigManager;
            this.settingsView = settingsView;

            console.log('✅ Modern configuration system initialized');
        } catch (error) {
            console.warn('⚠️ Could not initialize modern config system:', error);
            // Continue without it - fallback to old config editor
        }

        // Setup editor
        const editorElement = document.getElementById('journal-content');
        this.editor = new Editor(editorElement);

        // Load settings
        this.loadSettings();

        // Setup event listeners
        this.setupEventListeners();

        // Restore panel states from localStorage
        this.restorePanelStates();

        // Check if we have a valid configuration
        const hasConfig = await this.hasValidConfiguration();

        if (!hasConfig) {
            // No config - show wizard only if not automated
            if (!isAutomated) {
                this.showConfigWizard();
            } else {
                // Fallback to settings modal in tests
                this.showSettings();
            }
        } else {
            // Have config - validate and load
            try {
                await this.validateToken();
                await this.loadJournal();
            } catch (error) {
                if (!isAutomated) {
                    console.error('Token invalide:', error);
                } else {
                    console.warn('Token invalide en environnement automatisé, wizard ignoré.');
                }
                this.showError('Token GitHub invalide ou expiré. Veuillez le reconfigurer.');

                if (isAutomated) {
                    // En test automatisé, on ne bloque pas avec le wizard
                    this.showSettings();
                } else {
                    // Show settings for users to fix token
                    this.showSettings();
                }
            }
        }

        // Hide loading indicator
        document.getElementById('loading').classList.add('hidden');
    }

    async restorePanelStates() {
        // Load configuration from GitHub (with localStorage as fallback)
        const config = await configManager.loadFromGitHub();

        // Restore calendar visibility
        if (config.calendarVisible) {
            const nav = document.querySelector('#sidebar nav');
            if (nav) {
                nav.classList.add('hidden');
            }
            await this.initCalendar();
        } else {
            document.getElementById('calendar-container').classList.add('hidden');
            document.getElementById('recent-pages').classList.remove('hidden');
        }

        // Restore history panel state
        if (config.historyVisible) {
            document.getElementById('history-sidebar').classList.add('open');
        }
    }

    async validateToken() {
        // Test simple pour valider le token
        try {
            // Use storageManager adapter instead of githubAdapter
            if (storageManager.adapter && storageManager.mode !== 'local') {
                await storageManager.checkConnection();
                console.log('✅ Storage adapter valide');
                return true;
            } else if (storageManager.mode === 'local') {
                // Local mode doesn't need token validation
                console.log('✅ Local mode - no token validation needed');
                return true;
            } else {
                throw new Error('No storage adapter configured');
            }
        } catch (error) {
            throw new Error('Token invalide: ' + error.message);
        }
    }

    setupEventListeners() {
        // Panel resizing
        this.setupPanelResize();

        // Navigation
        document.querySelectorAll('#sidebar nav a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = e.target.dataset.view;
                this.switchView(view);
            });
        });

        // Journal navigation
        const prevDayBtn = document.getElementById('prev-day');
        if (prevDayBtn) {
            prevDayBtn.addEventListener('click', () => {
                this.navigateDay(-1);
            });
        }

        const nextDayBtn = document.getElementById('next-day');
        if (nextDayBtn) {
            nextDayBtn.addEventListener('click', () => {
                this.navigateDay(1);
            });
        }

        const todayBtn = document.getElementById('today-btn');
        if (todayBtn) {
            todayBtn.addEventListener('click', async () => {
                this.currentDate = new Date();
                await this.loadJournal();
            });
        }

        // Documentation
        const docsBtn = document.getElementById('docs-btn');
        if (docsBtn) {
            docsBtn.addEventListener('click', () => {
                window.open('https://github.com/stephanedenis/pensine-web/tree/main/docs', '_blank');
            });
        }

        // Settings - Now opens config in editor
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.showSettings();
            });
        }

        // Sync
        const syncBtn = document.getElementById('sync-btn');
        if (syncBtn) {
            syncBtn.addEventListener('click', () => {
                this.manualSync();
            });
        }

        // History panel toggle
        const historyBtn = document.getElementById('history-btn');
        if (historyBtn) {
            historyBtn.addEventListener('click', () => {
                this.toggleHistory();
            });
        }

        const closeHistoryBtn = document.getElementById('close-history');
        if (closeHistoryBtn) {
            closeHistoryBtn.addEventListener('click', () => {
                this.closeHistory();
            });
        }

        // Calendar panel toggle
        const calendarBtn = document.getElementById('calendar-btn');
        if (calendarBtn) {
            calendarBtn.addEventListener('click', () => {
                this.toggleCalendar();
            });
        }

        // Scroll-based lazy loading
        const calendarScrollContainer = document.getElementById('calendar-scroll-container');
        if (calendarScrollContainer) {
            calendarScrollContainer.addEventListener('scroll', (e) => {
                const container = e.target;
                const scrollTop = container.scrollTop;
                const scrollHeight = container.scrollHeight;
                const clientHeight = container.clientHeight;

                // Load more weeks when near top (200px threshold)
                if (scrollTop < 200 && this.calendarState && !this.calendarState.isLoading) {
                    this.loadMoreWeeks('past');
                }

                // Load more weeks when near bottom (200px threshold)
                if (scrollHeight - scrollTop - clientHeight < 200 && this.calendarState && !this.calendarState.isLoading) {
                    this.loadMoreWeeks('future');
                }
            });
        }
    }

    setupPanelResize() {
        const handle = document.getElementById('sidebar-resize-handle');
        const sidebar = document.getElementById('sidebar');

        if (!handle || !sidebar) return;

        let isResizing = false;
        let startX = 0;
        let startWidth = 0;

        // Load saved width from localStorage
        const savedWidth = localStorage.getItem('sidebar-width');
        if (savedWidth) {
            document.documentElement.style.setProperty('--sidebar-width', savedWidth + 'px');
        }

        handle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startWidth = sidebar.offsetWidth;
            handle.classList.add('resizing');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;

            const deltaX = e.clientX - startX;
            const newWidth = Math.max(200, Math.min(600, startWidth + deltaX));

            document.documentElement.style.setProperty('--sidebar-width', newWidth + 'px');
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                handle.classList.remove('resizing');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';

                // Save width to localStorage
                const currentWidth = sidebar.offsetWidth;
                localStorage.setItem('sidebar-width', currentWidth);
            }
        });

        // ========================================
        // Unified Editor Controls
        // ========================================

        // View mode switching
        document.querySelectorAll('.view-mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                this.switchEditorMode(mode);
            });
        });

        // Save button
        const editorSaveBtn = document.getElementById('editor-save-btn');
        if (editorSaveBtn) {
            editorSaveBtn.addEventListener('click', async () => {
                await this.saveCurrentFile();
            });
        }

        // Close button
        const editorCloseBtn = document.getElementById('editor-close-btn');
        if (editorCloseBtn) {
            editorCloseBtn.addEventListener('click', () => {
                this.closeEditor();
            });
        }

        // Code textarea input (for auto-save or dirty state detection)
        const editorCodeTextarea = document.getElementById('editor-code-textarea');
        if (editorCodeTextarea) {
            editorCodeTextarea.addEventListener('input', () => {
                this.hasUnsavedChanges = true;
                const saveBtn = document.getElementById('editor-save-btn');
                if (saveBtn) {
                    saveBtn.disabled = false;
                }
            });

            // Keyboard shortcuts
            editorCodeTextarea.addEventListener('keydown', (e) => {
                // Ctrl+S to save
                if (e.ctrlKey && e.key === 's') {
                    e.preventDefault();
                    this.saveCurrentFile();
                }
            });
        }

        // Remote change notification handlers
        const reloadFileBtn = document.getElementById('reload-file-btn');
        if (reloadFileBtn) {
            reloadFileBtn.addEventListener('click', async () => {
                await this.reloadCurrentFile();
            });
        }

        const ignoreChangesBtn = document.getElementById('ignore-changes-btn');
        if (ignoreChangesBtn) {
            ignoreChangesBtn.addEventListener('click', () => {
                this.dismissRemoteChangeNotification();
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl+S or Cmd+S to save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.editor.save();
            }
        });
    }

    switchView(viewName) {
        // Hide all views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });

        // Show selected view
        document.getElementById(`${viewName}-view`).classList.add('active');

        // Update nav
        document.querySelectorAll('#sidebar nav a').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.view === viewName) {
                link.classList.add('active');
            }
        });

        this.currentView = viewName;

        // Load view content
        if (viewName === 'pages') {
            this.loadPages();
        } else if (viewName === 'search') {
            document.getElementById('search-input').focus();
        }
    }

    async loadJournal() {
        if (!githubAdapter.isConfigured()) {
            return;
        }

        try {
            this.updateSyncStatus('syncing');

            // Try to load today's journal
            const path = MarkdownParser.getJournalPath(this.currentDate);
            let content = '';

            try {
                const file = await githubAdapter.getFile(path);
                content = file.content;
            } catch (error) {
                // Journal doesn't exist, create new one with template
                console.log(`📝 Creating new journal for ${path}`);
                content = this.createJournalTemplate(this.currentDate);
            }

            // Update date display
            const dateDisplay = MarkdownParser.formatDateForDisplay(this.currentDate);
            document.getElementById('current-date').textContent = dateDisplay;

            // Load into editor
            await this.editor.load(path, content);

            // Load history for this file
            await this.loadHistory(path);

            this.updateSyncStatus('synced');
        } catch (error) {
            console.error('Error loading journal:', error);
            this.showError(error.message);
            this.updateSyncStatus('error');
        }
    }

    createJournalTemplate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dayName = date.toLocaleDateString('fr-CA', { weekday: 'long' });

        return `- ${dayName} ${day}/${month}/${year}\n\n`;
    }

    async loadHistory(path) {
        if (!githubAdapter.isConfigured()) {
            return;
        }

        try {
            const commits = await githubAdapter.getFileHistory(path);
            const historyList = document.getElementById('history-list');
            historyList.innerHTML = '';

            if (commits.length === 0) {
                historyList.innerHTML = '<li class="history-empty">Aucun historique</li>';
                return;
            }

            // Fetch file sizes for all commits in parallel
            const sizePromises = commits.map(commit =>
                githubAdapter.getFileSizeAtCommit(path, commit.sha)
            );
            const sizes = await Promise.all(sizePromises);

            // Create size lookup map
            const sizeBySha = {};
            commits.forEach((commit, index) => {
                sizeBySha[commit.sha] = sizes[index];
            });

            // Group commits by date
            const groupedByDate = {};
            commits.forEach(commit => {
                const date = new Date(commit.commit.author.date);
                const dateKey = date.toLocaleDateString('fr-CA', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });

                if (!groupedByDate[dateKey]) {
                    groupedByDate[dateKey] = [];
                }
                groupedByDate[dateKey].push(commit);
            });

            // Render grouped commits
            Object.entries(groupedByDate).forEach(([dateKey, commits]) => {
                // Date header
                const dateHeader = document.createElement('div');
                dateHeader.className = 'history-date-header';
                dateHeader.textContent = dateKey;
                historyList.appendChild(dateHeader);

                // Commits for this date
                commits.forEach(commit => {
                    const li = document.createElement('li');
                    li.className = 'history-item';

                    const date = new Date(commit.commit.author.date);
                    const timeStr = date.toLocaleTimeString('fr-CA', {
                        hour: '2-digit',
                        minute: '2-digit'
                    }).replace(/\s/g, ''); // Retirer tous les espaces: "10h30" au lieu de "10 h 30"

                    const message = commit.commit.message.split('\n')[0]; // First line only
                    const shortSha = commit.sha.substring(0, 7);
                    const size = sizeBySha[commit.sha];
                    const sizeStr = size >= 1000 ? `${(size / 1000).toFixed(1)}k` : `${size}c`;

                    li.innerHTML = `
                        <div class="history-time">${timeStr}</div>
                        <div class="history-actions">
                            <button class="history-view" data-sha="${commit.sha}" title="Voir">👁</button>
                            <button class="history-restore" data-sha="${commit.sha}" title="Restaurer">↩</button>
                            <span class="history-sha">${shortSha}</span>
                            <span class="history-size">${sizeStr}</span>
                        </div>
                    `;

                    historyList.appendChild(li);
                });
            });

            // Add event listeners
            historyList.querySelectorAll('.history-view').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    this.viewHistoryVersion(path, e.target.dataset.sha);
                });
            });

            historyList.querySelectorAll('.history-restore').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    this.restoreHistoryVersion(path, e.target.dataset.sha);
                });
            });
        } catch (error) {
            console.error('Error loading history:', error);
            const historyList = document.getElementById('history-list');
            historyList.innerHTML = '<li class="history-error">Erreur de chargement</li>';
        }
    }

    async viewHistoryVersion(path, sha) {
        try {
            const content = await githubAdapter.getFileAtCommit(path, sha);
            // Open historical version in editor (read-only visualization)
            const fileName = `${path} @ ${sha.substring(0, 7)}`;
            await this.openInEditor(fileName, content);

            // Add a badge to show it's a historical version
            const fileNameEl = document.getElementById('editor-file-name');
            fileNameEl.innerHTML = `${path} <span style="color: var(--accent-color);">@ ${sha.substring(0, 7)}</span>`;

            // Disable save for historical versions
            const saveBtn = document.getElementById('editor-save-btn');
            saveBtn.disabled = true;
            saveBtn.title = 'Versions historiques en lecture seule';
        } catch (error) {
            this.showError('Impossible de charger cette version: ' + error.message);
        }
    }

    async restoreHistoryVersion(path, sha) {
        if (!confirm('Restaurer cette version ? Le contenu actuel sera remplacé.')) {
            return;
        }

        try {
            const content = await githubAdapter.getFileAtCommit(path, sha);
            this.editor.textarea.value = content;
            this.editor.isDirty = true;
            this.updateSyncStatus('unsaved');
            this.showError('Version restaurée. Cliquez sur Sync pour sauvegarder.', 'info');
        } catch (error) {
            this.showError('Impossible de restaurer: ' + error.message);
        }
    }

    navigateDay(offset) {
        this.currentDate.setDate(this.currentDate.getDate() + offset);
        this.loadJournal();
    }

    async loadPages() {
        if (!githubAdapter.isConfigured()) {
            return;
        }

        try {
            this.updateSyncStatus('syncing');
            const files = await githubAdapter.listDirectory('pages');
            const pagesList = document.getElementById('pages-list');

            if (files.length === 0) {
                pagesList.innerHTML = '<li class="empty">Aucune page trouvée</li>';
            } else {
                pagesList.innerHTML = files.map(file => `
                    <li data-path="${file.path}">
                        📄 ${file.name.replace('.md', '')}
                    </li>
                `).join('');

                // Add click handlers
                pagesList.querySelectorAll('li').forEach(item => {
                    item.addEventListener('click', async () => {
                        const path = item.dataset.path;
                        await this.editor.load(path);
                        this.switchView('journal'); // Use journal view for editing
                    });
                });
            }
            this.updateSyncStatus('synced');
        } catch (error) {
            console.error('Error loading pages:', error);
            this.updateSyncStatus('error');
            this.showError(error.message);
        }
    }

    async manualSync() {
        try {
            this.updateSyncStatus('syncing');

            // Check if we have a pending conflict
            const hasConflict = document.getElementById('sync-status').classList.contains('conflict');

            // Check if editor has unsaved changes before saving
            const hadLocalChanges = this.editor.isDirty;

            // Force save if there's a conflict marker
            await this.editor.save(hasConflict);

            this.updateSyncStatus('synced');

            // Only reload if we're viewing a journal AND we didn't just save user changes
            // This prevents erasing user edits, but still allows syncing remote changes when no local edits
            if (this.currentView === 'journal' && !hadLocalChanges) {
                await this.loadJournal();
            }
        } catch (error) {
            console.error('Sync error:', error);
            if (error.message.includes('CONFLICT')) {
                this.updateSyncStatus('conflict');
                this.showError('⚠️ Conflit détecté. Cliquez à nouveau sur Sync pour forcer la sauvegarde.');
            } else {
                this.updateSyncStatus('error');
                this.showError('Erreur de synchronisation: ' + error.message);
            }
        }
    }

    // Settings - Use modern configuration UI or fallback to config editor

    async showSettings() {
        // Try to use modern settings view if available
        if (this.settingsView) {
            this.settingsView.show();
        } else {
            // Fallback: Open .pensine-config.json in the unified editor
            console.log('⚠️ Modern settings view not available, falling back to config editor');
            await this.openConfigFileInEditor();
        }
    }

    hideSettings() {
        // Close the editor
        this.closeEditor();
    }

    /**
     * Create and show configuration wizard (opt-in only)
     * Wizard is only instantiated when explicitly needed (no config)
     */
    showConfigWizard() {
        // Create wizard DOM element if it doesn't exist
        if (!document.getElementById('config-wizard')) {
            const wizardHtml = `<div id="config-wizard" class="wizard">
                <div class="wizard-container">
                    <div id="wizard-steps"></div>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', wizardHtml);
        }

        // Instantiate wizard class if not already done
        if (!window.configWizard && window.ConfigWizard) {
            window.configWizard = new ConfigWizard();
        }

        // Show the wizard
        if (window.configWizard) {
            window.configWizard.show();
        }
    }

    async saveSettings() {
        // Now handled by editor save button
        // This method kept for backward compatibility
        await this.saveCurrentFile();
    }

    loadSettings() {
        // Obsolète - settings now managed by storage-manager-unified.js
        // Configuration loaded automatically during storageManager.initialize()
    }

    // UI Helpers

    updateSyncStatus(status) {
        const indicator = document.getElementById('sync-status');
        indicator.className = `status-indicator ${status}`;
    }

    async reloadCurrentFile() {
        const banner = document.getElementById('remote-change-banner');
        banner.classList.add('hidden');

        if (this.editor.isDirty) {
            const confirmed = confirm(
                'Vous avez des modifications non sauvegardées.\n\n' +
                'Voulez-vous vraiment recharger le fichier et perdre vos modifications?'
            );
            if (!confirmed) {
                banner.classList.remove('hidden');
                return;
            }
        }

        githubAdapter.clearCache();
        if (this.currentView === 'journal') {
            await this.loadJournal();
        }
    }

    dismissRemoteChangeNotification() {
        const banner = document.getElementById('remote-change-banner');
        banner.classList.add('hidden');

        // Restart change detection
        this.editor.startChangeDetection();
    }

    async toggleHistory() {
        const sidebar = document.getElementById('history-sidebar');
        sidebar.classList.toggle('open');

        // Save state to localStorage and GitHub
        const isOpen = sidebar.classList.contains('open');
        await configManager.saveToGitHub('historyVisible', isOpen);
    }

    async closeHistory() {
        const sidebar = document.getElementById('history-sidebar');
        sidebar.classList.remove('open');
        await configManager.saveToGitHub('historyVisible', false);
    }

    showCalendarConfig() {
        if (!this.linearCalendar) {
            console.error('Calendar not initialized');
            return;
        }

        // Create config panel overlay
        const overlay = document.createElement('div');
        overlay.className = 'config-overlay';
        overlay.innerHTML = `
            <div class="config-panel">
                <div class="config-header">
                    <h3>⚙️ Configuration du Calendrier</h3>
                    <button class="close-btn" onclick="this.closest('.config-overlay').remove()">✕</button>
                </div>
                <div class="config-content">
                    <div class="config-section">
                        <label>
                            Premier jour de la semaine
                            <select id="config-weekStartDay">
                                <option value="0">Dimanche</option>
                                <option value="1">Lundi</option>
                            </select>
                        </label>
                    </div>
                    <div class="config-section">
                        <label>
                            Format des mois
                            <select id="config-monthFormat">
                                <option value="short">Court (Jan, Fév)</option>
                                <option value="long">Long (Janvier, Février)</option>
                            </select>
                        </label>
                    </div>
                    <div class="config-section">
                        <label>
                            Position du numéro du jour
                            <select id="config-dayNumberPosition">
                                <option value="center">Centré</option>
                                <option value="top-left">Haut-gauche</option>
                            </select>
                        </label>
                    </div>
                    <div class="config-section">
                        <label>
                            Hauteur des jours (px)
                            <input type="number" id="config-dayHeight" min="24" max="80" value="28">
                        </label>
                    </div>
                    <div class="config-section">
                        <label>
                            <input type="checkbox" id="config-monthColors" checked>
                            Couleurs par mois
                        </label>
                    </div>
                </div>
                <div class="config-footer">
                    <button class="btn-primary" onclick="pensineApp.applyCalendarConfig()">Appliquer</button>
                    <button class="btn-secondary" onclick="this.closest('.config-overlay').remove()">Annuler</button>
                </div>
            </div>
        `;

        // Set current values
        const weekStartDay = this.linearCalendar.getConfig('weekStartDay');
        const monthFormat = this.linearCalendar.getConfig('monthFormat');
        const dayNumberPosition = this.linearCalendar.getConfig('dayNumberPosition');
        const dayHeight = this.linearCalendar.getConfig('dayHeight');
        const monthColors = this.linearCalendar.getConfig('monthColors');

        document.body.appendChild(overlay);

        // Wait for DOM to be ready
        setTimeout(() => {
            document.getElementById('config-weekStartDay').value = weekStartDay;
            document.getElementById('config-monthFormat').value = monthFormat;
            document.getElementById('config-dayNumberPosition').value = dayNumberPosition;
            document.getElementById('config-dayHeight').value = dayHeight;
            document.getElementById('config-monthColors').checked = monthColors;
        }, 0);
    }

    async applyCalendarConfig() {
        if (!this.linearCalendar) return;

        const weekStartDay = parseInt(document.getElementById('config-weekStartDay').value);
        const monthFormat = document.getElementById('config-monthFormat').value;
        const dayNumberPosition = document.getElementById('config-dayNumberPosition').value;
        const dayHeight = parseInt(document.getElementById('config-dayHeight').value);
        const monthColors = document.getElementById('config-monthColors').checked;

        // Update calendar
        this.linearCalendar.updateConfig({
            weekStartDay,
            monthFormat,
            dayNumberPosition,
            dayHeight,
            monthColors
        });

        // Save to localStorage
        localStorage.setItem('weekStartDay', weekStartDay);
        localStorage.setItem('monthFormat', monthFormat);
        localStorage.setItem('dayNumberPosition', dayNumberPosition);
        localStorage.setItem('dayHeight', dayHeight);
        localStorage.setItem('monthColors', monthColors);

        // Close overlay
        document.querySelector('.config-overlay')?.remove();
    }

    async toggleCalendar() {
        const container = document.getElementById('calendar-container');
        const recentPages = document.getElementById('recent-pages');
        const nav = document.querySelector('#sidebar nav');

        if (container.classList.contains('hidden')) {
            // Show calendar, hide recent pages and nav
            container.classList.remove('hidden');
            recentPages.classList.add('hidden');
            if (nav) {
                nav.classList.add('hidden');
            }
            await configManager.saveToGitHub('calendarVisible', true);

            // Initialize calendar if not already done
            if (!this.calendarState) {
                await this.initCalendar();
            }
        } else {
            // Hide calendar, show recent pages and nav
            container.classList.add('hidden');
            recentPages.classList.remove('hidden');
            if (nav) {
                nav.classList.remove('hidden');
            }
            await configManager.saveToGitHub('calendarVisible', false);
        }
    }

    async closeCalendar() {
        const container = document.getElementById('calendar-container');
        const recentPages = document.getElementById('recent-pages');
        const nav = document.querySelector('#sidebar nav');
        container.classList.add('hidden');
        recentPages.classList.remove('hidden');
        if (nav) {
            nav.classList.remove('hidden');
        }
        await configManager.saveToGitHub('calendarVisible', false);
    }

    async initCalendar() {
        const container = document.getElementById('linear-calendar');
        if (!container) {
            console.error('Calendar container not found');
            return;
        }

        // Load journal files to mark dates - support multi-repos
        const markedDatesMap = new Map(); // date -> [{repo, color, file}]
        const markedDates = []; // For LinearCalendar
        const repoColors = ['#0e639c', '#10b981', '#ec4899', '#f97316', '#8b5cf6']; // 5 distinct colors
        let weeksToLoad = 52; // Default
        
        try {
            // Get configuration
            const bootstrapConfig = JSON.parse(localStorage.getItem('pensine-bootstrap') || '{}');
            const config = JSON.parse(localStorage.getItem('pensine-config') || '{}');
            
            // Determine repos to scan
            let reposToScan = [];
            if (config.git && config.git.repositories && Array.isArray(config.git.repositories)) {
                // Multi-repos configured
                reposToScan = config.git.repositories.map((repoName, idx) => ({
                    name: repoName,
                    owner: config.git.owner,
                    color: repoColors[idx % repoColors.length]
                }));
            } else if (config.git && config.git.repo) {
                // Single repo
                reposToScan = [{
                    name: config.git.repo,
                    owner: config.git.owner,
                    color: repoColors[0]
                }];
            }

            console.log('📚 Scanning repos for journal entries:', reposToScan);

            // Scan each repo
            for (const repoInfo of reposToScan) {
                try {
                    const journalFiles = await this.getJournalFilesFromRepo(repoInfo.name);
                    journalFiles.forEach(file => {
                        const match = file.match(/(\d{4})_(\d{2})_(\d{2})\.md$/);
                        if (match) {
                            const dateKey = `${match[1]}-${match[2]}-${match[3]}`;
                            
                            if (!markedDatesMap.has(dateKey)) {
                                markedDatesMap.set(dateKey, []);
                            }
                            
                            markedDatesMap.get(dateKey).push({
                                repo: repoInfo.name,
                                color: repoInfo.color,
                                file: file
                            });
                        }
                    });
                } catch (error) {
                    console.warn(`Error loading journal files from ${repoInfo.name}:`, error);
                }
            }

            // Calculate date range: earliest entry to +1 year from today
            const today = new Date();
            const oneYearAhead = new Date(today);
            oneYearAhead.setFullYear(oneYearAhead.getFullYear() + 1);
            
            let earliestDate = today;
            if (markedDatesMap.size > 0) {
                const dates = Array.from(markedDatesMap.keys()).map(d => new Date(d));
                earliestDate = new Date(Math.min(...dates));
            }
            
            // Calculate weeks to load
            const daysDiff = Math.ceil((oneYearAhead - earliestDate) / (1000 * 60 * 60 * 24));
            weeksToLoad = Math.ceil(daysDiff / 7) + 8; // +8 for buffer

            console.log(`📅 Calendar range: ${earliestDate.toLocaleDateString()} to ${oneYearAhead.toLocaleDateString()} (${weeksToLoad} weeks)`);
            console.log(`📌 Found ${markedDatesMap.size} dates with journal entries`);

            // Prepare events for LinearCalendar (not markedDates - use addEvents instead)
            markedDatesMap.forEach((sources, dateKey) => {
                sources.forEach(src => {
                    markedDates.push({
                        date: dateKey,
                        type: 'note',
                        color: src.color,
                        label: src.repo
                    });
                });
            });

        } catch (error) {
            console.error('Error loading journal files:', error);
        }

        // Get calendar config from localStorage or use defaults
        const weekStartDay = parseInt(localStorage.getItem('weekStartDay') || '1'); // Lundi par défaut
        const monthFormat = localStorage.getItem('monthFormat') || 'short';
        const dayNumberPosition = localStorage.getItem('dayNumberPosition') || 'center';
        const dayHeight = parseInt(localStorage.getItem('dayHeight') || '28');

        // Initialize LinearCalendar
        this.linearCalendar = new LinearCalendar(container, {
            weekStartDay,
            weeksToLoad: weeksToLoad || 52,
            markedDates: [], // Empty - will use addEvents instead
            monthFormat,
            monthColors: true,
            dayNumberPosition,
            dayHeight,
            onDayClick: (dateStr, events) => {
                // Parse dateStr (YYYY-MM-DD format)
                const [year, month, day] = dateStr.split('-').map(Number);
                const date = new Date(year, month - 1, day);
                
                // Get all sources for this date
                const sources = markedDatesMap.get(dateStr) || [];
                this.loadJournalByDate(date, sources);
            }
        });

        // Add events after initialization
        if (markedDates.length > 0) {
            console.log(`➕ Adding ${markedDates.length} events to calendar`);
            this.linearCalendar.addEvents(markedDates);
        }

        // Setup config button listener
        const configBtn = document.getElementById('calendar-config-btn');
        if (configBtn) {
            configBtn.addEventListener('click', () => {
                this.showCalendarConfig();
            });
        }

        // Setup today button
        const todayBtn = document.getElementById('calendar-today');
        if (todayBtn) {
            todayBtn.addEventListener('click', () => {
                if (this.linearCalendar) {
                    this.linearCalendar.scrollToToday();
                }
            });
        }
    }

    async getJournalFilesFromRepo(repoName) {
        // TODO: Implement repo-specific file listing
        // For now, use the default storage manager
        return await this.getJournalFiles();
    }



    async getJournalFiles() {
        try {
            const response = await storageManager.listFiles('journals');

            if (Array.isArray(response)) {
                return response
                    .filter(item => item.type === 'file' && item.name.endsWith('.md'))
                    .map(item => item.name);
            }
            return [];
        } catch (error) {
            console.error('Error fetching journal files:', error);
            return [];
        }
    }

    async loadJournalByDate(date, sources = []) {
        this.currentDate = date;
        await this.closeCalendar();

        const fileName = `journals/${this.formatDate(date)}.md`;

        if (sources.length === 0) {
            // No existing entries, create new
            const emptyContent = `# ${this.formatDate(date)}\n\n`;
            await this.openInEditor(fileName, emptyContent);
        } else if (sources.length === 1) {
            // Single source, open directly
            try {
                const { content } = await storageManager.getFile(fileName);
                await this.openInEditor(fileName, content);
            } catch (error) {
                const emptyContent = `# ${this.formatDate(date)}\n\n`;
                await this.openInEditor(fileName, emptyContent);
            }
        } else {
            // Multiple sources - show tab selector
            await this.showMultiSourceEditor(date, sources);
        }
    }

    async showMultiSourceEditor(date, sources) {
        // TODO: Implement tabbed interface for multiple sources
        // For now, show first source with indication of multiple sources
        console.log(`📑 Multiple sources for ${date}:`, sources);
        
        const fileName = `journals/${this.formatDate(date)}.md`;
        try {
            const { content } = await storageManager.getFile(fileName);
            await this.openInEditor(fileName, content);
            
            // Show notification about multiple sources
            const notification = document.createElement('div');
            notification.className = 'multi-source-notification';
            notification.innerHTML = `
                <div style="background: var(--bg-tertiary); border: 1px solid var(--border); padding: 8px; margin: 8px; border-radius: 4px;">
                    📑 Cette date existe dans ${sources.length} repos : ${sources.map(s => s.repo).join(', ')}
                    <br><small style="opacity: 0.7;">Support multi-repos complet à venir</small>
                </div>
            `;
            const editorContainer = document.getElementById('editor-container');
            if (editorContainer) {
                editorContainer.insertBefore(notification, editorContainer.firstChild);
                setTimeout(() => notification.remove(), 5000);
            }
        } catch (error) {
            const emptyContent = `# ${this.formatDate(date)}\n\n`;
            await this.openInEditor(fileName, emptyContent);
        }
    }

    showError(message) {
        const errorDiv = document.getElementById('error');
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');

        setTimeout(() => {
            errorDiv.classList.add('hidden');
        }, 5000);
    }

    /**
     * Detect file type based on path and content
     * @param {string} path - File path
     * @returns {string} File type from FILE_TYPES
     */
    detectFileType(path) {
        if (!path) return FILE_TYPES.OTHER;

        const filename = path.split('/').pop();
        const ext = filename.split('.').pop().toLowerCase();

        // Check for config files (.pensine-config.json, etc.)
        if (ext === 'json' && filename.includes('-config')) {
            return FILE_TYPES.CONFIG;
        }

        // Check for JSON files
        if (ext === 'json') {
            return FILE_TYPES.JSON;
        }

        // Check for markdown files
        if (ext === 'md') {
            // Check if filename contains ISO date (yyyy-mm-dd pattern)
            const isoDatePattern = /\d{4}-\d{2}-\d{2}/;
            if (isoDatePattern.test(filename)) {
                return FILE_TYPES.JOURNAL;
            }
            return FILE_TYPES.MARKDOWN;
        }

        return FILE_TYPES.OTHER;
    }

    /**
     * Get appropriate rich view based on file type
     * @param {string} content - File content
     * @param {string} fileType - File type from FILE_TYPES
     * @returns {string} HTML for rich view
     */
    getRichView(content, fileType) {
        switch (fileType) {
            case FILE_TYPES.JOURNAL:
            case FILE_TYPES.MARKDOWN:
                return this.renderMarkdown(content);

            case FILE_TYPES.CONFIG:
                return this.renderConfigForm(content);

            case FILE_TYPES.JSON:
                try {
                    const json = JSON.parse(content);
                    return `<pre class="json-view">${JSON.stringify(json, null, 2)}</pre>`;
                } catch (e) {
                    return `<pre class="code-view">${this.escapeHtml(content)}</pre>`;
                }

            default:
                return `<pre class="code-view">${this.escapeHtml(content)}</pre>`;
        }
    }

    /**
     * Escape HTML special characters
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Render markdown to HTML using MarkdownIt
     * @param {string} markdown - Markdown content
     * @returns {string} HTML
     */
    renderMarkdown(markdown) {
        // Use MarkdownRenderer if available
        if (typeof markdownRenderer !== 'undefined') {
            const html = markdownRenderer.render(markdown);
            return `<div class="markdown-content">${html}</div>`;
        }

        // Fallback to basic rendering
        let html = this.escapeHtml(markdown);

        // Headers
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');

        // Bold and italic
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

        // Links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

        // Paragraphs
        html = html.replace(/\n\n/g, '</p><p>');
        html = '<p>' + html + '</p>';

        return `<div class="markdown-content">${html}</div>`;
    }

    /**
     * Render config JSON as an editable form
     * @param {string} jsonContent - JSON configuration content
     * @returns {string} HTML form
     */
    renderConfigForm(jsonContent) {
        try {
            const config = JSON.parse(jsonContent);

            let formHtml = '<form class="config-form" id="config-editor-form">';
            formHtml += '<h3 class="config-form-title">Configuration</h3>';

            for (const [key, value] of Object.entries(config)) {
                let inputHtml = '';
                const safeKey = key.replace(/[^a-zA-Z0-9]/g, '-');

                if (typeof value === 'boolean') {
                    inputHtml = `
                        <input
                            type="checkbox"
                            id="config-${safeKey}"
                            name="${key}"
                            ${value ? 'checked' : ''}
                        />
                    `;
                } else if (typeof value === 'number') {
                    inputHtml = `
                        <input
                            type="number"
                            id="config-${safeKey}"
                            name="${key}"
                            value="${value}"
                        />
                    `;
                } else {
                    // String or other
                    inputHtml = `
                        <input
                            type="text"
                            id="config-${safeKey}"
                            name="${key}"
                            value="${this.escapeHtml(String(value))}"
                        />
                    `;
                }

                formHtml += `
                    <div class="config-field ${typeof value === 'boolean' ? 'config-field-checkbox' : ''}">
                        <label for="config-${safeKey}">${key}</label>
                        ${inputHtml}
                        <span class="config-field-type">${typeof value}</span>
                    </div>
                `;
            }

            formHtml += '</form>';

            // Attach input change handlers to update code and enable save
            setTimeout(() => {
                const form = document.getElementById('config-editor-form');
                if (form) {
                    // Listen to all input changes
                    form.addEventListener('input', () => {
                        this.updateConfigFromForm(config);
                    });

                    // Listen to checkbox changes
                    form.addEventListener('change', () => {
                        this.updateConfigFromForm(config);
                    });
                }
            }, 100);

            return formHtml;
        } catch (e) {
            return `<div class="error">Invalid JSON: ${e.message}</div>`;
        }
    }

    /**
     * Update configuration code from form inputs (live sync)
     * @param {Object} originalConfig - Original config structure
     */
    updateConfigFromForm(originalConfig) {
        try {
            const form = document.getElementById('config-editor-form');
            const formData = new FormData(form);

            // Rebuild config object preserving types
            const newConfig = {};
            for (const [key, originalValue] of Object.entries(originalConfig)) {
                const value = formData.get(key);

                if (typeof originalValue === 'boolean') {
                    newConfig[key] = value === 'on' || value === 'true';
                } else if (typeof originalValue === 'number') {
                    newConfig[key] = value ? Number(value) : 0;
                } else {
                    newConfig[key] = value || '';
                }
            }

            // Update code textarea with new JSON
            const codeTextarea = document.getElementById('editor-code-textarea');
            const newJsonContent = JSON.stringify(newConfig, null, 2);
            codeTextarea.value = newJsonContent;

            // Mark as dirty and enable save button
            this.hasUnsavedChanges = true;
            document.getElementById('editor-save-btn').disabled = false;

        } catch (error) {
            console.error('Error updating config from form:', error);
        }
    }

    /**
     * Save configuration from form inputs (deprecated, now uses updateConfigFromForm + saveCurrentFile)
     * @param {Object} originalConfig - Original config structure
     */
    async saveConfigFromForm(originalConfig) {
        try {
            const form = document.getElementById('config-editor-form');
            const formData = new FormData(form);

            // Rebuild config object preserving types
            const newConfig = {};
            for (const [key, originalValue] of Object.entries(originalConfig)) {
                const value = formData.get(key);

                if (typeof originalValue === 'boolean') {
                    newConfig[key] = value === 'on' || value === 'true';
                } else if (typeof originalValue === 'number') {
                    newConfig[key] = value ? Number(value) : 0;
                } else {
                    newConfig[key] = value || '';
                }
            }

            // Update code textarea with new JSON
            const codeTextarea = document.getElementById('editor-code-textarea');
            const newJsonContent = JSON.stringify(newConfig, null, 2);
            codeTextarea.value = newJsonContent;

            // Mark as dirty and trigger save
            this.hasUnsavedChanges = true;
            document.getElementById('editor-save-btn').disabled = false;

            // Auto-save
            await this.saveCurrentFile();

        } catch (error) {
            console.error('Error saving config from form:', error);
            this.showError('Erreur lors de la sauvegarde: ' + error.message);
        }
    }

    // ========================================
    // Unified Editor Management
    // ========================================

    /**
     * Open a file in the unified editor
     * @param {string} path - File path
     * @param {string} content - File content
     */
    async openInEditor(path, content) {
        this.currentFile = path;
        this.currentContent = content;
        this.currentFileType = this.detectFileType(path);
        this.hasUnsavedChanges = false;

        // Update UI
        const editorContainer = document.getElementById('editor-container');
        const fileNameEl = document.getElementById('editor-file-name');
        const fileTypeBadge = document.getElementById('editor-file-type');
        const codeTextarea = document.getElementById('editor-code-textarea');
        const richContent = document.getElementById('editor-rich-content');

        // Set file name and type badge
        fileNameEl.textContent = path.split('/').pop();
        fileTypeBadge.textContent = this.currentFileType;
        fileTypeBadge.className = `file-type-badge ${this.currentFileType}`;

        // Set code view content
        codeTextarea.value = content;

        // Set rich view content
        richContent.innerHTML = this.getRichView(content, this.currentFileType);

        // Show editor container
        editorContainer.classList.remove('hidden');

        // Hide legacy views
        document.getElementById('journal-view').classList.remove('active');

        // Apply saved view mode or default to rich
        // For CONFIG files, always start in RICH mode to show the form
        let initialMode;
        if (this.currentFileType === FILE_TYPES.CONFIG) {
            initialMode = VIEW_MODES.RICH;
        } else {
            initialMode = localStorage.getItem('editorViewMode') || VIEW_MODES.RICH;
        }
        this.switchEditorMode(initialMode);

        // Disable save button initially
        document.getElementById('editor-save-btn').disabled = true;
    }

    /**
     * Switch editor view mode
     * @param {string} mode - View mode (code, rich, split)
     */
    switchEditorMode(mode) {
        this.currentViewMode = mode;

        const editorContainer = document.getElementById('editor-container');
        const buttons = document.querySelectorAll('.view-mode-btn');

        // Update active button
        buttons.forEach(btn => {
            if (btn.dataset.mode === mode) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Update editor container data attribute for CSS
        editorContainer.setAttribute('data-mode', mode);

        // Save preference
        localStorage.setItem('editorViewMode', mode);

        // Update rich view if needed
        if (mode === VIEW_MODES.RICH || mode === VIEW_MODES.SPLIT) {
            const codeTextarea = document.getElementById('editor-code-textarea');
            const richContent = document.getElementById('editor-rich-content');
            richContent.innerHTML = this.getRichView(codeTextarea.value, this.currentFileType);
        }
    }

    /**
     * Save current file to GitHub
     */
    async saveCurrentFile() {
        if (!this.currentFile || !this.hasUnsavedChanges) {
            return;
        }

        try {
            const codeTextarea = document.getElementById('editor-code-textarea');
            const content = codeTextarea.value;

            // Save to GitHub
            await githubAdapter.updateFile(this.currentFile, content);

            // Update state
            this.currentContent = content;
            this.hasUnsavedChanges = false;

            // Disable save button
            document.getElementById('editor-save-btn').disabled = true;

            // Show success message
            this.showSuccess('✅ Fichier sauvegardé');

            // Update rich view if visible
            if (this.currentViewMode === VIEW_MODES.RICH || this.currentViewMode === VIEW_MODES.SPLIT) {
                const richContent = document.getElementById('editor-rich-content');
                richContent.innerHTML = this.getRichView(content, this.currentFileType);
            }
        } catch (error) {
            console.error('Error saving file:', error);
            this.showError('Erreur lors de la sauvegarde: ' + error.message);
        }
    }

    /**
     * Close the editor and return to previous view
     */
    closeEditor() {
        if (this.hasUnsavedChanges) {
            const confirmClose = confirm('Vous avez des modifications non sauvegardées. Fermer quand même ?');
            if (!confirmClose) {
                return;
            }
        }

        // Hide editor
        document.getElementById('editor-container').classList.add('hidden');

        // Show legacy view
        document.getElementById('journal-view').classList.add('active');

        // Reset state
        this.currentFile = null;
        this.currentContent = '';
        this.currentFileType = null;
        this.hasUnsavedChanges = false;
    }

    /**
     * Show success message
     * @param {string} message - Success message
     */
    showSuccess(message) {
        // TODO: Add success notification UI
        console.log(message);
    }

    /**
     * Open .pensine-config.json file in editor
     */
    async openConfigFileInEditor() {
        try {
            // Close settings modal
            this.hideSettings();

            const configPath = '.pensine-config.json';
            let content;

            // Try to load from storage adapter
            try {
                const config = await storageManager.adapter?.getConfig();
                if (config) {
                    content = JSON.stringify(config, null, 2);
                    console.log('📋 Config loaded from storage adapter');
                } else {
                    throw new Error('No config available');
                }
            } catch (e) {
                // Fallback: try to fetch from GitHub
                try {
                    const result = await githubAdapter.getFile(configPath);
                    content = result.content;
                    console.log('📋 Config loaded from GitHub');
                } catch (githubError) {
                    // No config anywhere - create template
                    console.log('⚠️ No config found, creating template');
                    content = JSON.stringify({
                        "storageMode": "github",
                        "github": {
                            "owner": "",
                            "repo": "",
                            "branch": "main",
                            "token": ""
                        },
                        "calendar": {
                            "firstDayOfWeek": 1,
                            "startDate": new Date().toISOString().split('T')[0],
                            "endDate": new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                        }
                    }, null, 2);
                }
            }

            // Open in editor
            await this.openInEditor(configPath, content);
        } catch (error) {
            console.error('Error opening config file:', error);
            this.showError('Impossible d\'ouvrir le fichier de configuration: ' + error.message);
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new PensineApp();
    window.pensineApp = window.app; // Alias pour les callbacks du panneau de config
});
