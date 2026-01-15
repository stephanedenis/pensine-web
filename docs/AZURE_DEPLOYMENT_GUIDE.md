# Déploiement Accelerator sur Azure
## Guide pas-à-pas

**Abonnement** : ee35c0a9-2a11-42a7-a463-f0c6fb4d0d89
**Date** : 14 janvier 2026
**Status** : À exécuter après Phase 1 (client-side)

---

## 📋 Prérequis

- [ ] Azure CLI installé : `az --version`
- [ ] Compte Azure avec permissions
- [ ] Git configuré
- [ ] Python 3.11+
- [ ] PostgreSQL client (optionnel)

---

## Phase 1 : Setup Local

### 1.1 Cloner le code backend
```bash
# Créer dossier backend
mkdir -p pensine-accelerator-backend
cd pensine-accelerator-backend

# Initialiser git + venv
git init
python3.11 -m venv venv
source venv/bin/activate  # ou: .\venv\Scripts\activate (Windows)

# Installer dépendances
pip install fastapi uvicorn asyncpg psycopg2-binary python-dotenv
```

### 1.2 Créer structure de projet
```bash
mkdir -p {app,tests,migrations,docs}

cat > requirements.txt << 'EOF'
fastapi==0.104.1
uvicorn[standard]==0.24.0
asyncpg==0.29.0
psycopg2-binary==2.9.9
python-dotenv==1.0.0
pydantic==2.5.0
pydantic-settings==2.1.0
httpx==0.25.2
EOF

pip install -r requirements.txt
```

### 1.3 Créer .env.local
```bash
cat > .env.local << 'EOF'
# Database
DATABASE_URL=postgresql+asyncpg://pgadmin:password@localhost:5432/pensine_dev
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=pgadmin
DATABASE_PASSWORD=password
DATABASE_NAME=pensine_dev

# App
APP_ENV=development
APP_DEBUG=true
APP_HOST=0.0.0.0
APP_PORT=8000

# GitHub
GITHUB_API_URL=https://api.github.com

# Security
SECRET_KEY=dev-key-change-in-prod
CORS_ORIGINS=http://localhost:8000,http://localhost:3000

# Logging
LOG_LEVEL=INFO
EOF
```

### 1.4 Setup PostgreSQL local (Docker)
```bash
# Démarrer PostgreSQL
docker run --name pensine-postgres \
  -e POSTGRES_USER=pgadmin \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=pensine_dev \
  -p 5432:5432 \
  -d postgres:15

# Vérifier connexion
psql -h localhost -U pgadmin -d pensine_dev
```

### 1.5 Créer schéma initial
```bash
cat > migrations/001_init.sql << 'EOF'
-- Create users table (optional, for future)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    github_id INT UNIQUE,
    github_username VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexed notes
CREATE TABLE IF NOT EXISTS indexed_notes (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    github_owner VARCHAR(255) NOT NULL,
    github_repo VARCHAR(255) NOT NULL,
    note_id VARCHAR(255) NOT NULL,
    title TEXT,
    content TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    github_sha VARCHAR(40),

    UNIQUE(user_id, note_id)
);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_notes_fts ON indexed_notes
    USING GIN(to_tsvector('french', COALESCE(content, '') || ' ' || COALESCE(title, '')));

-- Wiki-links
CREATE TABLE IF NOT EXISTS wiki_links (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    source_note_id VARCHAR(255) NOT NULL,
    target_note_id VARCHAR(255) NOT NULL,
    link_text VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(user_id, source_note_id, target_note_id)
);

-- Backlinks index
CREATE INDEX IF NOT EXISTS idx_backlinks ON wiki_links(target_note_id, user_id);

-- Indexing stats
CREATE TABLE IF NOT EXISTS indexing_stats (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL UNIQUE,
    total_notes INT DEFAULT 0,
    indexed_notes INT DEFAULT 0,
    last_sync TIMESTAMP,
    sync_status VARCHAR(50)
);
EOF

# Appliquer migrations
psql -h localhost -U pgadmin -d pensine_dev -f migrations/001_init.sql
```

### 1.6 Créer app principale
```bash
cat > app/main.py << 'EOF'
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

# Load environment
load_dotenv('.env.local')

# Initialize FastAPI
app = FastAPI(
    title="Pensine Accelerator API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration
origins = os.getenv("CORS_ORIGINS", "").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/api/v1/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "ok",
        "version": "0.1.0",
        "environment": os.getenv("APP_ENV", "unknown")
    }

# Placeholder endpoints
@app.post("/api/v1/index/notes")
async def index_notes(payload: dict):
    """Index notes (placeholder)"""
    return {"indexed": 0, "duration_ms": 0}

@app.get("/api/v1/search")
async def search(query: str, limit: int = 20):
    """Search notes (placeholder)"""
    return {"results": []}

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("APP_HOST", "0.0.0.0")
    port = int(os.getenv("APP_PORT", "8000"))
    uvicorn.run(app, host=host, port=port)
EOF

# Test local
python app/main.py
# Visiter http://localhost:8000/docs
```

---

## Phase 2 : Déploiement Azure

### 2.1 Login Azure
```bash
az login
# Sélectionner l'abonnement ee35c0a9-2a11-42a7-a463-f0c6fb4d0d89
az account set --subscription "ee35c0a9-2a11-42a7-a463-f0c6fb4d0d89"

# Vérifier
az account show
```

### 2.2 Créer groupe de ressources
```bash
az group create \
  --name pensine-accelerator \
  --location westeurope

# Lister ressources
az group show -n pensine-accelerator
```

### 2.3 Créer App Service Plan
```bash
# Dev/Test (cheap)
az appservice plan create \
  --name pensine-accelerator-plan \
  --resource-group pensine-accelerator \
  --sku B1 \
  --is-linux

# Ou Production (scalable)
# az appservice plan create \
#   --name pensine-accelerator-plan \
#   --resource-group pensine-accelerator \
#   --sku S1 \
#   --is-linux
```

### 2.4 Créer App Service
```bash
az webapp create \
  --resource-group pensine-accelerator \
  --plan pensine-accelerator-plan \
  --name pensine-accelerator \
  --runtime "PYTHON:3.11" \
  --deployment-local-git
```

### 2.5 Créer PostgreSQL Database
```bash
# Créer serveur PostgreSQL
az postgres flexible-server create \
  --resource-group pensine-accelerator \
  --name pensine-accelerator-db \
  --location westeurope \
  --admin-user pgadmin \
  --admin-password "ChangeMe123!@" \
  --sku-name Standard_B1s \
  --storage-size 32 \
  --version 15 \
  --public-access 0.0.0.0 \
  --yes

# Vérifier création
az postgres flexible-server show \
  --resource-group pensine-accelerator \
  --name pensine-accelerator-db
```

### 2.6 Créer base de données
```bash
# Se connecter au serveur Azure
POSTGRES_HOST=$(az postgres flexible-server show \
  --resource-group pensine-accelerator \
  --name pensine-accelerator-db \
  --query fqdn -o tsv)

# Note: Vous devrez peut-être configurer le firewall d'abord
az postgres flexible-server firewall-rule create \
  --resource-group pensine-accelerator \
  --name pensine-accelerator-db \
  --rule-name allow-local \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 255.255.255.255

# Créer DB
psql -h "$POSTGRES_HOST" \
  -U pgadmin \
  -d postgres \
  -c "CREATE DATABASE pensine_prod;"

# Appliquer migrations
psql -h "$POSTGRES_HOST" \
  -U pgadmin \
  -d pensine_prod \
  -f migrations/001_init.sql
```

### 2.7 Configurer App Service
```bash
# Récupérer connection string PostgreSQL
DB_HOST=$(az postgres flexible-server show \
  --resource-group pensine-accelerator \
  --name pensine-accelerator-db \
  --query fqdn -o tsv)

# Configurer variables d'environnement
az webapp config appsettings set \
  --resource-group pensine-accelerator \
  --name pensine-accelerator \
  --settings \
    "DATABASE_URL=postgresql+asyncpg://pgadmin:ChangeMe123!@${DB_HOST}:5432/pensine_prod" \
    "APP_ENV=production" \
    "APP_DEBUG=false" \
    "SECRET_KEY=$(openssl rand -hex 32)" \
    "CORS_ORIGINS=https://pensine-web.github.io,https://localhost:8000"
```

### 2.8 Configurer Python Runtime
```bash
# Créer startup script
cat > startup.sh << 'EOF'
#!/bin/bash
pip install -r requirements.txt
python app/main.py
EOF

chmod +x startup.sh

# Configurer App Service
az webapp config set \
  --resource-group pensine-accelerator \
  --name pensine-accelerator \
  --startup-file "startup.sh"
```

### 2.9 Déployer code
```bash
# Récupérer git URL
REPO_URL=$(az webapp show \
  --resource-group pensine-accelerator \
  --name pensine-accelerator \
  --query id -o tsv)

git remote add azure "$REPO_URL"

# Deployer
git push azure main

# Vérifier logs
az webapp log tail \
  --resource-group pensine-accelerator \
  --name pensine-accelerator
```

### 2.10 Tester déploiement
```bash
# Récupérer URL app
APP_URL=$(az webapp show \
  --resource-group pensine-accelerator \
  --name pensine-accelerator \
  --query defaultHostName -o tsv)

echo "App running at: https://${APP_URL}"

# Health check
curl "https://${APP_URL}/api/v1/health"

# Devrait retourner:
# {"status":"ok","version":"0.1.0","environment":"production"}
```

---

## Phase 3 : Configuration HTTPS & Custom Domain

### 3.1 Ajouter certificate SSL
```bash
# Azure gère automatiquement *.azurewebsites.net

# Pour custom domain (optionnel):
# 1. Ajouter DNS CNAME
# 2. Ajouter custom domain
az webapp config hostname add \
  --resource-group pensine-accelerator \
  --name pensine-accelerator \
  --hostname pensine-accelerator.com  # Remplacer
```

### 3.2 Configurer HTTPS obligatoire
```bash
az webapp update \
  --resource-group pensine-accelerator \
  --name pensine-accelerator \
  --set httpsOnly=true
```

---

## Phase 4 : Monitoring & Maintenance

### 4.1 Activer Application Insights
```bash
az monitor app-insights component create \
  --app pensine-insights \
  --location westeurope \
  --resource-group pensine-accelerator \
  --application-type web

# Récupérer instrumentation key
INSIGHTS_KEY=$(az monitor app-insights component show \
  --app pensine-insights \
  --resource-group pensine-accelerator \
  --query instrumentationKey -o tsv)

# Ajouter à App Service
az webapp config appsettings set \
  --resource-group pensine-accelerator \
  --name pensine-accelerator \
  --settings "APPINSIGHTS_INSTRUMENTATIONKEY=${INSIGHTS_KEY}"
```

### 4.2 Configurer alertes
```bash
# Alerte si CPU > 80%
az monitor metrics alert create \
  --resource-group pensine-accelerator \
  --name "pensine-high-cpu" \
  --scopes "/subscriptions/ee35c0a9-2a11-42a7-a463-f0c6fb4d0d89/resourceGroups/pensine-accelerator/providers/Microsoft.Web/sites/pensine-accelerator" \
  --condition "avg CpuPercentage > 80" \
  --window-size 5m \
  --evaluation-frequency 1m
```

### 4.3 Configurer backups
```bash
# DB backup (Azure gère automatiquement)
# App Service backup (manual)
az webapp backup create \
  --resource-group pensine-accelerator \
  --name pensine-accelerator \
  --backup-name "pensine-backup-$(date +%Y%m%d-%H%M%S)"
```

---

## 🔧 Troubleshooting

### App ne démarre pas
```bash
# Vérifier logs
az webapp log tail -n pensine-accelerator -g pensine-accelerator

# Vérifier settings
az webapp config appsettings list \
  -n pensine-accelerator \
  -g pensine-accelerator

# Redémarrer
az webapp restart \
  -n pensine-accelerator \
  -g pensine-accelerator
```

### Base de données inaccessible
```bash
# Vérifier firewall
az postgres flexible-server firewall-rule list \
  -n pensine-accelerator-db \
  -g pensine-accelerator

# Tester connexion
psql -h pensine-accelerator-db.postgres.database.azure.com \
  -U pgadmin \
  -d pensine_prod \
  -c "SELECT 1"
```

### Performance lente
```bash
# Vérifier metrics
az monitor metrics list \
  --resource "/subscriptions/ee35c0a9-2a11-42a7-a463-f0c6fb4d0d89/resourceGroups/pensine-accelerator/providers/Microsoft.Web/sites/pensine-accelerator" \
  --metric "CpuTime,MemoryWorkingSet"

# Scale up si nécessaire
az appservice plan update \
  --name pensine-accelerator-plan \
  --resource-group pensine-accelerator \
  --sku S1  # Upgrade de B1 à S1
```

---

## 📊 Checklist Déploiement

- [ ] **Préparation local**
  - [ ] Code backend complété
  - [ ] Requirements.txt à jour
  - [ ] Tests locaux passent

- [ ] **Setup Azure**
  - [ ] Groupe de ressources créé
  - [ ] App Service Plan créé
  - [ ] App Service créé
  - [ ] PostgreSQL créé

- [ ] **Configuration**
  - [ ] Variables d'environnement définies
  - [ ] Database migrations appliquées
  - [ ] CORS configuré
  - [ ] SSL activé

- [ ] **Déploiement**
  - [ ] Code pushé vers Azure
  - [ ] Startup script configuré
  - [ ] Health check répond

- [ ] **Monitoring**
  - [ ] Application Insights activé
  - [ ] Alertes configurées
  - [ ] Backups planifiés

- [ ] **Documentation**
  - [ ] URLs documentées
  - [ ] Credentials sécurisés
  - [ ] Runbook de maintenance

---

## 📞 Ressources

- [Azure WebApps Documentation](https://docs.microsoft.com/azure/app-service/)
- [Azure Database for PostgreSQL](https://docs.microsoft.com/azure/postgresql/)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
- [Application Insights](https://docs.microsoft.com/azure/azure-monitor/app/app-insights-overview)

---

**Version** : 1.0
**Créé** : 14 janvier 2026
**Prêt** : Après Phase 1 (plugin client-side complété)
