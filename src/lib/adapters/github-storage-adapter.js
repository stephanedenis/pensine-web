/**
 * GitHub Storage Adapter - Modes PAT et OAuth
 * Adaptateur pour stockage via GitHub API avec support OAuth et PAT
 */

import StorageAdapterBase from '/src/lib/adapters/storage-adapter-base.js';

class GitHubStorageAdapter extends StorageAdapterBase {
  constructor() {
    super();
    this.mode = 'pat'; // Défaut PAT, peut être 'oauth'
    this.token = null;
    this.owner = null;
    this.repo = null;
    this.branch = 'master';
    this.baseUrl = 'https://api.github.com';
    this.cache = new Map(); // SHA cache for atomic commits
  }

  async configure(config) {
    console.log(`🔧 Configuring GitHub storage (mode: ${config.authMode || 'pat'})`);

    this.mode = config.authMode || 'pat';
    this.token = config.token;
    this.owner = config.owner;
    this.repo = config.repo;
    this.branch = config.branch || 'master';

    // Stocker la config
    localStorage.setItem('pensine-storage-mode', this.mode);
    localStorage.setItem('pensine-github-config', JSON.stringify({
      owner: this.owner,
      repo: this.repo,
      branch: this.branch,
      authMode: this.mode
    }));

    // Si PAT, stocker le token chiffré
    if (this.mode === 'pat' && this.token) {
      await window.tokenStorage.saveToken(this.token);
    }

    this.configured = true;
    console.log('✅ GitHub storage configured');
  }

  isConfigured() {
    return this.token && this.owner && this.repo;
  }

  async getToken() {
    // OAuth mode : récupérer via githubOAuth
    if (this.mode === 'oauth' && window.githubOAuth && window.githubOAuth.isAuthenticated()) {
      try {
        return await window.githubOAuth.getToken();
      } catch (error) {
        console.error('OAuth token fetch failed:', error);
        throw new Error('OAuth authentication failed. Please login again.');
      }
    }

    // PAT mode : utiliser le token direct
    if (this.mode === 'pat' && this.token) {
      return this.token;
    }

    throw new Error('No authentication method available');
  }

  async request(endpoint, options = {}) {
    if (!this.isConfigured()) {
      throw new Error('GitHub adapter not configured');
    }

    const token = await this.getToken();
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

  async putFile(path, content, message, sha = null) {
    // Si SHA non fourni, essayer de récupérer du cache
    if (!sha) {
      sha = this.cache.get(path);
    }

    // Si toujours pas de SHA, vérifier si fichier existe
    if (!sha) {
      const existing = await this.getFile(path);
      if (existing) {
        sha = existing.sha;
      }
    }

    // Encode content to base64
    const encodedContent = btoa(unescape(encodeURIComponent(content)));

    const body = {
      message,
      content: encodedContent,
      branch: this.branch
    };

    if (sha) {
      body.sha = sha;
    }

    const response = await this.request(
      `/repos/${this.owner}/${this.repo}/contents/${path}`,
      {
        method: 'PUT',
        body: JSON.stringify(body)
      }
    );

    // Update cache
    this.cache.set(path, response.content.sha);

    return {
      content,
      sha: response.content.sha,
      path: response.content.path
    };
  }

  async deleteFile(path, message, sha) {
    // Si SHA non fourni, le récupérer
    if (!sha) {
      const file = await this.getFile(path);
      if (!file) {
        throw new Error('File not found');
      }
      sha = file.sha;
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

    // Remove from cache
    this.cache.delete(path);
  }

  async listFiles(path) {
    try {
      const data = await this.request(
        `/repos/${this.owner}/${this.repo}/contents/${path}?ref=${this.branch}`
      );

      return data.map(item => ({
        path: item.path,
        type: item.type,
        sha: item.sha
      }));
    } catch (error) {
      if (error.message.includes('404')) {
        return []; // Directory doesn't exist
      }
      throw error;
    }
  }

  async checkConnection() {
    try {
      await this.request(`/repos/${this.owner}/${this.repo}`);
      return true;
    } catch (error) {
      console.error('GitHub connection check failed:', error);
      return false;
    }
  }

  getModeInfo() {
    const isPAT = this.mode === 'pat';

    return {
      mode: this.mode,
      label: isPAT ? 'GitHub (PAT)' : 'GitHub (OAuth)',
      icon: '🔗',
      description: isPAT
        ? 'Synchronisation GitHub avec Personal Access Token'
        : 'Synchronisation GitHub avec OAuth sécurisé',
      features: {
        sync: true,
        backup: true,
        collaboration: true,
        offline: false,
        security: isPAT ? 'medium' : 'high'
      },
      storage: `GitHub (${this.owner}/${this.repo})`,
      limitations: isPAT ? [
        'Token stocké en clair (moins sécurisé)',
        'Pas d\'expiration automatique',
        'Révocation manuelle nécessaire'
      ] : [
        'Nécessite backend OAuth (Cloudflare Worker)',
        'Configuration initiale plus complexe'
      ]
    };
  }

  /**
   * Récupérer les commits récents
   */
  async getCommits(limit = 10) {
    try {
      const data = await this.request(
        `/repos/${this.owner}/${this.repo}/commits?sha=${this.branch}&per_page=${limit}`
      );

      return data.map(commit => ({
        sha: commit.sha,
        message: commit.commit.message,
        author: commit.commit.author.name,
        date: commit.commit.author.date
      }));
    } catch (error) {
      console.error('Error fetching commits:', error);
      return [];
    }
  }

  /**
   * Créer une branche
   */
  async createBranch(branchName, fromBranch = 'master') {
    // Récupérer le SHA du commit de référence
    const ref = await this.request(`/repos/${this.owner}/${this.repo}/git/refs/heads/${fromBranch}`);

    // Créer la nouvelle branche
    await this.request(`/repos/${this.owner}/${this.repo}/git/refs`, {
      method: 'POST',
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: ref.object.sha
      })
    });

    console.log(`✅ Branch ${branchName} created`);
  }
}

// Export ES6
export default GitHubStorageAdapter;

// Export global (backwards compatibility)
if (typeof window !== 'undefined') {
  window.GitHubStorageAdapter = GitHubStorageAdapter;
}
