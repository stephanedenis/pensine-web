# Architecture - Axe Temps

## 🎯 Vision

L'axe **Temps** est le premier pilier de Pensine, unifiant calendrier, flux entrants, tâches, journal et réflexions dans une expérience cohérente et contextuelle.

## 📦 Composants Principaux

### 1. Calendrier 📅

**Objectif**: Vue temporelle unifiée des événements passés, présents et futurs

**Fonctionnalités**:

- ✅ Timeline linéaire (déjà implémenté - LinearCalendar v2)
- 🔄 Vue mensuelle classique
- 📊 Vue hebdomadaire
- 🎯 Filtrage par contexte (travail, perso, santé...)
- 🔗 Synchronisation multi-sources (Google, Outlook, iCal)
- ➕ Création/édition événements inline
- 🏷️ Tags et catégories
- 🔔 Rappels contextuels

**État actuel**:

```
✅ lib/components/linear-calendar/
   ├── linear-calendar.js (1311 lignes) - Composant principal
   ├── linear-calendar-v2.css (731 lignes) - Styles
   └── linear-calendar-test.html - Tests

✅ Intégré dans app.js (calendrier par défaut)
```

**Refactoring en plugin**:

```
plugins/calendar/
├── plugin.json              # Métadonnées
├── calendar-plugin.js       # Orchestration
├── views/
│   ├── linear-view.js       # Timeline (existant)
│   ├── monthly-view.js      # Vue mois
│   └── weekly-view.js       # Vue semaine
├── components/
│   ├── event-editor.js      # Création/édition
│   ├── event-card.js        # Affichage événement
│   └── filters.js           # Filtres contextuels
├── adapters/
│   ├── google-calendar.js   # Sync Google
│   ├── outlook-calendar.js  # Sync Outlook
│   └── ical-adapter.js      # Import iCal
└── styles/
    └── calendar.css
```

### 2. Flux Entrants & Tâches 📥

**Objectif**: Capturer rapidement informations et tâches, les organiser et les traiter

**Fonctionnalités**:

- ➕ **Capture rapide** : Formulaire minimal (titre + texte + contexte)
- 📥 **Inbox** : Liste non triée de tout ce qui entre
- 🏷️ **Triage** : Classer en tâche, événement, note, référence
- ✅ **Tâches** : États (à faire, en cours, fait, annulé)
- 📅 **Planification** : Lier tâche → événement calendrier
- 🎯 **Priorisation** : Important/Urgent, deadlines
- 📊 **Vues** : Par contexte, par priorité, par date
- 🔄 **Récurrence** : Tâches répétitives

**Architecture**:

```
plugins/inbox/
├── plugin.json
├── inbox-plugin.js
├── models/
│   ├── task.js              # Modèle tâche
│   ├── note.js              # Modèle note
│   └── reference.js         # Modèle référence
├── views/
│   ├── capture-form.js      # Formulaire rapide
│   ├── inbox-list.js        # Liste non triée
│   ├── tasks-list.js        # Vue tâches
│   └── triage-view.js       # Interface triage
├── components/
│   ├── task-card.js         # Affichage tâche
│   ├── quick-actions.js     # Actions rapides
│   └── priority-badge.js    # Badges priorité
└── styles/
    └── inbox.css
```

**Format données**:

```json
{
  "id": "task-20251217-001",
  "type": "task",
  "status": "todo",
  "title": "Finaliser refactoring calendar",
  "description": "Migrer composant existant en plugin",
  "context": "work",
  "priority": "high",
  "dueDate": "2025-12-20",
  "linkedEvent": "calendar-event-123",
  "tags": ["dev", "refactoring"],
  "createdAt": "2025-12-17T10:30:00Z",
  "completedAt": null
}
```

### 3. Journal Quotidien 📝

**Objectif**: Espace réflexion quotidien avec structure flexible

**Fonctionnalités**:

- ✅ Entrée par jour (déjà implémenté via editor)
- 📋 **Templates** : Daily, Weekly Review, Monthly Review
- 🔗 **Liens auto** : Événements du jour, tâches complétées
- 🏷️ **Tags** : Humeur, énergie, météo, personnes
- 🔍 **Recherche** : Full-text + filtres temporels
- 📊 **Insights** : Patterns (jours productifs, récurrences...)
- 🎨 **Markdown enrichi** : Existant + frontmatter YAML

**État actuel**:

```
✅ lib/editor.js (755 lignes) - Éditeur unifié
✅ lib/markdown-parser.js - Parsing Markdown
✅ lib/markdown-renderer.js - Rendu HTML
✅ Intégré dans app.js
```

**Refactoring en plugin**:

```
plugins/journal/
├── plugin.json
├── journal-plugin.js
├── templates/
│   ├── daily.md             # Template quotidien
│   ├── weekly-review.md     # Revue hebdo
│   └── monthly-review.md    # Revue mensuelle
├── components/
│   ├── journal-editor.js    # Wrapper éditeur
│   ├── template-selector.js # Choix template
│   ├── day-summary.js       # Résumé jour (events, tasks)
│   └── tag-input.js         # Input tags
├── views/
│   ├── daily-view.js        # Vue jour
│   ├── calendar-view.js     # Calendrier journaux
│   └── search-view.js       # Recherche
├── analyzers/
│   ├── pattern-detector.js  # Détection patterns
│   └── insights-engine.js   # Génération insights
└── styles/
    └── journal.css
```

**Format entrée journal**:

```markdown
---
date: 2025-12-17
mood: 😊
energy: 8/10
weather: ☀️
tags: [dev, pensine, breakthrough]
linkedEvents: [calendar-event-456]
completedTasks: [task-001, task-002]
---

# Mardi 17 Décembre 2025

## ☀️ Matin
Vision claire pour architecture Pensine. 3 axes: Temps, Santé, Buts.

## 🍽️ Midi
Déjeuner avec équipe. Discussion architecture plugins.

## 🌆 Après-midi
Implémentation refactoring calendar en plugin. Progress fluide.

## 🌙 Soir
Satisfaction: journée productive. Avancée majeure sur vision long terme.

## 💡 Insights
- Architecture plugins va permettre extensibilité
- Important de documenter vision avant code
- Momentum positif quand objectifs clairs
```

### 4. Enrichissement & Réflexions 🧠

**Objectif**: Espace de pensée profonde, connections d'idées, apprentissages

**Fonctionnalités**:

- 📚 **Notes permanentes** : Idées, concepts, apprentissages
- 🔗 **Liens bidirectionnels** : Zettelkasten-style
- 🏷️ **Tags sémantiques** : Catégorisation flexible
- 🌐 **Graph view** : Visualisation connexions
- 💡 **Insights** : Suggestions de liens, patterns émergents
- 📖 **Revues** : Weekly/monthly/yearly reviews
- 🎯 **Questions ouvertes** : Tracker questions en cours
- 📈 **Progression** : Évolution pensée dans le temps

**Architecture**:

```
plugins/reflection/
├── plugin.json
├── reflection-plugin.js
├── models/
│   ├── note.js              # Note permanente
│   ├── connection.js        # Lien entre notes
│   └── question.js          # Question ouverte
├── views/
│   ├── note-editor.js       # Éditeur note
│   ├── graph-view.js        # Vue graphe
│   ├── connections-panel.js # Panneau liens
│   └── reviews-list.js      # Liste revues
├── components/
│   ├── backlinks.js         # Affichage backlinks
│   ├── tag-graph.js         # Graphe tags
│   ├── insight-card.js      # Carte insight
│   └── question-tracker.js  # Suivi questions
├── analyzers/
│   ├── link-suggester.js    # Suggestions liens
│   ├── pattern-finder.js    # Détection patterns
│   └── topic-clusterer.js   # Clustering thématique
└── styles/
    └── reflection.css
```

**Format note permanente**:

```markdown
---
id: note-001-zettelkasten
title: Principe Zettelkasten
type: concept
tags: [knowledge-management, note-taking, learning]
created: 2025-12-17
updated: 2025-12-17
connections:
  - [[note-002-bidirectional-links]]
  - [[note-003-atomic-notes]]
questions:
  - Comment automatiser détection de liens?
  - Quelle profondeur idéale pour graphe?
---

# Zettelkasten

Méthode de prise de notes développée par Niklas Luhmann.

## Principes clés
1. **Notes atomiques**: Une idée = une note
2. **Liens explicites**: Connections entre notes
3. **Émergence**: Structure émerge des connexions

## Applications Pensine
- Notes permanentes dans plugin Reflection
- Liens bidirectionnels auto-détectés
- Graph view pour visualisation

## Références
- [[journal-2025-12-17]] - Réflexion architecture
- [[note-004-plugin-system]] - Lien avec système plugins
```

## 🔗 Intégrations entre Composants

### Calendrier ↔ Journal

```javascript
// Clic sur jour calendrier → Ouvre/crée entrée journal
calendar.on('day-click', (date) => {
  journal.openOrCreateEntry(date);
});

// Journal affiche événements du jour
journal.on('entry-open', (date) => {
  const events = calendar.getEventsForDate(date);
  journal.displayDaySummary(events);
});
```

### Inbox ↔ Calendrier

```javascript
// Tâche avec deadline → Crée événement calendrier
inbox.on('task-scheduled', (task) => {
  calendar.createEvent({
    title: task.title,
    date: task.dueDate,
    context: task.context,
    linkedTask: task.id
  });
});

// Événement calendrier → Peut générer tâches
calendar.on('event-create', (event) => {
  if (event.needsPrep) {
    inbox.suggestTasks(event);
  }
});
```

### Journal ↔ Réflexions

```javascript
// Tag dans journal → Crée/lie note permanente
journal.on('tag-added', (tag) => {
  if (reflection.hasNote(tag)) {
    reflection.addBacklink(journal.currentEntry);
  } else {
    reflection.suggestNoteCreation(tag);
  }
});

// Note permanente → Références dans journaux
reflection.on('note-view', (note) => {
  const mentions = journal.findMentions(note.id);
  reflection.displayBacklinks(mentions);
});
```

### Inbox ↔ Réflexions

```javascript
// Tâche récurrente → Peut générer insight
inbox.on('task-pattern-detected', (pattern) => {
  reflection.suggestInsight({
    type: 'recurring-task',
    data: pattern,
    suggestion: 'Automatiser ou optimiser?'
  });
});
```

## 🏗️ Architecture Technique

### Plugin System Core

**API commune pour tous les plugins**:

```javascript
class PensinePlugin {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.version = config.version;
    this.dependencies = config.dependencies || [];
  }

  // Lifecycle hooks
  async init(context) { }
  async enable() { }
  async disable() { }
  async unload() { }

  // API accès
  getContext() { return this.context; }
  getStorage() { return this.context.storage; }
  getUI() { return this.context.ui; }
  getEventBus() { return this.context.eventBus; }
}
```

**Plugin manifest (plugin.json)**:

```json
{
  "id": "calendar",
  "name": "Calendrier Pensine",
  "version": "2.0.0",
  "description": "Gestion du temps avec vues multiples",
  "author": "Stéphane Denis",
  "license": "MIT",
  "main": "calendar-plugin.js",
  "dependencies": {
    "pensine-core": ">=1.0.0"
  },
  "permissions": [
    "storage.read",
    "storage.write",
    "ui.sidebar",
    "events.calendar"
  ],
  "config": {
    "defaultView": "linear",
    "firstDayOfWeek": 1,
    "enableSync": false,
    "sources": []
  },
  "routes": [
    { "path": "/calendar", "view": "linear-view" },
    { "path": "/calendar/month", "view": "monthly-view" },
    { "path": "/calendar/week", "view": "weekly-view" }
  ]
}
```

### Event Bus (Communication inter-plugins)

```javascript
class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(event, callback, plugin) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push({ callback, plugin });
  }

  emit(event, data, sourcePlugin) {
    const listeners = this.listeners.get(event) || [];
    listeners.forEach(({ callback, plugin }) => {
      if (plugin !== sourcePlugin) {
        callback(data);
      }
    });
  }

  off(event, callback) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      this.listeners.set(event,
        listeners.filter(l => l.callback !== callback)
      );
    }
  }
}

// Exemples d'événements
const EVENTS = {
  // Calendar
  'calendar:day-click': { date: Date },
  'calendar:event-create': { event: Object },
  'calendar:event-update': { event: Object },
  'calendar:event-delete': { eventId: String },

  // Inbox
  'inbox:item-captured': { item: Object },
  'inbox:task-scheduled': { task: Object },
  'inbox:task-complete': { taskId: String },

  // Journal
  'journal:entry-open': { date: Date, entry: Object },
  'journal:entry-save': { date: Date, content: String },
  'journal:tag-added': { tag: String, entry: Object },

  // Reflection
  'reflection:note-create': { note: Object },
  'reflection:link-create': { from: String, to: String },
  'reflection:insight-generated': { insight: Object }
};
```

### Storage API (Unifié)

```javascript
class PluginStorage {
  constructor(pluginId, storageAdapter) {
    this.pluginId = pluginId;
    this.adapter = storageAdapter;
    this.basePath = `plugins/${pluginId}/`;
  }

  async read(path) {
    return this.adapter.getFile(this.basePath + path);
  }

  async write(path, content) {
    return this.adapter.saveFile(this.basePath + path, content);
  }

  async list(directory = '') {
    return this.adapter.listFiles(this.basePath + directory);
  }

  async delete(path) {
    return this.adapter.deleteFile(this.basePath + path);
  }

  // Helpers spécifiques
  async readJSON(path) {
    const content = await this.read(path);
    return JSON.parse(content);
  }

  async writeJSON(path, data) {
    return this.write(path, JSON.stringify(data, null, 2));
  }
}
```

### UI Framework (Composants communs)

```javascript
// Composants réutilisables entre plugins
const PensineUI = {
  // Layout
  Sidebar: class { },
  Panel: class { },
  Modal: class { },
  Toast: class { },

  // Forms
  Input: class { },
  Select: class { },
  DatePicker: class { },
  TagInput: class { },

  // Data display
  Card: class { },
  List: class { },
  Table: class { },
  Timeline: class { },

  // Navigation
  Tabs: class { },
  Menu: class { },
  Breadcrumb: class { },

  // Feedback
  Spinner: class { },
  Progress: class { },
  Alert: class { }
};
```

## 📁 Structure Fichiers Cible

```
pensine-web/
├── index.html
├── config.js (minimal)
├── core/
│   ├── app.js                  # Core minimal
│   ├── plugin-system.js        # Gestionnaire plugins
│   ├── event-bus.js            # Communication
│   ├── storage-manager.js      # Storage unifié
│   ├── router.js               # Routing
│   └── ui-framework.js         # Composants communs
├── plugins/
│   ├── calendar/               # Plugin Calendrier
│   │   ├── plugin.json
│   │   ├── calendar-plugin.js
│   │   ├── views/
│   │   ├── components/
│   │   ├── adapters/
│   │   └── styles/
│   ├── inbox/                  # Plugin Flux & Tâches
│   │   ├── plugin.json
│   │   ├── inbox-plugin.js
│   │   └── ...
│   ├── journal/                # Plugin Journal
│   │   ├── plugin.json
│   │   ├── journal-plugin.js
│   │   └── ...
│   └── reflection/             # Plugin Réflexions
│       ├── plugin.json
│       ├── reflection-plugin.js
│       └── ...
├── lib/                        # Librairies externes (backward compat)
│   ├── storage.js              # → core/storage-manager.js
│   ├── editor.js               # → shared editor component
│   └── markdown-*.js           # → shared markdown components
└── styles/
    ├── core.css                # Styles core
    └── themes/                 # Thèmes
```

## 🚀 Plan de Migration

### Phase 1: Fondations (2-3 semaines)

1. ✅ Créer core/plugin-system.js
2. ✅ Créer core/event-bus.js
3. ✅ Adapter core/storage-manager.js (API unifiée)
4. ✅ Créer core/router.js (routing plugins)
5. ✅ Créer core/ui-framework.js (composants communs)

### Phase 2: Migration Calendar (1-2 semaines)

1. ✅ Créer plugins/calendar/ avec structure
2. ✅ Migrer lib/components/linear-calendar/ → plugins/calendar/views/linear-view.js
3. ✅ Adapter styles
4. ✅ Intégrer avec plugin system
5. ✅ Tests fonctionnels

### Phase 3: Inbox & Tâches (2-3 semaines)

1. ✅ Créer plugins/inbox/
2. ✅ Implémenter capture rapide
3. ✅ Implémenter liste tâches
4. ✅ Intégration avec calendrier
5. ✅ Tests

### Phase 4: Journal (1-2 semaines)

1. ✅ Créer plugins/journal/
2. ✅ Migrer éditeur existant
3. ✅ Templates et frontmatter
4. ✅ Intégration calendrier/inbox
5. ✅ Tests

### Phase 5: Réflexions (2-3 semaines)

1. ✅ Créer plugins/reflection/
2. ✅ Notes permanentes
3. ✅ Liens bidirectionnels
4. ✅ Graph view
5. ✅ Tests

### Phase 6: Polissage (1-2 semaines)

1. ✅ Optimisations performance
2. ✅ Documentation API plugins
3. ✅ Tests end-to-end complets
4. ✅ Release v2.0.0

**Total estimé**: 9-15 semaines (2-4 mois)

## 📊 Success Metrics

### Performance

- Chargement initial < 2s (seulement core + plugins activés)
- Changement de vue < 200ms
- Recherche full-text < 500ms (10k entrées)

### Fonctionnel

- ✅ 4 plugins Axe Temps fonctionnels
- ✅ Communication inter-plugins fluide
- ✅ Données compatibles backward avec version actuelle

### Développeur

- API plugin documentée
- Template plugin disponible
- 3+ exemples de plugins de référence

---

**Version**: 1.0
**Date**: 2025-12-17
**Status**: Draft - En cours de validation
**Auteur**: Stéphane Denis (@stephanedenis)
