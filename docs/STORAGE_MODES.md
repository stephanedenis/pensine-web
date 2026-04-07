# 🗂️ Modes de stockage Pensine

Pensine propose **4 modes de stockage** adaptés à différents besoins :

## 📊 Comparaison rapide

| Caractéristique | 🔒 OAuth | 🔑 PAT | 🏠 Local | 🌿 Local Git |
|----------------|----------|---------|----------|--------------|
| **Sécurité** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Sync multi-appareils** | ✅ | ✅ | ❌ | ⚠️ Manuel |
| **Backup automatique** | ✅ | ✅ | ❌ | ⚠️ Manuel |
| **Collaboration** | ✅ | ✅ | ❌ | ⚠️ Via push/pull |
| **Offline** | ❌ | ❌ | ✅ | ✅ |
| **Versioning** | ⚠️ Commits | ⚠️ Commits | ❌ | ✅ Vrai Git |
| **Branches** | ❌ | ❌ | ❌ | ✅ |
| **Historique** | ⚠️ 30 jours | ⚠️ GitHub | ⚠️ 30 jours | ✅ Complet |
| **Configuration** | Complexe | Simple | Aucune | Minimale |
| **Compte requis** | GitHub | GitHub | Aucun | ⚠️ Optionnel |
| **Internet requis** | Oui | Oui | Non | ⚠️ Optionnel |

---

## 🔒 Mode OAuth (Recommandé)

### Description

Authentification via GitHub OAuth App avec backend Cloudflare Worker. Le token n'est jamais stocké dans le navigateur.

### ✅ Avantages

- **Sécurité maximale** : Token jamais en clair dans localStorage
- **Protection XSS** : HttpOnly cookies pour refresh token
- **Expiration automatique** : Access token 1h, refresh 6 mois
- **Révocation facile** : Depuis [github.com/settings/applications](https://github.com/settings/applications)
- **Scopes minimaux** : Accès `repo` uniquement

### ❌ Inconvénients

- Configuration initiale complexe
- Nécessite backend (Cloudflare Worker)
- Dépendance externe (Cloudflare)

### 📋 Prérequis

- Compte GitHub
- Connexion Internet
- Backend OAuth déployé (Cloudflare Worker)
- GitHub OAuth App configurée

### 🚀 Installation

Voir [`docs/OAUTH_SETUP.md`](OAUTH_SETUP.md)

### 💡 Recommandé pour

- ✅ Production
- ✅ Données sensibles
- ✅ Équipes/collaboration
- ✅ Usage quotidien long terme

---

## 🔑 Mode PAT (Personal Access Token)

### Description

Authentification classique avec Personal Access Token GitHub stocké en localStorage.

### ✅ Avantages

- **Configuration rapide** : Juste copier-coller un token
- **Pas de backend requis** : 100% client-side
- **Compatible legacy** : Fonctionne partout
- **Simple à débugger** : Token visible dans DevTools

### ❌ Inconvénients

- **Moins sécurisé** : Token en clair dans localStorage
- **Vulnérable XSS** : Attaque JS peut voler le token
- **Pas d'expiration** : Token valide indéfiniment
- **Révocation manuelle** : Doit aller sur GitHub

### 📋 Prérequis

- Compte GitHub
- Connexion Internet
- Personal Access Token avec scope `repo`

### 🚀 Installation

1. Aller sur [github.com/settings/tokens](https://github.com/settings/tokens)
2. Créer nouveau token (classic)
3. Scope `repo` uniquement
4. Copier le token
5. Coller dans config wizard

### 💡 Recommandé pour

- ✅ Développement local
- ✅ Tests rapides
- ✅ Usage temporaire
- ❌ Production (utiliser OAuth)

---

## 🏠 Mode Local (Offline)

### Description

Stockage 100% local avec IndexedDB + localStorage. Aucune connexion Internet, aucun compte requis.

### ✅ Avantages

- **100% offline** : Fonctionne sans Internet
- **Données privées** : Jamais envoyées nulle part
- **Pas de compte** : Aucun compte GitHub requis
- **Export/Import** : Backup manuel possible
- **Rapide** : Pas de latence réseau

### ❌ Inconvénients

- **Pas de sync** : Données sur un seul appareil
- **Backup manuel** : Doit exporter régulièrement
- **Volatile** : Données perdues si cache effacé
- **Pas de collaboration** : Usage solo uniquement

### 📋 Prérequis

- Navigateur moderne (support IndexedDB)
- Aucun compte
- Aucune connexion Internet

### 🚀 Installation

1. Sélectionner "Local (Offline)" dans wizard
2. C'est tout ! Aucune configuration

### 💡 Recommandé pour

- ✅ Données ultra-sensibles
- ✅ Usage offline (avion, etc.)
- ✅ Pas de compte GitHub
- ✅ Tests/développement sans Internet
- ❌ Collaboration multi-utilisateurs

---

## 🌿 Mode Local Git (Offline Pro)

### Description

Vrai repo Git dans le navigateur avec **isomorphic-git** + **OPFS**. Toutes les fonctionnalités Git (commits, branches, diff, merge) + synchronisation optionnelle avec GitHub.

### ✅ Avantages

- **100% offline** : Fonctionne entièrement sans Internet
- **Vrai Git** : Commits, branches, checkout, merge, rebase
- **Historique complet** : Pas de limite de 30 jours
- **Diff & blame** : Voir qui a changé quoi et quand
- **Branches** : Feature branches, hotfixes, expérimentation
- **Export Git** : Bundle `.git` complet pour backup
- **Sync optionnel** : Push/pull vers GitHub quand connecté
- **Collaboration Git** : Clone, pull, merge avec workflow Git standard
- **Données privées** : Stockées en OPFS (Origin Private File System)

### ❌ Inconvénients

- **Performance** : Git en JavaScript plus lent que natif
- **Taille** : Historique complet peut être volumineux
- **Complexité** : Concepts Git requis (commit, branch, merge)
- **Backup manuel** : Doit exporter bundle régulièrement (si pas de sync)
- **Pas de UI graphique** : Opérations Git via commandes (pour l'instant)

### 📋 Prérequis

- Navigateur moderne (support OPFS : Chrome 102+, Edge 102+, Opera 89+)
- Aucun compte (mode offline pur)
- Token GitHub + compte (si sync avec remote)

### 🚀 Installation

#### Mode Offline pur (pas de sync)

```javascript
// 1. Dans wizard : Sélectionner "Local Git (Offline Pro)"
// 2. Configurer auteur Git :
{
  author: {
    name: "Votre Nom",
    email: "email@example.com"
  }
}
// 3. C'est tout ! Repo Git créé automatiquement
```

#### Mode avec sync GitHub (online + offline)

```javascript
// 1. Créer repo GitHub vide
// 2. Créer PAT avec scope 'repo'
// 3. Dans wizard : Sélectionner "Local Git (Offline Pro)"
// 4. Configurer :
{
  author: {
    name: "Votre Nom",
    email: "email@example.com"
  },
  remote: {
    url: "https://github.com/user/repo",
    token: "ghp_xxxxx"
  }
}
// 5. Travailler offline, push/pull quand connecté
```

### 🎯 Fonctionnalités Git disponibles

#### Opérations locales (offline)

- ✅ `git init` - Initialisation automatique
- ✅ `git add` - Staging automatique à chaque `putFile()`
- ✅ `git commit` - Commit avec message + auteur
- ✅ `git log` - Historique complet via `getHistory()`
- ✅ `git diff` - Comparaison entre commits
- ✅ `git branch` - Créer/lister branches
- ✅ `git checkout` - Changer de branche
- ✅ `git status` - Modified/staged/untracked
- ✅ `git show` - Contenu d'un fichier à un commit donné

#### Opérations remote (nécessite token)

- ✅ `git clone` - Cloner repo GitHub existant
- ✅ `git push` - Envoyer commits vers GitHub
- ✅ `git pull` - Récupérer commits depuis GitHub
- ✅ `git remote add` - Configurer remote

#### Export/Import

- ✅ **Export bundle** : `.git` complet avec tout l'historique
- ✅ **Import bundle** : Restaurer repo depuis backup

### 💡 Recommandé pour

- ✅ **Développeurs** : Workflow Git familier
- ✅ **Offline pro** : Historique complet sans Internet
- ✅ **Expérimentation** : Branches pour tester idées
- ✅ **Collaboration Git** : Push/pull avec équipe
- ✅ **Backup robuste** : Historique complet exportable
- ✅ **Compliance** : Audit trail complet (qui/quoi/quand)
- ⚠️ **Débutants** : Nécessite connaissance Git

### 🔧 Exemples d'utilisation

#### Créer une branche feature

```javascript
await storageManager.adapter.createBranch('feature-new-idea');
await storageManager.adapter.checkoutBranch('feature-new-idea');
// Éditer fichiers...
await storageManager.putFile('notes/idea.md', 'Nouvelle idée !', 'Add idea');
```

#### Voir l'historique

```javascript
const history = await storageManager.adapter.getHistory();
console.log(history);
// [{ sha, message, author, date, files }, ...]
```

#### Comparer deux versions

```javascript
const diff = await storageManager.adapter.diff('HEAD~2', 'HEAD');
console.log(diff); // Liste des changements
```

#### Push vers GitHub (si configuré)

```javascript
await storageManager.adapter.push('origin', 'main');
```

#### Exporter backup complet

```javascript
const bundle = await storageManager.adapter.exportBundle();
// bundle contient .git complet + métadonnées
localStorage.setItem('backup', JSON.stringify(bundle));
```

---

## 🔄 Migration entre modes

### OAuth → PAT

```javascript
// 1. Révoquer OAuth sur GitHub
// 2. Créer PAT sur github.com/settings/tokens
// 3. Dans Pensine : Paramètres → Changer mode → PAT
```

### PAT → OAuth

```javascript
// 1. Déployer backend OAuth (voir OAUTH_SETUP.md)
// 2. Dans Pensine : Paramètres → Changer mode → OAuth
// 3. Autoriser sur GitHub
// 4. Ancien PAT automatiquement supprimé
```

### GitHub (OAuth/PAT) → Local

```javascript
// 1. Exporter données depuis GitHub (optionnel)
// 2. Dans Pensine : Paramètres → Changer mode → Local
// 3. Importer données si backup créé
```

### Local → GitHub (OAuth/PAT)

```javascript
// 1. Exporter données locales (Paramètres → Export)
// 2. Dans Pensine : Paramètres → Changer mode → OAuth/PAT
// 3. Configurer GitHub
// 4. Importer données exportées
```

---

## 🛡️ Sécurité comparée

### Analyse des risques

| Menace | OAuth | PAT | Local | Local Git |
|-------------------|-------|-----|-------|-----------|
| **XSS** | ✅ Protégé (HttpOnly) | ❌ Vulnérable | ✅ Protégé (pas de token) | ✅ Protégé (OPFS) |
| **CSRF** | ✅ Protégé (state) | ⚠️ Possible | N/A | N/A |
| **Token leakage** | ✅ Expire auto | ❌ Valide toujours | N/A | ⚠️ Si remote configuré |
| **Accès physique** | ⚠️ Cookie local | ❌ Token visible | ⚠️ Données locales | ⚠️ OPFS accessible |
| **Man-in-the-middle** | ✅ HTTPS | ✅ HTTPS | N/A | ✅ HTTPS (si push/pull) |

### Recommandations sécurité

**Pour production** :

1. ✅ Utiliser OAuth
2. ✅ Activer HTTPS uniquement
3. ✅ Monitorer tokens via GitHub
4. ✅ Renouveler secrets régulièrement

**Pour développement** :

1. ✅ PAT acceptable pour tests
2. ⚠️ Ne jamais commiter le token
3. ✅ Utiliser token avec scope minimal
4. ✅ Révoquer après usage

**Pour usage offline** :

1. ✅ Mode Local idéal (simple)
2. ✅ Mode Local Git idéal (avec historique Git)
3. ✅ Exporter backup régulièrement
4. ⚠️ Chiffrer backup si sensible
5. ⚠️ Ne pas partager exports

---

## 📦 Stockage des données

### OAuth Mode

```
Données : GitHub repo (cloud)
Token : In-memory (access) + KV storage (refresh)
Config : localStorage (owner, repo, branch)
Cache : Aucun (direct API)
```

### PAT Mode

```
Données : GitHub repo (cloud)
Token : localStorage (⚠️ clair)
Config : localStorage (owner, repo, branch, token)
Cache : Map() en mémoire (SHA)
```

### Local Mode

```
Données : IndexedDB (local)
Token : Aucun (pas d'API)
Config : localStorage (minimal)
Cache : Aucun (direct IndexedDB)
Historique : IndexedDB (30 jours)
```

### Local Git Mode

```
Données : OPFS (Origin Private File System)
Token : localStorage (si remote configuré)
Config : localStorage (author, remote optionnel)
Cache : Aucun (direct OPFS)
Historique : Complet dans .git (illimité)
```

---

## 🔧 Fonctionnalités par mode

| Fonctionnalité | OAuth | PAT | Local | Local Git |
|----------------|-------|-----|-------|-----------|
| Lire fichiers | ✅ | ✅ | ✅ | ✅ |
| Écrire fichiers | ✅ | ✅ | ✅ | ✅ |
| Supprimer fichiers | ✅ | ✅ | ✅ | ✅ |
| Lister répertoires | ✅ | ✅ | ✅ | ✅ |
| Historique commits | ✅ | ✅ | ✅ (local) | ✅ (Git complet) |
| Branches | ✅ | ✅ | ❌ | ✅ |
| Diff/Blame | ⚠️ GitHub | ⚠️ GitHub | ❌ | ✅ |
| Merge | ⚠️ GitHub | ⚠️ GitHub | ❌ | ✅ |
| Collaboration | ✅ | ✅ | ❌ | ⚠️ (via push/pull) |
| Export/Import | ⚠️ (via Git) | ⚠️ (via Git) | ✅ (natif) | ✅ (Git bundle) |
| Recherche fulltext | ✅ | ✅ | ✅ | ✅ |

---

## 💾 Limites de stockage

### OAuth/PAT (GitHub)

- **Limite fichier** : 100 MB par fichier
- **Limite repo** : 1 GB recommandé, 100 GB max
- **Requêtes API** : 5,000/heure (authentifié)
- **Coût** : Gratuit (repos publics/privés)

### Local (IndexedDB)

- **Limite navigateur** : Variable (50 MB - 10 GB selon navigateur)
- **Chrome/Edge** : ~60% espace disque libre
- **Firefox** : ~50% espace disque libre, max 2 GB par origine
- **Safari** : 1 GB max par origine
- **Coût** : Gratuit

### Local Git (OPFS)

- **Limite navigateur** : Variable selon implémentation OPFS
- **Chrome 102+** : ~60% espace disque libre (comme IndexedDB)
- **Edge 102+** : ~60% espace disque libre
- **Opera 89+** : Similaire à Chrome
- **Attention** : Historique Git peut devenir volumineux
- **Coût** : Gratuit

---

## 🎯 Matrice de décision

### Choisir OAuth si

- ✅ Vous avez besoin de synchronisation multi-appareils
- ✅ Vous travaillez en équipe
- ✅ La sécurité est prioritaire
- ✅ Vous pouvez déployer un backend Cloudflare
- ✅ Usage production long terme

### Choisir PAT si

- ✅ Vous développez/testez localement
- ✅ Vous voulez une config rapide
- ✅ Vous n'avez pas de backend OAuth
- ✅ Usage temporaire/personnel
- ⚠️ Pas en production !

### Choisir Local si

- ✅ Vous n'avez pas de compte GitHub
- ✅ Vous travaillez offline (avion, etc.)
- ✅ Données ultra-sensibles (pas de cloud)
- ✅ Vous n'avez pas besoin de sync
- ✅ Usage solo uniquement
- ✅ Simplicité maximale

### Choisir Local Git si

- ✅ Vous voulez le meilleur des deux mondes (offline + Git)
- ✅ Vous connaissez Git et ses concepts (commit, branch, merge)
- ✅ Vous avez besoin d'historique complet (pas de limite 30 jours)
- ✅ Vous voulez branches pour expérimentation
- ✅ Vous voulez diff/blame pour audit
- ✅ Synchronisation GitHub optionnelle quand connecté
- ✅ Backup professionnel avec bundle Git
- ⚠️ Nécessite navigateur moderne (Chrome 102+, Edge 102+, Opera 89+)

---

## 🔄 Changer de mode

### Dans l'interface Pensine

1. Cliquer sur **⚙️ Paramètres**
2. Section **Stockage**
3. Cliquer **Changer de mode**
4. Sélectionner nouveau mode
5. Suivre les instructions de configuration
6. (Optionnel) Exporter/importer données

### Recommandations migration

**GitHub → Local** :

```bash
# 1. Exporter depuis GitHub
git clone https://github.com/username/pensine-notes.git
# 2. Importer dans Local mode via l'interface
```

**Local → GitHub** :

```bash
# 1. Exporter depuis Local mode (JSON)
# 2. Configurer GitHub mode
# 3. Importer JSON via l'interface
# 4. Commit initial créé automatiquement
```

---

## 📚 Documentation complémentaire

- **OAuth Setup** : [`docs/OAUTH_SETUP.md`](OAUTH_SETUP.md)
- **OAuth Deployment** : [`docs/OAUTH_DEPLOYMENT.md`](OAUTH_DEPLOYMENT.md)
- **Security** : [`docs/SECURITY.md`](SECURITY.md)
- **Testing** : [`docs/TESTING_CHECKLIST.md`](TESTING_CHECKLIST.md)

---

## ❓ FAQ

### Puis-je utiliser plusieurs modes simultanément ?

Non, un seul mode actif à la fois. Mais vous pouvez changer de mode à tout moment.

### Mes données sont-elles perdues si je change de mode ?

Non, les données restent dans le stockage précédent. Utilisez Export/Import pour transférer.

### Quel mode est le plus rapide ?

Local > PAT > OAuth (latence réseau)

### Quel mode consomme le moins de batterie ?

Local (pas de requêtes réseau)

### OAuth est-il vraiment nécessaire ?

Pour production : OUI. Pour dev/tests : PAT suffit.

### Mode Local est-il sûr ?

Oui, mais les données sont perdues si vous effacez le cache navigateur. Exportez régulièrement !

### Quelle est la différence entre Local et Local Git ?

- **Local** : Simple, stockage clé-valeur IndexedDB, historique 30 jours
- **Local Git** : Vrai repo Git avec branches, commits illimités, diff, merge

### Local Git fonctionne dans quels navigateurs ?

Chrome 102+, Edge 102+, Opera 89+ (support OPFS requis). Safari et Firefox : pas encore.

### Puis-je synchroniser Local Git avec GitHub ?

Oui ! Configurez un remote GitHub et utilisez push/pull comme un vrai repo Git.

### Local Git est-il plus lent que Local ?

Légèrement, car Git fait plus de travail (commits, objects, refs). Mais acceptable pour usage normal.

---

**Version** : v0.2.0
**Dernière mise à jour** : 2025-12-15
**Mainteneur** : Stéphane Denis (@stephanedenis)
