# Design: Wizard Multi-Repository

## Problème actuel

Le wizard actuel ne sépare pas l'authentification de la sélection de repository. Cela cause plusieurs problèmes:

1. **Pas de validation du token** avant de demander le nom du repo
2. **Pas de liste des repos existants** - l'utilisateur doit taper manuellement
3. **Aucun message d'erreur** si le repo n'existe pas
4. **Pas de support multi-repo** - impossible de gérer plusieurs repos (personnel, travail, public)

## Cas d'usage de Stéphane

Trois types de repositories avec des finalités différentes:

1. **Pensine-StephaneDenis** (privé) - Notes personnelles, journal intime
2. **Pensine-GouvQc** (privé) - Notes professionnelles, réunions de travail  
3. **Pensine-Public** (public) - Connaissances générales, articles, références

### Workflow souhaité

1. **Une fois**: S'authentifier avec un token GitHub
2. **Ensuite**: Sélectionner parmi les repos existants OU créer un nouveau
3. **Pendant l'utilisation**: Switcher facilement entre les différents repos

## Solution proposée

### Étapes du wizard amélioré

#### Étape 1: Bienvenue
- Inchangée

#### Étape 2: Plateforme
- Inchangée (GitHub, GitLab, etc.)

#### Étape 3: Authentification (NOUVEAU)
- **Input**: Token uniquement
- **Action**: Valider le token avec API `/user`
- **Récupération**: Username automatique depuis l'API
- **Bouton**: "Valider le token" avec feedback visuel
- **Success**: Afficher ✅ "Authentifié en tant que [username]"
- **Error**: Message clair "Token invalide"

#### Étape 4: Sélection/Création Repository (NOUVEAU)
- **Liste** des repos existants (depuis API `/user/repos`)
  * Afficher nom, visibilité (🔒 privé / 🌐 public), description
  * Filtre par nom contenant "Pensine"
  * Click pour sélectionner
  
- **Création** d'un nouveau repo
  * Input: Nom du repo
  * Checkbox: Privé/Public
  * Textarea: Description (optionnelle)
  * Bouton: "Créer le repository"
  * Validation: Vérifier que le nom n'existe pas déjà
  
- **Templates suggérés**:
  * `Pensine-[VotreNom]` - Notes personnelles privées
  * `Pensine-[Organisation]` - Notes professionnelles privées
  * `Pensine-Public` - Connaissances publiques

#### Étape 5: Préférences
- Inchangée (langue, thème, etc.)

#### Étape 6: Résumé et confirmation
- Afficher le repo sélectionné
- Option: "Ajouter un autre repository" → retour étape 4
- Terminer la configuration

### API GitHub nécessaires

```javascript
// Valider token et récupérer user info
GET /user
Response: { login: "stephanedenis", name: "Stéphane Denis", ... }

// Lister repos de l'utilisateur
GET /user/repos?type=all&sort=updated&per_page=100
Response: [{ name: "pensine-web", private: false, description: "...", ... }]

// Créer un nouveau repo
POST /user/repos
Body: {
  name: "Pensine-StephaneDenis",
  private: true,
  description: "Notes personnelles",
  auto_init: true
}

// Vérifier l'existence d'un repo
GET /repos/{owner}/{repo}
Response: 200 OK ou 404 Not Found
```

### Structure de données multi-repo

#### localStorage Schema

```json
{
  "pensine-auth": {
    "platform": "github",
    "owner": "stephanedenis",
    "token": "[encrypted]"
  },
  "pensine-repos": [
    {
      "id": "repo-1",
      "name": "Pensine-StephaneDenis",
      "label": "Personnel",
      "private": true,
      "branch": "main",
      "active": true
    },
    {
      "id": "repo-2", 
      "name": "Pensine-GouvQc",
      "label": "Travail",
      "private": true,
      "branch": "main",
      "active": false
    },
    {
      "id": "repo-3",
      "name": "Pensine-Public",
      "label": "Public",
      "private": false,
      "branch": "main",
      "active": false
    }
  ],
  "pensine-active-repo": "repo-1"
}
```

### UI pour switcher entre repos

Dans le header de l'application:

```
[🔮 Pensine]  [▼ Personnel ▼]  [⚙️ Settings]
                  ↓
              [Dropdown menu]
              • ✓ Personnel (Pensine-StephaneDenis)
              • Travail (Pensine-GouvQc)  
              • Public (Pensine-Public)
              • ➕ Ajouter un repository
```

Changement de repo → Reload de l'application avec nouveau context

### Validation et erreurs

#### Lors de la validation du token
- ❌ Token vide → "Veuillez entrer un token"
- ❌ Token invalide → "Token invalide. Vérifiez vos droits d'accès."
- ❌ Token sans scope 'repo' → "Token valide mais manque de permissions (scope 'repo' requis)"
- ✅ Token valide → "Authentifié en tant que [username]"

#### Lors de la sélection/création de repo
- ❌ Repo inexistant (si tapé manuellement) → "Ce repository n'existe pas. Voulez-vous le créer?"
- ❌ Nom de repo invalide → "Nom invalide (caractères autorisés: a-z, 0-9, -, _)"
- ❌ Repo déjà existant (à la création) → "Ce repository existe déjà. Sélectionnez-le ci-dessus."
- ✅ Repo créé avec succès → "Repository créé! Vous pouvez maintenant configurer Pensine."

## Implémentation par phases

### Phase 1: Validation de token (PRIORITÉ)
- Modifier étape "credentials" pour séparer token des infos repo
- Ajouter bouton "Valider token" avec appel API `/user`
- Désactiver inputs repo tant que token non validé
- **Estimé**: 2h

### Phase 2: Liste des repos existants
- Appeler API `/user/repos` après validation token
- Afficher liste cliquable des repos
- Pré-remplir le champ "repo" au clic
- **Estimé**: 3h

### Phase 3: Création de repo
- Ajouter formulaire de création
- Appeler API `POST /user/repos`
- Gérer erreurs (nom existant, etc.)
- **Estimé**: 3h

### Phase 4: Multi-repo support
- Modifier localStorage schema
- Ajouter "Ajouter un repo" dans le wizard
- Créer dropdown dans header
- Implémenter switch de repo
- **Estimé**: 5h

### Phase 5: Migration des configs existantes
- Script pour migrer anciennes configs mono-repo vers multi-repo
- **Estimé**: 2h

**Total estimé**: ~15h de développement

## Questions ouvertes

1. **Partage de token entre repos**: OK car même plateforme (GitHub)
2. **Limite de repos**: Proposer max 5 repos configurés?
3. **Import/Export**: Permettre export de config multi-repo?
4. **Sync selective**: Synchroniser tous les repos ou seulement l'actif?

## Next Steps

1. [ ] Valider ce design avec l'utilisateur
2. [ ] Créer branche `feature/multi-repo-wizard`
3. [ ] Implémenter Phase 1 (validation token)
4. [ ] Tester avec token réel
5. [ ] Itérer sur les phases suivantes

---

**Document créé**: 2025-12-16  
**Auteur**: GitHub Copilot  
**Status**: 🟡 En révision
