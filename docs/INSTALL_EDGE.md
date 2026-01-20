# Installation de Microsoft Edge pour les tests Playwright

## OpenSUSE Tumbleweed

Pour tester Pensine Web sur Microsoft Edge, exécutez le script d'installation :

```bash
bash scripts/install-edge-opensuse.sh
```

Ce script va :

1. Importer la clé GPG Microsoft
2. Ajouter le dépôt Edge
3. Installer Microsoft Edge Stable
4. Installer les binaires Playwright pour Edge

## Installation manuelle

Si vous préférez installer manuellement :

```bash
# 1. Importer la clé GPG
sudo rpm --import https://packages.microsoft.com/keys/microsoft.asc

# 2. Ajouter le dépôt
sudo zypper addrepo https://packages.microsoft.com/yumrepos/edge microsoft-edge

# 3. Installer Edge
sudo zypper refresh
sudo zypper install microsoft-edge-stable

# 4. Installer binaires Playwright
npx playwright install msedge
```

## Vérification

```bash
# Vérifier que Edge est installé
microsoft-edge-stable --version

# Tester un fichier spécifique
npx playwright test tests/e2e/config-persistence.spec.mjs --project=msedge

# Tous les tests
npx playwright test --project=msedge
```

## Autres distributions Linux

### Ubuntu/Debian

```bash
# Télécharger et installer
wget -q https://packages.microsoft.com/keys/microsoft.asc -O- | sudo apt-key add -
sudo add-apt-repository "deb [arch=amd64] https://packages.microsoft.com/repos/edge stable main"
sudo apt update
sudo apt install microsoft-edge-stable
npx playwright install msedge
```

### Fedora/RHEL

```bash
# Ajouter le dépôt
sudo rpm --import https://packages.microsoft.com/keys/microsoft.asc
sudo dnf config-manager --add-repo https://packages.microsoft.com/yumrepos/edge
sudo dnf install microsoft-edge-stable
npx playwright install msedge
```

## Configuration Playwright

Le fichier `playwright.config.mjs` est configuré pour utiliser Edge :

```javascript
projects: [
  {
    name: 'msedge',
    use: {
      ...devices['Desktop Edge'],
      channel: 'msedge',
      headless: false,
    },
  },
],
```

Pour tester avec d'autres navigateurs, ajoutez des projects supplémentaires.
