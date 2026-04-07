# Pensine Repository Structure Standard

**Version**: 1.0.0
**Date**: 2026-01-17
**Status**: DRAFT (proposé)

---

## 🎯 Objectif

Définir une structure de dossiers **standard** pour les repos Pensine, permettant :

1. **Interopérabilité** : N'importe quel repo Pensine respectant la structure est compatible
2. **Multi-repos** : Superposition fluide de plusieurs repos dans une seule vue
3. **Migration** : Passage facile d'un outil à l'autre (Obsidian, Logseq, etc.)
4. **Extensibilité** : Plugins peuvent s'appuyer sur conventions connues

---

## 📁 Structure Minimale Obligatoire

```
repo-name/
├── .pensine/              # ⚠️ OBLIGATOIRE - Métadonnées Pensine
│   ├── config.json        # Configuration spécifique au repo
│   └── metadata.json      # Métadonnées (couleur, icon, description)
├── journals/              # 📅 RECOMMANDÉ - Journaux quotidiens
│   ├── 2025-01-17.md
│   ├── 2025-01-18.md
│   └── ...
├── pages/                 # 📄 RECOMMANDÉ - Pages/notes permanentes
│   ├── inbox.md           # Inbox GTD
│   ├── projects/          # Projets en cours
│   └── references/        # Références/documentation
└── assets/                # 🖼️ OPTIONNEL - Médias et attachments
    ├── images/
    └── attachments/
```

### Dossiers Obligatoires

#### `.pensine/` (MANDATORY)

**Rôle** : Contient métadonnées et configuration spécifique au repo.

**Fichiers** :

**`.pensine/config.json`** :

```json
{
  "$schema": "https://pensine.io/schemas/repo-config.v1.json",
  "version": "1.0.0",
  "repo": {
    "id": "work-repo",
    "name": "Travail - Acme Corp",
    "description": "Notes et journaux professionnels",
    "created": "2025-01-01T00:00:00Z"
  },
  "appearance": {
    "color": "#3b82f6", // Couleur primaire (blue-500)
    "icon": "💼", // Emoji ou URL icon
    "theme": "auto" // "auto" | "dark" | "light"
  },
  "features": {
    "dailyJournals": true, // Active les journaux quotidiens
    "autoCommit": true, // Commit auto sur save
    "encryption": false, // Chiffrement E2E (future)
    "sharing": {
      // Partage collaboratif
      "enabled": false,
      "allowedUsers": []
    }
  },
  "plugins": {
    "calendar": {
      "enabled": true,
      "weekStart": "monday" // "monday" | "sunday"
    },
    "inbox": {
      "enabled": true,
      "path": "pages/inbox.md"
    }
  },
  "sync": {
    "branch": "main",
    "autoSync": true,
    "conflictResolution": "prompt" // "prompt" | "ours" | "theirs"
  }
}
```

**`.pensine/metadata.json`** :

```json
{
  "version": "1.0.0",
  "lastModified": "2025-01-17T12:00:00Z",
  "stats": {
    "totalNotes": 142,
    "totalWords": 45230,
    "journalDays": 89,
    "lastSync": "2025-01-17T11:30:00Z"
  },
  "tags": ["work", "acme-corp", "professional"],
  "priority": 1, // Ordre d'affichage dans multi-repos
  "visibility": "private" // "private" | "public" | "shared"
}
```

**Pourquoi obligatoire** :

- Permet à Pensine de détecter un repo valide
- Configure comportement spécifique (couleur, sync, plugins)
- Évite conflits entre repos (IDs uniques)

---

### Dossiers Recommandés

#### `journals/` (RECOMMENDED)

**Rôle** : Journaux quotidiens (daily notes).

**Convention** :

- Nom fichier : `YYYY-MM-DD.md` (ISO 8601)
- Encodage : UTF-8
- Format : Markdown standard

**Exemple** : `journals/2025-01-17.md`

```markdown
# Vendredi 17 janvier 2025

## 🎯 Objectifs

- [ ] Finir ADR-001
- [ ] Tester Edge
- [ ] Review PR #42

## 📝 Notes

Lorem ipsum...

## 🔗 Liens

- [[2025-01-16]] - Hier
- [[projects/pensine-web]] - Projet en cours
```

**Avantages** :

- Compatible Obsidian, Logseq, Roam
- Facile à parser (nom = date)
- Git history = timeline naturelle

---

#### `pages/` (RECOMMENDED)

**Rôle** : Notes permanentes, projets, références.

**Structure suggérée** :

```
pages/
├── inbox.md                 # Inbox GTD (capture rapide)
├── projects/                # Projets actifs
│   ├── pensine-web.md
│   ├── client-acme.md
│   └── ...
├── areas/                   # Domaines de responsabilité (PARA)
│   ├── management.md
│   ├── development.md
│   └── ...
├── resources/               # Références (PARA)
│   ├── git-cheatsheet.md
│   ├── kubernetes-tips.md
│   └── ...
└── archives/                # Projets terminés
    └── old-project.md
```

**Convention nommage** :

- Kebab-case : `my-note-title.md`
- Pas d'espaces (compatibilité Git)
- Extensions : `.md`, `.markdown`

---

#### `assets/` (OPTIONAL)

**Rôle** : Médias et fichiers attachés.

**Structure** :

```
assets/
├── images/
│   ├── 2025-01-17-screenshot.png
│   ├── diagrams/
│   │   └── architecture.svg
│   └── photos/
│       └── meeting-whiteboard.jpg
└── attachments/
    ├── documents/
    │   └── contract.pdf
    └── data/
        └── export.csv
```

**Convention** :

- Préfixer avec date : `2025-01-17-filename.ext`
- Organiser par type (images/, documents/, data/)
- Git LFS pour gros fichiers (>1 MB)

**Référencement** :

```markdown
![Screenshot](../assets/images/2025-01-17-screenshot.png)
[Contrat PDF](../assets/attachments/documents/contract.pdf)
```

---

## 🔀 Multi-Repos et Superposition

### Scénario : Vie Pro + Vie Perso + Projet Open Source

**3 repos distincts** :

1. **`work-pensine/`** (💼 Travail)

   ```
   .pensine/
     config.json → color: #3b82f6 (bleu)
   journals/
     2025-01-17.md → "Réunion client A..."
   pages/
     projects/client-a.md
   ```

2. **`personal-pensine/`** (🏠 Personnel)

   ```
   .pensine/
     config.json → color: #10b981 (vert)
   journals/
     2025-01-17.md → "RDV médecin 14h..."
   pages/
     health/medical-records.md
   ```

3. **`opensource-pensine/`** (🚀 Open Source)

   ```
   .pensine/
     config.json → color: #f59e0b (orange)
   journals/
     2025-01-17.md → "Contribué à React..."
   pages/
     projects/react-contribution.md
   ```

### Vue Superposée dans Pensine

**Calendrier 17 janvier 2025** :

```
📅 Vendredi 17 janvier 2025

┌─────────────────────────────────────────┐
│ 💼 Travail (work-pensine)              │
│ • Réunion client A 10h                  │
│ • Review PR #42                         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 🏠 Personnel (personal-pensine)         │
│ • RDV médecin 14h                       │
│ • Courses 18h                           │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 🚀 Open Source (opensource-pensine)     │
│ • Contribué à React docs                │
└─────────────────────────────────────────┘
```

**Vue Pages (fusion arborescences)** :

```
📂 Pages (tous repos)

├─ 📥 Inbox
│  ├─ 💼 Task client A (work)
│  ├─ 🏠 Acheter cadeau anniversaire (personal)
│  └─ 🚀 Bug React à investiguer (opensource)
│
├─ 📁 Projects
│  ├─ 💼 projects/client-a.md (work)
│  ├─ 🏠 projects/renovation-maison.md (personal)
│  └─ 🚀 projects/react-contribution.md (opensource)
│
└─ 📚 Resources
   ├─ 💼 resources/kubernetes.md (work)
   └─ 🚀 resources/react-patterns.md (opensource)
```

---

## 🎨 Conventions de Couleurs et Icônes

### Couleurs Recommandées (Tailwind CSS)

| Contexte     | Couleur    | Hex       | Usage                     |
| ------------ | ---------- | --------- | ------------------------- |
| 💼 Travail   | blue-500   | `#3b82f6` | Repos professionnels      |
| 🏠 Personnel | green-500  | `#10b981` | Repos vie privée          |
| 🚀 Projets   | orange-500 | `#f59e0b` | Projets/side-projects     |
| 📚 Études    | purple-500 | `#a855f7` | Formations, cours         |
| ❤️ Santé     | red-500    | `#ef4444` | Santé, bien-être          |
| 🎨 Créatif   | pink-500   | `#ec4899` | Art, écriture, créativité |
| 🤝 Équipe    | cyan-500   | `#06b6d4` | Repos partagés/collab     |
| 🔒 Privé     | gray-500   | `#6b7280` | Repos sensibles           |

### Icônes Recommandées (Emoji Unicode)

| Emoji | Code    | Contexte             |
| ----- | ------- | -------------------- |
| 💼    | U+1F4BC | Travail              |
| 🏠    | U+1F3E0 | Personnel            |
| 🚀    | U+1F680 | Projets/Tech         |
| 📚    | U+1F4DA | Études/Formations    |
| ❤️    | U+2764  | Santé/Bien-être      |
| 🎨    | U+1F3A8 | Créatif/Art          |
| 🤝    | U+1F91D | Collaboration/Équipe |
| 🔒    | U+1F512 | Privé/Sensible       |
| 📊    | U+1F4CA | Analytics/Données    |
| 🎯    | U+1F3AF | Objectifs/OKRs       |

---

## 🔧 Configuration Multi-Repos

### Dans `localStorage` : `pensine-multi-repos`

```json
{
  "version": "1.0.0",
  "repos": [
    {
      "id": "work",
      "name": "Travail",
      "owner": "acme-corp",
      "repo": "pensine-work",
      "branch": "main",
      "path": "/",
      "color": "#3b82f6",
      "icon": "💼",
      "enabled": true,
      "priority": 1,
      "credentials": {
        "mode": "pat",
        "tokenKey": "pensine-token-work" // Clé localStorage séparée
      },
      "sync": {
        "auto": true,
        "interval": 300000 // 5 min
      }
    },
    {
      "id": "personal",
      "name": "Personnel",
      "owner": "mystephanedenis",
      "repo": "pensine-perso",
      "branch": "main",
      "path": "/",
      "color": "#10b981",
      "icon": "🏠",
      "enabled": true,
      "priority": 2,
      "credentials": {
        "mode": "pat",
        "tokenKey": "pensine-token-personal"
      },
      "sync": {
        "auto": true,
        "interval": 600000 // 10 min
      }
    }
  ],
  "display": {
    "showRepoLabels": true, // Afficher badge repo sur chaque note
    "colorCodeCalendar": true, // Colorier calendrier par repo
    "mergeInbox": true, // Fusionner tous les inbox
    "defaultRepo": "personal" // Repo par défaut pour nouvelles notes
  },
  "conflicts": {
    "resolution": "prompt", // "prompt" | "ours" | "theirs" | "merge"
    "notifyOnConflict": true
  }
}
```

### Ordre de Priorité Configuration

Quand même paramètre défini dans plusieurs repos :

```
1. Repo-specific config (.pensine/config.json du repo actif)
2. Global user config (localStorage: pensine-global-config)
3. Default config (app defaults)
```

**Exemple** :

- Global config : theme = "light"
- Work repo config : theme = "dark"
- Résultat : Quand dans work-repo → theme dark, ailleurs → light

---

## 🚀 Migration depuis autres outils

### Depuis Obsidian

**Obsidian → Pensine** (compatible à 95%)

| Obsidian         | Pensine          | Notes            |
| ---------------- | ---------------- | ---------------- |
| `Daily Notes/`   | `journals/`      | Renommer dossier |
| `.obsidian/`     | `.pensine/`      | Config séparée   |
| `attachments/`   | `assets/`        | Renommer dossier |
| `[[wikilinks]]`  | `[[wikilinks]]`  | ✅ Compatible    |
| Frontmatter YAML | Frontmatter YAML | ✅ Compatible    |
| Tags `#tag`      | Tags `#tag`      | ✅ Compatible    |

**Script de migration** :

```bash
#!/bin/bash
# migrate-obsidian-to-pensine.sh

# Renommer dossiers
mv "Daily Notes" journals
mv .obsidian .pensine
mv attachments assets

# Créer config.json
cat > .pensine/config.json <<EOF
{
  "version": "1.0.0",
  "repo": {
    "id": "$(basename $(pwd))",
    "name": "Migrated from Obsidian"
  },
  "appearance": {
    "color": "#8b5cf6",
    "icon": "📝"
  }
}
EOF

# Créer metadata.json
cat > .pensine/metadata.json <<EOF
{
  "version": "1.0.0",
  "migrationSource": "obsidian",
  "migrationDate": "$(date -Iseconds)"
}
EOF

echo "✅ Migration terminée!"
```

### Depuis Logseq

**Logseq → Pensine** (compatible à 80%)

| Logseq          | Pensine            | Notes                     |
| --------------- | ------------------ | ------------------------- |
| `journals/`     | `journals/`        | ✅ Même structure         |
| `pages/`        | `pages/`           | ✅ Même structure         |
| `logseq/`       | `.pensine/`        | Config séparée            |
| `[[Page]]`      | `[[page]]`         | Case-insensitive Logseq   |
| Outliner format | Free-form Markdown | Perte hiérarchie outliner |

---

## 📊 Validation Structure

### Outil CLI : `pensine-validate`

```bash
# Valider structure d'un repo
pensine validate /path/to/repo

# Output:
✅ .pensine/ directory exists
✅ .pensine/config.json valid
✅ .pensine/metadata.json valid
⚠️  journals/ directory missing (recommended)
✅ pages/ directory exists
✅ All markdown files valid UTF-8
✅ No filename conflicts

Summary: 5/6 checks passed (1 warning)
```

### JSON Schema pour validation

**URL** : `https://pensine.io/schemas/repo-config.v1.json`

Permet validation automatique dans éditeurs (VSCode, etc.)

---

## 🔐 Sécurité et Confidentialité

### Données Sensibles

**À NE JAMAIS commiter** :

- Tokens/PATs (utiliser localStorage uniquement)
- Mots de passe
- Clés API privées
- Données personnelles sensibles (SSN, cartes bancaires)

**Utiliser `.gitignore`** :

```gitignore
# Pensine - données sensibles
.pensine/credentials.json
.pensine/tokens.json
*.secret.md
*-private.md

# Assets volumineux
assets/**/*.psd
assets/**/*.mp4
```

### Chiffrement E2E (Future)

**Roadmap v1.5** : Chiffrement optionnel repos sensibles

- AES-256 pour contenu
- Clé stockée localement (pas dans repo)
- Compatible Git (fichiers .encrypted)

---

## 📖 Références

### Standards Suivis

- **ISO 8601** : Dates (YYYY-MM-DD)
- **UTF-8** : Encodage fichiers
- **Markdown CommonMark** : Format notes
- **JSON Schema** : Validation configs
- **Semantic Versioning** : Numérotation versions

### Inspirations

- **Obsidian** : Structure dossiers, wikilinks
- **Logseq** : Journaux quotidiens, outliner
- **Notion** : Bases de données, relations
- **Zettelkasten** : Notes atomiques, liens
- **PARA Method** : Organisation Projects/Areas/Resources/Archives

### Documents Liés

- [`ARCHITECTURE_DECISION_LOG.md`](ARCHITECTURE_DECISION_LOG.md) - ADR-001 Multi-Repos
- [`SPECIFICATIONS_TECHNIQUES.md`](SPECIFICATIONS_TECHNIQUES.md) - Architecture complète
- [`docs/CONFIG_SYSTEM.md`](CONFIG_SYSTEM.md) - Configuration centralisée

---

**Maintainer**: Stéphane Denis (@stephanedenis)
**Last Updated**: 2026-01-17
**Version**: 1.0.0 (DRAFT)
