/**
 * Event Bus - Pub/Sub system for inter-plugin communication
 */
export interface EventBus {
  /**
   * Subscribe to an event
   * @param event - Event name
   * @param handler - Callback function
   * @param namespace - Optional namespace for scoping (usually plugin ID)
   */
  on(event: string, handler: EventHandler, namespace?: string): void;

  /**
   * Subscribe to an event (one-time)
   * @param event - Event name
   * @param handler - Callback function
   * @param namespace - Optional namespace for scoping
   */
  once(event: string, handler: EventHandler, namespace?: string): void;

  /**
   * Unsubscribe from an event
   * @param event - Event name
   * @param handler - Callback function to remove
   * @param namespace - Optional namespace
   */
  off(event: string, handler: EventHandler, namespace?: string): void;

  /**
   * Emit an event
   * @param event - Event name
   * @param data - Event payload
   */
  emit(event: string, data?: any): void;

  /**
   * Remove all listeners for a namespace (typically on plugin deactivate)
   * @param namespace - Namespace to clear (usually plugin ID)
   */
  clearNamespace(namespace: string): void;
}

/**
 * Event handler function
 */
export type EventHandler = (data: any) => void | Promise<void>;

/**
 * Common event names used across Panini ecosystem
 */
export const PaniniEvents = {
  // Lifecycle events
  APP_READY: 'app:ready',
  APP_ERROR: 'app:error',

  // Plugin events
  PLUGIN_ACTIVATED: 'plugin:activated',
  PLUGIN_DEACTIVATED: 'plugin:deactivated',
  PLUGIN_ERROR: 'plugin:error',

  // Config events
  CONFIG_CHANGED: 'config:changed',
  CONFIG_SAVED: 'config:saved',

  // Storage events
  STORAGE_READY: 'storage:ready',
  STORAGE_ERROR: 'storage:error',

  // File events (Pensine, OntoWave)
  FILE_OPENED: 'file:opened',
  FILE_SAVED: 'file:saved',
  FILE_DELETED: 'file:deleted',

  // Markdown events (Pensine, OntoWave)
  MARKDOWN_RENDER: 'markdown:render',
  MARKDOWN_RENDERED: 'markdown:rendered',

  // UI events
  UI_THEME_CHANGED: 'ui:theme-changed',
  UI_MODAL_OPENED: 'ui:modal-opened',
  UI_MODAL_CLOSED: 'ui:modal-closed',
} as const;
