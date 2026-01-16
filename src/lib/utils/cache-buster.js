/**
 * Cache Buster Utility
 * Détecte et corrige les problèmes de cache navigateur
 */

class CacheBuster {
  constructor() {
    this.APP_VERSION = '2026.01.16.001'; // Increment après chaque correction critique
    this.VERSION_KEY = 'pensine-app-version';
    this.LAST_ERROR_KEY = 'pensine-last-error';
  }

  /**
   * Vérifie si l'app doit être nettoyée (changement de version)
   */
  shouldClearCache() {
    const storedVersion = localStorage.getItem(this.VERSION_KEY);
    return storedVersion !== this.APP_VERSION;
  }

  /**
   * Détecte si une erreur critique nécessite un nettoyage
   */
  isCriticalError(error) {
    const errorMessage = error?.message || String(error);
    
    const criticalPatterns = [
      'StorageAdapterBase is not defined',
      'StorageAdapterBase is not a constructor',
      'Cannot read properties of undefined',
      'module not found',
      'Failed to fetch dynamically imported module'
    ];

    return criticalPatterns.some(pattern => 
      errorMessage.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * Enregistre l'erreur pour diagnostic
   */
  logError(error) {
    const errorLog = {
      message: error?.message || String(error),
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    try {
      localStorage.setItem(this.LAST_ERROR_KEY, JSON.stringify(errorLog));
    } catch (e) {
      console.warn('Could not log error to localStorage:', e);
    }
  }

  /**
   * Nettoie tous les caches
   */
  async clearAllCaches() {
    console.warn('🧹 Clearing all caches due to critical error...');

    try {
      // 1. Clear localStorage (sauf config critique)
      const toPreserve = [
        'pensine-encrypted-token',
        'pensine-config',
        'pensine-bootstrap'
      ];

      const preserved = {};
      toPreserve.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) preserved[key] = value;
      });

      localStorage.clear();

      // Restore preserved items
      Object.entries(preserved).forEach(([key, value]) => {
        localStorage.setItem(key, value);
      });

      // 2. Clear sessionStorage
      sessionStorage.clear();

      // 3. Clear Cache API (Service Worker caches)
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('✅ Cache API cleared');
      }

      // 4. Unregister service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map(registration => registration.unregister())
        );
        if (registrations.length > 0) {
          console.log('✅ Service Workers unregistered');
        }
      }

      // 5. Mark version as current
      localStorage.setItem(this.VERSION_KEY, this.APP_VERSION);

      console.log('✅ All caches cleared successfully');
      return true;

    } catch (error) {
      console.error('❌ Error clearing caches:', error);
      return false;
    }
  }

  /**
   * Affiche un message à l'utilisateur et recharge
   */
  showReloadMessage(error) {
    const message = `
      ⚠️ DÉTECTION DE CACHE OBSOLÈTE
      
      Erreur détectée: ${error?.message || 'Erreur critique'}
      
      L'application va nettoyer les caches et recharger.
      Cliquez sur OK pour continuer.
    `;

    if (confirm(message)) {
      return true;
    }
    return false;
  }

  /**
   * Gestion automatique des erreurs critiques
   */
  async handleCriticalError(error) {
    console.error('🚨 Critical error detected:', error);
    
    this.logError(error);

    if (this.isCriticalError(error)) {
      // Afficher notification
      const shouldReload = this.showReloadMessage(error);
      
      if (shouldReload) {
        await this.clearAllCaches();
        
        // Force reload with cache bypass
        window.location.reload(true);
      }
    }
  }

  /**
   * Vérification au démarrage
   */
  async checkOnStartup() {
    if (this.shouldClearCache()) {
      console.warn('⚠️ App version changed, clearing cache...');
      await this.clearAllCaches();
    }
  }

  /**
   * Ajoute un timestamp aux imports pour forcer refresh
   */
  versionedImport(path) {
    const separator = path.includes('?') ? '&' : '?';
    return `${path}${separator}v=${this.APP_VERSION}`;
  }
}

// Instance globale
window.cacheBuster = new CacheBuster();

// Export pour modules ES6
export default CacheBuster;
