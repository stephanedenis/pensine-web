/**
 * Exemple de plugin Panini utilisant @panini/plugin-interface
 *
 * Ce plugin peut fonctionner dans Pensine, OntoWave ou PaniniFS
 * sans modification du code.
 */

import {
  PaniniPlugin,
  PaniniPluginContext,
  PaniniPluginManifest,
  PluginState
} from '../src/index';

/**
 * Plugin Example: Word Counter
 *
 * Compte les mots dans les documents Markdown et affiche
 * des statistiques en temps réel.
 */
export default class WordCounterPlugin implements PaniniPlugin {
  // État du plugin
  private state: PluginState = PluginState.UNLOADED;
  private context?: PaniniPluginContext;
  private wordCount = 0;
  private charCount = 0;

  // Manifest du plugin
  manifest: PaniniPluginManifest = {
    id: 'word-counter',
    name: 'Word Counter',
    version: '1.0.0',
    description: 'Count words and characters in Markdown documents',
    author: 'Panini Team',
    tags: ['markdown', 'stats', 'productivity'],
    dependencies: []
  };

  /**
   * Activation du plugin
   *
   * Le contexte fourni contient tout ce dont le plugin a besoin:
   * - events: Pour écouter les événements
   * - config: Pour lire la configuration
   * - storage: Pour lire/écrire des fichiers
   * - logger: Pour les logs
   */
  async activate(context: PaniniPluginContext): Promise<void> {
    this.context = context;
    this.state = PluginState.ACTIVE;

    context.logger.info(`[${this.manifest.id}] Activating on ${context.app}...`);

    // 1. Enregistrer le schéma de configuration JSON Schema
    context.config.registerSchema(
      this.manifest.id,
      {
        type: 'object',
        properties: {
          enabled: {
            type: 'boolean',
            description: 'Enable word counting'
          },
          showCharCount: {
            type: 'boolean',
            description: 'Show character count alongside word count'
          },
          updateInterval: {
            type: 'number',
            description: 'Update interval in milliseconds',
            minimum: 100,
            maximum: 5000
          }
        },
        required: ['enabled']
      },
      {
        // Valeurs par défaut
        enabled: true,
        showCharCount: true,
        updateInterval: 500
      }
    );

    // 2. Récupérer la config du plugin
    const config = context.config.getPluginConfig(this.manifest.id);
    context.logger.info(`[${this.manifest.id}] Config:`, config);

    // 3. S'abonner aux événements pertinents
    if (config.enabled) {
      // Écouter l'ouverture de fichiers
      context.events.on(
        'file:opened',
        async (data: { path: string }) => {
          await this.onFileOpened(data.path);
        },
        this.manifest.id // Namespace pour cleanup automatique
      );

      // Écouter les changements de contenu
      context.events.on(
        'markdown:render',
        async (data: { content: string }) => {
          this.updateCounts(data.content);
        },
        this.manifest.id
      );

      // Écouter les changements de config
      context.events.on(
        'config:changed',
        async (data: { pluginId: string; config: any }) => {
          if (data.pluginId === this.manifest.id) {
            await this.onConfigChanged(data.config);
          }
        },
        this.manifest.id
      );
    }

    context.logger.info(`[${this.manifest.id}] Activated successfully!`);
  }

  /**
   * Désactivation du plugin
   *
   * Cleanup automatique: tous les event listeners avec le namespace
   * du plugin seront retirés automatiquement.
   */
  async deactivate(): Promise<void> {
    if (!this.context) return;

    this.context.logger.info(`[${this.manifest.id}] Deactivating...`);

    // Nettoyer les listeners (fait automatiquement via namespace)
    this.context.events.clearNamespace(this.manifest.id);

    // Reset state
    this.wordCount = 0;
    this.charCount = 0;
    this.state = PluginState.UNLOADED;
    this.context = undefined;

    console.info(`[${this.manifest.id}] Deactivated.`);
  }

  /**
   * Callback optionnel: changement de configuration
   */
  async onConfigChange(newConfig: Record<string, any>): Promise<void> {
    if (!this.context) return;

    this.context.logger.info(`[${this.manifest.id}] Config changed:`, newConfig);

    if (newConfig.enabled === false) {
      // Désactiver le comptage
      this.wordCount = 0;
      this.charCount = 0;
    }
  }

  /**
   * Health check optionnel
   */
  async healthCheck(): Promise<boolean> {
    // Vérifier que le plugin fonctionne correctement
    return this.state === PluginState.ACTIVE && this.context !== undefined;
  }

  // ========== Logique métier du plugin ==========

  /**
   * Appelé quand un fichier est ouvert
   */
  private async onFileOpened(path: string): Promise<void> {
    if (!this.context) return;

    try {
      // Lire le contenu du fichier via StorageAdapter
      const content = await this.context.storage.readFile(path);

      // Mettre à jour les compteurs
      this.updateCounts(content);

      // Émettre un événement custom
      this.context.events.emit(`${this.manifest.id}:updated`, {
        path,
        wordCount: this.wordCount,
        charCount: this.charCount
      });
    } catch (error) {
      this.context.logger.error(`[${this.manifest.id}] Error reading file:`, error);
    }
  }

  /**
   * Met à jour les compteurs de mots et caractères
   */
  private updateCounts(content: string): void {
    if (!this.context) return;

    const config = this.context.config.getPluginConfig(this.manifest.id);

    // Compter les mots (simpliste, mais suffisant pour l'exemple)
    const words = content.trim().split(/\s+/).filter(w => w.length > 0);
    this.wordCount = words.length;

    // Compter les caractères si activé
    if (config.showCharCount) {
      this.charCount = content.length;
    }

    // Log si en mode dev
    if (this.context.features.hotReload) {
      this.context.logger.info(
        `[${this.manifest.id}] Words: ${this.wordCount}, Chars: ${this.charCount}`
      );
    }
  }

  /**
   * Appelé quand la config change
   */
  private async onConfigChanged(newConfig: Record<string, any>): Promise<void> {
    await this.onConfigChange(newConfig);
  }

  // ========== API publique (optionnelle) ==========

  /**
   * Retourne les statistiques actuelles
   *
   * Peut être appelé par d'autres plugins ou l'app hôte
   */
  public getStats(): { words: number; chars: number } {
    return {
      words: this.wordCount,
      chars: this.charCount
    };
  }
}

// ========== Utilisation ==========

/*
// Dans Pensine (pensine-web/app.js)

import WordCounterPlugin from '@panini/plugin-word-counter';

const context = {
  app: 'pensine',
  version: '1.0.0',
  events: window.eventBus,
  config: window.modernConfigManager,
  storage: storageManager,
  features: {
    markdown: true,
    hotReload: false,
    semanticSearch: false,
    offline: true
  },
  logger: console
};

const plugin = new WordCounterPlugin();
await plugin.activate(context);

// Plus tard...
const stats = plugin.getStats();
console.log(`Document: ${stats.words} words, ${stats.chars} chars`);

// Cleanup
await plugin.deactivate();


// Dans OntoWave (Panini-OntoWave/src/plugin-manager.ts)

const context = {
  app: 'ontowave',
  version: '2.0.0',
  events: this.eventBus,
  config: this.configManager,
  storage: this.storageAdapter,
  features: {
    markdown: true,
    hotReload: true,
    semanticSearch: false,
    offline: false
  },
  logger: this.logger
};

const plugin = new WordCounterPlugin();
await plugin.activate(context);
*/
