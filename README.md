# Pensine Web

> Le 3e hémisphère du cerveau — gestion de notes, journaux et données personnelles avec GitHub comme backend souverain.

![Version](https://img.shields.io/badge/version-0.1.0--alpha-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Architecture](https://img.shields.io/badge/architecture-plugin--first-purple.svg)

## 🎯 Fonctionnalités

- **📅 Calendrier interactif** : Journaux quotidiens avec support multi-repo et marqueurs colorés
- **✍️ Éditeur riche** : 3 modes de visualisation (Code / Riche / Split)
- **🔌 Architecture plugin** : Modules activables/désactivables (journal, calendrier, inbox, reflection…)
- **🔄 Synchronisation GitHub** : Vos données sont stockées dans votre propre repo GitHub
- **🔐 Sécurisé** : Configuration locale, aucune donnée envoyée à des serveurs tiers
- **⚙️ Configuration JSON** : Interface graphique avec validation de schéma JSON
- **🌐 Multi-plateforme** : Fonctionne dans n'importe quel navigateur moderne

## 🚀 Démarrage rapide

### Prérequis

- Un compte GitHub
- Un token d'accès personnel GitHub (avec scope \`repo\`)
- Un navigateur moderne (Chrome, Firefox, Edge, Safari)
- Python 3 (pour le serveur local) ou n'importe quel serveur HTTP

### Installation

1. **Cloner le repository**
\`\`\`bash
git clone <https://github.com/stephanedenis/pensine-web.git>
cd pensine-web
\`\`\`

2. **Lancer le serveur local**
\`\`\`bash
python3 -m http.server 8000
\`\`\`

3. **Ouvrir dans le navigateur**
\`\`\`
<http://localhost:8000>
\`\`\`

4. **Configuration au premier lancement**

L'assistant de configuration vous guidera pour :

- Entrer votre token GitHub
- Spécifier votre repository (ex: \`votre-username/Pensine\`)
- Configurer la branche (par défaut: \`master\`)

## 📖 Documentation

### Structure recommandée du repository

Votre repository GitHub devrait contenir :

\`\`\`
journals/
  2025_01_15.md
  2025_01_16.md
  ...
pages/
  notes.md
  projets.md
  ...
.pensine-config.json  (optionnel, configuration locale)
\`\`\`

### Configuration

La configuration est stockée localement dans le navigateur (localStorage). Vous pouvez aussi créer un fichier \`.pensine-config.json\` dans votre repo :

\`\`\`json
{
  "owner": "votre-username",
  "repo": "votre-repo",
  "branch": "master",
  "autoSync": false
}
\`\`\`

⚠️ **IMPORTANT** : Ne commitez JAMAIS votre token GitHub dans le code source. Le token doit être fourni via l'assistant de configuration.

### Obtenir un token GitHub

1. Allez sur [GitHub Settings > Tokens](https://github.com/settings/tokens)
2. "Generate new token (classic)"
3. Donnez un nom : "Pensine Web App"
4. Cochez le scope : \`repo\` (Full control of private repositories)
5. Générez et copiez le token

## 🏗️ Architecture

Pensine Web est construit sur une architecture **plugin-first** :

```
EventBus ──► PluginSystem ──► Plugins
                │
            ConfigManager
                │
         StorageAdapter (localStorage / GitHub API)
```

| Composant | Fichier | Rôle |
|---|---|---|
| `EventBus` | `src/core/event-bus.js` | Communication découplée entre composants |
| `PluginSystem` | `src/core/plugin-system.js` | Chargement, activation, cycle de vie des plugins |
| `ConfigManager` | `src/core/config-manager.js` | Config unifiée avec validation JSON Schema |
| `StorageAdapter` | `src/core/storage-adapter-base.js` | Abstraction localStorage / GitHub API |

Chaque plugin implémente `PluginInterface` :
```javascript
{
  manifest: { id, name, version },
  async activate(context),   // context = { eventBus, configManager, storage, user }
  async deactivate()
}
```

## 🛠️ Développement

### Structure du projet

```
pensine-web/
├── index.html              # Point d'entrée
├── app.js                  # Orchestration principale
├── config/
│   ├── config.js           # Configuration par défaut
│   └── oauth-callback.html # Callback OAuth GitHub
├── src/
│   ├── core/               # EventBus, PluginSystem, ConfigManager
│   └── lib/                # Composants UI, adapters, utilitaires
├── plugins/                # Plugins officiels
│   ├── pensine-plugin-journal/
│   ├── pensine-plugin-calendar/
│   ├── pensine-plugin-inbox/
│   ├── pensine-plugin-reflection/
│   └── ...
├── packages/
│   └── plugin-interface/   # Interface partagée (npm package)
├── styles/                 # CSS global
├── workers/                # Web Workers
└── tests/                  # Tests Playwright
```

### Tests

```bash
# Validation syntaxe (toujours avant commit)
node -c app.js

# Tests Playwright (nécessite token GitHub)
export GITHUB_TEST_TOKEN="votre_token"
npx playwright test
```

Voir [docs/TESTING_CHECKLIST.md](docs/TESTING_CHECKLIST.md) pour la checklist complète.

## 🔐 Sécurité

- **Tokens** : Ne jamais commiter de tokens dans le code
- **Configuration locale** : \`.pensine-config.json\` est dans \`.gitignore\`
- **Variables d'environnement** : Pour les tests, utiliser \`.env\` (non versionné)

## �️ Roadmap

Suivi via [GitHub Issues](https://github.com/stephanedenis/pensine-web/issues).

### 🔴 Priorité haute (bugs/blocants)
- [#2](https://github.com/stephanedenis/pensine-web/issues/2) Fix: Tests Playwright échouants (5 tests bloqués)
- [#3](https://github.com/stephanedenis/pensine-web/issues/3) Fix: Supprimer duplication ConfigManager
- [#4](https://github.com/stephanedenis/pensine-web/issues/4) Fix: Implémenter UI notifications (toasts & modals)

### ✨ Améliorations en cours
- [#5](https://github.com/stephanedenis/pensine-web/issues/5) Plugin Journal: Migrer vers PluginSystem
- [#7](https://github.com/stephanedenis/pensine-web/issues/7) Plugin Calendar: Stabiliser support multi-repo

### 🔭 Long terme
- [#6](https://github.com/stephanedenis/pensine-web/issues/6) Auth: Implémenter OAuth GitHub
- [#8](https://github.com/stephanedenis/pensine-web/issues/8) Migrer tous les plugins vers PluginInterface v1.0

## 📝 Changelog

### v0.1.0-alpha (2026-Q1)

- 🔌 Architecture : Migration vers EventBus + PluginSystem + ConfigManager
- 📅 Calendar : Support multi-repo avec marqueurs colorés par repo
- ✨ Wizard : Filtres de repos + correction boucle infinie
- 🔐 Auth : Infrastructure OAuth GitHub (callback page)
- ⚙️ Config : Validation JSON Schema sur les formulaires
- 🐛 Fix : Race condition init storage + chargement événements calendrier
- 📦 Plugins : 7 plugins (journal, calendar, inbox, reflection, word-counter, hello, accelerator)

### v0.0.22 (2025-12-14)

- 🔐 Sécurité : Suppression des tokens du code source
- ⚙️ Configuration : Éditeur de configuration avec formulaire dynamique
- 🔄 Live sync : Synchronisation formulaire ↔ code
- 📚 Documentation : Spécifications techniques complètes

### v0.0.21 (2025-12-13)

- 🎨 UI : Correction layout header éditeur
- 🐛 Fix : Suppression event listeners modal

### v0.0.20 (2025-12-13)

- ✨ Nouveau : Suppression modal + Onglets éditeur
- 🔧 Configuration : Wizard multi-plateformes

## 📄 License

MIT License - voir [LICENSE](LICENSE) pour plus de détails

## 🤝 Contribution

Les contributions sont les bienvenues ! Veuillez :

1. Fork le projet
2. Créer une branche (\`git checkout -b feature/AmazingFeature\`)
3. Commit vos changements (\`git commit -m 'Add some AmazingFeature'\`)
4. Push vers la branche (\`git push origin feature/AmazingFeature\`)
5. Ouvrir une Pull Request

## 📧 Contact

Stéphane Denis - [@stephanedenis](https://github.com/stephanedenis)

Lien du projet : [https://github.com/stephanedenis/pensine-web](https://github.com/stephanedenis/pensine-web)
