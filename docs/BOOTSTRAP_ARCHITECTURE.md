# Architecture Bootstrap - Pensine v0.1.0

## 🎯 Objectif

Architecture micro-kernel où l'application de base est minimale et toutes les fonctionnalités sont des plugins optionnels.

## 📁 Structure

```
pensine-web/
├── index-minimal.html          # Point d'entrée minimal
├── src/
│   └── bootstrap.js            # Loader de démarrage
├── bootstrap.example.json      # Config locale exemple
├── bootstrap.schema.json       # Schéma validation
├── .pensine-config.example.json # Config remote exemple
└── plugins/
    ├── pensine-plugin-editor/   # Plugin éditeur (requis)
    ├── pensine-plugin-calendar/ # Plugin calendrier (optionnel)
    ├── pensine-plugin-history/  # Plugin historique (optionnel)
    └── ...
```

## 🔄 Flux de démarrage

```
1. index-minimal.html charge
   ↓
2. bootstrap.js s'exécute
   ↓
3. Vérifie localStorage['pensine-bootstrap']
   ├─ Absent/invalide → Afficher wizard
   └─ Présent/valide  → Continuer
   ↓
4. Initialise storage adapter (GitHub/local-git/local)
   ↓
5. Charge .pensine-config.json depuis storage
   ↓
6. Initialise plugin system
   ↓
7. Charge et active plugins configurés
   ↓
8. Émet événement 'app:ready'
```

## 📝 Configuration en cascade

### Niveau 1 : Bootstrap local (localStorage)

**Fichier** : `localStorage['pensine-bootstrap']`
**Contenu** :

```json
{
  "version": "1.0.0",
  "storageMode": "github",
  "credentials": {
    "owner": "username",
    "repo": "pensine-data",
    "token": "ghp_..."
  }
}
```

**Rôle** : Détermine comment se connecter au storage

### Niveau 2 : Configuration remote (storage)

**Fichier** : `.pensine-config.json` (racine du repo)
**Contenu** :

```json
{
  "version": "1.0.0",
  "settings": { "theme": "auto", ... },
  "plugins": {
    "editor": { "enabled": true, "config": {...} },
    "calendar": { "enabled": true, "config": {...} }
  }
}
```

**Rôle** : Détermine quels plugins charger et leurs settings

### Niveau 3 : Registry (futur)

**Source** : npm registry ou CDN custom
**Rôle** : Découverte de plugins compatibles

## 🔌 Plugins

### Plugins core (requis)

- **editor** - Éditeur markdown/code
- **storage** - Gestion storage (GitHub/local-git/local)

### Plugins optionnels

- **calendar** - Vue calendrier linéaire
- **history** - Historique et versions
- **inbox** - Capture et tâches
- **journal** - Entrées journalières
- **reflection** - Notes permanentes et backlinks

### Format plugin

Chaque plugin doit exposer :

```javascript
export default class MyPlugin {
  constructor(context) {
    this.context = context; // { storage, events, config }
  }

  async enable() {
    // Activer plugin
  }

  async disable() {
    // Désactiver plugin
  }

  static getConfigSchema() {
    // JSON Schema pour config
  }
}
```

## 🚀 Utilisation

### Première visite

1. Ouvrir `index-minimal.html`
2. Wizard s'affiche (pas de config locale)
3. Configurer storage mode
4. Config sauvegardée dans localStorage
5. App recharge et s'initialise

### Visites suivantes

1. Ouvrir `index-minimal.html`
2. Bootstrap charge config locale
3. Connecte au storage
4. Charge config remote
5. Active plugins configurés
6. App prête à l'emploi

## 🧪 Test local

```bash
# Lancer serveur
python3 -m http.server 8000

# Ouvrir navigateur
firefox http://localhost:8000/index-minimal.html

# Effacer config locale pour tester wizard
localStorage.removeItem('pensine-bootstrap')
```

## 📋 TODO

- [ ] Migrer éditeur actuel vers plugin
- [ ] Migrer historique vers plugin
- [ ] Implémenter plugin registry (npm)
- [ ] Ajouter versioning et compatibility check
- [ ] Hot reload plugins (dev mode)
- [ ] Plugin marketplace UI

## 🔐 Sécurité

- ⚠️ **JAMAIS** commiter `bootstrap.json` avec credentials
- ✅ Utiliser `.gitignore` pour exclure configs locales
- ✅ Token GitHub stocké chiffré dans localStorage
- ✅ Validation schéma JSON avant utilisation

---

**Version** : 0.1.0
**Date** : 2026-01-15
