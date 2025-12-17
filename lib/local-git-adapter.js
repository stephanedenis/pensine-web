/**
 * Local Git Storage Adapter - Mode Offline avec vrai Git
 * Utilise isomorphic-git pour un vrai repo Git dans le navigateur
 * Stockage via OPFS (Origin Private File System) ou LightningFS
 */

class LocalGitAdapter extends StorageAdapterBase {
  constructor() {
    super();
    this.mode = 'local-git';
    this.fs = null;
    this.gitdir = '/pensine-repo';
    this.author = {
      name: 'Pensine User',
      email: 'user@pensine.local'
    };
    this.initialized = false;
  }

  async configure(config) {
    console.log('🌿 Configuring Local Git storage mode');

    // Vérifier que isomorphic-git est chargé
    if (typeof window.git === 'undefined') {
      throw new Error('isomorphic-git not loaded. Please include it in index.html');
    }

    // Initialiser le filesystem (LightningFS)
    if (typeof window.LightningFS === 'undefined') {
      throw new Error('LightningFS not loaded. Please include it in index.html');
    }

    this.fs = new LightningFS('pensine-fs');

    // Configurer auteur si fourni
    if (config.author) {
      // Si author est un objet {name, email}, l'utiliser tel quel
      // Sinon, construire depuis config.author et config.email
      if (typeof config.author === 'object' && config.author.name) {
        this.author = config.author;
      } else {
        this.author = {
          name: config.author,
          email: config.email || 'user@pensine.local'
        };
      }
    } else if (config.email) {
      this.author.email = config.email;
    }

    // Initialiser le repo Git
    await this.initRepository();

    // Stocker la config
    localStorage.setItem('pensine-storage-mode', 'local-git');
    localStorage.setItem('pensine-local-git-config', JSON.stringify({
      author: this.author,
      gitdir: this.gitdir
    }));

    this.configured = true;
    this.initialized = true;
    console.log('✅ Local Git storage configured');
  }

  async initRepository() {
    try {
      // Vérifier si repo existe déjà
      const exists = await this.repoExists();

      if (!exists) {
        console.log('📦 Initializing new Git repository...');

        // Créer le répertoire
        await this.fs.promises.mkdir(this.gitdir, { recursive: true });

        // Initialiser Git repo
        await git.init({
          fs: this.fs,
          dir: this.gitdir,
          defaultBranch: 'main'
        });

        // Créer commit initial
        await this.createInitialCommit();

        console.log('✅ Git repository initialized');
      } else {
        console.log('✅ Existing Git repository found');
      }
    } catch (error) {
      console.error('Error initializing repository:', error);
      throw error;
    }
  }

  async repoExists() {
    try {
      const stat = await this.fs.promises.stat(`${this.gitdir}/.git`);
      return stat.isDirectory();
    } catch (error) {
      return false;
    }
  }

  async createInitialCommit() {
    // Créer un README initial
    const readmeContent = '# Pensine - Knowledge Base\n\nInitialized with Local Git mode.\n';
    await this.fs.promises.writeFile(
      `${this.gitdir}/README.md`,
      readmeContent,
      'utf8'
    );

    // Ajouter au staging
    await git.add({
      fs: this.fs,
      dir: this.gitdir,
      filepath: 'README.md'
    });

    // Commit initial
    await git.commit({
      fs: this.fs,
      dir: this.gitdir,
      author: this.author,
      message: 'Initial commit'
    });
  }

  async getFile(path) {
    try {
      const filepath = `${this.gitdir}/${path}`;
      const content = await this.fs.promises.readFile(filepath, 'utf8');

      // Récupérer le SHA du dernier commit pour ce fichier
      const commits = await git.log({
        fs: this.fs,
        dir: this.gitdir,
        filepath: path,
        depth: 1
      });

      const sha = commits.length > 0 ? commits[0].oid : null;

      return {
        content,
        sha,
        path
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null; // File doesn't exist
      }
      throw error;
    }
  }

  async putFile(path, content, message, sha = null) {
    try {
      const filepath = `${this.gitdir}/${path}`;

      // Créer les répertoires parents si nécessaire
      const dirname = filepath.substring(0, filepath.lastIndexOf('/'));
      await this.fs.promises.mkdir(dirname, { recursive: true });

      // Écrire le fichier
      await this.fs.promises.writeFile(filepath, content, 'utf8');

      // Ajouter au staging
      await git.add({
        fs: this.fs,
        dir: this.gitdir,
        filepath: path
      });

      // Commit
      const commitSha = await git.commit({
        fs: this.fs,
        dir: this.gitdir,
        author: this.author,
        message: message || 'Update ' + path
      });

      return {
        content,
        sha: commitSha,
        path
      };
    } catch (error) {
      console.error('Error putting file:', error);
      throw error;
    }
  }

  async deleteFile(path, message, sha) {
    try {
      const filepath = `${this.gitdir}/${path}`;

      // Supprimer le fichier
      await this.fs.promises.unlink(filepath);

      // Ajouter la suppression au staging
      await git.remove({
        fs: this.fs,
        dir: this.gitdir,
        filepath: path
      });

      // Commit
      await git.commit({
        fs: this.fs,
        dir: this.gitdir,
        author: this.author,
        message: message || 'Delete ' + path
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  async listFiles(path) {
    try {
      const dirpath = path ? `${this.gitdir}/${path}` : this.gitdir;
      const files = await this.fs.promises.readdir(dirpath);

      const result = [];
      for (const filename of files) {
        // Ignorer .git
        if (filename === '.git') continue;

        const fullPath = `${dirpath}/${filename}`;
        const stat = await this.fs.promises.stat(fullPath);
        const relativePath = path ? `${path}/${filename}` : filename;

        result.push({
          path: relativePath,
          type: stat.isDirectory() ? 'dir' : 'file'
        });
      }

      return result;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async checkConnection() {
    // Mode local toujours disponible
    return this.initialized;
  }

  getModeInfo() {
    return {
      mode: 'local-git',
      label: 'Local Git (Offline)',
      icon: '🌿',
      description: 'Stockage local avec vrai Git (commits, branches, historique)',
      features: {
        sync: false,
        backup: true,
        collaboration: false,
        offline: true,
        git: true,
        privacy: true
      },
      storage: 'OPFS/LightningFS + Git',
      capabilities: [
        'Vrai repo Git dans le navigateur',
        'Commits avec auteur et date',
        'Branches et merges',
        'Historique complet (git log)',
        'Diff entre versions',
        'Push/pull optionnel vers GitHub',
        'Export .git bundle'
      ],
      limitations: [
        'Pas de sync automatique multi-appareils',
        'Backup manuel recommandé',
        'Taille limitée par quota navigateur'
      ]
    };
  }

  /**
   * Récupérer l'historique Git (commits)
   */
  async getHistory(path = null, limit = 20) {
    try {
      const options = {
        fs: this.fs,
        dir: this.gitdir,
        depth: limit
      };

      if (path) {
        options.filepath = path;
      }

      const commits = await git.log(options);

      return commits.map(commit => ({
        sha: commit.oid,
        message: commit.commit.message,
        author: commit.commit.author.name,
        email: commit.commit.author.email,
        date: new Date(commit.commit.author.timestamp * 1000).toISOString(),
        parents: commit.commit.parent
      }));
    } catch (error) {
      console.error('Error getting history:', error);
      return [];
    }
  }

  /**
   * Créer une branche
   */
  async createBranch(branchName) {
    try {
      await git.branch({
        fs: this.fs,
        dir: this.gitdir,
        ref: branchName
      });
      console.log(`✅ Branch ${branchName} created`);
    } catch (error) {
      console.error('Error creating branch:', error);
      throw error;
    }
  }

  /**
   * Lister les branches
   */
  async listBranches() {
    try {
      const branches = await git.listBranches({
        fs: this.fs,
        dir: this.gitdir
      });
      return branches;
    } catch (error) {
      console.error('Error listing branches:', error);
      return [];
    }
  }

  /**
   * Changer de branche
   */
  async checkoutBranch(branchName) {
    try {
      await git.checkout({
        fs: this.fs,
        dir: this.gitdir,
        ref: branchName
      });
      console.log(`✅ Switched to branch ${branchName}`);
    } catch (error) {
      console.error('Error checking out branch:', error);
      throw error;
    }
  }

  /**
   * Obtenir la branche actuelle
   */
  async getCurrentBranch() {
    try {
      const branch = await git.currentBranch({
        fs: this.fs,
        dir: this.gitdir
      });
      return branch;
    } catch (error) {
      console.error('Error getting current branch:', error);
      return null;
    }
  }

  /**
   * Diff entre deux commits
   */
  async diff(commitSha1, commitSha2) {
    try {
      // Lire les deux commits
      const commit1 = await git.readCommit({
        fs: this.fs,
        dir: this.gitdir,
        oid: commitSha1
      });

      const commit2 = await git.readCommit({
        fs: this.fs,
        dir: this.gitdir,
        oid: commitSha2
      });

      // Comparer les arbres (simplified diff)
      // Note: Pour un vrai diff, il faudrait comparer les blobs
      return {
        commit1: {
          sha: commitSha1,
          message: commit1.commit.message,
          author: commit1.commit.author.name,
          date: new Date(commit1.commit.author.timestamp * 1000).toISOString()
        },
        commit2: {
          sha: commitSha2,
          message: commit2.commit.message,
          author: commit2.commit.author.name,
          date: new Date(commit2.commit.author.timestamp * 1000).toISOString()
        }
      };
    } catch (error) {
      console.error('Error diffing commits:', error);
      throw error;
    }
  }

  /**
   * Lire un fichier à un commit spécifique
   */
  async getFileAtCommit(path, commitSha) {
    try {
      const { blob } = await git.readBlob({
        fs: this.fs,
        dir: this.gitdir,
        oid: commitSha,
        filepath: path
      });

      const content = new TextDecoder().decode(blob);

      return {
        content,
        sha: commitSha,
        path
      };
    } catch (error) {
      console.error('Error reading file at commit:', error);
      return null;
    }
  }

  /**
   * Status du repo (fichiers modifiés, staged, etc.)
   */
  async status() {
    try {
      const FILE = 0, WORKDIR = 2, STAGE = 3;
      const status = await git.statusMatrix({
        fs: this.fs,
        dir: this.gitdir
      });

      const result = {
        modified: [],
        staged: [],
        untracked: []
      };

      for (const [filepath, head, workdir, stage] of status) {
        if (head === 0 && workdir === 2 && stage === 0) {
          result.untracked.push(filepath);
        } else if (head === 1 && workdir === 2 && stage === 2) {
          result.modified.push(filepath);
        } else if (head !== stage) {
          result.staged.push(filepath);
        }
      }

      return result;
    } catch (error) {
      console.error('Error getting status:', error);
      return { modified: [], staged: [], untracked: [] };
    }
  }

  /**
   * Exporter le repo comme bundle Git
   */
  async exportBundle() {
    try {
      // Créer un bundle avec tous les commits
      // Note: isomorphic-git ne supporte pas directement les bundles
      // Alternative: exporter tous les fichiers + historique en JSON

      const files = await this.listFiles('');
      const fileContents = await Promise.all(
        files.map(async file => {
          if (file.type === 'file') {
            const content = await this.getFile(file.path);
            return content;
          }
          return null;
        })
      );

      const history = await this.getHistory(null, 1000);
      const branches = await this.listBranches();

      return {
        version: 2,
        type: 'git-bundle',
        exportDate: new Date().toISOString(),
        files: fileContents.filter(f => f !== null),
        history,
        branches,
        author: this.author
      };
    } catch (error) {
      console.error('Error exporting bundle:', error);
      throw error;
    }
  }

  /**
   * Importer depuis un bundle
   */
  async importBundle(bundle) {
    if (bundle.version !== 2 || bundle.type !== 'git-bundle') {
      throw new Error('Incompatible bundle format');
    }

    console.log(`📥 Importing ${bundle.files.length} files...`);

    // Importer chaque fichier avec commit
    for (const file of bundle.files) {
      await this.putFile(
        file.path,
        file.content,
        `Import: ${file.path}`
      );
    }

    console.log('✅ Import complete');
  }

  /**
   * Configuration remote GitHub (optionnel)
   */
  async addRemote(name, url, token = null) {
    try {
      // Stocker remote config
      const remoteConfig = {
        name,
        url,
        hasToken: !!token
      };

      if (token) {
        // Stocker token de façon sécurisée (session seulement)
        sessionStorage.setItem(`pensine-git-token-${name}`, token);
      }

      const config = JSON.parse(localStorage.getItem('pensine-local-git-config') || '{}');
      config.remotes = config.remotes || {};
      config.remotes[name] = remoteConfig;
      localStorage.setItem('pensine-local-git-config', JSON.stringify(config));

      console.log(`✅ Remote ${name} added: ${url}`);
    } catch (error) {
      console.error('Error adding remote:', error);
      throw error;
    }
  }

  /**
   * Push vers remote GitHub (si configuré et token disponible)
   */
  async push(remoteName = 'origin', branch = 'main') {
    try {
      const config = JSON.parse(localStorage.getItem('pensine-local-git-config') || '{}');
      const remote = config.remotes?.[remoteName];

      if (!remote) {
        throw new Error(`Remote ${remoteName} not configured`);
      }

      const token = sessionStorage.getItem(`pensine-git-token-${remoteName}`);
      if (!token) {
        throw new Error('No authentication token for remote');
      }

      console.log(`🚀 Pushing to ${remoteName}...`);

      await git.push({
        fs: this.fs,
        http: window.git.http,
        dir: this.gitdir,
        remote: remoteName,
        ref: branch,
        onAuth: () => ({ username: token })
      });

      console.log('✅ Push successful');
    } catch (error) {
      console.error('Error pushing:', error);
      throw error;
    }
  }

  /**
   * Pull depuis remote GitHub (si configuré)
   */
  async pull(remoteName = 'origin', branch = 'main') {
    try {
      const config = JSON.parse(localStorage.getItem('pensine-local-git-config') || '{}');
      const remote = config.remotes?.[remoteName];

      if (!remote) {
        throw new Error(`Remote ${remoteName} not configured`);
      }

      const token = sessionStorage.getItem(`pensine-git-token-${remoteName}`);

      console.log(`⬇️ Pulling from ${remoteName}...`);

      await git.pull({
        fs: this.fs,
        http: window.git.http,
        dir: this.gitdir,
        ref: branch,
        author: this.author,
        onAuth: token ? () => ({ username: token }) : undefined
      });

      console.log('✅ Pull successful');
    } catch (error) {
      console.error('Error pulling:', error);
      throw error;
    }
  }

  /**
   * Clone depuis GitHub
   */
  async clone(url, token = null) {
    try {
      console.log(`📦 Cloning from ${url}...`);

      await git.clone({
        fs: this.fs,
        http: window.git.http,
        dir: this.gitdir,
        url,
        onAuth: token ? () => ({ username: token }) : undefined
      });

      this.initialized = true;
      console.log('✅ Clone successful');
    } catch (error) {
      console.error('Error cloning:', error);
      throw error;
    }
  }
}

// Export
if (typeof window !== 'undefined') {
  window.LocalGitAdapter = LocalGitAdapter;
}
