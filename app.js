/**
 * Pensine - Main Application
 * Zero-install, GitHub-direct knowledge management
 */

/**
 * Configuration Manager - Syncs localStorage with GitHub
 * localStorage is used as a cache for performance
 * GitHub .pensine-config.json is the source of truth for multi-machine sync
 */
class ConfigManager {
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

const configManager = new ConfigManager();

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

    async init() {
        // Initialize storage
        await storageManager.init();

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
        if (!githubAdapter.isConfigured()) {
            // No config - show wizard
            if (window.configWizard) {
                configWizard.show();
            } else {
                // Fallback to settings modal
                this.showSettings();
            }
        } else {
            // Have config - validate token
            try {
                await this.validateToken();
                await this.loadJournal();
            } catch (error) {
                console.error('Token invalide:', error);
                this.showError('Token GitHub invalide ou expiré. Veuillez le reconfigurer.');
                
                // Show wizard if available, otherwise settings
                if (window.configWizard) {
                    configWizard.show();
                } else {
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
            await githubAdapter.request('/user');
            console.log('✅ Token GitHub valide');
            return true;
        } catch (error) {
            throw new Error('Token invalide: ' + error.message);
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('#sidebar nav a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = e.target.dataset.view;
                this.switchView(view);
            });
        });

        // Journal navigation
        document.getElementById('prev-day').addEventListener('click', () => {
            this.navigateDay(-1);
        });
        document.getElementById('next-day').addEventListener('click', () => {
            this.navigateDay(1);
        });
        document.getElementById('today-btn').addEventListener('click', async () => {
            this.currentDate = new Date();
            await this.loadJournal();
        });

        // Settings - Now opens config in editor
        document.getElementById('settings-btn').addEventListener('click', () => {
            this.showSettings();
        });

        // Sync
        document.getElementById('sync-btn').addEventListener('click', () => {
            this.manualSync();
        });

        // History panel toggle
        document.getElementById('history-btn').addEventListener('click', () => {
            this.toggleHistory();
        });
        document.getElementById('close-history').addEventListener('click', () => {
            this.closeHistory();
        });

        // Calendar panel toggle
        document.getElementById('calendar-btn').addEventListener('click', () => {
            this.toggleCalendar();
        });
        
        // Calendar navigation
        document.getElementById('calendar-prev').addEventListener('click', () => {
            this.loadMoreWeeks('past');
        });
        document.getElementById('calendar-next').addEventListener('click', () => {
            this.loadMoreWeeks('future');
        });
        document.getElementById('calendar-today').addEventListener('click', () => {
            this.scrollToCurrentWeek();
        });
        
        // Scroll-based lazy loading
        document.getElementById('calendar-scroll-container').addEventListener('scroll', (e) => {
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
        document.getElementById('editor-save-btn').addEventListener('click', async () => {
            await this.saveCurrentFile();
        });
        
        // Close button
        document.getElementById('editor-close-btn').addEventListener('click', () => {
            this.closeEditor();
        });
        
        // Code textarea input (for auto-save or dirty state detection)
        document.getElementById('editor-code-textarea').addEventListener('input', () => {
            this.hasUnsavedChanges = true;
            document.getElementById('editor-save-btn').disabled = false;
        });
        
        // Keyboard shortcuts
        document.getElementById('editor-code-textarea').addEventListener('keydown', (e) => {
            // Ctrl+S to save
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveCurrentFile();
            }
        });

        // Remote change notification handlers
        document.getElementById('reload-file-btn').addEventListener('click', async () => {
            await this.reloadCurrentFile();
        });
        document.getElementById('ignore-changes-btn').addEventListener('click', () => {
            this.dismissRemoteChangeNotification();
        });

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

    // Settings - Open config file in editor instead of modal
    
    async showSettings() {
        // Open .pensine-config.json in the unified editor
        await this.openConfigFileInEditor();
    }

    hideSettings() {
        // Close the editor
        this.closeEditor();
    }

    async saveSettings() {
        // Now handled by editor save button
        // This method kept for backward compatibility
        await this.saveCurrentFile();
    }

    loadSettings() {
        const settings = storageManager.getSettings();
        if (settings) {
            githubAdapter.configure(settings);
        }
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
        const weekStartDay = parseInt(localStorage.getItem('weekStartDay') || '0');
        
        // Initialize calendar state
        this.calendarState = {
            weekStartDay,
            journalDates: new Set(),
            weeksLoaded: {
                earliest: null,
                latest: null
            },
            isLoading: false
        };

        // Setup weekday headers
        this.setupWeekdayHeaders(weekStartDay);

        // Load journal files list
        try {
            const journalFiles = await this.getJournalFiles();
            this.calendarState.journalDates = new Set(journalFiles.map(file => {
                const match = file.match(/(\d{4})_(\d{2})_(\d{2})\.md$/);
                if (match) {
                    return `${match[1]}-${match[2]}-${match[3]}`;
                }
                return null;
            }).filter(Boolean));
        } catch (error) {
            console.error('Error loading journal files:', error);
        }

        // Load initial weeks (26 past + current + 25 future = 52 weeks / 1 year)
        await this.loadInitialWeeks();
    }

    setupWeekdayHeaders(weekStartDay) {
        const header = document.querySelector('.calendar-weekdays-header');
        const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        
        // Rotate array based on week start day
        const rotatedDayNames = [
            ...dayNames.slice(weekStartDay),
            ...dayNames.slice(0, weekStartDay)
        ];
        
        header.innerHTML = '<div></div>'; // Empty space for month column
        rotatedDayNames.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.textContent = day;
            header.appendChild(dayHeader);
        });
    }

    async loadInitialWeeks() {
        const weeksContainer = document.getElementById('calendar-weeks');
        weeksContainer.innerHTML = '';

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find the start of current week
        const currentWeekStart = this.getWeekStart(today);
        
        // Load 26 weeks before and 25 weeks after (52 total = 1 year)
        const startDate = new Date(currentWeekStart);
        startDate.setDate(startDate.getDate() - (26 * 7));
        
        this.calendarState.weeksLoaded.earliest = new Date(startDate);
        
        for (let i = 0; i < 52; i++) {
            const weekStart = new Date(startDate);
            weekStart.setDate(weekStart.getDate() + (i * 7));
            
            const weekElement = this.generateWeekRow(weekStart);
            weeksContainer.appendChild(weekElement);
            
            this.calendarState.weeksLoaded.latest = new Date(weekStart);
        }

        // Scroll to current week
        setTimeout(() => this.scrollToCurrentWeek(), 100);
    }

    getWeekStart(date) {
        const weekStartDay = this.calendarState.weekStartDay;
        const d = new Date(date);
        const day = d.getDay();
        const diff = (day - weekStartDay + 7) % 7;
        d.setDate(d.getDate() - diff);
        d.setHours(0, 0, 0, 0);
        return d;
    }

    generateWeekRow(weekStart) {
        const weekDiv = document.createElement('div');
        weekDiv.className = 'calendar-week';
        weekDiv.dataset.weekStart = weekStart.toISOString();

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const currentWeekStart = this.getWeekStart(today);

        // Check if this is the current week
        if (weekStart.getTime() === currentWeekStart.getTime()) {
            weekDiv.classList.add('current-week');
            weekDiv.id = 'current-week';
        }

        // Check if this is the first week of a month
        const isMonthStart = weekStart.getDate() <= 7;
        if (isMonthStart) {
            weekDiv.classList.add('month-start');
        }

        // Add month color class based on month number (12 distinct colors)
        const monthColorIndex = weekStart.getMonth();
        weekDiv.classList.add(`month-color-${monthColorIndex}`);

        // Month label
        const monthLabel = document.createElement('div');
        monthLabel.className = 'calendar-month-label';
        monthLabel.textContent = weekStart.toLocaleDateString('fr-CA', { month: 'short' });
        weekDiv.appendChild(monthLabel);

        // Generate 7 days
        for (let i = 0; i < 7; i++) {
            const dayDate = new Date(weekStart);
            dayDate.setDate(dayDate.getDate() + i);
            
            const dayDiv = document.createElement('div');
            dayDiv.className = 'calendar-day';
            dayDiv.textContent = dayDate.getDate();

            const dayMonth = dayDate.getMonth();
            const dayYear = dayDate.getFullYear();
            const weekMonth = weekStart.getMonth();
            const dayOfWeek = dayDate.getDay();
            
            // Add month color class based on THIS day's month (12 distinct colors)
            const monthColorIndex = dayMonth;
            dayDiv.classList.add(`month-color-${monthColorIndex}`);
            
            // Add weekend class for Saturday (6) and Sunday (0)
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                dayDiv.classList.add('weekend');
            }
            
            // Check if this day is in a different month than the week start
            if (dayMonth !== weekMonth) {
                dayDiv.classList.add('other-month');
            }

            // Detect month transitions for borders
            const prevDay = new Date(dayDate);
            prevDay.setDate(prevDay.getDate() - 1);
            const nextDay = new Date(dayDate);
            nextDay.setDate(nextDay.getDate() + 1);
            
            // First day of month - left border
            if (dayDate.getDate() === 1) {
                dayDiv.classList.add('month-start-left');
            }
            
            // Last day of month - right border
            const lastDayOfMonth = new Date(dayYear, dayMonth + 1, 0).getDate();
            if (dayDate.getDate() === lastDayOfMonth) {
                dayDiv.classList.add('month-end-right');
            }
            
            // Simple border logic: top border on first 7 days, bottom border on last 7 days
            const dayOfMonth = dayDate.getDate();
            
            // Top border: days 1-7 of the month
            if (dayOfMonth <= 7) {
                dayDiv.classList.add('month-start-top');
            }
            
            // Bottom border: last 7 days of the month
            if (dayOfMonth > lastDayOfMonth - 7) {
                dayDiv.classList.add('month-end-bottom');
            }
            if (dayOfMonth > lastDayOfMonth - 7) {
                dayDiv.classList.add('month-end-bottom');
            }

            // Check if today
            const checkDate = new Date(dayDate);
            checkDate.setHours(0, 0, 0, 0);
            if (checkDate.getTime() === today.getTime()) {
                dayDiv.classList.add('today');
            }

            // Check if journal entry exists
            const dateStr = this.formatDateForLookup(dayDate);
            if (this.calendarState.journalDates.has(dateStr)) {
                dayDiv.classList.add('has-entry');
                dayDiv.addEventListener('click', () => {
                    this.loadJournalByDate(dayDate);
                });
            }

            weekDiv.appendChild(dayDiv);
        }

        return weekDiv;
    }

    formatDateForLookup(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    async loadMoreWeeks(direction) {
        if (this.calendarState.isLoading) return;
        
        this.calendarState.isLoading = true;
        const weeksContainer = document.getElementById('calendar-weeks');
        const weeksToAdd = 4; // Add 4 weeks at a time

        if (direction === 'past') {
            // Add weeks before the earliest
            const startDate = new Date(this.calendarState.weeksLoaded.earliest);
            const fragment = document.createDocumentFragment();

            for (let i = weeksToAdd; i > 0; i--) {
                const weekStart = new Date(startDate);
                weekStart.setDate(weekStart.getDate() - (i * 7));
                
                const weekElement = this.generateWeekRow(weekStart);
                fragment.appendChild(weekElement);
                
                if (i === weeksToAdd) {
                    this.calendarState.weeksLoaded.earliest = new Date(weekStart);
                }
            }

            weeksContainer.insertBefore(fragment, weeksContainer.firstChild);
        } else {
            // Add weeks after the latest
            const startDate = new Date(this.calendarState.weeksLoaded.latest);

            for (let i = 1; i <= weeksToAdd; i++) {
                const weekStart = new Date(startDate);
                weekStart.setDate(weekStart.getDate() + (i * 7));
                
                const weekElement = this.generateWeekRow(weekStart);
                weeksContainer.appendChild(weekElement);
                
                if (i === weeksToAdd) {
                    this.calendarState.weeksLoaded.latest = new Date(weekStart);
                }
            }
        }

        this.calendarState.isLoading = false;
    }

    scrollToCurrentWeek() {
        const currentWeek = document.getElementById('current-week');
        if (currentWeek) {
            const container = document.getElementById('calendar-scroll-container');
            const containerRect = container.getBoundingClientRect();
            const weekRect = currentWeek.getBoundingClientRect();
            
            // Scroll so current week is at top of visible area
            container.scrollTop = currentWeek.offsetTop - container.offsetTop - 10;
        }
    }

    async getJournalFiles() {
        try {
            const response = await githubAdapter.request(
                `/repos/${githubAdapter.owner}/${githubAdapter.repo}/contents/journals`
            );
            
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

    async loadJournalByDate(date) {
        this.currentDate = date;
        await this.closeCalendar();
        
        // Open journal file in editor
        const fileName = `journals/${this.formatDate(date)}.md`;
        
        try {
            // Try to fetch existing file
            const { content } = await githubAdapter.getFile(fileName);
            await this.openInEditor(fileName, content);
        } catch (error) {
            // File doesn't exist yet, create empty
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
            
            // Try to load from localStorage first
            const localSettings = storageManager.getSettings();
            if (localSettings) {
                content = JSON.stringify(localSettings, null, 2);
                console.log('📋 Config loaded from localStorage');
            } else {
                // Fallback: try to fetch from GitHub
                try {
                    const result = await githubAdapter.getFile(configPath);
                    content = result.content;
                    console.log('📋 Config loaded from GitHub');
                } catch (githubError) {
                    // No config anywhere - show wizard
                    console.log('⚠️ No config found, showing wizard');
                    if (window.ConfigWizard) {
                        const wizard = new ConfigWizard();
                        wizard.show();
                    } else {
                        this.showError('Configuration introuvable. Veuillez créer une configuration.');
                    }
                    return;
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
});
