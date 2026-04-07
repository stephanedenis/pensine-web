# 🔐 OAuth Setup Guide for Pensine

Cette guide vous explique comment configurer l'authentification OAuth pour Pensine, offrant une sécurité renforcée par rapport aux Personal Access Tokens (PAT).

## 📋 Table des matières

- [Pourquoi OAuth ?](#pourquoi-oauth)
- [Architecture](#architecture)
- [Prérequis](#prérequis)
- [Installation étape par étape](#installation-étape-par-étape)
- [Configuration Frontend](#configuration-frontend)
- [Configuration Backend (Cloudflare Workers)](#configuration-backend-cloudflare-workers)
- [Testing](#testing)
- [Migration des utilisateurs existants](#migration-des-utilisateurs-existants)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## Pourquoi OAuth ?

### Problèmes avec PAT (Personal Access Tokens)

- ❌ Stocké en clair dans `localStorage`
- ❌ Vulnérable aux attaques XSS
- ❌ Pas d'expiration automatique
- ❌ Révocation manuelle difficile
- ❌ Scopes trop larges

### Avantages OAuth

- ✅ Token jamais stocké dans le navigateur
- ✅ Protection contre XSS (HttpOnly cookies)
- ✅ Expiration automatique (1 heure)
- ✅ Refresh tokens sécurisés
- ✅ Révocation facile depuis GitHub
- ✅ Scopes minimaux (repo uniquement)

---

## Architecture

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│   Browser   │◄───────►│ Cloudflare Worker│◄───────►│   GitHub    │
│   (Client)  │         │   (OAuth Backend)│         │   API       │
└─────────────┘         └──────────────────┘         └─────────────┘
      │                          │
      │                          │
      ├─ Access Token            ├─ Refresh Token (KV)
      │  (in-memory)             ├─ HttpOnly Cookie
      │                          └─ CSRF Protection
      └─ No localStorage!
```

### Flux OAuth

1. **Login** : User clique "Se connecter avec GitHub"
2. **Redirect** : GitHub demande autorisation
3. **Callback** : GitHub redirige avec `code`
4. **Exchange** : Worker échange `code` contre `access_token` + `refresh_token`
5. **Storage** :
   - `access_token` → in-memory (browser)
   - `refresh_token` → KV storage + HttpOnly cookie
6. **Refresh** : Worker renouvelle automatiquement après expiration

---

## Prérequis

### GitHub

- Compte GitHub avec droits admin sur le repo Pensine
- Repo privé (recommandé) ou public

### Cloudflare

- Compte Cloudflare (gratuit)
- Workers quota : 100,000 req/jour (gratuit)
- KV namespace pour stocker refresh tokens

### Local

- Node.js 18+ (pour Wrangler CLI)
- npm ou yarn

---

## Installation étape par étape

### Étape 1 : Créer GitHub OAuth App

1. Aller sur [github.com/settings/developers](https://github.com/settings/developers)
2. Cliquer **New OAuth App**
3. Remplir :

   ```
   Application name: Pensine
   Homepage URL: https://votre-domaine.com
   Authorization callback URL: https://votre-domaine.com/oauth-callback.html
   ```

4. Cliquer **Register application**
5. **Noter** :
   - Client ID (exemple : `Iv1.a1b2c3d4e5f6g7h8`)
   - Client Secret (cliquer **Generate a new client secret**)

⚠️ **IMPORTANT** : Ne JAMAIS commiter le Client Secret dans Git !

---

### Étape 2 : Déployer Cloudflare Worker

#### 2.1 Installer Wrangler CLI

```bash
npm install -g wrangler

# Authentifier
wrangler login
```

#### 2.2 Créer KV Namespace

```bash
cd workers/

# Créer namespace pour production
wrangler kv:namespace create "OAUTH_KV"

# Créer namespace pour preview (dev)
wrangler kv:namespace create "OAUTH_KV" --preview
```

Wrangler affichera les IDs :

```
✅ Created namespace with id "abcd1234..."
✅ Created preview namespace with id "efgh5678..."
```

#### 2.3 Configurer wrangler.toml

Éditer `workers/wrangler.toml` :

```toml
name = "pensine-oauth"
compatibility_date = "2025-01-01"
main = "oauth.js"

# Remplacer avec vos IDs de l'étape 2.2
[[kv_namespaces]]
binding = "OAUTH_KV"
id = "abcd1234..."  # ← Votre ID de production
preview_id = "efgh5678..."  # ← Votre ID de preview
```

#### 2.4 Configurer les secrets

```bash
# Client Secret GitHub (depuis Étape 1)
wrangler secret put GITHUB_CLIENT_SECRET
# → Copier-coller le Client Secret

# Clé de signature JWT (générer une clé aléatoire)
openssl rand -base64 32 | wrangler secret put JWT_SECRET
```

#### 2.5 Déployer le Worker

```bash
wrangler deploy
```

Wrangler affichera l'URL :

```
✅ Published pensine-oauth (1.23 sec)
   https://pensine-oauth.YOUR_SUBDOMAIN.workers.dev
```

⚠️ **Noter cette URL** pour l'Étape 3 !

---

### Étape 3 : Configurer le Frontend

#### 3.1 Éditer config.js

```javascript
// Remplacer les placeholders
window.GITHUB_OAUTH_CLIENT_ID = 'Iv1.a1b2c3d4e5f6g7h8';  // ← Votre Client ID
window.OAUTH_CALLBACK_URL = 'https://votre-domaine.com/oauth-callback.html';
window.OAUTH_BACKEND_URL = 'https://pensine-oauth.YOUR_SUBDOMAIN.workers.dev';
```

#### 3.2 Vérifier index.html

Les scripts doivent être chargés dans cet ordre :

```html
<script src="config.js"></script>
<script src="lib/github-oauth.js"></script>
<script src="lib/migrate-to-oauth.js"></script>
<script src="lib/github-adapter.js"></script>
<!-- ... autres scripts ... -->
```

#### 3.3 Déployer le frontend

```bash
# Option 1 : GitHub Pages
git add .
git commit -m "feat: OAuth authentication"
git push origin main

# Option 2 : Cloudflare Pages
wrangler pages deploy .
```

---

### Étape 4 : Mettre à jour GitHub OAuth App

Retourner sur [github.com/settings/developers](https://github.com/settings/developers) et mettre à jour :

```
Homepage URL: https://votre-domaine-reel.com  # ← URL de production
Authorization callback URL: https://votre-domaine-reel.com/oauth-callback.html
```

---

## Configuration Backend (Cloudflare Workers)

### Variables d'environnement

Le Worker utilise ces variables (configurées via `wrangler secret`) :

| Variable | Description | Exemple |
|----------|-------------|---------|
| `GITHUB_CLIENT_SECRET` | Client Secret de GitHub OAuth App | `1234567890abcdef...` |
| `JWT_SECRET` | Clé pour signer les JWT | `random_base64_string` |

### KV Storage

Le Worker stocke :

```javascript
// Key format: refresh_token:<hash>
{
  "userId": "12345678",
  "username": "john-doe",
  "createdAt": "2025-01-15T10:30:00Z",
  "expiresAt": "2025-07-15T10:30:00Z"  // 6 mois
}
```

### Endpoints

Le Worker expose :

- `POST /token` : Échanger code contre tokens
- `POST /refresh` : Renouveler access_token
- `POST /revoke` : Révoquer refresh_token
- `GET /verify` : Vérifier validité token

---

## Testing

### Test Local (sans déploiement)

#### 1. Tester le Worker localement

```bash
cd workers/
wrangler dev
```

Worker disponible sur `http://localhost:8787`

#### 2. Mettre à jour config.js temporairement

```javascript
window.OAUTH_BACKEND_URL = 'http://localhost:8787';
```

#### 3. Lancer Pensine

```bash
python3 -m http.server 8000
firefox http://localhost:8000
```

#### 4. Tester le flux OAuth

1. Cliquer "Se connecter avec GitHub"
2. Autoriser l'app sur GitHub
3. Vérifier redirection vers `/oauth-callback.html`
4. Vérifier token dans DevTools :

   ```javascript
   window.githubOAuth.isAuthenticated()  // → true
   ```

### Test Production

1. Déployer Worker et Frontend
2. Visiter l'URL de production
3. Tester flux OAuth complet
4. Vérifier cookies HttpOnly dans DevTools (Application > Cookies)

---

## Migration des utilisateurs existants

### Flux automatique

1. **Détection** : `migrate-to-oauth.js` détecte ancien PAT
2. **Modal** : Affiche popup d'information
3. **Choix** :
   - Migrer → supprime PAT, redirige vers OAuth
   - Annuler → banner d'avertissement permanent
4. **Nettoyage** : Supprime PAT de localStorage après OAuth

### Migration manuelle

Si l'utilisateur a dismissé le banner :

```javascript
// Dans la console DevTools
localStorage.removeItem('github-token');
location.reload();
```

---

## Monitoring

### Logs Cloudflare

Voir les logs du Worker :

```bash
wrangler tail
```

### Métriques

Dashboard Cloudflare Workers :

- Nombre de requêtes
- Taux d'erreur
- Latence P50/P99

### Alertes

Configurer des alertes Cloudflare pour :

- Taux d'erreur > 5%
- Latence P99 > 2s
- Quota dépassé

---

## Troubleshooting

### Erreur : "OAuth client not configured"

**Cause** : `config.js` non chargé ou Client ID invalide

**Solution** :

1. Vérifier `config.js` est chargé en premier
2. Vérifier `GITHUB_OAUTH_CLIENT_ID` est correct
3. Console : `window.GITHUB_OAUTH_CLIENT_ID`

### Erreur : "Token exchange failed"

**Cause** : Worker ne peut pas échanger le code

**Solutions** :

1. Vérifier `GITHUB_CLIENT_SECRET` est correct :

   ```bash
   wrangler secret list
   ```

2. Vérifier Worker est déployé :

   ```bash
   curl https://pensine-oauth.YOUR_SUBDOMAIN.workers.dev/verify
   ```

3. Vérifier logs :

   ```bash
   wrangler tail
   ```

### Erreur : "CSRF token mismatch"

**Cause** : Attaque CSRF ou state perdu

**Solution** :

1. Vérifier cookies non bloqués (pas de mode strict)
2. Relancer le flux OAuth depuis le début
3. Vérifier `state` parameter dans URL

### Token expiry issues

**Symptôme** : Déconnexion après 1 heure

**Cause** : Refresh automatique échoue

**Solutions** :

1. Vérifier `refresh_token` dans KV :

   ```bash
   wrangler kv:key list --namespace-id=abcd1234
   ```

2. Vérifier logs refresh :

   ```bash
   wrangler tail | grep refresh
   ```

3. Se reconnecter manuellement si nécessaire

### CORS issues

**Symptôme** : Erreur CORS dans console

**Cause** : Headers CORS manquants dans Worker

**Solution** : Vérifier `oauth.js` retourne :

```javascript
headers: {
  'Access-Control-Allow-Origin': 'https://votre-domaine.com',
  'Access-Control-Allow-Credentials': 'true'
}
```

---

## Sécurité Hardening

### Production checklist

- [ ] HTTPS uniquement (pas de HTTP)
- [ ] `Secure` flag sur cookies
- [ ] `SameSite=Strict` sur cookies
- [ ] CSRF protection activée
- [ ] Rate limiting configuré (Cloudflare)
- [ ] Secrets rotés régulièrement
- [ ] Monitoring actif
- [ ] Backup KV namespace
- [ ] Documentation à jour

### Rotation des secrets

Tous les 90 jours :

```bash
# Générer nouveau JWT_SECRET
openssl rand -base64 32 | wrangler secret put JWT_SECRET

# Redéployer
wrangler deploy
```

### Audit régulier

- Vérifier tokens révoqués sur GitHub
- Nettoyer KV namespace (tokens expirés)
- Analyser logs pour patterns suspects

---

## Support

- **Documentation** : [`docs/SECURITY.md`](SECURITY.md)
- **Deployment** : [`docs/OAUTH_DEPLOYMENT.md`](OAUTH_DEPLOYMENT.md)
- **Issues** : [GitHub Issues](https://github.com/stephanedenis/pensine-web/issues)

---

**Version** : v0.1.0
**Dernière mise à jour** : 2025-01-15
**Mainteneur** : Stéphane Denis (@stephanedenis)
