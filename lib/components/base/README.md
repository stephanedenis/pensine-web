# Pensine Configuration Standard

## Vue d'ensemble

Le **Pensine Configuration Standard** est un système de configuration standardisé pour tous les composants de pensine-web. Il fournit une interface cohérente pour définir, valider, modifier et exporter les configurations des composants.

## Architecture

### Composants du système

```
lib/components/base/
├── configurable-component.js  # Classe de base
├── config-panel.js            # Générateur d'UI
└── config-panel.css           # Styles
```

### Pattern

```javascript
// 1. Composant étend ConfigurableComponent
class MyComponent extends ConfigurableComponent {
  constructor(container, options) {
    super(container, options);
    // ... initialisation
  }

  // 2. Définit son schéma de configuration
  getConfigSchema() {
    return {
      groups: [
        {
          id: 'display',
          title: 'Display',
          icon: '🎨',
          properties: {
            color: {
              type: 'color',
              title: 'Color',
              default: '#667eea'
            }
          }
        }
      ]
    };
  }

  // 3. Implémente refresh() pour appliquer les changements
  refresh() {
    // Re-render avec nouvelles options
  }
}

// 4. ConfigPanel génère automatiquement l'UI
const panel = new ConfigPanel(component, '#panel-container');
```

## ConfigurableComponent (classe de base)

### Méthodes publiques

#### `getConfigSchema()` ⚠️ **À implémenter**
Retourne le schéma de configuration du composant.

```javascript
getConfigSchema() {
  return {
    groups: [...]
  };
}
```

#### `getConfig()`
Retourne la configuration actuelle.

```javascript
const config = component.getConfig();
// { weekStartDay: 1, locale: 'fr-CA', ... }
```

#### `setConfig(config, merge = true)`
Met à jour la configuration avec validation.

```javascript
// Merge partiel (défaut)
component.setConfig({ weekStartDay: 0 });

// Remplacement complet
component.setConfig({ weekStartDay: 0 }, false);
```

#### `setConfigProperty(key, value)`
Met à jour une seule propriété.

```javascript
component.setConfigProperty('locale', 'en-US');
```

#### `resetConfig()`
Réinitialise à la configuration par défaut du schéma.

```javascript
component.resetConfig();
```

#### `exportConfig(pretty = true)`
Exporte la configuration en JSON.

```javascript
const json = component.exportConfig();
// Télécharger ou partager
```

#### `importConfig(jsonString)`
Importe une configuration depuis JSON.

```javascript
component.importConfig(jsonString);
```

### Événements

#### `configchange`
Déclenché lors d'un changement de configuration.

```javascript
component.on('configchange', (data) => {
  console.log('Old:', data.oldConfig);
  console.log('New:', data.newConfig);
  console.log('Changes:', data.changes);
});
```

#### `configreset`
Déclenché lors d'une réinitialisation.

```javascript
component.on('configreset', () => {
  console.log('Config reset to defaults');
});
```

#### `configerror`
Déclenché lors d'une erreur de validation.

```javascript
component.on('configerror', (errors) => {
  console.error('Validation errors:', errors);
});
```

## Schéma de configuration

### Structure

```javascript
{
  groups: [
    {
      id: 'group-id',              // ID unique du groupe
      title: 'Group Title',        // Titre affiché
      icon: '🎨',                   // Emoji ou icône
      description: 'Description',  // Description optionnelle
      properties: {
        propertyName: {
          type: 'boolean',         // Type de propriété (voir ci-dessous)
          title: 'Title',          // Label affiché
          description: 'Help',     // Description
          default: true,           // Valeur par défaut
          required: false,         // Obligatoire ?
          // ... règles de validation spécifiques au type
        }
      }
    }
  ]
}
```

### Types de propriétés

#### `boolean` - Toggle switch
```javascript
{
  type: 'boolean',
  title: 'Enable Feature',
  default: true
}
```
UI : Toggle switch on/off

#### `number` - Slider + input
```javascript
{
  type: 'number',
  title: 'Opacity',
  default: 0.5,
  min: 0,
  max: 1,
  step: 0.1,
  unit: '%'
}
```
UI : Slider avec input numérique synchronisé

#### `string` - Text input
```javascript
{
  type: 'string',
  title: 'Username',
  default: '',
  minLength: 3,
  maxLength: 20,
  pattern: '^[a-zA-Z0-9]+$',
  placeholder: 'Enter username'
}
```
UI : Text input avec validation

#### `color` - Color picker
```javascript
{
  type: 'color',
  title: 'Primary Color',
  default: '#667eea'
}
```
UI : Color picker + text input synchronisé

#### `select` - Dropdown
```javascript
{
  type: 'select',
  title: 'Locale',
  default: 'fr-CA',
  options: [
    { value: 'fr-CA', label: 'French (Canada)' },
    { value: 'en-US', label: 'English (US)' }
  ]
}
```
UI : Select dropdown

#### `date` - Date picker
```javascript
{
  type: 'date',
  title: 'Start Date',
  default: '2025-01-01'
}
```
UI : Date input

### Règles de validation

#### Validation par type

**number :**
- `min` : valeur minimale
- `max` : valeur maximale
- `step` : pas d'incrémentation
- `unit` : unité affichée (optionnel)

**string :**
- `minLength` : longueur minimale
- `maxLength` : longueur maximale
- `pattern` : regex de validation

**select :**
- `options` : liste des valeurs possibles

#### Validation personnalisée

```javascript
{
  type: 'number',
  title: 'Age',
  default: 18,
  validator: (value) => {
    if (value < 0) return 'Age must be positive';
    if (value > 120) return 'Age seems unrealistic';
    return null; // OK
  }
}
```

#### Champ obligatoire

```javascript
{
  type: 'string',
  title: 'Email',
  required: true,
  pattern: '^[^@]+@[^@]+\.[^@]+$'
}
```

## ConfigPanel (générateur d'UI)

### Initialisation

```javascript
const panel = new ConfigPanel(component, container, options);
```

**Paramètres :**
- `component` : Instance de ConfigurableComponent
- `container` : Sélecteur CSS ou HTMLElement
- `options` : Configuration du panel (optionnel)

### Options du panel

```javascript
{
  showExport: true,      // Bouton Export
  showImport: true,      // Bouton Import
  showReset: true,       // Bouton Reset
  livePreview: true,     // Mise à jour en temps réel
  collapsible: true      // Groupes collapsibles
}
```

### Méthodes

#### `refresh()`
Re-génère le panel (après changement de schéma).

```javascript
panel.refresh();
```

#### `destroy()`
Détruit le panel.

```javascript
panel.destroy();
```

## Exemple complet : LinearCalendar

### 1. Étendre ConfigurableComponent

```javascript
class LinearCalendar extends ConfigurableComponent {
  constructor(container, options = {}) {
    // Définir les options par défaut
    const defaultOptions = {
      weekStartDay: 1,
      locale: 'fr-CA',
      weeksToLoad: 52,
      // ...
    };

    // Appeler le constructeur parent
    super(container, { ...defaultOptions, ...options });

    // Initialiser le composant
    this.init();

    // Marquer comme initialisé
    this._initialized = true;
  }

  // ...
}
```

### 2. Définir le schéma

```javascript
getConfigSchema() {
  return {
    groups: [
      {
        id: 'display',
        title: 'Display Options',
        icon: '🎨',
        properties: {
          weekStartDay: {
            type: 'select',
            title: 'Week Start Day',
            default: 1,
            options: [
              { value: 0, label: 'Sunday' },
              { value: 1, label: 'Monday' }
            ]
          },
          weekendOpacity: {
            type: 'number',
            title: 'Weekend Opacity',
            default: 0.15,
            min: 0,
            max: 1,
            step: 0.05
          }
        }
      },
      {
        id: 'behavior',
        title: 'Behavior',
        icon: '⚙️',
        properties: {
          infiniteScroll: {
            type: 'boolean',
            title: 'Infinite Scroll',
            default: true
          }
        }
      }
    ]
  };
}
```

### 3. Implémenter refresh()

```javascript
refresh() {
  if (!this._initialized) return;

  // Sauvegarder l'état
  const currentScroll = this.scrollContainer.scrollTop;

  // Réinitialiser
  this.state.isInitialized = false;
  this.container.innerHTML = '';
  this.init();

  // Restaurer l'état
  this.scrollContainer.scrollTop = currentScroll;
}
```

### 4. Créer le panel

```javascript
// HTML
<div id="calendar"></div>
<div id="config-panel"></div>

// JavaScript
const calendar = new LinearCalendar('#calendar');
const panel = new ConfigPanel(calendar, '#config-panel');

// Écouter les changements
calendar.on('configchange', (data) => {
  console.log('Configuration changed:', data.changes);
});
```

## Avantages du système

### Pour les développeurs

1. **Moins de code** : Pas besoin de créer manuellement l'UI de configuration
2. **Cohérence** : Même UX pour tous les composants
3. **Validation intégrée** : Règles de validation standardisées
4. **Type-safe** : Schéma définit structure et types
5. **Testable** : Configuration indépendante de l'UI

### Pour les utilisateurs

1. **Interface uniforme** : Même pattern partout
2. **Export/Import** : Partage de configurations
3. **Prévisualisation live** : Voir les changements en temps réel
4. **Reset facile** : Retour aux valeurs par défaut
5. **Documentation intégrée** : Descriptions dans l'UI

## Bonnes pratiques

### 1. Grouper logiquement les options

```javascript
{
  groups: [
    { id: 'display', title: 'Display', ... },    // Apparence
    { id: 'behavior', title: 'Behavior', ... },  // Comportement
    { id: 'advanced', title: 'Advanced', ... }   // Avancé
  ]
}
```

### 2. Fournir des valeurs par défaut sensées

```javascript
{
  weekStartDay: {
    type: 'select',
    default: 1,  // Lundi (ISO 8601)
    options: [...]
  }
}
```

### 3. Ajouter des descriptions

```javascript
{
  weekendOpacity: {
    type: 'number',
    title: 'Weekend Opacity',
    description: 'Background opacity for Saturday and Sunday',
    // ...
  }
}
```

### 4. Utiliser des icônes pertinentes

```javascript
{
  id: 'display',
  icon: '🎨',  // Display
}
{
  id: 'behavior',
  icon: '⚙️',  // Settings
}
{
  id: 'data',
  icon: '💾',  // Data
}
```

### 5. Valider les entrées critiques

```javascript
{
  apiKey: {
    type: 'string',
    required: true,
    pattern: '^[a-f0-9]{32}$',
    validator: (value) => {
      // Validation supplémentaire
      return null; // ou message d'erreur
    }
  }
}
```

### 6. Appeler refresh() dans setConfig()

ConfigurableComponent appelle automatiquement `refresh()` après `setConfig()` si :
- `this._initialized === true`
- `this.refresh` existe

```javascript
setConfig(config, merge = true) {
  // ... validation et mise à jour

  // Appel automatique de refresh() si disponible
  if (this._initialized && typeof this.refresh === 'function') {
    this.refresh();
  }

  // ...
}
```

## Migration de composants existants

### Avant (sans standard)

```javascript
class MyComponent {
  constructor(container, options) {
    this.container = document.querySelector(container);
    this.options = { ...defaults, ...options };
    this.init();
  }

  updateOption(key, value) {
    this.options[key] = value;
    this.render();
  }
}

// UI manuelle
const slider = document.createElement('input');
slider.type = 'range';
slider.addEventListener('input', (e) => {
  component.updateOption('opacity', e.target.value);
});
```

### Après (avec standard)

```javascript
class MyComponent extends ConfigurableComponent {
  constructor(container, options) {
    super(container, { ...defaults, ...options });
    this.init();
    this._initialized = true;
  }

  getConfigSchema() {
    return {
      groups: [{
        id: 'display',
        title: 'Display',
        properties: {
          opacity: {
            type: 'number',
            title: 'Opacity',
            default: 0.5,
            min: 0,
            max: 1,
            step: 0.1
          }
        }
      }]
    };
  }

  refresh() {
    this.render();
  }
}

// UI automatique
const panel = new ConfigPanel(component, '#panel');
```

## Tests

### Tester la validation

```javascript
// Valeur valide
component.setConfig({ opacity: 0.5 });
console.assert(component.options.opacity === 0.5);

// Valeur invalide (hors limites)
component.setConfig({ opacity: 2.0 });
// Devrait émettre 'configerror' et ne pas changer

// Validation personnalisée
component.setConfig({ age: -5 });
// Devrait échouer avec message 'Age must be positive'
```

### Tester export/import

```javascript
// Export
const json = component.exportConfig();
console.assert(typeof json === 'string');
console.assert(JSON.parse(json));

// Import
const success = component.importConfig(json);
console.assert(success === true);
```

### Tester événements

```javascript
let changeTriggered = false;

component.on('configchange', () => {
  changeTriggered = true;
});

component.setConfig({ opacity: 0.8 });
console.assert(changeTriggered === true);
```

## Démo

Voir `lib/components/linear-calendar/demo-with-config-panel.html` pour un exemple complet et fonctionnel.

Ouvrir dans le navigateur :
```bash
cd lib/components/linear-calendar
python3 -m http.server 8003
# Ouvrir http://localhost:8003/demo-with-config-panel.html
```

## Support

Le système est compatible avec :
- **Navigateurs modernes** : Chrome, Firefox, Safari, Edge
- **ES6+** : Classes, arrow functions, destructuring
- **UMD** : Fonctionne en module ou global

## Licence

MIT - Voir LICENSE à la racine du projet

---

**Version** : 1.0.0
**Auteur** : Stéphane Denis
**Date** : 2025-12-15
