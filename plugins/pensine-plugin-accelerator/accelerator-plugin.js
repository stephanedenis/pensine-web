/**
 * Pensine Accelerator Plugin
 *
 * Snippets et templates configurables pour l'éditeur
 * id: 'accelerator', icon: '⚡'
 *
 * @version 1.0.0
 */

export default class AcceleratorPlugin {
  constructor() {
    this._snippets = {};
  }

  get manifest() {
    return {
      id: 'accelerator',
      name: 'Accelerator',
      version: '1.0.0',
      icon: '⚡',
      description: "Snippets et templates configurables pour l'éditeur"
    };
  }

  async activate(context) {
    this.context = context;
    const config = context.config?.getPluginConfig?.(this.manifest.id) || {};
    this._snippets = config.snippets ? { ...config.snippets } : {};
    this._createUI();
    context.events?.on?.(
      'accelerator:insert-snippet',
      (data) => this.insertSnippet(data.key),
      this.manifest.id
    );
  }

  async deactivate() {
    this.context?.events?.clearNamespace?.(this.manifest.id);
    if (this._menu?.parentNode) {
      this._menu.parentNode.removeChild(this._menu);
    }
    if (this._btn?.parentNode) {
      this._btn.parentNode.removeChild(this._btn);
    }
    this.context = null;
  }

  _createUI() {
    this._btn = document.createElement('button');
    this._btn.id = 'accelerator-btn';
    this._btn.textContent = '⚡';
    this._btn.title = 'Insérer un snippet';
    this._btn.style.cssText = [
      'position:fixed',
      'bottom:140px',
      'right:10px',
      'z-index:900',
      'font-size:20px',
      'background:none',
      'border:none',
      'cursor:pointer'
    ].join(';');
    this._btn.addEventListener('click', () => this._toggleMenu());
    document.body.appendChild(this._btn);

    this._menu = document.createElement('ul');
    this._menu.id = 'accelerator-menu';
    this._menu.style.cssText = [
      'display:none',
      'position:fixed',
      'bottom:180px',
      'right:10px',
      'z-index:1000',
      'background:#fff',
      'border:1px solid #ccc',
      'border-radius:6px',
      'padding:4px 0',
      'margin:0',
      'list-style:none',
      'min-width:180px',
      'box-shadow:0 2px 8px rgba(0,0,0,.2)'
    ].join(';');
    document.body.appendChild(this._menu);
    this._renderMenuItems();
  }

  _renderMenuItems() {
    if (!this._menu) return;
    this._menu.innerHTML = '';
    const keys = Object.keys(this._snippets);
    if (keys.length === 0) {
      const li = document.createElement('li');
      li.style.cssText = 'padding:8px 12px;color:#999;font-size:13px;';
      li.textContent = 'Aucun snippet configuré';
      this._menu.appendChild(li);
      return;
    }
    for (const key of keys) {
      const li = document.createElement('li');
      li.style.cssText = 'padding:6px 12px;cursor:pointer;font-size:13px;';
      li.textContent = key;
      li.addEventListener('click', () => {
        this.insertSnippet(key);
        this._closeMenu();
      });
      li.addEventListener('mouseenter', () => { li.style.background = '#f0f0f0'; });
      li.addEventListener('mouseleave', () => { li.style.background = ''; });
      this._menu.appendChild(li);
    }
  }

  _toggleMenu() {
    if (this._menu) {
      const isVisible = this._menu.style.display !== 'none';
      this._menu.style.display = isVisible ? 'none' : 'block';
    }
  }

  _closeMenu() {
    if (this._menu) this._menu.style.display = 'none';
  }

  /**
   * Insère le texte d'un snippet dans l'éditeur actif
   * @param {string} key - Clé du snippet
   */
  insertSnippet(key) {
    const text = this._snippets[key];
    if (text === undefined) return;
    this.context?.events?.emit?.('editor:insert-text', { text });
  }

  /**
   * Ajoute ou remplace un snippet
   * @param {string} key
   * @param {string} text
   */
  addSnippet(key, text) {
    if (!key || text === undefined) return;
    this._snippets[key] = text;
    this._renderMenuItems();
  }

  /**
   * Supprime un snippet
   * @param {string} key
   */
  removeSnippet(key) {
    delete this._snippets[key];
    this._renderMenuItems();
  }

  /** Retourne une copie des snippets configurés */
  getSnippets() {
    return { ...this._snippets };
  }
}
