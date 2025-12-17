/**
 * Event Bus - Communication système inter-plugins
 * Permet aux plugins de communiquer sans couplage direct
 */

class EventBus {
  constructor() {
    this.listeners = new Map();
    this.debugMode = false;
  }

  /**
   * S'abonner à un événement
   * @param {string} event - Nom de l'événement
   * @param {Function} callback - Fonction appelée lors de l'événement
   * @param {string} pluginId - ID du plugin qui s'abonne
   */
  on(event, callback, pluginId = 'core') {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    this.listeners.get(event).push({
      callback,
      pluginId,
      id: `${pluginId}-${Date.now()}-${Math.random()}`
    });

    if (this.debugMode) {
      console.log(`📡 EventBus: ${pluginId} subscribed to "${event}"`);
    }
  }

  /**
   * Se désabonner d'un événement
   * @param {string} event - Nom de l'événement
   * @param {Function} callback - Fonction à retirer
   */
  off(event, callback) {
    const listeners = this.listeners.get(event);
    if (!listeners) return;

    this.listeners.set(
      event,
      listeners.filter(l => l.callback !== callback)
    );

    if (this.debugMode) {
      console.log(`📡 EventBus: Unsubscribed from "${event}"`);
    }
  }

  /**
   * Émettre un événement
   * @param {string} event - Nom de l'événement
   * @param {*} data - Données de l'événement
   * @param {string} sourcePluginId - ID du plugin émetteur
   */
  emit(event, data, sourcePluginId = 'core') {
    const listeners = this.listeners.get(event);
    if (!listeners || listeners.length === 0) {
      if (this.debugMode) {
        console.log(`📡 EventBus: No listeners for "${event}"`);
      }
      return;
    }

    if (this.debugMode) {
      console.log(`📡 EventBus: ${sourcePluginId} emitted "${event}"`, data);
    }

    // Appeler tous les listeners (sauf source pour éviter boucles)
    listeners.forEach(({ callback, pluginId }) => {
      if (pluginId !== sourcePluginId) {
        try {
          callback(data, sourcePluginId);
        } catch (error) {
          console.error(`❌ EventBus: Error in ${pluginId} handler for "${event}"`, error);
        }
      }
    });
  }

  /**
   * S'abonner une seule fois
   * @param {string} event - Nom de l'événement
   * @param {Function} callback - Fonction appelée
   * @param {string} pluginId - ID du plugin
   */
  once(event, callback, pluginId = 'core') {
    const wrapper = (data, source) => {
      callback(data, source);
      this.off(event, wrapper);
    };
    this.on(event, wrapper, pluginId);
  }

  /**
   * Obtenir le nombre de listeners pour un événement
   * @param {string} event - Nom de l'événement
   * @returns {number}
   */
  listenerCount(event) {
    const listeners = this.listeners.get(event);
    return listeners ? listeners.length : 0;
  }

  /**
   * Obtenir tous les événements enregistrés
   * @returns {string[]}
   */
  getEvents() {
    return Array.from(this.listeners.keys());
  }

  /**
   * Nettoyer tous les listeners d'un plugin
   * @param {string} pluginId - ID du plugin
   */
  removeAllListeners(pluginId) {
    let removed = 0;

    this.listeners.forEach((listeners, event) => {
      const filtered = listeners.filter(l => l.pluginId !== pluginId);
      removed += listeners.length - filtered.length;

      if (filtered.length === 0) {
        this.listeners.delete(event);
      } else {
        this.listeners.set(event, filtered);
      }
    });

    if (this.debugMode) {
      console.log(`📡 EventBus: Removed ${removed} listeners from ${pluginId}`);
    }
  }

  /**
   * Activer/désactiver mode debug
   * @param {boolean} enabled
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }

  /**
   * Obtenir statistiques
   * @returns {Object}
   */
  getStats() {
    const stats = {
      totalEvents: this.listeners.size,
      totalListeners: 0,
      byPlugin: {}
    };

    this.listeners.forEach(listeners => {
      stats.totalListeners += listeners.length;

      listeners.forEach(({ pluginId }) => {
        stats.byPlugin[pluginId] = (stats.byPlugin[pluginId] || 0) + 1;
      });
    });

    return stats;
  }
}

// Événements standards Pensine
export const EVENTS = {
  // Lifecycle
  'app:init': 'Application initialisée',
  'app:ready': 'Application prête',
  'app:error': 'Erreur application',

  // Plugins
  'plugin:registered': 'Plugin enregistré',
  'plugin:enabled': 'Plugin activé',
  'plugin:disabled': 'Plugin désactivé',
  'plugin:error': 'Erreur plugin',

  // Navigation
  'route:change': 'Route changée',
  'route:before': 'Avant changement route',
  'route:after': 'Après changement route',

  // Storage
  'storage:read': 'Lecture storage',
  'storage:write': 'Écriture storage',
  'storage:delete': 'Suppression storage',
  'storage:error': 'Erreur storage',

  // Calendar
  'calendar:day-click': 'Clic sur jour',
  'calendar:event-create': 'Événement créé',
  'calendar:event-update': 'Événement modifié',
  'calendar:event-delete': 'Événement supprimé',
  'calendar:view-change': 'Vue calendrier changée',

  // Inbox
  'inbox:item-captured': 'Item capturé',
  'inbox:item-triaged': 'Item trié',
  'inbox:task-scheduled': 'Tâche planifiée',
  'inbox:task-complete': 'Tâche complétée',

  // Journal
  'journal:entry-open': 'Entrée ouverte',
  'journal:entry-save': 'Entrée sauvegardée',
  'journal:entry-delete': 'Entrée supprimée',
  'journal:tag-added': 'Tag ajouté',

  // Reflection
  'reflection:note-create': 'Note créée',
  'reflection:note-update': 'Note modifiée',
  'reflection:link-create': 'Lien créé',
  'reflection:insight-generated': 'Insight généré',

  // UI
  'ui:modal-open': 'Modal ouverte',
  'ui:modal-close': 'Modal fermée',
  'ui:sidebar-toggle': 'Sidebar togglée',
  'ui:theme-change': 'Thème changé'
};

export default EventBus;
