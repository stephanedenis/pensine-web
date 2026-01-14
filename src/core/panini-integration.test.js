/**
 * Tests for Panini Plugin Integration
 * 
 * Tests:
 * - PaniniPluginContext creation
 * - Event wrapper with namespace cleanup
 * - Config wrapper with schema validation
 * - Storage wrapper
 * - Plugin lifecycle (activate/deactivate)
 * - Legacy plugin backward compatibility
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PaniniEventBusWrapper,
  PaniniConfigManagerWrapper,
  PaniniStorageAdapterWrapper,
  createPaniniContext,
  LegacyPluginAdapter
} from '../src/core/panini-wrappers.js';

describe('Panini Integration', () => {
  describe('PaniniEventBusWrapper', () => {
    let mockEventBus;
    let wrapper;

    beforeEach(() => {
      mockEventBus = {
        on: vi.fn(),
        once: vi.fn(),
        off: vi.fn(),
        emit: vi.fn()
      };
      wrapper = new PaniniEventBusWrapper(mockEventBus);
    });

    it('should wrap on() with namespace tracking', () => {
      const handler = vi.fn();
      wrapper.on('test:event', handler, 'my-plugin');

      expect(mockEventBus.on).toHaveBeenCalledWith('test:event', handler, 'my-plugin');
      expect(wrapper.namespaces.has('my-plugin')).toBe(true);
    });

    it('should clear namespace handlers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      wrapper.on('event1', handler1, 'plugin-a');
      wrapper.on('event2', handler2, 'plugin-a');

      wrapper.clearNamespace('plugin-a');

      expect(mockEventBus.off).toHaveBeenCalledTimes(2);
      expect(wrapper.namespaces.has('plugin-a')).toBe(false);
    });

    it('should emit events', () => {
      wrapper.emit('test:event', { data: 'value' });
      expect(mockEventBus.emit).toHaveBeenCalledWith('test:event', { data: 'value' }, 'plugin');
    });
  });

  describe('PaniniConfigManagerWrapper', () => {
    let mockConfigManager;
    let wrapper;

    beforeEach(() => {
      mockConfigManager = {
        getCoreConfig: vi.fn(() => ({ theme: 'dark' })),
        setCoreConfig: vi.fn(() => Promise.resolve()),
        getPluginConfig: vi.fn(() => ({ enabled: true })),
        setPluginConfig: vi.fn(() => Promise.resolve(true)),
        registerPluginSchema: vi.fn(),
        getPluginSchema: vi.fn(() => ({ type: 'object' })),
        validateConfig: vi.fn(() => ({ valid: true })),
        loaded: true
      };
      wrapper = new PaniniConfigManagerWrapper(mockConfigManager);
    });

    it('should wrap getCoreConfig', () => {
      const config = wrapper.getCoreConfig();
      expect(config).toEqual({ theme: 'dark' });
      expect(mockConfigManager.getCoreConfig).toHaveBeenCalled();
    });

    it('should wrap getPluginConfig', () => {
      const config = wrapper.getPluginConfig('my-plugin');
      expect(config).toEqual({ enabled: true });
      expect(mockConfigManager.getPluginConfig).toHaveBeenCalledWith('my-plugin');
    });

    it('should register schema', () => {
      const schema = { type: 'object', properties: {} };
      const defaults = { enabled: true };

      wrapper.registerSchema('my-plugin', schema, defaults);

      expect(mockConfigManager.registerPluginSchema).toHaveBeenCalledWith(
        'my-plugin',
        schema,
        defaults
      );
    });

    it('should validate config', () => {
      const result = wrapper.validate('my-plugin', { enabled: false });
      expect(result.valid).toBe(true);
    });

    it('should report loaded state', () => {
      expect(wrapper.isLoaded()).toBe(true);
    });
  });

  describe('PaniniStorageAdapterWrapper', () => {
    let mockStorageManager;
    let mockAdapter;
    let wrapper;

    beforeEach(() => {
      mockAdapter = {
        getFile: vi.fn((path) => Promise.resolve({ content: `Content of ${path}` })),
        saveFile: vi.fn(() => Promise.resolve()),
        deleteFile: vi.fn(() => Promise.resolve()),
        listFiles: vi.fn(() => Promise.resolve([{ path: 'file1.md' }, { path: 'file2.md' }])),
        isConfigured: vi.fn(() => true)
      };

      mockStorageManager = {
        adapter: mockAdapter,
        mode: 'github',
        initialize: vi.fn(() => Promise.resolve())
      };

      wrapper = new PaniniStorageAdapterWrapper(mockStorageManager);
    });

    it('should detect adapter name', () => {
      expect(wrapper.name).toBe('github');
    });

    it('should read file', async () => {
      const content = await wrapper.readFile('test.md');
      expect(content).toBe('Content of test.md');
      expect(mockAdapter.getFile).toHaveBeenCalledWith('test.md');
    });

    it('should write file', async () => {
      await wrapper.writeFile('test.md', 'New content', 'Update');
      expect(mockAdapter.saveFile).toHaveBeenCalledWith('test.md', 'New content', 'Update');
    });

    it('should list files', async () => {
      const files = await wrapper.listFiles('notes/');
      expect(files).toEqual(['file1.md', 'file2.md']);
    });

    it('should check if configured', () => {
      expect(wrapper.isConfigured()).toBe(true);
    });

    it('should check file exists', async () => {
      const exists = await wrapper.fileExists('test.md');
      expect(exists).toBe(true);

      mockAdapter.getFile.mockRejectedValueOnce(new Error('Not found'));
      const notExists = await wrapper.fileExists('missing.md');
      expect(notExists).toBe(false);
    });
  });

  describe('createPaniniContext', () => {
    it('should create valid PaniniPluginContext', () => {
      const mockEventBus = { on: vi.fn(), emit: vi.fn() };
      const mockConfigManager = { loaded: true };
      const mockStorageManager = { adapter: {}, mode: 'local' };

      const context = createPaniniContext({
        eventBus: mockEventBus,
        configManager: mockConfigManager,
        storageManager: mockStorageManager,
        features: { markdown: true }
      });

      expect(context.app).toBe('pensine');
      expect(context.version).toBeDefined();
      expect(context.events).toBeDefined();
      expect(context.config).toBeDefined();
      expect(context.storage).toBeDefined();
      expect(context.features.markdown).toBe(true);
      expect(context.features.offline).toBe(true); // local mode
      expect(context.logger).toBe(console);
    });
  });

  describe('LegacyPluginAdapter', () => {
    it('should adapt legacy plugin to PaniniPlugin', async () => {
      const legacyPlugin = {
        enable: vi.fn(() => Promise.resolve()),
        disable: vi.fn(() => Promise.resolve())
      };

      const manifest = {
        id: 'legacy-plugin',
        name: 'Legacy Plugin',
        version: '1.0.0'
      };

      const adapter = new LegacyPluginAdapter(legacyPlugin, manifest);

      expect(adapter.manifest).toEqual(manifest);

      // Activate
      const mockContext = {
        events: {
          clearNamespace: vi.fn()
        },
        logger: { info: vi.fn() }
      };

      await adapter.activate(mockContext);
      expect(legacyPlugin.enable).toHaveBeenCalled();

      // Deactivate
      await adapter.deactivate();
      expect(legacyPlugin.disable).toHaveBeenCalled();
      expect(mockContext.events.clearNamespace).toHaveBeenCalledWith('legacy-plugin');

      // Health check
      expect(await adapter.healthCheck()).toBe(false); // deactivated
    });
  });

  describe('Plugin Lifecycle', () => {
    it('should support full PaniniPlugin lifecycle', async () => {
      class TestPlugin {
        manifest = {
          id: 'test-plugin',
          name: 'Test Plugin',
          version: '1.0.0'
        };

        constructor() {
          this.activated = false;
        }

        async activate(context) {
          this.context = context;
          this.activated = true;

          context.config.registerSchema(
            this.manifest.id,
            { type: 'object', properties: { enabled: { type: 'boolean' } } },
            { enabled: true }
          );

          context.events.on('test:event', () => {}, this.manifest.id);
        }

        async deactivate() {
          this.context.events.clearNamespace(this.manifest.id);
          this.activated = false;
          this.context = null;
        }

        async healthCheck() {
          return this.activated;
        }
      }

      const plugin = new TestPlugin();

      const mockEventBus = {
        on: vi.fn(),
        emit: vi.fn(),
        off: vi.fn()
      };

      const mockConfigManager = {
        registerPluginSchema: vi.fn(),
        getPluginConfig: vi.fn(() => ({ enabled: true }))
      };

      const mockStorageManager = {
        adapter: { isConfigured: () => true },
        mode: 'github'
      };

      const context = createPaniniContext({
        eventBus: mockEventBus,
        configManager: mockConfigManager,
        storageManager: mockStorageManager
      });

      // Activate
      await plugin.activate(context);
      expect(plugin.activated).toBe(true);
      expect(await plugin.healthCheck()).toBe(true);
      expect(mockConfigManager.registerPluginSchema).toHaveBeenCalled();

      // Deactivate
      await plugin.deactivate();
      expect(plugin.activated).toBe(false);
      expect(await plugin.healthCheck()).toBe(false);
    });
  });
});
