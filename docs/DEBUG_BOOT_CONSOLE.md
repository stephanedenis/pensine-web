# Boot Console - Guide de debugging

**Date** : 2026-01-15
**Status** : ✅ Implémenté et committé (2b2aa44)

## 🎯 Objectif

Console visuelle style boot Linux pour tracer en temps réel le processus de démarrage de Pensine et diagnostiquer les problèmes d'activation des plugins.

## 🖥️ Interface

### Esthétique

- **Style** : Terminal rétro Linux/VT100
- **Couleurs** :
  - Fond : `#0a0a0a` (noir)
  - Texte : `#33ff33` (vert phosphorescent)
  - Bordure : `2px solid #33ff33` avec glow
- **Police** : `'Courier New', 'Consolas', monospace` 12px
- **Position** : Fixed, top-right (650px width, 85vh max-height)
- **Effets** :
  - Fade-in pour nouvelles lignes (0.15s)
  - Blink cursor animation
  - Box-shadow glow vert

### Système de badges

| Badge    | Couleur | Utilisation         |
| -------- | ------- | ------------------- |
| `[ OK ]` | Vert    | Opération réussie   |
| `[FAIL]` | Rouge   | Erreur critique     |
| `[WAIT]` | Jaune   | En attente/en cours |
| `[INFO]` | Bleu    | Information         |

### Types de lignes

- `.boot-line.info` - Informations générales (blanc)
- `.boot-line.success` - Succès (vert)
- `.boot-line.warning` - Avertissement (jaune)
- `.boot-line.error` - Erreur (rouge)
- `.boot-line.debug` - Debug détaillé (gris clair)

## 📝 BootLogger API

### Classe BootLogger

```javascript
class BootLogger {
  constructor() {
    this.startTime = Date.now();
    this.container = document.getElementById('boot-console-content');
    this.lineCount = 0;
  }

  // Méthodes principales
  log(message, type = 'info', badge = null)  // Log générique
  ok(message)                                 // Badge OK vert
  fail(message)                               // Badge FAIL rouge
  wait(message)                               // Badge WAIT jaune
  info(message)                               // Badge INFO bleu
  warn(message)                               // Warning sans badge
  error(message, error)                       // Error avec stack
  debug(message)                              // Debug gris
  step(step, total, message)                  // Progress [1/6]
}
```

### Utilisation

```javascript
// Dans constructor de PensineBootstrap
this.logger = new BootLogger();

// Dans méthodes
this.logger.step(1, 6, "Loading configuration...");
this.logger.wait("Initializing storage...");
this.logger.debug("Config loaded: 4832 bytes");
this.logger.ok("Storage initialized");
this.logger.fail("Plugin activation failed");
this.logger.error("Critical error", error);
```

## 🔍 Phases tracées

### 1. Bootstrap init() - 6 étapes

```
[1/6] Loading configuration from localStorage
[2/6] Validating configuration
[3/6] Initializing storage adapter
[4/6] Loading remote configuration
[5/6] Initializing plugin system
[6/6] Loading enabled plugins
```

### 2. Configuration Loading

```
[WAIT] Loading local config from localStorage...
[INFO] Local config loaded: 4832 bytes
[ OK ] Configuration validated
```

### 3. Storage Initialization

```
[WAIT] Initializing local storage adapter...
[    ] StorageManager module imported
[    ] StorageManager instance created
[    ] StorageManager.initialize() completed
[ OK ] Storage initialized: local (adapter ready)
```

### 4. Remote Config Loading

```
[WAIT] Loading remote config from storage...
[    ] Remote config loaded: 3457 bytes, 5 plugins
[ OK ] Remote config merged with local config
```

### 5. Plugin System Initialization

```
[WAIT] Importing core modules (EventBus, PluginSystem, ConfigManager)...
[    ] Core modules imported
[WAIT] Creating EventBus instance...
[    ] EventBus created
[WAIT] Creating ConfigManager instance...
[    ] ConfigManager initialized
[WAIT] Creating PluginSystem instance...
[    ] PluginSystem initialized
[ OK ] Plugin system ready
```

### 6. Plugin Loading (DÉTAILLÉ)

```
[INFO] Found 1 enabled plugin(s)
[WAIT] Loading plugin: hello-world
[    ] Plugin path: ./plugins/pensine-plugin-hello/plugin.js
[WAIT] Importing module: ./plugins/pensine-plugin-hello/plugin.js
[    ] Module imported: HelloWorldPlugin
[    ] Manifest created: Hello World v0.1.0
[    ] Plugin type: Panini (activate/deactivate)
[WAIT] Registering plugin in PluginSystem...
[    ] Plugin registered: hello-world
[    ] Context prepared: storage=true, events=true, config=true, router=false
[WAIT] Enabling plugin via PluginSystem.enable("hello-world", context)...

>>> PluginSystem.enable() TRACÉ DÉTAILLÉ <<<

[ OK ] Plugin "hello-world" loaded and activated
[ OK ] All plugins processed (1 total)
```

### 7. PluginSystem.enable() - Trace détaillée

```javascript
// Logs ajoutés dans plugin-system.js:enable()
[PluginSystem.enable] START - pluginId="hello-world"
[PluginSystem.enable] Plugin found in registry: {
  id: "hello-world",
  name: "Hello World",
  version: "0.1.0",
  isPaniniPlugin: true,
  hasActivateMethod: true,
  hasEnableMethod: false
}
[PluginSystem.enable] Activating plugin: Hello World
[PluginSystem.enable] Panini plugin detected
[PluginSystem.enable] Plugin instance: HelloWorldPlugin { ... }
[PluginSystem.enable] Panini context: { storage, events, config, router, ... }
[PluginSystem.enable] About to call: pluginData.plugin.activate(this.paniniContext)

>>> activate() DEVRAIT S'EXÉCUTER ICI <<<

[PluginSystem.enable] ✅ activate() completed successfully
[PluginSystem.enable] Plugin marked as active and enabled
[PluginSystem.enable] Event "plugin:enabled" emitted
[PluginSystem.enable] ✅ SUCCESS - Plugin "hello-world" fully activated
```

### 8. App Ready

```
[WAIT] Finalizing app initialization...
[    ] Loading indicator hidden
[    ] App container visible
[    ] Event "app:ready" emitted
[ OK ] 🎉 Pensine ready - All systems operational
```

## 🐛 Diagnostic du problème d'activation

### Comportement attendu

1. Plugin chargé (import réussi) ✅
2. Plugin enregistré dans PluginSystem ✅
3. `isPaniniPlugin = true` détecté ✅
4. `enable(id, context)` appelé ✅
5. **`activate(context)` appelé sur plugin** ❌ **← PROBLÈME ICI**
6. Message "Hello World 🌍" affiché dans #app ❌

### Hypothèses à vérifier avec boot console

#### Hypothèse #1 : activate() n'est pas appelé

**Vérification** : Chercher dans console :

```
[PluginSystem.enable] About to call: pluginData.plugin.activate(this.paniniContext)
```

Si ce log apparaît MAIS pas de logs depuis `HelloWorldPlugin.activate()`, alors :

- La méthode existe mais ne s'exécute pas → bug bind/context
- Ou exception silencieuse → check try/catch

#### Hypothèse #2 : activate() s'exécute mais plante silencieusement

**Vérification** : Chercher erreur JavaScript dans console après :

```
[PluginSystem.enable] About to call: ...
```

Si erreur → problème dans le code du plugin lui-même

#### Hypothèse #3 : Context invalide

**Vérification** : Inspecter log :

```
[PluginSystem.enable] Panini context: { ... }
```

Vérifier que context a bien :

- `storage` (objet StorageManager)
- `events` (objet EventBus)
- `config` (objet ConfigManager)
- `features` (objet avec markdown: true, etc.)

#### Hypothèse #4 : Plugin non-Panini détecté comme Panini

**Vérification** : Chercher :

```
[PluginSystem.enable] Plugin found in registry: {
  isPaniniPlugin: true,
  hasActivateMethod: true
}
```

Si `isPaniniPlugin: false` alors détection échoue → revoir logique détection

#### Hypothèse #5 : activate() retourne Promise non-awaited

**Vérification** :

```javascript
// Dans plugin.js - activate() doit retourner Promise
async activate(context) {
  await this.init(); // Si init async
  // ...
}
```

Si activate() synchrone mais init() async → race condition

## 📊 Métriques de performance visibles

La boot console affiche les timestamps en secondes depuis démarrage :

```
[    0.000] Pensine Bootstrap v0.1.0
[    0.012] [1/6] Loading configuration...
[    0.234] [2/6] Validating configuration
[    0.456] [3/6] Initializing storage
[    0.789] [4/6] Loading remote config
[    1.023] [5/6] Initializing plugin system
[    1.267] [6/6] Loading enabled plugins
[    1.489] Plugin "hello-world" loaded
[    1.502] 🎉 Pensine ready
```

**Objectif** : <2s pour cold start, <500ms pour warm cache

## 🛠️ Outils de debug

### Afficher/masquer console

```javascript
// Toggle console visibility
const console = document.getElementById("boot-console");
console.classList.toggle("visible");
```

### Bouton close

Cliquer sur `×` en haut à droite pour masquer la console (utile en production)

### Filtrer logs par type

```javascript
// Show only errors
document
  .querySelectorAll(".boot-line:not(.error)")
  .forEach((el) => (el.style.display = "none"));
```

### Exporter logs

```javascript
// Copy all logs to clipboard
const logs = Array.from(document.querySelectorAll(".boot-line"))
  .map((el) => el.textContent)
  .join("\n");
navigator.clipboard.writeText(logs);
```

## 🔧 Configuration

### Désactiver en production

Dans `index-minimal.html`, commenter :

```html
<!-- Boot Console (DEBUG ONLY) -->
<!-- <div id="boot-console" class="visible"> ... </div> -->
```

Ou ajouter condition :

```javascript
if (import.meta.env.MODE === "production") {
  const console = document.getElementById("boot-console");
  console?.remove();
}
```

### Activer mode verbose

Dans `bootstrap.js` constructor :

```javascript
this.logger = new BootLogger();
this.logger.verboseMode = true; // Affiche tous les debug()
```

### Changer couleurs

Dans `index-minimal.html` CSS :

```css
#boot-console {
  --console-bg: #0a0a0a;
  --console-text: #33ff33;
  --console-border: #33ff33;
}
```

## 📚 Fichiers modifiés

1. **index-minimal.html** (+150 lignes CSS, +30 lignes HTML)

   - `#boot-console` structure
   - Styles badges et animations

2. **src/bootstrap.js** (+80 lignes BootLogger, +100 lignes logs)

   - Classe `BootLogger`
   - Conversion tous console.log → logger.\*
   - Logs détaillés chaque phase

3. **src/core/plugin-system.js** (+40 lignes logs)
   - Trace complète `enable()` method
   - Inspection context et plugin avant activate()

## 🎯 Prochaines étapes

1. ✅ Boot console implémentée
2. ✅ Tous logs convertis
3. ✅ PluginSystem.enable() tracé
4. ⏳ **Tester boot console visuellement**
5. ⏳ **Identifier ligne exacte où activate() échoue**
6. ⏳ **Corriger bug activation plugin**
7. ⏳ **Tests Playwright GREEN**
8. ⏳ **Documenter fix dans journal de bord**

## 📝 Notes

- Console auto-scroll vers bas (nouveaux logs visibles)
- Max ~100 lignes avant overflow scroll
- Performances : négligeables (<1ms par log)
- Compatible tous navigateurs modernes (ES6+)
- Pas de dépendances externes

---

**Commit** : 2b2aa44 - `feat: Add Linux-style boot console for debugging`
