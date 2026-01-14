import { PaniniPluginManifest } from './manifest';
import { PaniniPluginContext } from './context';

/**
 * Main Plugin Interface
 * All Panini plugins must implement this interface
 */
export interface PaniniPlugin {
  /** Plugin metadata */
  readonly manifest: PaniniPluginManifest;

  /**
   * Called when the plugin is activated
   * @param context - Runtime context provided by the host
   */
  activate(context: PaniniPluginContext): Promise<void>;

  /**
   * Called when the plugin is deactivated
   * Clean up resources, unregister listeners, etc.
   */
  deactivate(): Promise<void>;

  /**
   * Optional: Called when plugin config changes
   * @param newConfig - New configuration values
   */
  onConfigChange?(newConfig: Record<string, any>): Promise<void>;

  /**
   * Optional: Health check for the plugin
   * @returns true if plugin is functioning correctly
   */
  healthCheck?(): Promise<boolean>;
}

/**
 * Plugin lifecycle states
 */
export enum PluginState {
  /** Plugin is not loaded */
  UNLOADED = 'unloaded',

  /** Plugin is loaded but not activated */
  LOADED = 'loaded',

  /** Plugin is active and running */
  ACTIVE = 'active',

  /** Plugin encountered an error */
  ERROR = 'error',

  /** Plugin is being deactivated */
  DEACTIVATING = 'deactivating'
}

/**
 * Plugin runtime information
 */
export interface PluginInfo {
  manifest: PaniniPluginManifest;
  state: PluginState;
  error?: Error;
  activatedAt?: Date;
  deactivatedAt?: Date;
}
