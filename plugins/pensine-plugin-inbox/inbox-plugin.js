/**
 * Pensine Inbox Plugin
 *
 * Capture rapide de notes dans inbox.md
 * id: 'inbox', icon: '📥'
 *
 * @version 1.0.0
 */

export default class InboxPlugin {
  constructor() {}

  get manifest() {
    return {
      id: 'inbox',
      name: 'Inbox',
      version: '1.0.0',
      icon: '📥',
      description: 'Capture rapide de notes dans inbox.md'
    };
  }

  async activate(context) {
    this.context = context;
    const config = context.config?.getPluginConfig?.(this.manifest.id) || {};
    this._inboxPath = config.inboxPath || 'inbox.md';
    this._createUI();
    context.events?.on?.(
      'inbox:capture',
      (data) => this.captureNote(data.text),
      this.manifest.id
    );
  }

  async deactivate() {
    this.context?.events?.clearNamespace?.(this.manifest.id);
    if (this._btn?.parentNode) {
      this._btn.parentNode.removeChild(this._btn);
    }
    if (this._modal?.parentNode) {
      this._modal.parentNode.removeChild(this._modal);
    }
    this.context = null;
  }

  _createUI() {
    this._btn = document.createElement('button');
    this._btn.id = 'inbox-capture-btn';
    this._btn.textContent = '📥';
    this._btn.title = 'Capture rapide (Inbox)';
    this._btn.style.cssText = [
      'position:fixed',
      'bottom:60px',
      'right:10px',
      'z-index:900',
      'font-size:20px',
      'background:none',
      'border:none',
      'cursor:pointer'
    ].join(';');
    this._btn.addEventListener('click', () => this._openModal());
    document.body.appendChild(this._btn);

    this._modal = document.createElement('div');
    this._modal.id = 'inbox-modal';
    this._modal.style.cssText = [
      'display:none',
      'position:fixed',
      'bottom:100px',
      'right:10px',
      'z-index:1000',
      'background:#fff',
      'border:1px solid #ccc',
      'border-radius:6px',
      'padding:12px',
      'box-shadow:0 2px 8px rgba(0,0,0,.2)',
      'min-width:240px'
    ].join(';');
    this._modal.innerHTML = [
      '<textarea id="inbox-text" rows="3" placeholder="Pensée rapide..."',
      ' style="width:100%;box-sizing:border-box;margin-bottom:8px;"></textarea>',
      '<div style="display:flex;justify-content:flex-end;gap:6px;">',
      '<button id="inbox-cancel">Annuler</button>',
      '<button id="inbox-save">📥 Sauvegarder</button>',
      '</div>'
    ].join('');
    document.body.appendChild(this._modal);

    this._modal.querySelector('#inbox-save')
      .addEventListener('click', () => this._saveFromModal());
    this._modal.querySelector('#inbox-cancel')
      .addEventListener('click', () => this._closeModal());
  }

  _openModal() {
    if (this._modal) {
      this._modal.style.display = 'block';
      const ta = this._modal.querySelector('#inbox-text');
      if (ta) ta.focus();
    }
  }

  _closeModal() {
    if (this._modal) {
      this._modal.style.display = 'none';
      const ta = this._modal.querySelector('#inbox-text');
      if (ta) ta.value = '';
    }
  }

  async _saveFromModal() {
    const ta = this._modal?.querySelector('#inbox-text');
    const text = ta?.value?.trim();
    if (text) {
      await this.captureNote(text);
    }
    this._closeModal();
  }

  async captureNote(text) {
    if (!text || !this.context) return;
    try {
      const existing = await this.context.storage
        .readFile(this._inboxPath)
        .catch(() => '');
      const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
      const entry = `\n- [${timestamp}] ${text}`;
      await this.context.storage.writeFile(this._inboxPath, (existing || '') + entry);
      this.context.events?.emit?.(`${this.manifest.id}:captured`, {
        path: this._inboxPath,
        text
      });
    } catch (error) {
      console.error('[inbox] captureNote error:', error);
    }
  }
}
