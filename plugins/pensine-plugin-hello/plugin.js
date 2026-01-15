/**
 * Hello World Plugin - Test minimal
 * Démontre la structure de base d'un plugin Pensine
 */

export default class HelloPlugin {
  constructor() {
    // PaniniPlugin interface requires manifest property
    this.manifest = {
      id: 'hello-world',
      name: 'Hello World',
      version: '1.0.0',
      icon: '👋',
      description: 'Simple test plugin demonstrating Pensine plugin architecture'
    };
  }

  /**
   * Activation du plugin (PaniniPlugin interface)
   */
  async activate(context) {
    console.log('🎯 HelloPlugin.activate() called');
    console.log('Context:', context);

    try {
      const { eventBus, storage, config } = context;

      // Injecter un message de bienvenue dans l'app
      const appContainer = document.getElementById('app');
      console.log('App container:', appContainer);

      if (appContainer) {
        const helloDiv = document.createElement('div');
        helloDiv.id = 'hello-plugin';
        helloDiv.style.cssText = `
          padding: 20px;
          margin: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 8px;
          text-align: center;
          font-size: 1.2em;
        `;
        helloDiv.innerHTML = `
          <h2>👋 Hello from Pensine Plugin System!</h2>
          <p>This is a dynamically loaded plugin.</p>
          <p><small>Storage: ${storage?.mode || 'unknown'} | Config: ${config ? 'loaded' : 'none'}</small></p>
        `;
        appContainer.appendChild(helloDiv);
        console.log('✅ Plugin UI injected');
      } else {
        console.warn('⚠️ App container not found');
      }

      // S'abonner à un event
      if (eventBus) {
        eventBus.on('app.ready', () => {
          console.log('📢 Hello plugin received app.ready event');
        });
      }

      console.log('👋 Hello World plugin activated!');
      return true;
    } catch (error) {
      console.error('❌ Error in HelloPlugin.activate():', error);
      throw error;
    }
  }

  /**
   * Désactivation du plugin
   */
  async deactivate() {
    console.log('👋 Hello World plugin deactivated');

    const helloDiv = document.getElementById('hello-plugin');
    if (helloDiv) {
      helloDiv.remove();
    }

    return true;
  }

  /**
   * Configuration du plugin
   */
  getConfigSchema() {
    return {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          title: 'Message',
          description: 'Message de bienvenue personnalisé',
          default: 'Hello World!'
        },
        showIcon: {
          type: 'boolean',
          title: 'Afficher l\'icône',
          default: true
        }
      }
    };
  }
}
