# Migration Guide: Panini Plugin Interface

Guide pour migrer les plugins Pensine vers `@panini/plugin-interface`.

---

## 📋 Vue d'ensemble

La nouvelle interface Panini permet:
- ✅ **Plugins partagés** entre Pensine, OntoWave, PaniniFS
- ✅ **Cleanup automatique** via namespaces
- ✅ **Type safety** avec TypeScript
- ✅ **Validation config** via JSON Schema
- ✅ **Backward compatibility** pour plugins legacy

---

## 🔄 Comparaison Legacy vs Panini

### Legacy Pensine Plugin

```javascript
class OldPlugin {
  constructor(manifest, context) {
    this.manifest = manifest;
    this.context = context;
  }

  async enable() {
    // Subscribe to events
    this.context.events.on('some:event', this.handler);
    
    // Get config
    const value = this.context.config.get('myKey', 'default');
  }

  async disable() {
    // Manual cleanup needed
    this.context.events.off('some:event', this.handler);
  }
}

// Registration
pluginSystem.register(OldPlugin, manifest);
```

### New Panini Plugin

```javascript
class NewPlugin {
  manifest = {
    id: 'my-plugin',
    name: 'My Plugin',
    version: '1.0.0'
  };

  async activate(context) {
    // Register schema first
    context.config.registerSchema(
      this.manifest.id,
      schema,
      defaults
    );
    
    // Get config
    const config = context.config.getPluginConfig(this.manifest.id);
    
    // Subscribe with namespace (auto-cleanup!)
    context.events.on(
      'some:event',
      handler,
      this.manifest.id // Namespace
    );
  }

  async deactivate() {
    // Auto cleanup via clearNamespace!
    this.context.events.clearNamespace(this.manifest.id);
  }

  async healthCheck() {
    return true;
  }
}

// Registration
pluginSystem.registerPaniniPlugin(NewPlugin);
```

---

## 🚀 Migration Steps

### Step 1: Update Plugin Structure

**Before:**
```javascript
class MyPlugin {
  constructor(manifest, context) {
    this.manifest = manifest;
    this.context = context;
  }
}
```

**After:**
```javascript
class MyPlugin {
  manifest = {
    id: 'my-plugin',
    name: 'My Plugin',
    version: '1.0.0',
    dependencies: []
  };
  
  constructor() {
    this.context = null;
  }
}
```

### Step 2: Rename Lifecycle Methods

**Before:**
```javascript
async enable() { }
async disable() { }
```

**After:**
```javascript
async activate(context) {
  this.context = context;
}

async deactivate() {
  this.context = null;
}
```

### Step 3: Update Event Subscriptions

**Before:**
```javascript
async enable() {
  this.context.events.on('event', this.handler);
}

async disable() {
  this.context.events.off('event', this.handler);
}
```

**After:**
```javascript
async activate(context) {
  // Add namespace for auto-cleanup!
  context.events.on(
    'event',
    this.handler.bind(this),
    this.manifest.id // ← Critical!
  );
}

async deactivate() {
  // Cleanup is automatic!
  this.context.events.clearNamespace(this.manifest.id);
}
```

### Step 4: Update Config Access

**Before:**
```javascript
const value = this.context.config.get('myKey', 'default');
await this.context.config.set('myKey', value);
```

**After:**
```javascript
// 1. Register schema in activate()
context.config.registerSchema(
  this.manifest.id,
  {
    type: 'object',
    properties: {
      myKey: { type: 'string' }
    }
  },
  { myKey: 'default' }
);

// 2. Get config
const config = context.config.getPluginConfig(this.manifest.id);
const value = config.myKey;

// 3. Update config
await context.config.setPluginConfig(
  this.manifest.id,
  { myKey: 'newValue' }
);
```

### Step 5: Update Storage Access

**Before:**
```javascript
await this.context.storage.read('path/file.md');
await this.context.storage.write('path/file.md', content);
```

**After:**
```javascript
await context.storage.readFile('path/file.md');
await context.storage.writeFile('path/file.md', content, 'Commit message');
```

### Step 6: Add Optional Methods

```javascript
// Optional: Health check
async healthCheck() {
  return this.context !== null;
}

// Optional: Config change handler
async onConfigChange(newConfig) {
  console.log('Config changed:', newConfig);
}
```

### Step 7: Update Registration

**Before:**
```javascript
await pluginSystem.register(MyPlugin, manifest);
```

**After:**
```javascript
await pluginSystem.registerPaniniPlugin(MyPlugin);
```

---

## 📝 Complete Example: Before/After

### Before (Legacy)

```javascript
// old-plugin.js
class TodoPlugin {
  constructor(manifest, context) {
    this.manifest = manifest;
    this.context = context;
    this.todos = [];
  }

  async enable() {
    // Load todos
    const stored = this.context.config.get('todos', []);
    this.todos = stored;
    
    // Subscribe
    this.context.events.on('todo:add', this.onAddTodo);
    this.context.events.on('todo:complete', this.onCompleteTodo);
  }

  async disable() {
    // Manual cleanup
    this.context.events.off('todo:add', this.onAddTodo);
    this.context.events.off('todo:complete', this.onCompleteTodo);
  }

  onAddTodo = (data) => {
    this.todos.push(data);
    this.context.config.set('todos', this.todos);
  }

  onCompleteTodo = (data) => {
    const index = this.todos.findIndex(t => t.id === data.id);
    if (index > -1) {
      this.todos[index].completed = true;
      this.context.config.set('todos', this.todos);
    }
  }
}

// Registration
pluginSystem.register(TodoPlugin, {
  id: 'todo',
  name: 'Todo List',
  version: '1.0.0'
});
```

### After (Panini)

```javascript
// todo-plugin.js
class TodoPlugin {
  manifest = {
    id: 'todo',
    name: 'Todo List',
    version: '1.0.0',
    description: 'Simple todo list',
    tags: ['productivity']
  };

  constructor() {
    this.context = null;
  }

  async activate(context) {
    this.context = context;

    // 1. Register schema
    context.config.registerSchema(
      this.manifest.id,
      {
        type: 'object',
        properties: {
          todos: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                text: { type: 'string' },
                completed: { type: 'boolean' }
              }
            }
          }
        }
      },
      { todos: [] }
    );

    // 2. Load config
    const config = context.config.getPluginConfig(this.manifest.id);
    this.todos = config.todos || [];

    // 3. Subscribe with namespace
    context.events.on(
      'todo:add',
      this.onAddTodo.bind(this),
      this.manifest.id
    );

    context.events.on(
      'todo:complete',
      this.onCompleteTodo.bind(this),
      this.manifest.id
    );

    context.logger.info(`[${this.manifest.id}] Activated with ${this.todos.length} todos`);
  }

  async deactivate() {
    // Auto cleanup!
    this.context.events.clearNamespace(this.manifest.id);
    this.context = null;
  }

  async healthCheck() {
    return this.context !== null;
  }

  async onConfigChange(newConfig) {
    this.todos = newConfig.todos || [];
  }

  onAddTodo = async (data) => {
    this.todos.push(data);
    await this.saveTodos();
    this.context.events.emit('todo:updated', { todos: this.todos });
  }

  onCompleteTodo = async (data) => {
    const index = this.todos.findIndex(t => t.id === data.id);
    if (index > -1) {
      this.todos[index].completed = true;
      await this.saveTodos();
      this.context.events.emit('todo:updated', { todos: this.todos });
    }
  }

  async saveTodos() {
    await this.context.config.setPluginConfig(
      this.manifest.id,
      { todos: this.todos }
    );
  }
}

// Registration
await pluginSystem.registerPaniniPlugin(TodoPlugin);
```

---

## ✅ Migration Checklist

- [ ] Move manifest to class property
- [ ] Remove manifest/context from constructor params
- [ ] Rename `enable()` → `activate(context)`
- [ ] Rename `disable()` → `deactivate()`
- [ ] Add namespace to all `events.on()` calls
- [ ] Use `clearNamespace()` in `deactivate()`
- [ ] Register config schema in `activate()`
- [ ] Use `getPluginConfig()` instead of `config.get()`
- [ ] Use `setPluginConfig()` instead of `config.set()`
- [ ] Update storage API calls
- [ ] Add optional `healthCheck()`
- [ ] Add optional `onConfigChange()`
- [ ] Update plugin registration call
- [ ] Test activation/deactivation
- [ ] Test config changes
- [ ] Test event cleanup

---

## 🧪 Testing

### Test in Console

```javascript
// List plugins
listPlugins();

// Enable/disable
await enablePlugin('my-plugin');
await disablePlugin('my-plugin');

// Config
getPluginConfig('my-plugin');
await setPluginConfig('my-plugin', { enabled: false });

// Health check
await pluginSystem.healthCheckAll();
```

### Test Event Cleanup

```javascript
// Before deactivate
console.log(eventBus.getStats());
// { totalListeners: 5, byPlugin: { 'my-plugin': 3 } }

// Deactivate
await disablePlugin('my-plugin');

// After deactivate
console.log(eventBus.getStats());
// { totalListeners: 2, byPlugin: {} }
// ✅ All listeners cleaned up!
```

---

## 🔗 Resources

- [@panini/plugin-interface README](../../packages/plugin-interface/README.md)
- [Word Counter Example](../../plugins/pensine-plugin-word-counter/)
- [Panini Wrappers](../../src/core/panini-wrappers.js)
- [Integration Strategy](../PANINI_INTEGRATION_STRATEGY.md)

---

**Last Updated**: 2026-01-14  
**Status**: ✅ Ready for migration  
**Support**: Backward compatible, legacy plugins still work
