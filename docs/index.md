# Pensine Web

## 🧠 Votre 3e Hémisphère du Cerveau

**Pensine Web** est une application de gestion de connaissances personnelles qui fonctionne comme une extension cognitive de votre cerveau. Elle archive, organise et croise intelligemment les informations de votre vie pour un usage quotidien et continu.

### ✨ En Bref

- 📚 **Archive vivante** : Vos données restent accessibles et utiles dans le temps
- 🔒 **Souveraineté** : Vos données sur GitHub, sous votre contrôle
- 🎯 **Contextuel** : Comprend et respecte vos différents contextes de vie
- 🔗 **Intelligent** : Croise automatiquement les informations entre elles
- 🔌 **Extensible** : Système de plugins pour personnaliser à l'infini

---

## 🎯 Trois Axes Principaux

### ⏰ Gestion du Temps
Calendrier unifié, journal quotidien, timeline continue. Synchronisez toutes vos sources (Google, Outlook, GitHub) et retrouvez facilement vos notes liées aux événements.

### 🏥 Santé & Bien-être
Suivi médicaments, activité physique, sommeil, nutrition. Comprenez les patterns et corrélations entre votre santé et votre vie quotidienne.

### 🎯 Buts & Motivations
Objectifs hiérarchiques (vision → buts → jalons → tâches), suivi de progression, réalisations. Visualisez votre avancement et restez motivé.

[📖 En savoir plus sur la Vision](VISION.md)

---

## 🚀 Essayer Pensine

### Installation Simple

```bash
# Cloner le projet
git clone https://github.com/stephanedenis/pensine-web.git
cd pensine-web

# Lancer localement
python3 -m http.server 8000

# Ouvrir dans le navigateur
open http://localhost:8000
```

### Configuration

Pensine fonctionne entièrement dans votre navigateur et stocke vos données :
- **GitHub** - Vos notes en Markdown sur votre propre repo
- **Local Git** - Repo Git local avec synchronisation
- **LocalStorage** - Cache local du navigateur

[📖 Guide d'Installation Complet](../README.md)

---

## 🔌 Écosystème de Plugins

Pensine fait partie de l'écosystème **Panini** avec un système de plugins partagés :

- 📝 **Word Counter** - Compteur de mots temps réel
- 📊 **PlantUML** - Diagrammes UML dans vos notes
- 🧮 **Math** - Formules LaTeX/KaTeX
- 📅 **Calendar** - Calendrier interactif
- 📥 **Inbox** - Capture rapide d'idées
- 🔍 **Search** - Recherche full-text

[📖 Créer votre Plugin](PLUGIN_MIGRATION_GUIDE.md)

---

## 📚 Documentation

### Pour Utilisateurs
- [🎯 Vision & Roadmap](VISION.md) - Le concept du 3e Hémisphère
- [⚙️ Configuration](CONFIG_SYSTEM.md) - Modes de stockage
- [✅ Scénarios de Test](SCENARIOS_DE_TEST.md) - Fonctionnalités complètes

### Pour Développeurs
- [🏗️ Architecture](SPECIFICATIONS_TECHNIQUES.md) - Spécifications techniques
- [🔌 Guide Plugins](PLUGIN_MIGRATION_GUIDE.md) - Développer des plugins
- [🌊 Écosystème Panini](PANINI_INTEGRATION_STRATEGY.md) - Pensine ↔ OntoWave ↔ PaniniFS

### Avancement du Projet
- [📖 Journal de Bord](journal-de-bord/) - Décisions techniques et sessions
- [🎉 Phase 1 Complete](journal-de-bord/2026-01-14_phase1-1-et-1-2-complete.md) - Interface plugin commune
- [🗺️ Roadmap Q1 2026](NEXT_STEPS_Q1_2026.md) - Prochaines étapes

[📖 Voir toute la documentation](documentation.md)

---

## 🤝 Contribuer

Pensine Web est **open source** (MIT License) et accueille les contributions !

- 🐛 **Signaler un bug** : [GitHub Issues](https://github.com/stephanedenis/pensine-web/issues)
- 💡 **Proposer une feature** : [Discussions](https://github.com/stephanedenis/pensine-web/discussions)
- 🔧 **Contribuer au code** : [Guide de Contribution](../CONTRIBUTING.md)
- 📦 **Créer un plugin** : [@panini/plugin-interface](https://www.npmjs.com/package/@panini/plugin-interface)

---

## 🌟 Projets Connexes

### Écosystème Panini

- **Pensine** - Gestion de connaissances personnelles (ce projet)
- **OntoWave** - Navigateur d'ontologies et documentation technique
- **PaniniFS** - Système de fichiers sémantique avec compression fractale

Les trois partagent la même interface de plugins pour une expérience unifiée.

---

## 📞 Liens Utiles

- **🏠 Site Web** : [pensine.org](https://pensine.org)
- **💻 GitHub** : [stephanedenis/pensine-web](https://github.com/stephanedenis/pensine-web)
- **📦 NPM** : [@panini/plugin-interface](https://www.npmjs.com/package/@panini/plugin-interface)
- **👤 Auteur** : Stéphane Denis ([@stephanedenis](https://github.com/stephanedenis))

---

<div align="center">

**Version 0.0.22** • **License MIT** • **Made with ❤️**

</div>
