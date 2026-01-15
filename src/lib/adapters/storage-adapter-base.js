/**
 * Base Storage Adapter Interface
 * Interface abstraite pour les différents modes de stockage
 */

class StorageAdapterBase {
  constructor() {
    this.mode = 'base'; // 'oauth', 'pat', 'local'
    this.configured = false;
  }

  /**
   * Configure l'adapter avec les paramètres nécessaires
   * @param {Object} config - Configuration spécifique au mode
   * @returns {Promise<void>}
   */
  async configure(config) {
    throw new Error('configure() must be implemented by subclass');
  }

  /**
   * Vérifie si l'adapter est configuré et prêt
   * @returns {boolean}
   */
  isConfigured() {
    return this.configured;
  }

  /**
   * Lit un fichier
   * @param {string} path - Chemin du fichier
   * @returns {Promise<{content: string, sha: string}|null>}
   */
  async getFile(path) {
    throw new Error('getFile() must be implemented by subclass');
  }

  /**
   * Crée ou met à jour un fichier
   * @param {string} path - Chemin du fichier
   * @param {string} content - Contenu du fichier
   * @param {string} message - Message de commit
   * @param {string} sha - SHA pour update (optionnel)
   * @returns {Promise<{content: string, sha: string}>}
   */
  async putFile(path, content, message, sha = null) {
    throw new Error('putFile() must be implemented by subclass');
  }

  /**
   * Supprime un fichier
   * @param {string} path - Chemin du fichier
   * @param {string} message - Message de commit
   * @param {string} sha - SHA du fichier à supprimer
   * @returns {Promise<void>}
   */
  async deleteFile(path, message, sha) {
    throw new Error('deleteFile() must be implemented by subclass');
  }

  /**
   * Liste les fichiers d'un répertoire
   * @param {string} path - Chemin du répertoire
   * @returns {Promise<Array<{path: string, type: string}>>}
   */
  async listFiles(path) {
    throw new Error('listFiles() must be implemented by subclass');
  }

  /**
   * Vérifie la connexion/disponibilité
   * @returns {Promise<boolean>}
   */
  async checkConnection() {
    throw new Error('checkConnection() must be implemented by subclass');
  }

  /**
   * Récupère les informations du mode
   * @returns {Object} - Infos sur le mode (label, icon, description)
   */
  getModeInfo() {
    return {
      mode: this.mode,
      label: 'Base',
      icon: '?',
      description: 'Storage adapter de base',
      features: {
        sync: false,
        backup: false,
        collaboration: false,
        offline: true
      }
    };
  }
}

// Export for ES6 modules
export default StorageAdapterBase;

// Export pour utilisation dans autres modules
if (typeof window !== 'undefined') {
  window.StorageAdapterBase = StorageAdapterBase;
}
