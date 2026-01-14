/**
 * Plugin Manifest - Metadata about the plugin
 */
export interface PaniniPluginManifest {
  /** Unique identifier (e.g., 'plantuml', 'calendar') */
  id: string;

  /** Human-readable name */
  name: string;

  /** Semantic version (e.g., '1.0.0') */
  version: string;

  /** Short description of what the plugin does */
  description?: string;

  /** Author name or organization */
  author?: string;

  /** Plugin dependencies (other plugin IDs) */
  dependencies?: string[];

  /** Minimum host version required */
  minHostVersion?: string;

  /** Plugin homepage or repository URL */
  homepage?: string;

  /** License identifier (e.g., 'MIT', 'Apache-2.0') */
  license?: string;

  /** Tags for categorization */
  tags?: string[];

  /** Icon (emoji or URL) */
  icon?: string;
}

/**
 * Validates a plugin manifest
 */
export function validateManifest(manifest: unknown): manifest is PaniniPluginManifest {
  if (!manifest || typeof manifest !== 'object') return false;

  const m = manifest as Partial<PaniniPluginManifest>;

  return (
    typeof m.id === 'string' && m.id.length > 0 &&
    typeof m.name === 'string' && m.name.length > 0 &&
    typeof m.version === 'string' && /^\d+\.\d+\.\d+/.test(m.version)
  );
}
