# Dépendances du Projet - Pensine Web

**Version** : 0.0.22
**Dernière mise à jour** : 14 janvier 2026

---

## 📋 Vue d'ensemble

Ce document décrit l'ordre de chargement des scripts, les dépendances entre modules, et comment résoudre les problèmes courants.

---

## 🔄 Ordre de Chargement Recommandé

### 1. **Polyfills & External Libraries**

```html
<!-- MarkdownIt + Extensions -->
<script src="https://cdn.jsdelivr.net/npm/markdown-it@14.0.0/dist/markdown-it.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/markdown-it-anchor@9.0.1/dist/markdownItAnchor.umd.min.js"></script>

<!-- Highlight.js for code syntax -->
<script src="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/es/highlight.min.js"></script>

<!-- Buffer polyfill (required for isomorphic-git) -->
<script src="https://cdn.jsdelivr.net/npm/buffer@6.0.3/index.min.js"></script>

<!-- isomorphic-git + LightningFS for Local Git mode -->
<script src="https://unpkg.com/@isomorphic-git/lightning-fs"></script>
<script src="https://unpkg.com/isomorphic-git"></script>
```

**Raison** : Ces librairies doivent être disponibles globalement avant tout code applicatif.

---

### 2. **Configuration**

```html
<script src="config.js"></script>
```

**Contenu** : Configuration par défaut (vide de credentials).

---

### 3. **Sécurité**

```html
<script src="lib/token-storage.js"></script>
```

**Fonctionnalité** : Chiffrement WebCrypto pour tokens GitHub.

---

### 4. **Storage Adapters**

```html
<script src="lib/storage-adapter-base.js"></script>
<script src="lib/local-storage-adapter.js"></script>
<script src="lib/local-git-adapter.js"></script>
<script src="lib/github-storage-adapter.js"></script>
<script src="lib/storage-manager-unified.js"></script>
```

**Ordre important** : Base → Adapters → Manager

---

### 5. **OAuth & GitHub**

```html
<script src="lib/github-oauth.js"></script>
<script src="lib/github-adapter.js"></script>
```

**Note** : github-adapter.js est legacy, conservé pour rétrocompatibilité.

---

### 6. **Components**

```html
<script src="lib/components/base/configurable-component.js"></script>
<script src="lib/components/linear-calendar/linear-calendar.js"></script>
```

**Dépendance** : configurable-component.js doit charger en premier.

---

### 7. **Core Libs**

```html
<script src="lib/config-wizard.js"></script>
<script src="lib/markdown-renderer.js"></script>
<script src="lib/markdown-parser.js"></script>
<script src="lib/storage.js"></script>
<script src="lib/editor.js"></script>
```

**Raison** : Fonctions utilitaires utilisées par app.js.

---

### 8. **Modern Config System (ES6 Modules)** ⚠️ CRITIQUE

```html
<!-- MUST load BEFORE app.js -->
<script type="module" src="core/event-bus.js"></script>
<script type="module" src="core/router.js"></script>
<script type="module" src="core/plugin-system.js"></script>
<script type="module" src="core/config-manager.js"></script>
<script type="module" src="lib/json-schema-form-builder.js"></script>
<script type="module" src="views/settings-view.js"></script>
<script type="module" src="lib/settings-integration.js"></script>
```

**⚠️ IMPORTANT** : Ces modules ES6 doivent charger **AVANT** `app.js`.

**Pourquoi** :

- app.js appelle `initializeModernConfig()` dans `init()`
- Cette fonction vient de `lib/settings-integration.js` (module ES6)
- Si app.js charge en premier, `initializeModernConfig` est `undefined`

**Fixé** : 14 janvier 2026 (voir commit [hash])

---

### 9. **Main Application**

```html
<script src="app.js"></script>
```

**Dernier script** : app.js orchestre tout, donc charge en dernier.

---

## 📊 Graphique de Dépendances

### Structure Hiérarchique

```
app.js (PensineApp)
├── LegacyConfigManager (dans app.js)
│   ├── githubAdapter
│   └── localStorage
│
├── Modern Config System (via settings-integration.js)
│   ├── core/config-manager.js
│   │   ├── core/event-bus.js
│   │   └── storage-manager.js
│   ├── core/plugin-system.js
│   │   ├── core/event-bus.js
│   │   └── core/router.js
│   └── views/settings-view.js
│       └── lib/json-schema-form-builder.js
│
├── editor.js (UnifiedEditor)
│   ├── markdown-parser.js
│   ├── markdown-renderer.js
│   └── storage.js
│
├── config-wizard.js (ConfigWizard)
│   ├── storage-manager-unified.js
│   └── github-oauth.js
│
└── plugins (via plugin-system.js)
    ├── pensine-plugin-calendar
    ├── pensine-plugin-inbox
    ├── pensine-plugin-journal
    └── pensine-plugin-reflection
```

### Dépendances Circulaires ? NON ✅

Les modules sont bien isolés, pas de cycles détectés.

---

## 🔀 Modules vs Scripts Classiques

### Modules ES6 (`<script type="module">`)

**Fichiers** :

- `core/event-bus.js`
- `core/router.js`
- `core/plugin-system.js`
- `core/config-manager.js`
- `lib/json-schema-form-builder.js`
- `views/settings-view.js`
- `lib/settings-integration.js`
- Tous les `*-plugin.js`

**Caractéristiques** :

- Export/import natif
- Isolation de scope (pas de pollution globale)
- Chargement asynchrone
- Nécessite serveur HTTP (pas `file://`)

**Accès** :

```javascript
// Export
export default class MyClass { ... }

// Import (dans un autre module)
import MyClass from './my-class.js';

// Exposition globale (pour compatibilité)
window.MyClass = MyClass;
```

### Scripts Classiques (`<script src="...">`)

**Fichiers** :

- `app.js`
- `config.js`
- Tous les `lib/*.js` (sauf ceux dans core/ et views/)

**Caractéristiques** :

- Variables globales automatiques
- Chargement synchrone et séquentiel
- Ordre de `<script>` dans HTML crucial

**Accès** :

```javascript
// Déclaration globale
class MyClass { ... }
const myInstance = new MyClass();

// Utilisable partout après
console.log(myInstance);
```

---

## 🛠️ Résolution de Problèmes

### Erreur : "X is not defined"

**Cause possible** :

1. Script qui utilise X chargé avant script qui définit X
2. Module ES6 pas encore chargé
3. Faute de frappe dans le nom

**Solution** :

```bash
# 1. Vérifier ordre dans index.html
grep -n "<script" index.html

# 2. Vérifier console DevTools (F12)
# Regarder quelle ligne déclenche l'erreur

# 3. Chercher la définition
grep -r "class X\|function X\|const X" lib/ core/ views/
```

### Erreur : "Cannot read property 'X' of undefined"

**Cause** : Objet pas encore initialisé.

**Exemple** :

```javascript
// ❌ MAUVAIS
this.modernConfigManager.get('key'); // Si init() pas encore appelé

// ✅ BON
if (this.modernConfigManager) {
    this.modernConfigManager.get('key');
}
```

### Erreur : "Module not found"

**Cause** : Chemin d'import incorrect dans module ES6.

**Solution** :

```javascript
// ❌ MAUVAIS
import MyClass from 'my-class.js'; // Chemin relatif manquant

// ✅ BON
import MyClass from '../core/my-class.js'; // Toujours relatif
```

### App bloquée sur "Chargement..."

**Causes possibles** :

1. Erreur JavaScript non catchée
2. Promesse non résolue
3. Boucle infinie

**Debug** :

```javascript
// Ajouter logs dans app.js init()
async init() {
    console.log('1. Init start');

    try {
        console.log('2. Before storage init');
        await this.initializeStorage();

        console.log('3. Before modern config');
        await this.initModernConfig();

        console.log('4. Init complete');
    } catch (error) {
        console.error('Init failed at:', error);
    }
}
```

---

## 🔐 Dépendances de Sécurité

### Token Storage

**Fichier** : `lib/token-storage.js`

**Dépendances** :

- WebCrypto API (natif navigateur)
- localStorage

**Support navigateur** :

- ✅ Chrome 60+
- ✅ Firefox 57+
- ✅ Safari 11+
- ❌ IE11 (pas de WebCrypto)

**Fallback** : Si WebCrypto indisponible, token stocké en clair (⚠️ risque).

---

## 📦 Dépendances CDN

### MarkdownIt

**Version** : 14.0.0
**URL** : `https://cdn.jsdelivr.net/npm/markdown-it@14.0.0/dist/markdown-it.min.js`
**Offline** : ❌ Nécessite connexion internet

### Highlight.js

**Version** : 11.9.0
**URL** : `https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/es/highlight.min.js`
**Offline** : ❌ Nécessite connexion internet

### Isomorphic-git

**Version** : Latest (unpinned)
**URL** : `https://unpkg.com/isomorphic-git`
**Offline** : ❌ Nécessite connexion internet
**Risque** : Version non pinée, peut changer

**Recommandation** : Pinner la version

```html
<!-- ❌ Actuel (version flottante) -->
<script src="https://unpkg.com/isomorphic-git"></script>

<!-- ✅ Recommandé (version fixe) -->
<script src="https://unpkg.com/isomorphic-git@1.25.0"></script>
```

---

## 🚀 Optimisations Futures

### 1. Bundling (optionnel)

**Avantages** :

- Réduction requêtes HTTP
- Minification automatique
- Tree-shaking

**Inconvénient** :

- Perd simplicité "zero-build"

### 2. Service Worker (offline)

**Permettrait** :

- Cache CDN assets
- Fonctionnement offline
- Progressive Web App (PWA)

### 3. Dynamic imports

**Actuellement** : Tous les modules chargent au démarrage.

**Amélioration** :

```javascript
// Charger plugin seulement quand nécessaire
const plugin = await import(`./plugins/${pluginId}/${pluginId}-plugin.js`);
```

---

## 📚 Références

### Documentation interne

- [SPECIFICATIONS_TECHNIQUES.md](SPECIFICATIONS_TECHNIQUES.md) - Architecture
- [CONFIG_SYSTEM.md](CONFIG_SYSTEM.md) - Système de configuration
- [AUDIT_COHESION.md](AUDIT_COHESION.md) - Analyse de cohérence

### Standards web

- [ES6 Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [Script type="module"](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type)
- [WebCrypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)

---

## ✅ Checklist de Validation

Après modification de l'ordre de scripts :

- [ ] `node -c app.js` (syntaxe valide)
- [ ] Ouvrir DevTools Console (F12)
- [ ] Aucune erreur "X is not defined"
- [ ] App se charge (pas de spinner infini)
- [ ] Settings s'ouvre (bouton ⚙️)
- [ ] ConfigManager initialisé (`window.modernConfigManager` existe)
- [ ] Plugins chargés (`window.pluginSystem.getRegisteredPlugins()`)

---

**Auteur** : GitHub Copilot
**Validé par** : Stéphane Denis
**Version** : 1.0
