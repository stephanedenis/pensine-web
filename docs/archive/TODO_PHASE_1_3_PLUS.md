# 📋 TODO - Phase 1.3 et suivantes

## 🔥 Immédiat (aujourd'hui)

### Phase 1.3: Publication Alpha

- [ ] **Publier sur NPM**

  ```bash
  cd packages/plugin-interface
  npm login
  npm publish --tag alpha
  ```

  Alternative: Exécuter `./PUBLISH_COMMANDS.sh`

- [ ] **Vérifier publication**
  - Visiter: <https://www.npmjs.com/package/@panini/plugin-interface>
  - Vérifier version 0.1.0-alpha.1 avec tag "alpha"
  - CLI: `npm info @panini/plugin-interface`

- [ ] **Tester installation**

  ```bash
  cd /tmp && mkdir test-panini && cd test-panini
  npm init -y
  npm install @panini/plugin-interface@alpha
  node -e "const p = require('@panini/plugin-interface'); console.log(Object.keys(p))"
  ```

- [ ] **Créer GitHub Release**

  ```bash
  git tag v0.1.0-alpha.1
  git push origin v0.1.0-alpha.1
  ```

  Puis créer release sur GitHub UI avec notes de CHANGELOG.md

- [ ] **Mettre à jour Pensine**
  - Ajouter dependency: `npm install @panini/plugin-interface@alpha`
  - Remplacer imports locaux par imports NPM
  - Tester `python3 -m http.server 8000`

---

## 📅 Cette semaine (15-19 janvier)

### Phase 1.4: Tests Real-World

- [ ] **Charger Pensine avec nouveau système**
  - Ouvrir <http://localhost:8000>
  - Console: `listPlugins()`
  - Vérifier Word Counter fonctionne

- [ ] **Créer plugin PlantUML**
  - Package: `@panini/plugin-plantuml`
  - Implémenter `PaniniPlugin` interface
  - Utiliser PlantUML server API
  - Tests + documentation
  
  Structure:

  ```
  packages/plugin-plantuml/
  ├── src/
  │   ├── index.ts
  │   ├── renderer.ts
  │   └── config.schema.json
  ├── examples/
  ├── tests/
  ├── README.md
  └── package.json
  ```

- [ ] **Tester PlantUML dans Pensine**
  - Installer plugin
  - Render diagrams UML
  - Config options (server URL, theme)

- [ ] **Collecter feedback alpha**
  - Annoncer sur Discord/Slack
  - Email à beta testers
  - GitHub issues

---

## 📅 Semaine prochaine (22-26 janvier)

### Phase 2: OntoWave Integration

- [ ] **Analyser OntoWave plugin system**
  - Lire code existing plugins
  - Identifier différences avec Pensine
  - Documenter gaps

- [ ] **Créer OntoWave wrappers**

  ```
  ontowave/src/core/
  ├── panini-wrappers.js      # Similar to Pensine
  └── panini-integration.test.js
  ```

- [ ] **Implémenter EventBus dans OntoWave**
  - OntoWave n'a pas d'EventBus actuellement
  - Créer implementation simple
  - Tests

- [ ] **Adapter OntoWave PluginSystem**
  - Support dual-mode (Panini + Legacy)
  - Shared context
  - Health monitoring

- [ ] **Tester Word Counter dans OntoWave**
  - Charger plugin depuis NPM
  - Vérifier fonctionnement
  - Comparer avec Pensine

- [ ] **Tester PlantUML cross-platform**
  - Même plugin dans Pensine + OntoWave
  - Sans modifications
  - Documenter différences comportement

---

## 📅 Février 2026

### Phase 3: Config Panini Schema

- [ ] **Créer @panini/config-schema**
  - JSON Schema complet
  - Validation AJV
  - Defaults par app

- [ ] **Implémenter dans Pensine**
  - Migrer config actuelle
  - Valider avec schema
  - Tests

- [ ] **Implémenter dans OntoWave**
  - Migrer config actuelle
  - Namespace ontowave
  - Tests

---

## 📅 Mars 2026

### Phase 4: Markdown Plugins Partagés

- [ ] **Créer @panini/plugin-mermaid**
- [ ] **Créer @panini/plugin-math**
- [ ] **Créer @panini/plugin-syntax-highlight**
- [ ] **Tester dans Pensine + OntoWave**

### Phase 5: Storage Panini

- [ ] **Analyser PaniniFS architecture**
- [ ] **Créer @panini/storage-adapter**
- [ ] **Implémenter dans Pensine**
- [ ] **Implémenter dans OntoWave**

---

## 🎯 Métriques de Succès

### Phase 1.3 (Alpha)

- [ ] Package sur npmjs.com
- [ ] Installation fonctionnelle
- [ ] GitHub release créée
- [ ] 0 issues critiques

### Phase 1.4 (Real Testing)

- [ ] Pensine fonctionne avec package NPM
- [ ] PlantUML plugin créé
- [ ] 5+ alpha testers feedback
- [ ] 0 breaking bugs

### Phase 2 (OntoWave)

- [ ] EventBus implémenté
- [ ] Wrappers fonctionnels
- [ ] 1+ plugin partagé fonctionne
- [ ] 0 breaking changes

---

## 🚨 Risques Identifiés

### Publication NPM

- **Risque**: Nom package déjà pris
- **Mitigation**: Publier sous @stephanedenis si @panini unavailable

### OntoWave EventBus

- **Risque**: Architecture incompatible
- **Mitigation**: Créer shim léger, pas full refactor

### PlantUML Rendering

- **Risque**: Server API rate limiting
- **Mitigation**: Cache local, fallback server

### Cross-Platform Config

- **Risque**: Namespaces conflicts
- **Mitigation**: Strict namespace rules, validation

---

## 📚 Documentation à Créer

### Semaine prochaine

- [ ] CONTRIBUTING.md - Guide contributeurs
- [ ] PLUGIN_DEVELOPMENT_GUIDE.md - Développer plugins
- [ ] CROSS_PLATFORM_GUIDE.md - Plugins cross-platform
- [ ] API_REFERENCE.md - Référence API complète

### Plus tard

- [ ] VIDEO_TUTORIAL.md - Screencasts
- [ ] FAQ.md - Questions fréquentes
- [ ] CHANGELOG_POLICY.md - Politique versioning

---

## 🤝 Community

### Communication

- [ ] Créer Discord channel #panini-plugins
- [ ] Post sur Reddit /r/PersonalKnowledgeManagement
- [ ] Tweet announcement
- [ ] Blog post technique

### Support

- [ ] GitHub Discussions activées
- [ ] Issue templates créés
- [ ] Contributing guidelines
- [ ] Code of conduct

---

## 🎓 Formation

### Workshops

- [ ] Video: "Create Your First Panini Plugin"
- [ ] Workshop: "Migrating Legacy Plugins"
- [ ] Tutorial: "Cross-Platform Plugin Development"

### Examples

- [ ] Create example-plugins/ repo
- [ ] 10+ example plugins
- [ ] Best practices showcase

---

## 🔧 Tooling

### Developer Tools

- [ ] Plugin CLI generator

  ```bash
  npx @panini/create-plugin my-plugin
  ```

- [ ] Plugin testing framework
- [ ] Plugin validator
- [ ] Hot reload dev mode

### CI/CD

- [ ] GitHub Actions workflows
- [ ] Automated testing
- [ ] Auto-publish on tag
- [ ] Changelog generation

---

## 📊 Tracking

**Complété**: Phase 1.1 ✅, Phase 1.2 ✅  
**En cours**: Phase 1.3 🔄  
**Prochain**: Phase 1.4  
**Version actuelle**: 0.1.0-alpha.1  
**Prochaine version**: 0.1.0-alpha.2 (bug fixes) ou 0.2.0-alpha.1 (features)

---

**Dernière mise à jour**: 14 janvier 2026  
**Maintenu par**: Stéphane Denis (@stephanedenis)
