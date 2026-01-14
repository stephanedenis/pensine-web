/**
 * Storage Adapter - Abstract interface for data persistence
 * Implementations: GitHub, Local Git, IndexedDB, PaniniFS, etc.
 */
export interface StorageAdapter {
  /**
   * Adapter name (e.g., 'github', 'local-git', 'panini-fs')
   */
  readonly name: string;

  /**
   * Initialize the storage adapter
   * @param config - Adapter-specific configuration
   */
  initialize(config: Record<string, any>): Promise<void>;

  /**
   * Check if adapter is configured and ready
   */
  isConfigured(): boolean;

  /**
   * Read a file
   * @param path - File path
   * @returns File content as string
   */
  readFile(path: string): Promise<string>;

  /**
   * Write a file
   * @param path - File path
   * @param content - File content
   * @param message - Optional commit message (for Git-based adapters)
   */
  writeFile(path: string, content: string, message?: string): Promise<void>;

  /**
   * Delete a file
   * @param path - File path
   * @param message - Optional commit message
   */
  deleteFile(path: string, message?: string): Promise<void>;

  /**
   * List files in a directory
   * @param path - Directory path
   * @returns Array of file paths
   */
  listFiles(path: string): Promise<string[]>;

  /**
   * Check if a file exists
   * @param path - File path
   */
  fileExists(path: string): Promise<boolean>;

  /**
   * Get file metadata
   * @param path - File path
   */
  getFileMetadata?(path: string): Promise<FileMetadata>;

  /**
   * Optional: Semantic search (for PaniniFS, etc.)
   * @param query - Search query
   * @returns Search results
   */
  semanticSearch?(query: string): Promise<SearchResult[]>;
}

/**
 * File metadata
 */
export interface FileMetadata {
  path: string;
  size: number;
  createdAt?: Date;
  modifiedAt?: Date;
  author?: string;
  sha?: string; // Git SHA, file hash, etc.
}

/**
 * Search result
 */
export interface SearchResult {
  path: string;
  score: number;
  excerpt?: string;
  metadata?: FileMetadata;
}
