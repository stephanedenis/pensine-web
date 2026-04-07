# Plan d'Action - Suite de l'Audit

## Pensine Web - Corrections Prioritaires

**Créé** : 14 janvier 2026
**Base** : Audit AUDIT_COHESION.md
**Durée estimée** : 4-6 heures réparties

---

## 🔴 PHASE 1 - CRITIQUE (1-2 heures)

### Task 1.1 : Fixer l'ordre de chargement JavaScript

**Impact** : Élevé - Initialisation instable
**Effort** : 30 min
**Risque** : Medium (tests nécessaires)

**Actions** :

1. [ ] Ouvrir `index.html`
2. [ ] Déplacer les scripts ES6 AVANT `<script src="app.js"></script>`
3. [ ] Ou : Convertir app.js en `<script type="module">`
4. [ ] Tester : Ouvrir DevTools, vérifier pas d'erreur "undefined"
5. [ ] Valider : ConfigManager et SettingsView s'initialisent

**Fichier** : `index.html`

**Option A** (minimal) :

```html
<!-- Avant app.js -->
<script type="module" src="core/event-bus.js"></script>
<script type="module" src="core/plugin-system.js"></script>
<script type="module" src="core/config-manager.js"></script>
<script type="module" src="lib/json-schema-form-builder.js"></script>
<script type="module" src="views/settings-view.js"></script>
<script type="module" src="lib/settings-integration.js"></script>

<!-- Puis app.js -->
<script src="app.js"></script>
```

**Option B** (meilleure) :

```html
<!-- Convertir app.js en module -->
<script type="module" src="app.js"></script>
```

---

### Task 1.2 : Supprimer duplication ConfigManager

**Impact** : Élevé - Double source de vérité
**Effort** : 45 min
**Risque** : High (dépendances en cascade)

**Actions** :

1. [ ] Ouvrir `app.js`
2. [ ] Identifier classe `ConfigManager` (lignes 1-90)
3. [ ] Chercher tous les appels à `configManager` dans app.js
4. [ ] Déterminer : Utilisée pour quoi exactement ?
5. [ ] Options :
   - Remplacer par import de `core/config-manager.js` ?
   - Ou garder ancienne pour compatibilité ?
6. [ ] Documenter la décision

**Découverte préalable** :
Vérifier ce que l'ancienne classe fait que la nouvelle ne fait pas

```bash
grep -n "configManager\." app.js
# Pour voir tous les usages
```

**Si décision = supprimer** :

- Importer le ConfigManager moderne
- Adapter l'initialisation dans `init()`
- Tester : Config se sauvegarde bien

---

### Task 1.3 : Documenter les dépendances

**Impact** : Moyen - Aide au debug
**Effort** : 20 min
**Risque** : Low

**Créer** : `docs/DEPENDENCIES.md`

**Contenu** :

```markdown
# Dépendances du Projet

## Ordre de chargement recommandé

1. **Polyfills** : buffer.js (pour isomorphic-git)
2. **Sécurité** : token-storage.js
3. **Storage** : storage adapters
4. **Core** : event-bus.js
5. **Plugin System** : plugin-system.js
6. **Config** : config-manager.js + json-schema-form-builder.js
7. **UI** : views/settings-view.js
8. **App** : app.js

## Graphique de dépendances

```

app.js
├── config-manager.js (nouveau)
│   ├── event-bus.js
│   └── storage-manager.js
├── plugin-system.js
│   ├── event-bus.js
│   └── router.js
└── editor.js
    ├── markdown-parser.js
    ├── markdown-renderer.js
    └── storage.js

settings-integration.js
├── config-manager.js
├── views/settings-view.js
│   └── lib/json-schema-form-builder.js
└── event-bus.js

```

## Modules vs Scripts

- ✅ **ES6 Modules** : core/*, views/*, lib/json-schema-form-builder.js
- ✅ **Global Scripts** : lib/*.js (legacy)
- ⚠️ **Hybrid** : app.js (dépend des deux)

## Résolution de problèmes

Si "X is not defined" :
1. Vérifier que le fichier source est chargé
2. Vérifier l'ordre de chargement dans index.html
3. Si module ES6 : vérifier `<script type="module">`
4. Vérifier pas de dépendance circulaire
```

---

## 🟡 PHASE 2 - HAUTE PRIORITÉ (1-2 heures)

### Task 2.1 : Unifier les versions

**Impact** : Faible - Cosmétique
**Effort** : 10 min

**Actions** :

1. [ ] Vérifier quelle version est correcte : 0.0.22 vs 1.0.0 ?
2. [ ] Utiliser 0.0.22 partout (config system est v1, mais app globale est 0.0.22)
3. [ ] Mettre à jour :
   - package.json : "version": "0.0.22"
   - README.md : badge version
   - index.html : span.version

---

### Task 2.2 : Documenter l'Event-Driven Architecture

**Impact** : Moyen - Aide au debug
**Effort** : 30 min

**Créer** : `docs/EVENTS_REFERENCE.md`

**Contenu** :

```markdown
# Événements Pensine Web

## Vue d'ensemble

Pensine utilise un bus d'événements centralisé pour la communication entre modules.

**Localization** : `core/event-bus.js`

## Tous les événements

### Startup
- `app:initialized` - Application prête
- `config:loaded` - Configuration chargée

### Configuration
- `config:saved` - Configuration sauvegardée
- `config:plugin-updated` - Plugin config mise à jour
- `settings:opened` - Panneau settings ouvert
- `settings:closed` - Panneau settings fermé

### Éditeur
- `editor:file-opened` - Fichier ouvert
- `editor:file-saved` - Fichier sauvegardé
- `editor:mode-changed` - Mode d'affichage changé

### Plugins
- `plugin:enabled` - Plugin activé
- `plugin:disabled` - Plugin désactivé

## Exemple d'utilisation

```javascript
// Émettre
eventBus.emit('config:saved', { key: 'theme', value: 'dark' });

// Écouter
eventBus.on('config:saved', (data) => {
    console.log('Config sauvegardée:', data);
});

// Écouter une fois
eventBus.once('app:initialized', () => {
    console.log('App prête');
});
```

```

---

### Task 2.3 : Documenter le Plugin System
**Impact** : Moyen - Aide à développer plugins
**Effort** : 45 min

**Améliorer** : `docs/PLUGINS_SYSTEM.md` ou `PLUGIN_DEVELOPMENT.md`

**Sections** :
1. Template minimal de plugin
2. Lifecycle (enable, disable)
3. API disponible
4. Communication inter-plugins
5. Configuration JSON Schema
6. Exemple complet

**Template minimal** :
```javascript
export default class MyPlugin {
  constructor(context) {
    this.id = 'my-plugin';
    this.context = context; // {config, eventBus, storage, router}
  }

  async enable() {
    console.log('[MyPlugin] Enabling');
    // Initialize
  }

  async disable() {
    console.log('[MyPlugin] Disabling');
    // Cleanup
  }

  static getConfigSchema() {
    return {
      title: 'My Plugin Configuration',
      properties: { ... }
    };
  }

  static getDefaultConfig() {
    return { ... };
  }
}
```

---

## 🟢 PHASE 3 - MOYEN TERME (1-2 heures)

### Task 3.1 : Créer issue GitHub pour plugins TODO

**Impact** : Faible - Organisation
**Effort** : 20 min

**Créer 3 issues** :

- [ ] "Implémenter inbox-plugin" (avec checklist)
- [ ] "Implémenter journal-plugin" (avec checklist)
- [ ] "Implémenter reflection-plugin" (avec checklist)

**Template** :

```markdown
## Titre: Implémenter [Plugin Name]

### Description
Le plugin [nom] est enregistré mais contient seulement des TODO.

### Checklist
- [ ] Définir JSON Schema de config
- [ ] Implémenter `render()` pour liste
- [ ] Implémenter `renderView()` pour détail
- [ ] Ajouter scénarios de test dans SCENARIOS_DE_TEST.md
- [ ] Tester avec TESTING_CHECKLIST

### Dépendances
- Plugin System (✅ prêt)
- Event Bus (✅ prêt)
- Settings View (✅ prêt)

### Ressources
- Voir pensine-plugin-calendar/ comme exemple
- Voir docs/PLUGIN_DEVELOPMENT.md
```

**Label** : `plugin`, `good-first-issue`

---

### Task 3.2 : Créer "Good First Issue" guide

**Impact** : Moyen - Onboarding
**Effort** : 30 min

**Créer** : `docs/FIRST_ISSUE.md`

**Contenu** :

```markdown
# Premier Issue - Guide pour Contributeurs

## Objectif
Vous pourrez faire votre premier commit en < 30 minutes.

## Issues recommandées pour débuter

### Facile : Documentation (5-10 min)
- [ ] Ajouter exemple dans CONFIG_SYSTEM.md
- [ ] Améliorer copilot-instructions.md
- [ ] Fixer typo dans README.md

### Facile : Code (15-20 min)
- [ ] Ajouter comment JSDoc manquant dans config-manager.js
- [ ] Implémenter TODO dans lib/json-schema-form-builder.js (validation avancée)
- [ ] Ajouter test scenario dans SCENARIOS_DE_TEST.md

### Moyen : Fonctionnalité (30-45 min)
- [ ] Implémenter plugin-reflection (voir PLUGIN_DEVELOPMENT.md)
- [ ] Ajouter export/import config en base64
- [ ] Implémenter dark mode complet

## Workflow

1. Cloner repo
2. Lancer python3 -m http.server 8000
3. Ouvrir http://localhost:8000
4. Configurer app (wizard)
5. Faire modification
6. Tester avec TESTING_CHECKLIST.md (6-8 min)
7. Commit + push
8. Pull Request

**Total : ~30 min pour un premier issue**
```

---

## 📊 TRACKING

### Rétrospective

- [ ] Nombre de issues résolues : __
- [ ] Temps investi : __h
- [ ] Clarté améliorée ? (avant/après)
- [ ] Onboarding plus facile ? (oui/non)

### Tests

- [ ] ConfigManager fonctionne bien
- [ ] SettingsView s'ouvre
- [ ] Pas d'erreurs console au startup
- [ ] Tous les plugins se chargent

### Documentation

- [ ] DEPENDENCIES.md créé et complét
- [ ] EVENTS_REFERENCE.md créé et complét
- [ ] PLUGIN_DEVELOPMENT.md amélioré
- [ ] FIRST_ISSUE.md créé

---

## 🎯 Succès = Quand

✅ Un nouveau développeur peut :

1. Cloner, setup, lancer en 10 min
2. Ouvrir un issue sans lire 5 fichiers
3. Faire premier commit sans bloquant
4. Comprendre les dépendances visuellement

---

**Version du plan** : 1.0
**Créé le** : 14 janvier 2026
**Responsable** : À définir
