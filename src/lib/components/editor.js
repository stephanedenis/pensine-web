/**
 * Content Editor with auto-save
 */

class Editor {
    constructor(element) {
        this.element = element;
        this.currentPath = null;
        this.isDirty = false;
        this.autoSaveTimeout = null;
        this.changeCheckInterval = null;
        this.parser = new MarkdownParser();
        
        this.setupEditor();
    }

    setupEditor() {
        this.element.setAttribute('contenteditable', 'true');
        this.element.addEventListener('input', () => {
            this.isDirty = true;
            this.scheduleAutoSave();
        });

        // Handle paste (strip formatting)
        this.element.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text/plain');
            document.execCommand('insertText', false, text);
        });
    }

    scheduleAutoSave() {
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }

        this.autoSaveTimeout = setTimeout(() => {
            this.save();
        }, 2000); // Auto-save after 2 seconds of inactivity
    }

    async load(path, content = null) {
        this.currentPath = path;
        
        // Stop previous change detection
        this.stopChangeDetection();
        
        try {
            let fileContent = content;
            
            // If no content provided, fetch from GitHub
            if (content === null) {
                const file = await githubAdapter.getFile(path);
                fileContent = file ? file.content : '';
            }
            
            this.setContent(fileContent);
            this.isDirty = false;
            
            // Start checking for remote changes every 30 seconds
            this.startChangeDetection();
        } catch (error) {
            console.error('Error loading file:', error);
            throw error;
        }
    }

    async save(force = false) {
        if (!this.currentPath) {
            console.warn('⚠️ No file path to save');
            return;
        }
        
        // For force save, always save even if not marked as dirty
        if (!force && !this.isDirty) {
            console.log('ℹ️ No changes to save');
            return;
        }

        try {
            const content = this.getContent();
            const timestamp = new Date().toISOString();
            const message = `Update ${this.currentPath} - ${timestamp}`;
            
            console.log(`💾 Saving ${force ? '(FORCE) ' : ''}${this.currentPath}...`);

            await githubAdapter.saveFile(this.currentPath, content, message, force);
            
            this.isDirty = false;
            this.updateSyncStatus('synced');
            console.log('✅ Save successful');
            
            return true;
        } catch (error) {
            // Ne gérer le conflit que si ce n'est pas déjà une tentative forcée
            if (error.message.includes('CONFLICT') && !force) {
                await this.handleConflict();
            } else {
                console.error('Error saving file:', error);
                this.updateSyncStatus('error');
                throw error;
            }
        }
    }

    getContent() {
        return this.element.innerText;
    }

    setContent(content) {
        this.element.innerText = content;
    }

    async handleConflict() {
        // Just show a user-friendly message, the app will handle force save on next sync click
        this.updateSyncStatus('conflict');
        throw new Error('CONFLICT: File was modified. Click sync again to force save.');
    }

    startChangeDetection() {
        if (!this.currentPath) return;
        
        // Check every 30 seconds
        this.changeCheckInterval = setInterval(async () => {
            if (!this.currentPath) return;
            
            const hasChanges = await githubAdapter.hasRemoteChanges(this.currentPath);
            if (hasChanges) {
                this.notifyRemoteChanges();
            }
        }, 30000); // 30 seconds
    }

    stopChangeDetection() {
        if (this.changeCheckInterval) {
            clearInterval(this.changeCheckInterval);
            this.changeCheckInterval = null;
        }
    }

    notifyRemoteChanges() {
        // Stop checking to avoid multiple notifications
        this.stopChangeDetection();
        
        const banner = document.getElementById('remote-change-banner');
        if (banner) {
            banner.classList.remove('hidden');
        }
        
        console.warn('⚠️ Le fichier distant a été modifié!');
    }

    updateSyncStatus(status) {
        const indicator = document.getElementById('sync-status');
        indicator.className = `status-indicator ${status}`;
    }

    clear() {
        this.stopChangeDetection();
        this.element.innerText = '';
        this.currentPath = null;
        this.isDirty = false;
    }
}

window.Editor = Editor;
