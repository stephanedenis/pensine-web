/**
 * GitHub API Adapter - Direct interaction with GitHub API
 * No sync scripts needed - atomic operations only
 */

class GitHubAdapter {
    constructor() {
        this.token = null;
        this.owner = null;
        this.repo = null;
        this.branch = 'master';
        this.baseUrl = 'https://api.github.com';
        this.cache = new Map(); // SHA cache for atomic commits
    }

    configure(config) {
        this.token = config.token;
        this.owner = config.owner;
        this.repo = config.repo;
        this.branch = config.branch || 'master';
    }

    isConfigured() {
        return this.token && this.owner && this.repo;
    }

    async request(endpoint, options = {}) {
        if (!this.isConfigured()) {
            throw new Error('GitHub adapter not configured');
        }

        // Get token from OAuth if available, fallback to direct token
        let token = this.token;
        if (window.githubOAuth && window.githubOAuth.isAuthenticated()) {
            try {
                token = await window.githubOAuth.getToken();
            } catch (error) {
                console.error('OAuth token fetch failed, using fallback:', error);
                // Si OAuth échoue, utiliser le token direct (pour rétrocompatibilité)
            }
        }

        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            ...options.headers
        };

        const response = await fetch(url, {
            ...options,
            headers
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`GitHub API error: ${error.message || response.statusText}`);
        }

        return response.json();
    }

    /**
     * Get file content from GitHub
     * @param {string} path - File path (e.g., "journals/2025_12_11.md")
     * @returns {Promise<{content: string, sha: string}>}
     */
    async getFile(path) {
        try {
            const data = await this.request(
                `/repos/${this.owner}/${this.repo}/contents/${path}?ref=${this.branch}`
            );

            // Decode base64 content with UTF-8 support
            const content = decodeURIComponent(escape(atob(data.content)));

            // Cache SHA for atomic updates
            this.cache.set(path, data.sha);

            return {
                content,
                sha: data.sha,
                path: data.path
            };
        } catch (error) {
            if (error.message.includes('404')) {
                return null; // File doesn't exist
            }
            throw error;
        }
    }

    /**
     * Save file to GitHub with atomic commit (checks SHA)
     * @param {string} path - File path
     * @param {string} content - File content
     * @param {string} message - Commit message
     * @param {boolean} force - Force save even if SHA mismatch
     * @returns {Promise<{sha: string}>}
     */
    async saveFile(path, content, message = 'Update from Pensine', force = false) {
        // Encode UTF-8 content to base64
        const encodedContent = btoa(unescape(encodeURIComponent(content)));

        // Get current SHA
        let currentSha = this.cache.get(path);

        // If forcing, always fetch the latest SHA first
        if (force && !currentSha) {
            console.log('🔄 Force mode: fetching latest SHA...');
            const currentFile = await this.getFile(path);
            currentSha = currentFile?.sha;
        }

        const body = {
            message,
            content: encodedContent,
            branch: this.branch
        };

        // CRITICAL: Only add SHA if file exists (atomic update)
        if (currentSha) {
            body.sha = currentSha;
        }

        try {
            const data = await this.request(
                `/repos/${this.owner}/${this.repo}/contents/${path}`,
                {
                    method: 'PUT',
                    body: JSON.stringify(body)
                }
            );

            // Update cache with new SHA
            this.cache.set(path, data.content.sha);

            return { sha: data.content.sha };
        } catch (error) {
            // Conflict detected - SHA mismatch
            if (error.message.includes('does not match') || error.message.includes('does not match the expected')) {
                if (force) {
                    // Récupérer le SHA actuel et réessayer UNE FOIS
                    console.log('⚠️ Conflit détecté, récupération du SHA actuel...');
                    try {
                        const currentFile = await this.getFile(path);
                        if (currentFile) {
                            body.sha = currentFile.sha;
                            const data = await this.request(
                                `/repos/${this.owner}/${this.repo}/contents/${path}`,
                                {
                                    method: 'PUT',
                                    body: JSON.stringify(body)
                                }
                            );
                            this.cache.set(path, data.content.sha);
                            console.log('✅ Sauvegarde forcée réussie');
                            return { sha: data.content.sha };
                        }
                    } catch (retryError) {
                        console.error('❌ Échec de la sauvegarde forcée:', retryError);
                        throw new Error('Force save failed: ' + retryError.message);
                    }
                }
                throw new Error('CONFLICT: File was modified. Try saving again to force.');
            }
            throw error;
        }
    }

    /**
     * List files in a directory
     * @param {string} path - Directory path (e.g., "journals/")
     * @returns {Promise<Array<{name: string, path: string, type: string}>>}
     */
    async listDirectory(path) {
        const data = await this.request(
            `/repos/${this.owner}/${this.repo}/contents/${path}?ref=${this.branch}`
        );

        return data.filter(item => item.type === 'file').map(item => ({
            name: item.name,
            path: item.path,
            type: item.type,
            sha: item.sha
        }));
    }

    /**
     * Delete file from GitHub
     * @param {string} path - File path
     * @param {string} message - Commit message
     */
    async deleteFile(path, message = 'Delete from Pensine') {
        const sha = this.cache.get(path) || (await this.getFile(path))?.sha;

        if (!sha) {
            throw new Error('Cannot delete file: SHA not found');
        }

        await this.request(
            `/repos/${this.owner}/${this.repo}/contents/${path}`,
            {
                method: 'DELETE',
                body: JSON.stringify({
                    message,
                    sha,
                    branch: this.branch
                })
            }
        );

        this.cache.delete(path);
    }

    /**
     * Search content across repository
     * @param {string} query - Search query
     * @returns {Promise<Array>}
     */
    async search(query) {
        const data = await this.request(
            `/search/code?q=${encodeURIComponent(query)}+repo:${this.owner}/${this.repo}`
        );

        return data.items || [];
    }

    /**
     * Check if remote file has changed
     * @param {string} path - File path
     * @returns {Promise<boolean>} true if remote file is different
     */
    async hasRemoteChanges(path) {
        try {
            const cachedSha = this.cache.get(path);
            if (!cachedSha) {
                return false; // No cached version to compare
            }

            // Get remote SHA without downloading content
            const data = await this.request(
                `/repos/${this.owner}/${this.repo}/contents/${path}?ref=${this.branch}`
            );

            return data.sha !== cachedSha;
        } catch (error) {
            console.error('Error checking remote changes:', error);
            return false;
        }
    }

    /**
     * Get commit history for a file
     * @param {string} path - File path
     * @param {number} perPage - Number of commits to return (default 20)
     * @returns {Promise<Array>} Array of commit objects
     */
    async getFileHistory(path, perPage = 20) {
        try {
            const commits = await this.request(
                `/repos/${this.owner}/${this.repo}/commits?path=${encodeURIComponent(path)}&per_page=${perPage}`
            );
            return commits;
        } catch (error) {
            console.error('Error fetching file history:', error);
            return [];
        }
    }

    /**
     * Get file content at a specific commit
     * @param {string} path - File path
     * @param {string} sha - Commit SHA
     * @returns {Promise<string>} File content
     */
    async getFileAtCommit(path, sha) {
        const data = await this.request(
            `/repos/${this.owner}/${this.repo}/contents/${path}?ref=${sha}`
        );

        if (data.encoding === 'base64') {
            return decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))));
        }

        return data.content;
    }

    /**
     * Get file size at a specific commit (without downloading content)
     * @param {string} path - File path
     * @param {string} sha - Commit SHA
     * @returns {Promise<number>} File size in bytes
     */
    async getFileSizeAtCommit(path, sha) {
        try {
            const data = await this.request(
                `/repos/${this.owner}/${this.repo}/contents/${path}?ref=${sha}`
            );
            return data.size || 0;
        } catch (error) {
            console.error('Error fetching file size:', error);
            return 0;
        }
    }

    /**
     * Get configuration file from GitHub
     * @returns {Promise<{config: Object, sha: string}>}
     */
    async getConfig() {
        try {
            const response = await this.request(
                `/repos/${this.owner}/${this.repo}/contents/.pensine-config.json?ref=${this.branch}`
            );
            const content = atob(response.content);
            return {
                config: JSON.parse(content),
                sha: response.sha
            };
        } catch (error) {
            if (error.message.includes('404')) {
                // File doesn't exist yet, return default config
                return {
                    config: {
                        calendarVisible: true,
                        historyVisible: false,
                        weekStartDay: 0,
                        weekendTint: true,
                        theme: 'auto'
                    },
                    sha: null
                };
            }
            throw error;
        }
    }

    /**
     * Update configuration file on GitHub
     * @param {Object} config - Configuration object
     * @param {string} sha - Current file SHA (null for new file)
     * @returns {Promise<string>} New file SHA
     */
    async updateConfig(config, sha) {
        const content = btoa(JSON.stringify(config, null, 2));
        const data = {
            message: 'Update Pensine configuration',
            content: content,
            branch: this.branch
        };

        if (sha) {
            data.sha = sha;
        }

        const response = await this.request(
            `/repos/${this.owner}/${this.repo}/contents/.pensine-config.json`,
            {
                method: 'PUT',
                body: JSON.stringify(data)
            }
        );

        return response.content.sha;
    }

    /**
     * Clear SHA cache (use after conflicts or manual refresh)
     */
    clearCache() {
        this.cache.clear();
    }
}

// Global instance
window.githubAdapter = new GitHubAdapter();
