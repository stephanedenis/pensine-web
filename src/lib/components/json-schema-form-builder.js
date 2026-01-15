/**
 * JSON Schema Form Builder
 *
 * Génère dynamiquement des formulaires HTML à partir de JSON Schema
 * Support des types: string, number, boolean, object, array, enum
 *
 * @version 1.0.0
 */

export default class JSONSchemaFormBuilder {
  constructor() {
    this.formId = `form-${Date.now()}`;
  }

  /**
   * Générer un formulaire HTML à partir d'un schéma JSON Schema
   *
   * @param {Object} schema - JSON Schema définissant la structure
   * @param {Object} data - Données actuelles (pour pré-remplir)
   * @param {Object} options - Options de génération
   * @returns {string} HTML du formulaire
   */
  build(schema, data = {}, options = {}) {
    const {
      formId = this.formId,
      formClass = 'json-schema-form',
      submitButton = true,
      submitLabel = 'Save',
      cancelButton = false,
      cancelLabel = 'Cancel'
    } = options;

    let html = `<form id="${formId}" class="${formClass}">`;

    if (schema.title) {
      html += `<h3 class="form-title">${this.escapeHtml(schema.title)}</h3>`;
    }

    if (schema.description) {
      html += `<p class="form-description">${this.escapeHtml(schema.description)}</p>`;
    }

    // Générer les champs
    if (schema.properties) {
      html += '<div class="form-fields">';

      for (const [key, propSchema] of Object.entries(schema.properties)) {
        const value = data[key];
        const isRequired = schema.required?.includes(key);

        html += this.buildField(key, propSchema, value, isRequired);
      }

      html += '</div>';
    }

    // Boutons d'action
    if (submitButton || cancelButton) {
      html += '<div class="form-actions">';

      if (submitButton) {
        html += `<button type="submit" class="btn btn-primary">${this.escapeHtml(submitLabel)}</button>`;
      }

      if (cancelButton) {
        html += `<button type="button" class="btn btn-secondary btn-cancel">${this.escapeHtml(cancelLabel)}</button>`;
      }

      html += '</div>';
    }

    html += '</form>';

    return html;
  }

  /**
   * Générer un champ de formulaire
   */
  buildField(key, schema, value, required = false) {
    const {
      type = 'string',
      title,
      description,
      enum: enumValues,
      default: defaultValue,
      minimum,
      maximum,
      minLength,
      maxLength,
      pattern
    } = schema;

    const label = title || this.titleCase(key);
    const fieldId = `field-${key}`;
    const fieldValue = value !== undefined ? value : (defaultValue !== undefined ? defaultValue : '');

    let html = `<div class="form-field" data-field-key="${key}">`;
    html += `<label for="${fieldId}" class="form-label">`;
    html += this.escapeHtml(label);
    if (required) html += ' <span class="required">*</span>';
    html += '</label>';

    if (description) {
      html += `<p class="form-field-description">${this.escapeHtml(description)}</p>`;
    }

    // Générer l'input selon le type
    if (enumValues && Array.isArray(enumValues)) {
      // Select pour les enums
      html += this.buildSelect(fieldId, key, enumValues, fieldValue, required);
    } else if (type === 'boolean') {
      html += this.buildCheckbox(fieldId, key, fieldValue);
    } else if (type === 'number' || type === 'integer') {
      html += this.buildNumber(fieldId, key, fieldValue, { minimum, maximum, required });
    } else if (type === 'string' && schema.format === 'textarea') {
      html += this.buildTextarea(fieldId, key, fieldValue, { minLength, maxLength, required });
    } else if (type === 'array') {
      html += this.buildArray(fieldId, key, schema.items, fieldValue, required);
    } else if (type === 'object') {
      html += this.buildObject(fieldId, key, schema, fieldValue);
    } else {
      // Input text par défaut
      html += this.buildText(fieldId, key, fieldValue, { minLength, maxLength, pattern, required });
    }

    html += '</div>';

    return html;
  }

  /**
   * Input text
   */
  buildText(id, name, value, options = {}) {
    const { minLength, maxLength, pattern, required } = options;

    let attrs = `type="text" id="${id}" name="${name}" value="${this.escapeHtml(value)}"`;
    if (minLength) attrs += ` minlength="${minLength}"`;
    if (maxLength) attrs += ` maxlength="${maxLength}"`;
    if (pattern) attrs += ` pattern="${this.escapeHtml(pattern)}"`;
    if (required) attrs += ' required';

    return `<input ${attrs} class="form-input">`;
  }

  /**
   * Textarea
   */
  buildTextarea(id, name, value, options = {}) {
    const { minLength, maxLength, required } = options;

    let attrs = `id="${id}" name="${name}" rows="4"`;
    if (minLength) attrs += ` minlength="${minLength}"`;
    if (maxLength) attrs += ` maxlength="${maxLength}"`;
    if (required) attrs += ' required';

    return `<textarea ${attrs} class="form-textarea">${this.escapeHtml(value)}</textarea>`;
  }

  /**
   * Input number
   */
  buildNumber(id, name, value, options = {}) {
    const { minimum, maximum, required } = options;

    let attrs = `type="number" id="${id}" name="${name}" value="${value || ''}"`;
    if (minimum !== undefined) attrs += ` min="${minimum}"`;
    if (maximum !== undefined) attrs += ` max="${maximum}"`;
    if (required) attrs += ' required';

    return `<input ${attrs} class="form-input">`;
  }

  /**
   * Checkbox
   */
  buildCheckbox(id, name, value) {
    const checked = value ? 'checked' : '';
    return `
      <div class="form-checkbox">
        <input type="checkbox" id="${id}" name="${name}" ${checked} class="form-checkbox-input">
        <span class="form-checkbox-label"></span>
      </div>
    `;
  }

  /**
   * Select dropdown
   */
  buildSelect(id, name, options, value, required = false) {
    let html = `<select id="${id}" name="${name}" class="form-select"${required ? ' required' : ''}>`;

    if (!required) {
      html += '<option value="">-- Select --</option>';
    }

    for (const option of options) {
      const optValue = typeof option === 'object' ? option.value : option;
      const optLabel = typeof option === 'object' ? option.label : option;
      const selected = optValue === value ? 'selected' : '';

      html += `<option value="${this.escapeHtml(optValue)}" ${selected}>`;
      html += this.escapeHtml(optLabel);
      html += '</option>';
    }

    html += '</select>';
    return html;
  }

  /**
   * Array field (liste d'items)
   */
  buildArray(id, name, itemSchema, values = [], required = false) {
    const items = Array.isArray(values) ? values : [];

    let html = '<div class="form-array">';
    html += `<div class="form-array-items" data-name="${name}">`;

    items.forEach((item, index) => {
      html += this.buildArrayItem(name, index, itemSchema, item);
    });

    html += '</div>';

    html += `
      <button type="button" class="btn btn-secondary btn-add-item" data-array="${name}">
        + Add item
      </button>
    `;

    html += '</div>';

    return html;
  }

  /**
   * Un item d'array
   */
  buildArrayItem(arrayName, index, itemSchema, value) {
    const itemType = itemSchema?.type || 'string';
    const itemId = `${arrayName}-${index}`;

    let html = '<div class="form-array-item">';

    if (itemType === 'string') {
      html += `<input type="text" name="${arrayName}[]" value="${this.escapeHtml(value)}" class="form-input">`;
    } else if (itemType === 'number') {
      html += `<input type="number" name="${arrayName}[]" value="${value || ''}" class="form-input">`;
    } else {
      // Type complexe - simplifier pour l'instant
      html += `<input type="text" name="${arrayName}[]" value="${this.escapeHtml(JSON.stringify(value))}" class="form-input">`;
    }

    html += `
      <button type="button" class="btn btn-icon btn-remove-item" title="Remove">
        ✕
      </button>
    `;

    html += '</div>';

    return html;
  }

  /**
   * Object field (sous-formulaire)
   */
  buildObject(id, name, schema, value = {}) {
    let html = '<div class="form-object">';

    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        const nestedValue = value[key];
        const nestedKey = `${name}.${key}`;
        const isRequired = schema.required?.includes(key);

        html += this.buildField(nestedKey, propSchema, nestedValue, isRequired);
      }
    }

    html += '</div>';

    return html;
  }

  /**
   * Extraire les données du formulaire
   *
   * @param {HTMLFormElement} form - Élément form
   * @returns {Object} Données du formulaire
   */
  extractData(form) {
    const data = {};
    const formData = new FormData(form);

    // Traiter les champs normaux
    for (const [key, value] of formData.entries()) {
      // Skip arrays (gérés séparément)
      if (key.endsWith('[]')) continue;

      // Gérer dot notation pour objets imbriqués
      if (key.includes('.')) {
        this.setNestedValue(data, key, value);
      } else {
        data[key] = value;
      }
    }

    // Traiter les checkboxes (non dans FormData si non cochées)
    form.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      const key = checkbox.name;
      if (key.includes('.')) {
        this.setNestedValue(data, key, checkbox.checked);
      } else {
        data[key] = checkbox.checked;
      }
    });

    // Traiter les arrays
    form.querySelectorAll('[name$="[]"]').forEach(input => {
      const arrayName = input.name.replace('[]', '');
      if (!data[arrayName]) {
        data[arrayName] = [];
      }

      // Convertir en nombre si input type="number"
      const value = input.type === 'number' ? parseFloat(input.value) : input.value;
      data[arrayName].push(value);
    });

    // Convertir les nombres
    form.querySelectorAll('input[type="number"]').forEach(input => {
      const key = input.name;
      if (!key.endsWith('[]')) {
        const value = parseFloat(input.value);
        if (key.includes('.')) {
          this.setNestedValue(data, key, value);
        } else {
          data[key] = value;
        }
      }
    });

    return data;
  }

  /**
   * Définir une valeur imbriquée avec dot notation
   */
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();

    let current = obj;
    for (const key of keys) {
      if (!current[key]) {
        current[key] = {};
      }
      current = current[key];
    }

    current[lastKey] = value;
  }

  /**
   * Convertir snake_case ou camelCase en Title Case
   */
  titleCase(str) {
    return str
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Échapper HTML
   */
  escapeHtml(str) {
    if (str === null || str === undefined) return '';

    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  /**
   * Attacher les event listeners aux éléments dynamiques
   */
  attachEventListeners(form) {
    // Boutons "Add item" pour les arrays
    form.querySelectorAll('.btn-add-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const arrayName = e.target.dataset.array;
        const container = form.querySelector(`[data-name="${arrayName}"]`);
        const items = container.querySelectorAll('.form-array-item');
        const index = items.length;

        // Récupérer le schéma (si disponible via data attribute)
        const itemHtml = this.buildArrayItem(arrayName, index, { type: 'string' }, '');
        container.insertAdjacentHTML('beforeend', itemHtml);

        // Attacher listener au nouveau bouton remove
        this.attachRemoveListeners(container.lastElementChild);
      });
    });

    // Boutons "Remove item" pour les arrays
    this.attachRemoveListeners(form);
  }

  /**
   * Attacher listeners pour boutons remove
   */
  attachRemoveListeners(container) {
    container.querySelectorAll('.btn-remove-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.target.closest('.form-array-item').remove();
      });
    });
  }
}
