# Technical Debt & TODOs - Pensine Web

**Date**: 2026-01-27
**Status**: Documentation consolidée
**Version**: v0.0.22

---

## 🎯 Vue d'Ensemble

Ce document recense la **dette technique** et les **TODOs** identifiés dans le projet Pensine Web, avec priorisation et plan d'action.

### Statistiques

- **TODOs JavaScript**: 20+
- **Priorité Critique**: 3
- **Priorité Haute**: 7
- **Priorité Moyenne**: 10+

---

## 🔴 Priorité CRITIQUE (Blocants)

### 1. Auth System Non Implémenté

**Fichier**: `src/core/plugin-system.js:50`

```javascript
user: null // TODO: Get from auth system
```

**Impact**: Les plugins ne peuvent pas accéder à l'utilisateur courant

**Plan d'action**:

1. Implémenter OAuth GitHub (déjà prévu dans roadmap)
2. Créer `src/lib/auth/github-oauth.js`
3. Injecter user dans `PaniniPluginContext`

**Estimation**: 2-3 jours

---

### 2. UI Notifications Manquantes

**Fichier**: `src/core/plugin-system.js:250-256`

```javascript
// TODO: Implémenter UI toast
console.warn('⚠️ Warning:', message);

// TODO: Implémenter UI modal
console.error('❌ Error:', message);
```

**Impact**: Pas de feedback visuel pour l'utilisateur

**Plan d'action**:

1. Créer `src/lib/components/toast-notifications.js`
2. Créer `src/lib/components/modal-dialog.js`
3. Intégrer dans PluginSystem

**Estimation**: 1 jour

---

### 3. Tests Playwright Échouants

**Fichier**: `tests/config-system-integration.spec.mjs`

**Impact**: CI/CD bloquée, confiance déploiement réduite

**Plan d'action**:

1. Fixer mock token (format valide `ghp_xxx`)
2. Résoudre init ConfigManager
3. Débugger panneau Settings (classe `.hidden`)

**Estimation**: 4-6 heures

---

## 🟠 Priorité HAUTE (Important)

### 4. Accelerator Plugin - FTS Non Implémenté

**Fichier**: `plugins/pensine-plugin-accelerator/accelerator-plugin.js:618-682`

**TODOs**:

- `@todo Implement proper IndexedDB with FTS` (ligne 618)
- `@todo Implement FTS using IndexedDB` (ligne 674)

**Impact**: Recherche plein texte non fonctionnelle

**Plan d'action**:

1. Utiliser `lunr.js` ou `fuse.js` pour FTS
2. Indexer notes dans IndexedDB
3. API de recherche `/search?q=`

**Estimation**: 3-4 jours

---

### 5. Accelerator Plugin - Graph Navigation

**Fichier**: `plugins/pensine-plugin-accelerator/accelerator-plugin.js:659-697`

**TODOs**:

- `@todo Implement [[note-title]] resolution` (ligne 659)
- `@todo Implement graph building from wiki-links` (ligne 689)

**Impact**: Navigation wiki-style non fonctionnelle

**Plan d'action**:

1. Parser `[[links]]` dans markdown
2. Construire graphe de relations
3. UI de navigation (graph view)

**Estimation**: 5-7 jours

---

### 6. Dual Config System

**Fichier**: `app.js:1-100` (LegacyConfigManager)

**Impact**: Duplication code, confusion

**Plan d'action**:

1. Migrer tous appels vers `src/core/config-manager.js`
2. Supprimer `LegacyConfigManager`
3. Valider tests

**Estimation**: 1-2 jours

---

### 7. Version Number Hardcoded

**Fichier**: `src/core/panini-wrappers.js:331`

```javascript
version: '1.0.0', // TODO: Get from package.json or config
```

**Plan d'action**:

1. Lire `package.json` au build
2. Inject version dans config

**Estimation**: 1 heure

---

### 8. Documentation API Plugin Manquante

**Impact**: Développeurs tiers ne peuvent pas créer plugins

**Plan d'action**:

1. Créer `docs/PLUGIN_API.md`
2. Documenter `PaniniPlugin` interface
3. Exemples de code

**Estimation**: 4 heures

---

### 9. Encryption Tokens localStorage

**Fichier**: `src/lib/services/token-storage.js`

**Impact**: Tokens en plain-text dans localStorage

**Plan d'action**:

1. Implémenter encryption AES-256
2. Dérivation de clé depuis passphrase utilisateur
3. Migration tokens existants

**Estimation**: 1 jour

---

### 10. Markdown Linting Errors Restantes

**Impact**: Professionnalisme documentation

**Plan d'action**:

1. Fixer tables (MD060)
2. Ajouter langages fenced code (MD040)

**Estimation**: 2 heures

---

## 🟡 Priorité MOYENNE (Nice to Have)

### 11. Accelerator - Toutes Méthodes Vides

**Fichier**: `plugins/pensine-plugin-accelerator/accelerator-plugin.js:622-653`

**TODOs**:

- `// TODO` (ligne 622 - getAllNotes)
- `// TODO` (ligne 626 - getNoteById)
- `// TODO` (ligne 630 - createNote)
- `// TODO` (ligne 635 - updateNote)
- `// TODO` (ligne 640 - deleteNote)
- `// TODO` (ligne 644 - getNotesByTag)
- `// TODO` (ligne 649 - getNotesInFolder)
- `// TODO` (ligne 653 - getRecentNotes)

**Plan d'action**: Implémenter progressivement selon besoins utilisateurs

**Estimation**: 10-15 jours (complet)

---

### 12. Outlook/Todoist Import

**Fichier**: `src/lib/components/config-wizard.js:549`

```html
<li>Import automatique de tâches Outlook / Todoist</li>
```

**Plan d'action**: Créer plugins dédiés

**Estimation**: 7-10 jours (par intégration)

---

### 13. Hot Reload Plugins (Dev Mode)

**Fichier**: `src/core/plugin-system.js:45`

```javascript
hotReload: false, // Enable in dev mode
```

**Plan d'action**:

1. File watcher sur `plugins/`
2. Reload automatique lors changement

**Estimation**: 2 jours

---

### 14. Semantic Search

**Fichier**: `src/core/plugin-system.js:46`

```javascript
semanticSearch: false, // Future feature
```

**Plan d'action**:

1. Intégrer modèle embeddings (Sentence-BERT)
2. Vectoriser notes
3. Recherche sémantique

**Estimation**: 5-7 jours

---

### 15. Performance Metrics

**Plan d'action**:

```javascript
// Ajouter monitoring performance
window.pensineMetrics = {
  bootTime: Date.now() - window.BOOT_START,
  pluginsLoaded: pluginSystem.plugins.size,
  memoryUsage: performance.memory?.usedJSHeapSize || 0
};
```

**Estimation**: 2 heures

---

## 📊 Matrice de Priorisation

| TODO | Priorité | Impact | Effort | ROI | Deadline |
|------|----------|--------|--------|-----|----------|
| Auth System | 🔴 Critique | Très élevé | Moyen | ⭐⭐⭐⭐⭐ | Q1 2026 |
| UI Notifications | 🔴 Critique | Élevé | Faible | ⭐⭐⭐⭐⭐ | Q1 2026 |
| Tests Playwright | 🔴 Critique | Élevé | Faible | ⭐⭐⭐⭐⭐ | Immédiat |
| Accelerator FTS | 🟠 Haute | Élevé | Élevé | ⭐⭐⭐⭐ | Q2 2026 |
| Graph Navigation | 🟠 Haute | Moyen | Élevé | ⭐⭐⭐ | Q2 2026 |
| Dual Config | 🟠 Haute | Moyen | Faible | ⭐⭐⭐⭐ | Q1 2026 |
| Plugin API Doc | 🟠 Haute | Élevé | Faible | ⭐⭐⭐⭐ | Q1 2026 |
| Token Encryption | 🟠 Haute | Moyen | Moyen | ⭐⭐⭐ | Q2 2026 |
| Hot Reload | 🟡 Moyenne | Faible | Moyen | ⭐⭐ | Q3 2026 |
| Semantic Search | 🟡 Moyenne | Moyen | Élevé | ⭐⭐⭐ | 2027 |

---

## 🚀 Plan d'Exécution Recommandé

### Semaine 1-2 (Immédiat)

- ✅ Fixer tests Playwright (6h)
- ✅ Documenter API Plugin (4h)
- ✅ Nettoyer Markdown linting (2h)
- ✅ Supprimer dual config (2 jours)

**Total**: ~3 jours

---

### Semaine 3-4 (Q1 2026)

- 🔄 Implémenter UI Notifications (1 jour)
- 🔄 Implémenter Auth System (3 jours)
- 🔄 Version from package.json (1h)

**Total**: ~4 jours

---

### Q2 2026

- 📅 Accelerator FTS (4 jours)
- 📅 Token Encryption (1 jour)
- 📅 Graph Navigation (7 jours)

**Total**: ~12 jours

---

### Q3-Q4 2026

- 📅 Hot Reload (2 jours)
- 📅 Performance Metrics (2h)
- 📅 Outlook/Todoist (10 jours)

**Total**: ~13 jours

---

## 🔧 Outillage Recommandé

### Détection Automatique TODOs

Ajouter au `package.json`:

```json
{
  "scripts": {
    "todos": "grep -r 'TODO' --include='*.js' --include='*.mjs' src/ plugins/ | wc -l",
    "todos:list": "grep -rn 'TODO' --include='*.js' --include='*.mjs' src/ plugins/"
  }
}
```

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Bloquer si TODOs critiques non résolus
CRITICAL_TODOS=$(grep -r "TODO.*CRITICAL" --include="*.js" src/)

if [ ! -z "$CRITICAL_TODOS" ]; then
  echo "❌ CRITICAL TODOs detected:"
  echo "$CRITICAL_TODOS"
  exit 1
fi
```

---

## 📈 Métriques de Succès

### Objectifs Q1 2026

- ✅ 0 TODO critique
- ✅ < 10 TODOs haute priorité
- ✅ 100% tests passent
- ✅ Documentation API complète

### Objectifs Q2 2026

- ✅ FTS fonctionnel
- ✅ Graph navigation opérationnel
- ✅ Encryption tokens active

---

## 📞 Contributeurs

Si vous souhaitez résoudre un TODO :

1. Créer une issue GitHub référençant ce doc
2. Assigner-vous la tâche
3. Créer une branche `fix/todo-XXX`
4. Soumettre PR avec tests

---

**Dernière mise à jour**: 2026-01-27
**Mainteneur**: Stéphane Denis (@stephanedenis)
