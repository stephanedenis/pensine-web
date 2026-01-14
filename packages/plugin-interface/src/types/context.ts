import { EventBus } from './events';
import { ConfigManager } from './config';
import { StorageAdapter } from './storage';

/**
 * Plugin Context - Runtime environment provided to plugins
 */
export interface PaniniPluginContext {
  /** Application identifier */
  app: 'pensine' | 'ontowave' | 'panini-fs';

  /** Application version */
  version: string;

  /** Event bus for pub/sub communication */
  events: EventBus;

  /** Configuration manager */
  config: ConfigManager;

  /** Storage adapter for data persistence */
  storage: StorageAdapter;

  /** Feature flags enabled in the host */
  features: FeatureFlags;

  /** Logger instance */
  logger: Logger;

  /** User information (if authenticated) */
  user?: UserInfo;
}

/**
 * Feature flags available in the host application
 */
export interface FeatureFlags {
  /** Markdown rendering support */
  markdown: boolean;

  /** Plugin hot-reload during development */
  hotReload: boolean;

  /** Semantic search capabilities */
  semanticSearch: boolean;

  /** Offline support */
  offline: boolean;

  /** Custom feature flags (app-specific) */
  [key: string]: boolean;
}

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

/**
 * User information
 */
export interface UserInfo {
  id: string;
  name?: string;
  email?: string;
  avatar?: string;
}
