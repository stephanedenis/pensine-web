# Journal de bord - Pensine Web

Ce dossier contient l'historique des conversations de développement avec GitHub Copilot, documentant les décisions techniques, les problèmes rencontrés et leurs solutions.

## Organisation

Chaque fichier est nommé selon la date et le sujet principal :

- `YYYY-MM-DD_sujet-principal.md`

## Index des sessions

### 2026-01-14

- [Phase 1.1: Interface Plugin Commune Complete](2026-01-14_phase1-1-plugin-interface-complete.md)
  - Création du package `@panini/plugin-interface` v0.1.0
  - Interfaces TypeScript pour plugins Panini (Pensine, OntoWave, PaniniFS)
  - 9 tests unitaires passent ✅
  - Exemple complet: Word Counter plugin
  - Documentation et guide de développement

### 2025-12-14

- [Sécurité et séparation des repos](2025-12-14_securite-et-separation-repos.md)
  - Suppression des tokens du code source
  - Configuration de l'éditeur de config avec formulaire dynamique
  - Séparation données personnelles / application publique
  - Création du repo pensine-web

## Comment documenter une session

Pour chaque session de développement, créez un nouveau fichier avec :

1. **Contexte** : Version de départ, problème à résoudre
2. **Objectifs** : Ce qu'on cherche à accomplir
3. **Actions** : Liste chronologique des modifications
4. **Décisions techniques** : Choix importants et leur justification
5. **Leçons apprises** : Ce qu'il faut retenir pour le futur
6. **État final** : Version, commit, état du projet

## Utilité

Ce journal permet de :

- Comprendre l'évolution du projet
- Retrouver pourquoi certaines décisions ont été prises
- Éviter de répéter les mêmes erreurs
- Faciliter l'onboarding de nouveaux contributeurs
- Documenter les patterns et anti-patterns découverts
