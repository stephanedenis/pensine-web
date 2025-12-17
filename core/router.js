/**
 * Router - Gestion navigation et routes
 * Permet aux plugins de déclarer des routes
 */

import { EVENTS } from './event-bus.js';

class Router {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.routes = new Map();
    this.currentRoute = null;
    this.defaultRoute = '/';

    // Initialiser navigation
    this.initNavigation();
  }

  /**
   * Initialiser la navigation (hash routing)
   */
  initNavigation() {
    // Écouter changements hash
    window.addEventListener('hashchange', () => {
      this.handleRouteChange();
    });

    // Navigation via history API
    window.addEventListener('popstate', () => {
      this.handleRouteChange();
    });

    // Route initiale
    this.handleRouteChange();
  }

  /**
   * Enregistrer une route
   * @param {string} path - Chemin (ex: /calendar, /journal/:date)
   * @param {Object} handler - { plugin, view, component }
   */
  register(path, handler) {
    if (this.routes.has(path)) {
      console.warn(`⚠️ Route "${path}" already registered, overwriting`);
    }

    const pattern = this.pathToRegex(path);

    this.routes.set(path, {
      path,
      pattern,
      paramNames: this.extractParamNames(path),
      handler
    });

    console.log(`🛣️ Route registered: ${path}`);
  }

  /**
   * Convertir path en regex
   * @param {string} path - /calendar/:id/:action
   * @returns {RegExp}
   */
  pathToRegex(path) {
    // Remplacer :param par groupe capture
    const pattern = path.replace(/:\w+/g, '([^/]+)');
    return new RegExp(`^${pattern}$`);
  }

  /**
   * Extraire noms des paramètres
   * @param {string} path
   * @returns {Array}
   */
  extractParamNames(path) {
    const matches = path.match(/:\w+/g);
    return matches ? matches.map(m => m.slice(1)) : [];
  }

  /**
   * Naviguer vers une route
   * @param {string} path
   * @param {Object} state - État additionnel
   */
  navigate(path, state = {}) {
    // Utiliser hash routing pour compatibilité
    window.location.hash = path;
  }

  /**
   * Obtenir path actuel
   * @returns {string}
   */
  getCurrentPath() {
    const hash = window.location.hash.slice(1) || '/';
    return hash;
  }

  /**
   * Gérer changement de route
   */
  async handleRouteChange() {
    const path = this.getCurrentPath();

    console.log(`🛣️ Route change: ${path}`);

    // Émettre événement before
    this.eventBus.emit(EVENTS['route:before'], {
      from: this.currentRoute,
      to: path
    }, 'core');

    // Trouver route correspondante
    const match = this.matchRoute(path);

    if (!match) {
      console.warn(`⚠️ No route matches "${path}", using default`);
      if (path !== this.defaultRoute) {
        this.navigate(this.defaultRoute);
        return;
      }
    }

    // Charger vue
    try {
      if (match) {
        await this.loadView(match);
      }

      this.currentRoute = path;

      // Émettre événement after
      this.eventBus.emit(EVENTS['route:after'], {
        path,
        params: match ? match.params : {},
        route: match ? match.route : null
      }, 'core');

    } catch (error) {
      console.error('❌ Error loading route:', error);
      this.eventBus.emit(EVENTS['app:error'], {
        type: 'route',
        path,
        error
      }, 'core');
    }
  }

  /**
   * Trouver route correspondant au path
   * @param {string} path
   * @returns {Object|null}
   */
  matchRoute(path) {
    for (const route of this.routes.values()) {
      const matches = path.match(route.pattern);

      if (matches) {
        // Extraire paramètres
        const params = {};
        route.paramNames.forEach((name, index) => {
          params[name] = matches[index + 1];
        });

        return {
          route,
          params
        };
      }
    }
    return null;
  }

  /**
   * Charger une vue
   * @param {Object} match - Route match
   */
  async loadView(match) {
    const { route, params } = match;
    const { handler } = route;

    console.log(`📄 Loading view for ${route.path}`, params);

    // Appeler handler
    if (typeof handler === 'function') {
      await handler(params);
    } else if (handler.component) {
      await this.renderComponent(handler.component, params);
    } else if (handler.view) {
      await this.renderView(handler.view, params);
    }
  }

  /**
   * Rendre un composant
   * @param {Function} Component - Classe ou fonction composant
   * @param {Object} params
   */
  async renderComponent(Component, params) {
    const container = document.querySelector('#main-content') || document.body;

    if (typeof Component === 'function') {
      const instance = new Component(params);
      if (instance.render) {
        const content = await instance.render();
        container.innerHTML = '';
        container.appendChild(content);
      }
    }
  }

  /**
   * Rendre une vue (HTML string ou element)
   * @param {string|HTMLElement} view
   * @param {Object} params
   */
  async renderView(view, params) {
    const container = document.querySelector('#main-content') || document.body;

    if (typeof view === 'string') {
      container.innerHTML = view;
    } else if (view instanceof HTMLElement) {
      container.innerHTML = '';
      container.appendChild(view);
    }
  }

  /**
   * Définir route par défaut
   * @param {string} path
   */
  setDefaultRoute(path) {
    this.defaultRoute = path;
  }

  /**
   * Obtenir toutes les routes
   * @returns {Array}
   */
  getAllRoutes() {
    return Array.from(this.routes.values()).map(({ path, handler }) => ({
      path,
      plugin: handler.plugin || 'core'
    }));
  }

  /**
   * Retirer route
   * @param {string} path
   */
  unregister(path) {
    if (this.routes.has(path)) {
      this.routes.delete(path);
      console.log(`🛣️ Route unregistered: ${path}`);
    }
  }

  /**
   * Retirer toutes les routes d'un plugin
   * @param {string} pluginId
   */
  unregisterPlugin(pluginId) {
    const toRemove = [];

    this.routes.forEach((route, path) => {
      if (route.handler.plugin === pluginId) {
        toRemove.push(path);
      }
    });

    toRemove.forEach(path => this.unregister(path));

    if (toRemove.length > 0) {
      console.log(`🛣️ Unregistered ${toRemove.length} routes from ${pluginId}`);
    }
  }
}

export default Router;
