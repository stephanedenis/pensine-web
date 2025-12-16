/**
 * ConfigPanel - Automatic configuration panel generator for ConfigurableComponent
 * @version 1.0.0
 * @license MIT
 *
 * Reads component schema and generates interactive configuration UI
 */

class ConfigPanel {
  constructor(component, container, options = {}) {
    this.component = component;

    this.container = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    if (!this.container) {
      throw new Error('Container element not found');
    }

    this.options = {
      showExport: true,
      showImport: true,
      showReset: true,
      livePreview: true,
      collapsible: true,
      ...options
    };

    this.schema = component.getConfigSchema();
    this.config = component.getConfig();

    // Track expanded groups
    this.expandedGroups = new Set();
    if (this.schema.groups) {
      // Expand first group by default
      if (this.schema.groups[0]) {
        this.expandedGroups.add(this.schema.groups[0].id);
      }
    }

    this.render();
    this.attachListeners();
  }

  /**
   * Render the configuration panel
   */
  render() {
    const html = `
            <div class="pensine-config-panel">
                ${this.renderHeader()}
                <div class="config-groups">
                    ${this.schema.groups.map(group => this.renderGroup(group)).join('')}
                </div>
                ${this.renderActions()}
            </div>
        `;

    this.container.innerHTML = html;
  }

  /**
   * Render panel header
   */
  renderHeader() {
    return `
            <div class="config-header">
                <h2>⚙️ Configuration</h2>
            </div>
        `;
  }

  /**
   * Render configuration group
   */
  renderGroup(group) {
    const isExpanded = this.expandedGroups.has(group.id);

    return `
            <div class="config-group ${isExpanded ? 'expanded' : 'collapsed'}" data-group="${group.id}">
                <div class="config-group-header" data-toggle-group="${group.id}">
                    <span class="group-icon">${group.icon || '📋'}</span>
                    <h3>${group.title}</h3>
                    <span class="group-toggle">${isExpanded ? '▼' : '▶'}</span>
                </div>
                ${group.description ? `<p class="group-description">${group.description}</p>` : ''}
                <div class="config-group-content" style="${isExpanded ? '' : 'display:none'}">
                    ${Object.entries(group.properties).map(([key, prop]) =>
      this.renderProperty(key, prop)
    ).join('')}
                </div>
            </div>
        `;
  }

  /**
   * Render single property
   */
  renderProperty(key, prop) {
    const value = this.config[key];

    return `
            <div class="config-property" data-property="${key}">
                <label for="config-${key}" class="property-label">
                    ${prop.title}
                    ${prop.required ? '<span class="required">*</span>' : ''}
                </label>
                ${prop.description ? `<p class="property-description">${prop.description}</p>` : ''}
                <div class="property-control">
                    ${this.renderControl(key, prop, value)}
                    ${prop.help ? `<span class="property-help">💡 ${prop.help}</span>` : ''}
                </div>
            </div>
        `;
  }

  /**
   * Render control based on property type
   */
  renderControl(key, prop, value) {
    switch (prop.type) {
      case 'boolean':
        return this.renderToggle(key, prop, value);
      case 'number':
        return this.renderNumber(key, prop, value);
      case 'string':
        return this.renderString(key, prop, value);
      case 'color':
        return this.renderColor(key, prop, value);
      case 'select':
        return this.renderSelect(key, prop, value);
      case 'date':
        return this.renderDate(key, prop, value);
      default:
        return this.renderString(key, prop, value);
    }
  }

  /**
   * Render toggle switch (boolean)
   */
  renderToggle(key, prop, value) {
    return `
            <label class="toggle-switch">
                <input type="checkbox"
                       id="config-${key}"
                       data-config-key="${key}"
                       ${value ? 'checked' : ''}>
                <span class="toggle-slider"></span>
            </label>
        `;
  }

  /**
   * Render number input with slider
   */
  renderNumber(key, prop, value) {
    const hasRange = prop.min !== undefined && prop.max !== undefined;

    return `
            <div class="number-control">
                ${hasRange ? `
                    <input type="range"
                           id="config-${key}"
                           data-config-key="${key}"
                           min="${prop.min}"
                           max="${prop.max}"
                           step="${prop.step || 1}"
                           value="${value || prop.default || prop.min}">
                ` : ''}
                <input type="number"
                       id="config-${key}${hasRange ? '-display' : ''}"
                       data-config-key="${key}"
                       ${prop.min !== undefined ? `min="${prop.min}"` : ''}
                       ${prop.max !== undefined ? `max="${prop.max}"` : ''}
                       ${prop.step !== undefined ? `step="${prop.step}"` : ''}
                       value="${value !== undefined ? value : prop.default || ''}">
                ${prop.unit ? `<span class="unit">${prop.unit}</span>` : ''}
            </div>
        `;
  }

  /**
   * Render string input
   */
  renderString(key, prop, value) {
    return `
            <input type="text"
                   id="config-${key}"
                   data-config-key="${key}"
                   ${prop.pattern ? `pattern="${prop.pattern}"` : ''}
                   ${prop.minLength ? `minlength="${prop.minLength}"` : ''}
                   ${prop.maxLength ? `maxlength="${prop.maxLength}"` : ''}
                   ${prop.placeholder ? `placeholder="${prop.placeholder}"` : ''}
                   value="${value !== undefined ? this.escapeHtml(value) : ''}">
        `;
  }

  /**
   * Render color picker
   */
  renderColor(key, prop, value) {
    return `
            <div class="color-control">
                <input type="color"
                       id="config-${key}"
                       data-config-key="${key}"
                       value="${value || prop.default || '#000000'}">
                <input type="text"
                       id="config-${key}-text"
                       data-config-key="${key}"
                       pattern="^#[0-9A-Fa-f]{6}$"
                       placeholder="#RRGGBB"
                       value="${value || prop.default || '#000000'}">
            </div>
        `;
  }

  /**
   * Render select dropdown
   */
  renderSelect(key, prop, value) {
    const options = prop.options || [];

    return `
            <select id="config-${key}" data-config-key="${key}">
                ${options.map(opt => {
      const optValue = typeof opt === 'object' ? opt.value : opt;
      const optLabel = typeof opt === 'object' ? opt.label : opt;
      return `<option value="${optValue}" ${value === optValue ? 'selected' : ''}>${optLabel}</option>`;
    }).join('')}
            </select>
        `;
  }

  /**
   * Render date picker
   */
  renderDate(key, prop, value) {
    return `
            <input type="date"
                   id="config-${key}"
                   data-config-key="${key}"
                   value="${value || ''}">
        `;
  }

  /**
   * Render action buttons
   */
  renderActions() {
    return `
            <div class="config-actions">
                ${this.options.showReset ? '<button class="action-btn" data-action="reset">🔄 Reset</button>' : ''}
                ${this.options.showExport ? '<button class="action-btn" data-action="export">📤 Export</button>' : ''}
                ${this.options.showImport ? '<button class="action-btn" data-action="import">📥 Import</button>' : ''}
            </div>
        `;
  }

  /**
   * Attach event listeners
   */
  attachListeners() {
    // Group toggle
    this.container.querySelectorAll('[data-toggle-group]').forEach(header => {
      header.addEventListener('click', (e) => {
        const groupId = e.currentTarget.dataset.toggleGroup;
        this.toggleGroup(groupId);
      });
    });

    // Property changes
    this.container.querySelectorAll('[data-config-key]').forEach(input => {
      const eventType = input.type === 'checkbox' ? 'change' : 'input';

      input.addEventListener(eventType, (e) => {
        if (this.options.livePreview) {
          this.handlePropertyChange(e.target);
        }
      });

      // Also handle blur for final commit
      if (eventType === 'input') {
        input.addEventListener('blur', (e) => {
          this.handlePropertyChange(e.target);
        });
      }
    });

    // Sync color picker with text input
    this.container.querySelectorAll('input[type="color"]').forEach(colorInput => {
      const key = colorInput.dataset.configKey;
      const textInput = this.container.querySelector(`#config-${key}-text`);

      if (textInput) {
        colorInput.addEventListener('input', () => {
          textInput.value = colorInput.value;
        });
        textInput.addEventListener('input', () => {
          if (/^#[0-9A-Fa-f]{6}$/.test(textInput.value)) {
            colorInput.value = textInput.value;
          }
        });
      }
    });

    // Sync range with number input
    this.container.querySelectorAll('input[type="range"]').forEach(rangeInput => {
      const key = rangeInput.dataset.configKey;
      const numberInput = this.container.querySelector(`#config-${key}-display`);

      if (numberInput) {
        rangeInput.addEventListener('input', () => {
          numberInput.value = rangeInput.value;
        });
        numberInput.addEventListener('input', () => {
          rangeInput.value = numberInput.value;
        });
      }
    });

    // Action buttons
    this.container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        this.handleAction(action);
      });
    });
  }

  /**
   * Toggle group expanded/collapsed
   */
  toggleGroup(groupId) {
    if (this.expandedGroups.has(groupId)) {
      this.expandedGroups.delete(groupId);
    } else {
      this.expandedGroups.add(groupId);
    }

    // Re-render to update UI
    this.render();
    this.attachListeners();
  }

  /**
   * Handle property value change
   */
  handlePropertyChange(input) {
    const key = input.dataset.configKey;
    let value;

    if (input.type === 'checkbox') {
      value = input.checked;
    } else if (input.type === 'number' || input.type === 'range') {
      value = parseFloat(input.value);
    } else if (input.tagName === 'SELECT') {
      // For select, try to convert to number if the original value was numeric
      const schema = this.component.getConfigSchema();
      const property = this._findPropertyInSchema(schema, key);

      if (property && property.options) {
        // Check if options contain numeric values
        const firstOption = property.options[0];
        const optValue = typeof firstOption === 'object' ? firstOption.value : firstOption;

        if (typeof optValue === 'number') {
          value = parseFloat(input.value);
        } else {
          value = input.value;
        }
      } else {
        value = input.value;
      }
    } else {
      value = input.value;
    }

    // Update component configuration
    this.component.setConfigProperty(key, value);

    // Update internal config reference
    this.config = this.component.getConfig();
  }

  /**
   * Find property in schema by key
   */
  _findPropertyInSchema(schema, key) {
    for (const group of schema.groups) {
      if (group.properties && group.properties[key]) {
        return group.properties[key];
      }
    }
    return null;
  }

  /**
   * Handle action button clicks
   */
  handleAction(action) {
    switch (action) {
      case 'reset':
        if (confirm('Reset all settings to defaults?')) {
          this.component.resetConfig();
          this.config = this.component.getConfig();
          this.render();
          this.attachListeners();
        }
        break;

      case 'export':
        const json = this.component.exportConfig();
        this.downloadJSON(json, 'component-config.json');
        break;

      case 'import':
        this.importFromFile();
        break;
    }
  }

  /**
   * Download JSON as file
   */
  downloadJSON(jsonString, filename) {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Import from file
   */
  importFromFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const success = this.component.importConfig(e.target.result);
        if (success) {
          this.config = this.component.getConfig();
          this.render();
          this.attachListeners();
          alert('Configuration imported successfully!');
        } else {
          alert('Failed to import configuration. Check console for errors.');
        }
      };
      reader.readAsText(file);
    });

    input.click();
  }

  /**
   * Escape HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Refresh panel (re-render)
   */
  refresh() {
    this.schema = this.component.getConfigSchema();
    this.config = this.component.getConfig();
    this.render();
    this.attachListeners();
  }

  /**
   * Destroy panel
   */
  destroy() {
    this.container.innerHTML = '';
  }
}

// Export for UMD pattern
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConfigPanel;
}
