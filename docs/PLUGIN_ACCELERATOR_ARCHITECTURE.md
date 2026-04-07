# Plugin Accelerator - Architecture Hybride Client/Server

**Date** : 14 janvier 2026
**Type** : Plugin optionnel de performance
**Status** : Design phase
**Dépendance obligatoire** : ❌ Non - fonctionne dégradé sans backend

---

## 🎯 Objectif

Accélérer les opérations courantes (wiki-links, search, indexation) avec un backend optionnel **sans casser la compatibilité client-side**.

### Performance Targets

- Wiki-links resolution : < 100ms
- Full-text search : < 500ms
- Indexation : background (async)

---

## 🏗️ Architecture

### Mode 1 : Client-Side Only (Default)

```
User's Browser
    ↓
Plugin Accelerator (Mode Dégradé)
    ├── IndexedDB (index local)
    ├── localStorage (cache)
    └── localStorage (wiki-links graph)
    ↓
GitHub API (pas de dépendance serveur)
```

**Avantage** : Fonctionne totalement offline
**Limitation** : Performance sur gros volumes (1000+ notes)

---

### Mode 2 : Hybrid Client + Azure Backend (Optionnel)

```
User's Browser
    ↓
Plugin Accelerator (Mode Accéléré)
    ├── Client cache (IndexedDB)
    ├── Server index (PostgreSQL Azure)
    ├── Real-time sync (WebSocket)
    └── Graceful fallback si serveur down
    ↓
GitHub API (données + Azure API (index + search)
```

**Avantage** : Performance maximale, search distribuée
**Optionnel** : Utilisateur choisit d'activer

---

## 🔌 Configuration Plugin

```json
{
  "plugins": {
    "accelerator": {
      "enabled": true,
      "mode": "client-only",
      "serverUrl": null,
      "features": {
        "wikiLinks": true,
        "fullTextSearch": true,
        "graphVisualization": true,
        "backlinkDetection": true
      },
      "indexing": {
        "autoIndex": true,
        "backgroundSync": true,
        "cacheSize": "100MB"
      }
    }
  }
}
```

---

## 📦 Infos Azure (optionnel)

```
Abonnement : ee35c0a9-2a11-42a7-a463-f0c6fb4d0d89

Ressources recommandées :
├── App Service (Python 3.11)
│   ├── Runtime : Python
│   ├── Framework : FastAPI
│   ├── Size : B1 (dev) → B2 (prod)
│   └── Region : West Europe (ou région utilisateur)
│
├── PostgreSQL Database
│   ├── Version : 15
│   ├── Size : B_Standard_B1s
│   ├── Backup : 7 jours
│   └── SSL : Required
│
└── Application Insights (monitoring)
    ├── Logs
    ├── Performance metrics
    └── Error tracking
```

---

## 🛠️ Tech Stack Backend

### Option A : FastAPI (Recommandé pour async)

```python
# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncpg
import logging

app = FastAPI()

# CORS pour navigateur + Pensine
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000", "https://pensine-web.github.io"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}

@app.post("/api/v1/index/notes")
async def index_notes(userId: str, notes: List[dict]):
    """Index une batch de notes pour recherche rapide"""
    # Insérer dans PostgreSQL
    # Retourner indexed_count

@app.get("/api/v1/search")
async def search(userId: str, query: str):
    """Full-text search sur les notes indexées"""
    # Requête PostgreSQL FTS
    # Retourner top 20 résultats

@app.get("/api/v1/backlinks")
async def get_backlinks(userId: str, noteId: str):
    """Trouver tous les backlinks d'une note"""
    # Requête PostgreSQL
    # Retourner liste des notes qui pointent vers noteId
```

### Option B : Django + DRF (Plus heavyweight mais solide)

```python
# settings.py
INSTALLED_APPS = [
    'rest_framework',
    'corsheaders',
    'notes',  # app pour notes indexées
]

# notes/models.py
class IndexedNote(models.Model):
    user_id = models.CharField(max_length=255)
    note_id = models.CharField(max_length=255)
    title = models.CharField(max_length=500)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['user_id', 'note_id']),
        ]
```

**Recommandation** : FastAPI (plus léger, async natif, déploiement Azure facile)

---

## 💾 Schema PostgreSQL

```sql
-- Table d'indexation
CREATE TABLE indexed_notes (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    github_owner VARCHAR(255) NOT NULL,
    github_repo VARCHAR(255) NOT NULL,
    note_id VARCHAR(255) NOT NULL,
    title TEXT,
    content TEXT,
    keywords TEXT[], -- for GIN index
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    github_sha VARCHAR(40), -- SHA du commit

    UNIQUE(user_id, note_id),
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Full-text search index
CREATE INDEX idx_notes_fts ON indexed_notes
    USING GIN(to_tsvector('french', content || ' ' || title));

-- Wiki-links graph
CREATE TABLE wiki_links (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    source_note_id VARCHAR(255) NOT NULL,
    target_note_id VARCHAR(255) NOT NULL,
    link_text VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(user_id, source_note_id, target_note_id),
    CONSTRAINT fk_source FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Index pour backlinks rapides
CREATE INDEX idx_backlinks ON wiki_links(target_note_id, user_id);

-- Stats (optionnel mais utile)
CREATE TABLE indexing_stats (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    total_notes INT DEFAULT 0,
    indexed_notes INT DEFAULT 0,
    last_sync TIMESTAMP,
    sync_status VARCHAR(50), -- pending, syncing, done

    UNIQUE(user_id)
);
```

---

## 🔌 API REST Backend

### Authentication

```javascript
// Plugin envoie header Authorization
headers: {
    'Authorization': 'Bearer ' + userToken,
    'X-User-Id': userId,
    'X-GitHub-Repo': 'owner/repo'
}
```

### Endpoints

#### 1. Health Check

```
GET /api/v1/health
→ { "status": "ok", "version": "1.0.0" }
```

#### 2. Index Notes (Batch)

```
POST /api/v1/index/notes
Body: {
    "notes": [
        { "id": "2025-01-14.md", "title": "...", "content": "..." },
        ...
    ]
}
→ { "indexed": 42, "duration_ms": 156 }
```

#### 3. Full-Text Search

```
GET /api/v1/search?query=wiki+links&limit=20
→ {
    "results": [
        { "noteId": "...", "title": "...", "snippet": "..." },
        ...
    ]
}
```

#### 4. Get Backlinks

```
GET /api/v1/backlinks/{noteId}
→ {
    "backlinks": [
        { "sourceId": "...", "linkText": "..." },
        ...
    ]
}
```

#### 5. Get Wiki Graph

```
GET /api/v1/graph
→ {
    "nodes": [ { "id": "...", "title": "..." }, ... ],
    "edges": [ { "source": "...", "target": "..." }, ... ]
}
```

#### 6. Sync Status

```
GET /api/v1/sync/status
→ {
    "indexed": 42,
    "pending": 3,
    "lastSync": "2025-01-14T10:30:00Z",
    "status": "synced"
}
```

---

## 📱 Client Plugin - Mode Dégradé

### Initialisation

```javascript
// plugins/pensine-plugin-accelerator/accelerator-plugin.js

export default class AcceleratorPlugin {
    constructor(context) {
        this.id = 'accelerator';
        this.context = context;
        this.serverUrl = null;
        this.indexDB = null;
        this.online = false; // Détection du serveur
    }

    async enable() {
        // Config depuis ConfigManager
        const config = this.context.config.getPluginConfig(this.id);

        // Initialiser IndexedDB (toujours dispo)
        this.indexDB = new AcceleratorIndexedDB();
        await this.indexDB.init();

        // Si backend configuré, tenter la connexion
        if (config.serverUrl) {
            this.serverUrl = config.serverUrl;
            await this.checkServerHealth();

            if (this.online) {
                // Sync avec serveur si online
                await this.syncWithServer();
            }
        }

        console.log(`[Accelerator] Enabled (mode: ${this.online ? 'hybrid' : 'client-only'})`);
    }

    async checkServerHealth() {
        try {
            const response = await fetch(`${this.serverUrl}/api/v1/health`, {
                timeout: 2000
            });
            this.online = response.ok;
        } catch (error) {
            console.warn('[Accelerator] Server unavailable, using client-only mode');
            this.online = false;
        }
    }

    // Recherche : utilise serveur si online, fallback à local
    async search(query) {
        if (this.online) {
            try {
                return await this.searchOnServer(query);
            } catch (error) {
                console.warn('Server search failed, falling back to local');
            }
        }

        // Fallback : recherche locale
        return await this.indexDB.search(query);
    }

    async searchOnServer(query) {
        const response = await fetch(
            `${this.serverUrl}/api/v1/search?query=${encodeURIComponent(query)}`,
            {
                headers: {
                    'Authorization': `Bearer ${this.context.config.get('github-token')}`
                }
            }
        );
        return await response.json();
    }

    // Wiki-links : même pattern
    async resolveWikiLink(linkText) {
        if (this.online) {
            try {
                return await this.resolveOnServer(linkText);
            } catch (error) {
                console.warn('Wiki-links resolution failed, using local cache');
            }
        }

        return await this.indexDB.resolveWikiLink(linkText);
    }
}
```

### Fallback Pattern

```javascript
async searchNotes(query) {
    const results = {
        source: 'client',  // ou 'server'
        items: [],
        confidence: 'high'  // ou 'degraded'
    };

    try {
        // Essayer serveur d'abord
        if (this.serverUrl && this.online) {
            results.items = await this.searchOnServer(query);
            results.source = 'server';
            results.confidence = 'high';
        } else {
            // Fallback immédiat à local
            results.items = await this.indexDB.search(query);
            results.source = 'client';
            results.confidence = 'medium';  // Moins à jour
        }
    } catch (error) {
        // Erreur serveur : revenir au local
        console.error('Search error:', error);
        results.items = await this.indexDB.search(query);
        results.source = 'client-fallback';
        results.confidence = 'degraded';
    }

    return results;
}
```

---

## 🔄 Sync Strategy

### Sync à la demande

```javascript
async manualSync() {
    if (!this.online) {
        console.log('[Accelerator] Server offline, sync postponed');
        return false;
    }

    const notes = await this.getAllNotes();
    const response = await fetch(`${this.serverUrl}/api/v1/index/notes`, {
        method: 'POST',
        body: JSON.stringify({ notes })
    });

    const result = await response.json();
    console.log(`[Accelerator] Synced ${result.indexed} notes`);
    return true;
}
```

### Sync au fond (background)

```javascript
startBackgroundSync(intervalMs = 300000) {
    // Toutes les 5 minutes si online
    setInterval(async () => {
        if (this.online) {
            await this.manualSync();
        }
    }, intervalMs);
}
```

---

## ⚙️ Déploiement Azure

### Infrastructure as Code (ARM Template)

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "appName": {
      "type": "string",
      "defaultValue": "pensine-accelerator"
    }
  },
  "resources": [
    {
      "type": "Microsoft.Web/serverfarms",
      "apiVersion": "2021-02-01",
      "name": "[concat(parameters('appName'), '-plan')]",
      "location": "[resourceGroup().location]",
      "sku": {
        "name": "B1",
        "tier": "Basic",
        "capacity": 1
      }
    },
    {
      "type": "Microsoft.Web/sites",
      "apiVersion": "2021-02-01",
      "name": "[parameters('appName')]",
      "location": "[resourceGroup().location]",
      "properties": {
        "serverFarmId": "[resourceId('Microsoft.Web/serverfarms', concat(parameters('appName'), '-plan'))]"
      }
    },
    {
      "type": "Microsoft.DBforPostgreSQL/servers",
      "apiVersion": "2017-12-01",
      "name": "[concat(parameters('appName'), '-db')]",
      "location": "[resourceGroup().location]",
      "properties": {
        "createMode": "Default",
        "version": "15",
        "administratorLogin": "pgadmin",
        "storageProfile": {
          "storageMB": 102400
        }
      }
    }
  ]
}
```

### Déploiement CLI

```bash
# 1. Créer groupe de ressources
az group create \
  --name pensine-accelerator \
  --location westeurope

# 2. Déployer template
az deployment group create \
  --name pensine-deployment \
  --resource-group pensine-accelerator \
  --template-file arm-template.json

# 3. Déployer code Python
az webapp deployment source config-zip \
  --resource-group pensine-accelerator \
  --name pensine-accelerator \
  --src deploy.zip

# 4. Tester
curl https://pensine-accelerator.azurewebsites.net/api/v1/health
```

---

## 🧪 Tests Plugin

### Tests unitaires (client)

```javascript
// tests/accelerator-plugin.spec.js

describe('AcceleratorPlugin - Mode Dégradé', () => {
    it('should search locally when server offline', async () => {
        const plugin = new AcceleratorPlugin(mockContext);
        plugin.online = false;  // Simuler serveur offline

        const results = await plugin.search('wiki');

        expect(results.source).toBe('client');
        expect(results.items.length).toBeGreaterThan(0);
    });

    it('should fallback to local on server error', async () => {
        const plugin = new AcceleratorPlugin(mockContext);
        plugin.serverUrl = 'http://invalid.url';

        const results = await plugin.search('wiki');

        expect(results.source).toBe('client-fallback');
        expect(results.confidence).toBe('degraded');
    });

    it('should prefer server results when online', async () => {
        const plugin = new AcceleratorPlugin(mockContext);
        plugin.online = true;

        const results = await plugin.search('wiki');

        expect(results.source).toBe('server');
        expect(results.confidence).toBe('high');
    });
});
```

### Tests d'intégration (server)

```python
# tests/test_api.py

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_index_notes():
    payload = {
        "notes": [
            {"id": "note1", "title": "Test", "content": "Content"}
        ]
    }
    response = client.post("/api/v1/index/notes", json=payload)
    assert response.status_code == 200
    assert response.json()["indexed"] == 1

def test_search():
    response = client.get("/api/v1/search?query=test")
    assert response.status_code == 200
    results = response.json()
    assert "results" in results
```

---

## 🔐 Sécurité

### OAuth avec GitHub

```python
# app/auth.py
from fastapi import Depends, HTTPException

async def verify_github_token(token: str):
    """Vérifier le token GitHub"""
    headers = {'Authorization': f'Bearer {token}'}
    response = await httpx.get(
        'https://api.github.com/user',
        headers=headers
    )

    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid token")

    return response.json()

@app.post("/api/v1/index/notes")
async def index_notes(
    notes: List[dict],
    current_user = Depends(verify_github_token)
):
    user_id = current_user['id']
    # Insérer notes avec user_id
```

### Chiffrement en transit

```
HTTPS obligatoire (certificat Azure)
CORS restreint à domaines connus
Rate limiting (50 req/min par utilisateur)
```

---

## 📊 Architecture Globale

```
┌─────────────────────────────────────────────────────────┐
│                  User's Browser                         │
│  ┌────────────────────────────────────────────────────┐ │
│  │         Pensine Web App (Vanilla JS)               │ │
│  │  ┌──────────────────────────────────────────────┐  │ │
│  │  │  Plugin Accelerator                          │  │ │
│  │  │  ├─ Mode: auto-detect (server health check) │  │ │
│  │  │  ├─ IndexedDB (cache local)                 │  │ │
│  │  │  ├─ Wiki-links resolver                     │  │ │
│  │  │  └─ Full-text search                        │  │ │
│  │  └──────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────┘ │
│            ↓         ↓         ↓                        │
│        GitHub API  Local  Azure API (optional)         │
└─────────────────────────────────────────────────────────┘
         ↓                              ↓
    GitHub                      ┌──────────────────┐
  (source of truth)             │  Azure Backend   │
                                │  ┌────────────┐  │
                                │  │ PostgreSQL │  │
                                │  │ Full-Text  │  │
                                │  │ Search     │  │
                                │  └────────────┘  │
                                │                  │
                                │ FastAPI Server  │
                                │ - Indexing      │
                                │ - Sync          │
                                │ - Search        │
                                └──────────────────┘
```

---

## 📝 Configuration Utilisateur

Dans `.pensine-config.json` :

```json
{
  "core": { ... },
  "plugins": {
    "accelerator": {
      "enabled": true,
      "mode": "auto",
      "serverUrl": "https://pensine-accelerator.azurewebsites.net",
      "features": {
        "wikiLinks": true,
        "fullTextSearch": true,
        "graphVisualization": false,
        "backlinkDetection": true
      },
      "indexing": {
        "autoIndex": true,
        "backgroundSync": true,
        "syncInterval": 300000,
        "cacheSize": "100MB"
      },
      "performance": {
        "searchTimeout": 2000,
        "syncTimeout": 5000,
        "retryAttempts": 3
      }
    }
  }
}
```

---

## ✅ Checklist d'implémentation

- [ ] **Client-side uniquement** (Phase 1)
  - [ ] Classe AcceleratorPlugin
  - [ ] IndexedDB wrapper
  - [ ] Wiki-links resolver
  - [ ] Full-text search local
  - [ ] Tests unitaires

- [ ] **Backend optionnel** (Phase 2)
  - [ ] FastAPI app
  - [ ] PostgreSQL schema
  - [ ] REST API endpoints
  - [ ] Sync logic
  - [ ] Tests intégration

- [ ] **Déploiement Azure** (Phase 3)
  - [ ] ARM template
  - [ ] Environment variables
  - [ ] SSL certificate
  - [ ] Monitoring
  - [ ] Docs de déploiement

- [ ] **Documentation** (Ongoing)
  - [ ] Setup guide
  - [ ] API docs (Swagger)
  - [ ] Troubleshooting
  - [ ] Performance benchmarks

---

## 🚀 Prochaines étapes

1. **Semaine 1** : Implémenter client-side (peut fonctionner seul)
2. **Semaine 2** : Créer backend minimal sur Azure
3. **Semaine 3** : Intégrer et tester le hybrid mode
4. **Semaine 4** : Optimiser performance, monitoring

---

**Version** : 0.1 (Design)
**Auteur** : Architecture Pensine
**Dernier update** : 14 janvier 2026
**Status** : Prêt pour implémentation Phase 1
