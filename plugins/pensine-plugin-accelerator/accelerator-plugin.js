/**
 * Pensine Accelerator Plugin
 *
 * Performance-focused plugin with optional Azure backend support
 *
 * Features:
 * - Wiki-links resolution (client + server)
 * - Full-text search (local + distributed)
 * - Graph visualization (backlinks)
 * - Graceful degradation (works offline)
 *
 * @version 0.1.0
 * @status WIP (Phase 1: Client-side only)
 */

export default class AcceleratorPlugin {
  /**
   * Constructor
   * @param {Object} context - Plugin context from PluginSystem
   *   - config: ConfigManager
   *   - eventBus: EventBus
   *   - storage: StorageManager
   *   - router: Router
   */
  constructor(context) {
    this.id = 'accelerator';
    this.context = context;

    // State
    this.enabled = false;
    this.serverUrl = null;
    this.online = false;

    // Components
    this.indexDB = null;
    this.wikiLinkResolver = null;
    this.searchEngine = null;
    this.graphBuilder = null;

    console.log('[Accelerator] Plugin constructed');
  }

  /**
   * Enable plugin - called when app starts if plugin is enabled
   */
  async enable() {
    try {
      console.log('[Accelerator] Enabling...');

      // 1. Load configuration
      const config = await this.loadConfig();
      this.serverUrl = config.serverUrl || null;

      // 2. Initialize client-side components (always)
      await this.initializeClientComponents();

      // 3. Check server availability (non-blocking)
      if (this.serverUrl) {
        this.checkServerHealth();
      }

      // 4. Start background services
      this.startBackgroundServices(config);

      this.enabled = true;
      console.log(`[Accelerator] Enabled (mode: ${this.getMode()})`);

      // Emit event
      this.context.eventBus?.emit('plugin:accelerator:enabled', {
        mode: this.getMode(),
        online: this.online
      });

    } catch (error) {
      console.error('[Accelerator] Enable failed:', error);
      throw error;
    }
  }

  /**
   * Disable plugin
   */
  async disable() {
    try {
      console.log('[Accelerator] Disabling...');

      if (this.indexDB) {
        await this.indexDB.close();
      }

      this.enabled = false;
      console.log('[Accelerator] Disabled');

      this.context.eventBus?.emit('plugin:accelerator:disabled');
    } catch (error) {
      console.error('[Accelerator] Disable failed:', error);
    }
  }

  /**
   * Load configuration from ConfigManager
   */
  async loadConfig() {
    const defaultConfig = AcceleratorPlugin.getDefaultConfig();

    try {
      const userConfig = this.context.config?.getPluginConfig(this.id) || {};
      return { ...defaultConfig, ...userConfig };
    } catch (error) {
      console.warn('[Accelerator] Could not load config, using defaults:', error);
      return defaultConfig;
    }
  }

  /**
   * Initialize client-side components
   * These work completely offline and don't require backend
   */
  async initializeClientComponents() {
    // IndexedDB for local caching and search
    this.indexDB = new AcceleratorIndexedDB();
    await this.indexDB.init();
    console.log('[Accelerator] IndexedDB initialized');

    // Wiki-links resolver
    this.wikiLinkResolver = new WikiLinkResolver(this.indexDB);
    console.log('[Accelerator] Wiki-link resolver initialized');

    // Full-text search engine
    this.searchEngine = new SearchEngine(this.indexDB);
    console.log('[Accelerator] Search engine initialized');

    // Graph builder for backlinks visualization
    this.graphBuilder = new GraphBuilder(this.indexDB);
    console.log('[Accelerator] Graph builder initialized');
  }

  /**
   * Check if backend server is available
   * Non-blocking, will retry periodically
   */
  async checkServerHealth() {
    if (!this.serverUrl) return;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`${this.serverUrl}/api/v1/health`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Pensine-Accelerator/0.1' }
      });

      clearTimeout(timeout);
      this.online = response.ok;

      if (this.online) {
        console.log('[Accelerator] Server is online');
        this.context.eventBus?.emit('plugin:accelerator:online');
      }
    } catch (error) {
      console.warn('[Accelerator] Server unavailable, using client-only mode');
      this.online = false;
      this.context.eventBus?.emit('plugin:accelerator:offline');
    }
  }

  /**
   * Start background services
   * - Periodic server health checks
   * - Auto-sync to server if online
   * - Index new notes
   */
  startBackgroundServices(config) {
    // Health check every 30 seconds
    if (this.serverUrl) {
      setInterval(() => this.checkServerHealth(), 30000);
    }

    // Auto-indexing
    if (config.indexing?.autoIndex) {
      this.context.eventBus?.on('editor:file-saved', async (event) => {
        await this.indexNote(event.file, event.content);
      });
    }

    // Background sync
    if (this.serverUrl && config.indexing?.backgroundSync) {
      const interval = config.indexing?.syncInterval || 300000;
      setInterval(() => this.syncWithServer(), interval);
    }

    console.log('[Accelerator] Background services started');
  }

  /**
   * Search notes with fallback strategy
   * 1. Try server if online
   * 2. Fallback to local IndexedDB
   * 3. Return results with confidence level
   */
  async search(query, options = {}) {
    const { limit = 20, timeout = 2000 } = options;

    let results = {
      query,
      items: [],
      source: 'unknown',
      confidence: 'none',
      duration: 0
    };

    const startTime = performance.now();

    try {
      // Try server first if online and configured
      if (this.online && this.serverUrl) {
        try {
          const serverResults = await this.searchOnServer(query, { limit, timeout });
          results.items = serverResults;
          results.source = 'server';
          results.confidence = 'high';
        } catch (error) {
          console.warn('[Accelerator] Server search failed, falling back to local');
          // Fall through to local search
        }
      }

      // Fallback to local if no server results
      if (results.items.length === 0) {
        const localResults = await this.searchLocal(query, { limit });
        results.items = localResults;
        results.source = 'client';
        results.confidence = this.online ? 'medium' : 'degraded';
      }

    } catch (error) {
      console.error('[Accelerator] Search error:', error);
      // Final fallback: return empty with error info
      results.error = error.message;
      results.confidence = 'error';
    }

    results.duration = performance.now() - startTime;
    return results;
  }

  /**
   * Search on server (requires backend online)
   */
  async searchOnServer(query, options = {}) {
    const { limit = 20, timeout = 2000 } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const url = new URL(`${this.serverUrl}/api/v1/search`);
      url.searchParams.set('query', query);
      url.searchParams.set('limit', limit);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${this.context.config?.get('github-token') || ''}`,
          'X-User-Id': this.context.config?.get('github-owner') || ''
        }
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      return data.results || [];

    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Search locally using IndexedDB
   */
  async searchLocal(query, options = {}) {
    const { limit = 20 } = options;
    return await this.searchEngine.search(query, limit);
  }

  /**
   * Resolve wiki-link: [[note-title]] → note ID
   * Tries server first, falls back to local index
   */
  async resolveWikiLink(linkText) {
    try {
      // Try server if online
      if (this.online && this.serverUrl) {
        try {
          const result = await this.resolveOnServer(linkText);
          if (result) return result;
        } catch (error) {
          console.warn('[Accelerator] Server wiki-link resolution failed');
        }
      }

      // Fallback to local
      return await this.wikiLinkResolver.resolve(linkText);

    } catch (error) {
      console.error('[Accelerator] Wiki-link resolution error:', error);
      return null;
    }
  }

  /**
   * Resolve wiki-link on server
   */
  async resolveOnServer(linkText) {
    const response = await fetch(
      `${this.serverUrl}/api/v1/wiki-links/resolve?text=${encodeURIComponent(linkText)}`,
      {
        headers: {
          'Authorization': `Bearer ${this.context.config?.get('github-token') || ''}`
        }
      }
    );

    if (!response.ok) return null;
    const data = await response.json();
    return data.noteId || null;
  }

  /**
   * Get backlinks for a note
   */
  async getBacklinks(noteId) {
    try {
      if (this.online && this.serverUrl) {
        try {
          return await this.getBacklinksFromServer(noteId);
        } catch (error) {
          console.warn('[Accelerator] Server backlinks failed');
        }
      }

      // Fallback to local
      return await this.graphBuilder.getBacklinks(noteId);

    } catch (error) {
      console.error('[Accelerator] Backlinks error:', error);
      return [];
    }
  }

  /**
   * Get backlinks from server
   */
  async getBacklinksFromServer(noteId) {
    const response = await fetch(
      `${this.serverUrl}/api/v1/backlinks/${encodeURIComponent(noteId)}`,
      {
        headers: {
          'Authorization': `Bearer ${this.context.config?.get('github-token') || ''}`
        }
      }
    );

    if (!response.ok) throw new Error('Server error');
    const data = await response.json();
    return data.backlinks || [];
  }

  /**
   * Index a note in local IndexedDB
   */
  async indexNote(noteId, content) {
    try {
      await this.indexDB.indexNote({
        id: noteId,
        content,
        timestamp: Date.now()
      });

      console.log(`[Accelerator] Indexed note: ${noteId}`);

      // If server online, queue for sync
      if (this.online && this.serverUrl) {
        // Add to sync queue (will be synced periodically)
        await this.indexDB.addSyncQueue(noteId);
      }

    } catch (error) {
      console.error('[Accelerator] Index error:', error);
    }
  }

  /**
   * Sync with server
   * Send all queued notes for indexing
   */
  async syncWithServer() {
    if (!this.online || !this.serverUrl) {
      return { synced: 0, skipped: 'server offline' };
    }

    try {
      const notesToSync = await this.indexDB.getSyncQueue();
      if (notesToSync.length === 0) {
        return { synced: 0, reason: 'nothing to sync' };
      }

      const response = await fetch(`${this.serverUrl}/api/v1/index/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.context.config?.get('github-token') || ''}`
        },
        body: JSON.stringify({ notes: notesToSync })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const result = await response.json();
      console.log(`[Accelerator] Synced ${result.indexed} notes with server`);

      // Clear sync queue
      await this.indexDB.clearSyncQueue();

      return { synced: result.indexed };

    } catch (error) {
      console.error('[Accelerator] Sync error:', error);
      return { synced: 0, error: error.message };
    }
  }

  /**
   * Get visualization graph (nodes + edges)
   */
  async getGraph() {
    try {
      if (this.online && this.serverUrl) {
        try {
          return await this.getGraphFromServer();
        } catch (error) {
          console.warn('[Accelerator] Server graph failed');
        }
      }

      return await this.graphBuilder.buildGraph();

    } catch (error) {
      console.error('[Accelerator] Graph error:', error);
      return { nodes: [], edges: [] };
    }
  }

  /**
   * Get graph from server
   */
  async getGraphFromServer() {
    const response = await fetch(`${this.serverUrl}/api/v1/graph`, {
      headers: {
        'Authorization': `Bearer ${this.context.config?.get('github-token') || ''}`
      }
    });

    if (!response.ok) throw new Error('Server error');
    return await response.json();
  }

  /**
   * Get current operation mode
   */
  getMode() {
    if (!this.serverUrl) return 'client-only';
    if (this.online) return 'hybrid';
    return 'client-fallback';
  }

  /**
   * Get plugin status
   */
  getStatus() {
    return {
      id: this.id,
      enabled: this.enabled,
      mode: this.getMode(),
      online: this.online,
      serverUrl: this.serverUrl,
      components: {
        indexDB: this.indexDB?.isInitialized || false,
        wikiLinks: !!this.wikiLinkResolver,
        search: !!this.searchEngine,
        graph: !!this.graphBuilder
      }
    };
  }

  /**
   * JSON Schema for configuration
   */
  static getConfigSchema() {
    return {
      title: 'Accelerator Plugin Configuration',
      type: 'object',
      properties: {
        enabled: {
          type: 'boolean',
          title: 'Enable Accelerator',
          default: true
        },
        serverUrl: {
          type: 'string',
          title: 'Backend Server URL',
          description: 'Optional - leave empty for client-only mode',
          default: null,
          examples: ['https://pensine-accelerator.azurewebsites.net']
        },
        features: {
          type: 'object',
          title: 'Features',
          properties: {
            wikiLinks: {
              type: 'boolean',
              title: 'Enable Wiki-Links',
              default: true
            },
            fullTextSearch: {
              type: 'boolean',
              title: 'Enable Full-Text Search',
              default: true
            },
            graphVisualization: {
              type: 'boolean',
              title: 'Enable Graph Visualization',
              default: false
            },
            backlinkDetection: {
              type: 'boolean',
              title: 'Detect Backlinks',
              default: true
            }
          }
        },
        indexing: {
          type: 'object',
          title: 'Indexing Settings',
          properties: {
            autoIndex: {
              type: 'boolean',
              title: 'Auto-Index Notes',
              default: true
            },
            backgroundSync: {
              type: 'boolean',
              title: 'Background Sync',
              default: true
            },
            syncInterval: {
              type: 'number',
              title: 'Sync Interval (ms)',
              default: 300000,
              minimum: 60000
            }
          }
        },
        performance: {
          type: 'object',
          title: 'Performance Tuning',
          properties: {
            searchTimeout: {
              type: 'number',
              title: 'Search Timeout (ms)',
              default: 2000
            },
            cacheSize: {
              type: 'string',
              title: 'Cache Size',
              default: '100MB'
            }
          }
        }
      }
    };
  }

  /**
   * Default configuration
   */
  static getDefaultConfig() {
    return {
      enabled: true,
      serverUrl: null,
      features: {
        wikiLinks: true,
        fullTextSearch: true,
        graphVisualization: false,
        backlinkDetection: true
      },
      indexing: {
        autoIndex: true,
        backgroundSync: true,
        syncInterval: 300000
      },
      performance: {
        searchTimeout: 2000,
        cacheSize: '100MB'
      }
    };
  }
}

/**
 * Placeholder: IndexedDB wrapper
 * @todo Implement proper IndexedDB with FTS
 */
class AcceleratorIndexedDB {
  async init() {
    // TODO
  }

  async indexNote(note) {
    // TODO
  }

  async search(query, limit) {
    // TODO
    return [];
  }

  async getBacklinks(noteId) {
    // TODO
    return [];
  }

  async addSyncQueue(noteId) {
    // TODO
  }

  async getSyncQueue() {
    // TODO
    return [];
  }

  async clearSyncQueue() {
    // TODO
  }

  async close() {
    // TODO
  }
}

/**
 * Placeholder: Wiki-link resolver
 * @todo Implement [[note-title]] resolution
 */
class WikiLinkResolver {
  constructor(indexDB) {
    this.indexDB = indexDB;
  }

  async resolve(linkText) {
    // TODO: Parse [[text]] and find matching note ID
    return null;
  }
}

/**
 * Placeholder: Full-text search engine
 * @todo Implement FTS using IndexedDB
 */
class SearchEngine {
  constructor(indexDB) {
    this.indexDB = indexDB;
  }

  async search(query, limit) {
    // TODO: FTS implementation
    return [];
  }
}

/**
 * Placeholder: Graph builder for backlinks
 * @todo Implement graph building from wiki-links
 */
class GraphBuilder {
  constructor(indexDB) {
    this.indexDB = indexDB;
  }

  async getBacklinks(noteId) {
    // TODO: Find all notes that link to noteId
    return [];
  }

  async buildGraph() {
    // TODO: Build full graph (nodes + edges)
    return { nodes: [], edges: [] };
  }
}
