# Pensine Web

Application web pour gérer vos notes et journaux avec GitHub comme backend.

![Version](https://img.shields.io/badge/version-0.0.22-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 🎯 Fonctionnalités

- **📅 Calendrier interactif** : Visualisez et accédez à vos journaux quotidiens
- **✍️ Éditeur riche** : 3 modes de visualisation (Code / Riche / Split)
- **🔄 Synchronisation GitHub** : Vos données sont stockées dans votre propre repo GitHub
- **🔐 Sécurisé** : Configuration locale, aucune donnée envoyée à des serveurs tiers
- **⚙️ Configuration JSON** : Interface graphique pour éditer votre configuration
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
git clone https://github.com/stephanedenis/pensine-web.git
cd pensine-web
\`\`\`

2. **Lancer le serveur local**
\`\`\`bash
python3 -m http.server 8000
\`\`\`

3. **Ouvrir dans le navigateur**
\`\`\`
http://localhost:8000
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

## 🛠️ Développement

### Structure du projet

\`\`\`
pensine-web/
├── index.html          # Page principale
├── app.js              # Application principale
├── config.js           # Configuration par défaut
├── styles/             # Feuilles de style
├── lib/                # Bibliothèques
│   ├── config-wizard.js
│   ├── github-adapter.js
│   └── storage-manager.js
└── TEST_README.md      # Instructions pour les tests
\`\`\`

### Tests

Voir [TEST_README.md](TEST_README.md) pour les instructions de test avec Playwright.

## 🔐 Sécurité

- **Tokens** : Ne jamais commiter de tokens dans le code
- **Configuration locale** : \`.pensine-config.json\` est dans \`.gitignore\`
- **Variables d'environnement** : Pour les tests, utiliser \`.env\` (non versionné)

## 📝 Changelog

### v0.0.22 (2025-12-14)
- 🔐 Sécurité : Suppression des tokens du code source
- ⚙️ Configuration : Editor de configuration avec formulaire dynamique
- 🔄 Live sync : Synchronisation formulaire ↔ code
- �� Documentation : Spécifications techniques complètes

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
