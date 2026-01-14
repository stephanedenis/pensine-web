/**
 * Tests pour @panini/plugin-interface
 *
 * Valide que toutes les interfaces sont correctement exportées
 * et peuvent être utilisées.
 */

import { describe, it, expect } from 'vitest';
import {
  // Manifest
  PaniniPluginManifest,

  // Context
  PaniniPluginContext,
  FeatureFlags,
  UserInfo,
  Logger,

  // Plugin
  PaniniPlugin,
  PluginState,

  // Events
  EventBus,
  EventHandler,
  PaniniEvents,

  // Config
  ConfigManager,
  JSONSchema,
  ValidationResult,

  // Storage
  StorageAdapter,
  FileMetadata,
  SearchResult
} from '../src/index';

describe('@panini/plugin-interface', () => {
  describe('Types Export', () => {
    it('should export all manifest types', () => {
      const manifest: PaniniPluginManifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'A test plugin',
        author: 'Test Author',
        tags: ['test'],
        dependencies: []
      };

      expect(manifest.id).toBe('test-plugin');
      expect(manifest.name).toBe('Test Plugin');
    });

    it('should export all context types', () => {
      const features: FeatureFlags = {
        markdown: true,
        hotReload: false,
        semanticSearch: true,
        offline: false
      };

      expect(features.markdown).toBe(true);
      expect(features.hotReload).toBe(false);
    });

    it('should export plugin states', () => {
      expect(PluginState.UNLOADED).toBe('unloaded');
      expect(PluginState.LOADED).toBe('loaded');
      expect(PluginState.ACTIVE).toBe('active');
      expect(PluginState.DEACTIVATING).toBe('deactivating');
      expect(PluginState.ERROR).toBe('error');
    });

    it('should export event constants', () => {
      expect(PaniniEvents.APP_READY).toBe('app:ready');
      expect(PaniniEvents.PLUGIN_ACTIVATED).toBe('plugin:activated');
      expect(PaniniEvents.FILE_OPENED).toBe('file:opened');
      expect(PaniniEvents.MARKDOWN_RENDER).toBe('markdown:render');
    });
  });

  describe('Interface Implementation', () => {
    it('should allow implementing PaniniPlugin', () => {
      class TestPlugin implements PaniniPlugin {
        manifest: PaniniPluginManifest = {
          id: 'test',
          name: 'Test',
          version: '1.0.0'
        };

        async activate(context: PaniniPluginContext): Promise<void> {
          expect(context.app).toBeDefined();
        }

        async deactivate(): Promise<void> {
          // Cleanup
        }

        async healthCheck(): Promise<boolean> {
          return true;
        }
      }

      const plugin = new TestPlugin();
      expect(plugin.manifest.id).toBe('test');
      expect(plugin.healthCheck).toBeDefined();
    });

    it('should allow implementing EventBus', () => {
      class TestEventBus implements EventBus {
        private handlers = new Map<string, EventHandler[]>();

        on(event: string, handler: EventHandler, namespace?: string): void {
          const key = namespace ? `${namespace}:${event}` : event;
          if (!this.handlers.has(key)) {
            this.handlers.set(key, []);
          }
          this.handlers.get(key)!.push(handler);
        }

        once(event: string, handler: EventHandler, namespace?: string): void {
          const wrappedHandler = (data: any) => {
            handler(data);
            this.off(event, wrappedHandler, namespace);
          };
          this.on(event, wrappedHandler, namespace);
        }

        off(event: string, handler: EventHandler, namespace?: string): void {
          const key = namespace ? `${namespace}:${event}` : event;
          const handlers = this.handlers.get(key);
          if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
              handlers.splice(index, 1);
            }
          }
        }

        emit(event: string, data?: any): void {
          const handlers = this.handlers.get(event);
          if (handlers) {
            handlers.forEach(h => h(data));
          }
        }

        clearNamespace(namespace: string): void {
          for (const key of this.handlers.keys()) {
            if (key.startsWith(`${namespace}:`)) {
              this.handlers.delete(key);
            }
          }
        }
      }

      const eventBus = new TestEventBus();
      let called = false;

      eventBus.on('test', () => { called = true; });
      eventBus.emit('test');

      expect(called).toBe(true);
    });

    it('should allow implementing ConfigManager', () => {
      class TestConfigManager implements ConfigManager {
        private schemas = new Map<string, JSONSchema>();
        private configs = new Map<string, Record<string, any>>();

        getCoreConfig(): Record<string, any> {
          return this.configs.get('core') || {};
        }

        async setCoreConfig(config: Record<string, any>): Promise<void> {
          this.configs.set('core', config);
        }

        getPluginConfig(pluginId: string): Record<string, any> {
          return this.configs.get(pluginId) || {};
        }

        async setPluginConfig(pluginId: string, config: Record<string, any>): Promise<void> {
          this.configs.set(pluginId, config);
        }

        registerSchema(pluginId: string, schema: JSONSchema, defaults?: Record<string, any>): void {
          this.schemas.set(pluginId, schema);
          if (defaults && !this.configs.has(pluginId)) {
            this.configs.set(pluginId, defaults);
          }
        }

        validate(pluginId: string, config: Record<string, any>): ValidationResult {
          return { valid: true };
        }

        isLoaded(): boolean {
          return true;
        }
      }

      const configManager = new TestConfigManager();
      configManager.registerSchema('test', { type: 'object' }, { enabled: true });

      const config = configManager.getPluginConfig('test');
      expect(config.enabled).toBe(true);
    });

    it('should allow implementing StorageAdapter', () => {
      class TestStorageAdapter implements StorageAdapter {
        readonly name = 'test-storage';
        private files = new Map<string, string>();

        async initialize(config: Record<string, any>): Promise<void> {
          // Init
        }

        isConfigured(): boolean {
          return true;
        }

        async readFile(path: string): Promise<string> {
          return this.files.get(path) || '';
        }

        async writeFile(path: string, content: string, message?: string): Promise<void> {
          this.files.set(path, content);
        }

        async deleteFile(path: string, message?: string): Promise<void> {
          this.files.delete(path);
        }

        async listFiles(path: string): Promise<string[]> {
          return Array.from(this.files.keys()).filter(k => k.startsWith(path));
        }

        async fileExists(path: string): Promise<boolean> {
          return this.files.has(path);
        }

        async getFileMetadata(path: string): Promise<FileMetadata> {
          const content = this.files.get(path);
          return {
            path,
            size: content?.length || 0,
            created: new Date(),
            modified: new Date()
          };
        }

        async semanticSearch(query: string): Promise<SearchResult[]> {
          return [];
        }
      }

      const storage = new TestStorageAdapter();
      expect(storage.name).toBe('test-storage');
      expect(storage.isConfigured()).toBe(true);
    });
  });

  describe('Real World Usage', () => {
    it('should support complete plugin lifecycle', async () => {
      // Mock implementations
      const mockEventBus: EventBus = {
        on: () => {},
        once: () => {},
        off: () => {},
        emit: () => {},
        clearNamespace: () => {}
      };

      const mockConfigManager: ConfigManager = {
        getCoreConfig: () => ({}),
        setCoreConfig: async () => {},
        getPluginConfig: () => ({ enabled: true }),
        setPluginConfig: async () => {},
        registerSchema: () => {},
        validate: () => ({ valid: true }),
        isLoaded: () => true
      };

      const mockStorage: StorageAdapter = {
        name: 'mock',
        initialize: async () => {},
        isConfigured: () => true,
        readFile: async () => '',
        writeFile: async () => {},
        deleteFile: async () => {},
        listFiles: async () => [],
        fileExists: async () => false
      };

      const context: PaniniPluginContext = {
        app: 'pensine',
        version: '1.0.0',
        events: mockEventBus,
        config: mockConfigManager,
        storage: mockStorage,
        features: {
          markdown: true,
          hotReload: false,
          semanticSearch: false,
          offline: true
        },
        logger: console
      };

      // Test plugin creation
      class SimplePlugin implements PaniniPlugin {
        manifest: PaniniPluginManifest = {
          id: 'simple',
          name: 'Simple Plugin',
          version: '1.0.0'
        };

        async activate(ctx: PaniniPluginContext): Promise<void> {
          expect(ctx.app).toBe('pensine');
          expect(ctx.version).toBe('1.0.0');
        }

        async deactivate(): Promise<void> {
          // Cleanup
        }
      }

      const plugin = new SimplePlugin();
      await plugin.activate(context);
      await plugin.deactivate();

      expect(plugin.manifest.id).toBe('simple');
    });
  });
});
