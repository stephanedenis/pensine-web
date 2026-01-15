# 🌐 Configuration GitHub Pages pour pensine.org

## ✅ Fichiers Créés

Les fichiers suivants ont été créés pour GitHub Pages :

1. **`docs/CNAME`** - Configuration du domaine personnalisé
   ```
   pensine.org
   ```

2. **`docs/index.md`** - Page d'accueil de la documentation
   - Navigation vers toutes les sections
   - Design responsive
   - Liens vers journal de bord

3. **`docs/_config.yml`** - Configuration Jekyll
   - Thème : Cayman (GitHub officiel)
   - Plugins : relative-links, SEO, sitemap
   - Markdown : kramdown avec GFM

## 🚀 Étapes de Configuration

### 1. Activer GitHub Pages

1. Aller sur https://github.com/stephanedenis/pensine-web/settings/pages

2. Dans **Source** :
   - Branch : `main`
   - Folder : `/docs`

3. Cliquer sur **Save**

### 2. Configurer le DNS du Domaine

#### Si vous utilisez un registrar (ex: OVH, Gandi, Cloudflare)

Ajouter les enregistrements DNS suivants :

**Option A : Apex domain (pensine.org)**
```
Type: A
Host: @
Value: 185.199.108.153
TTL: 3600

Type: A
Host: @
Value: 185.199.109.153
TTL: 3600

Type: A
Host: @
Value: 185.199.110.153
TTL: 3600

Type: A
Host: @
Value: 185.199.111.153
TTL: 3600

Type: AAAA
Host: @
Value: 2606:50c0:8000::153
TTL: 3600

Type: AAAA
Host: @
Value: 2606:50c0:8001::153
TTL: 3600

Type: AAAA
Host: @
Value: 2606:50c0:8002::153
TTL: 3600

Type: AAAA
Host: @
Value: 2606:50c0:8003::153
TTL: 3600
```

**Option B : Subdomain www (www.pensine.org)**
```
Type: CNAME
Host: www
Value: stephanedenis.github.io
TTL: 3600
```

**Recommandé : Les deux**
- Apex domain (pensine.org) avec A records
- www subdomain (www.pensine.org) avec CNAME

### 3. Vérifier le Domaine dans GitHub

1. Retourner sur https://github.com/stephanedenis/pensine-web/settings/pages

2. Dans **Custom domain** :
   - Entrer : `pensine.org`
   - Cliquer sur **Save**

3. Cocher **Enforce HTTPS** (recommandé, disponible après propagation DNS)

### 4. Attendre la Propagation DNS

- DNS propagation : 15 minutes à 48 heures
- Vérifier avec : https://dnschecker.org/#A/pensine.org

### 5. Tester le Site

Une fois la propagation terminée :
- https://pensine.org
- https://stephanedenis.github.io/pensine-web (toujours accessible)

---

## 📁 Structure Documentation Publique

Voici ce qui sera publié sur pensine.org :

```
docs/
├── index.md                    # Page d'accueil ⭐
├── _config.yml                 # Config Jekyll
├── CNAME                       # Domain config
│
├── VISION.md                   # Vision du projet
├── SPECIFICATIONS_TECHNIQUES.md
├── SCENARIOS_DE_TEST.md
├── TESTING_CHECKLIST.md
│
├── PANINI_INTEGRATION_STRATEGY.md
├── PHASE1_1_SUMMARY.md
├── PHASE1_2_PLUGIN_SYSTEM_ADAPTATION.md
├── PLUGIN_MIGRATION_GUIDE.md
│
├── CONFIG_SYSTEM.md
├── STORAGE_MODES.md
├── OAUTH_SETUP.md
│
├── ACCELERATOR_START_HERE.md
├── ACCELERATOR_EXECUTIVE_SUMMARY.md
├── ACCELERATOR_DEVELOPMENT_PLAN.md
│
└── journal-de-bord/            # Journal technique ouvert
    ├── 2026-01-14_phase1-1-et-1-2-complete.md
    ├── 2025-12-14_securite-et-separation-repos.md
    └── ...
```

**Tout est public** ✅ - Aucun secret détecté

---

## 🎨 Personnalisation (Optionnel)

### Changer le Thème

Dans `docs/_config.yml` :
```yaml
theme: jekyll-theme-cayman        # Actuel
# Autres options:
# theme: jekyll-theme-minimal
# theme: jekyll-theme-slate
# theme: jekyll-theme-architect
```

### Ajouter un Logo

1. Placer le logo dans `docs/assets/`
2. Mettre à jour `index.md` :
   ```markdown
   ![Pensine Logo](assets/pensine-logo.png)
   ```

### Ajouter Google Analytics (Optionnel)

Dans `docs/_config.yml` :
```yaml
google_analytics: UA-XXXXXXXXX-X
```

---

## 🐛 Troubleshooting

### Le site ne se charge pas

1. Vérifier que GitHub Pages est activé (Settings → Pages)
2. Vérifier que le domaine est configuré
3. Attendre 5-10 minutes pour le premier build

### DNS ne résout pas

1. Vérifier les enregistrements DNS : `dig pensine.org`
2. Attendre propagation (jusqu'à 48h)
3. Essayer : https://stephanedenis.github.io/pensine-web

### HTTPS ne fonctionne pas

1. Attendre que DNS soit propagé
2. Retourner dans Settings → Pages
3. Cocher **Enforce HTTPS**

### Liens cassés

- Jekyll utilise `relative_links` plugin (activé dans `_config.yml`)
- Les liens `.md` sont automatiquement convertis en `.html`

---

## 📊 Monitoring

### Vérifier le Build

1. Aller sur https://github.com/stephanedenis/pensine-web/actions
2. Chercher "pages build and deployment"
3. Vérifier que le workflow est vert ✅

### Analytics

GitHub Pages ne fournit pas d'analytics par défaut. Options :

1. **Google Analytics** (gratuit)
   - Ajouter tracking ID dans `_config.yml`

2. **Cloudflare Analytics** (gratuit, privacy-friendly)
   - Si DNS géré par Cloudflare

3. **Plausible** (payant, privacy-first)

---

## 🔐 Sécurité

### HTTPS

- ✅ Enforcer HTTPS dans Settings → Pages
- ✅ Certificat Let's Encrypt automatique

### CNAME Protection

Le fichier `docs/CNAME` empêche d'autres repos d'utiliser votre domaine.

### Secrets

- ✅ Audit effectué : **Aucun secret dans docs/**
- ✅ Tous les tokens sont dans examples ou placeholders

---

## 📚 Ressources

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Jekyll Documentation](https://jekyllrb.com/docs/)
- [Configuring DNS](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)

---

**Créé** : 14 janvier 2026  
**Statut** : ✅ Prêt à déployer  
**Prochaine étape** : Activer GitHub Pages dans Settings
