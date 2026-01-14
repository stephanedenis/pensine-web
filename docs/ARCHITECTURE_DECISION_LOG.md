# Architecture Decision Log - Modern Config System

**Date**: 2026-01-14  
**Decision Maker**: Stéphane + Copilot  
**Status**: ACCEPTED (pending tests)

---

## 🎯 Decision: Make PluginSystem + ConfigManager the Future Foundation

### Context

Currently, Pensine Web has:
- **Legacy System** (`lib/`, `app.js`): Monolithic, tightly coupled
- **Modern System** (`src/core/`, `src/lib/components/`): EventBus + PluginSystem + ConfigManager

Tests show:
- 7/12 passing (modern system initializes correctly)
- 5/12 failing (settings panel UI issues - fixable)
- Wizard refactored to opt-in ✅

### The Decision

**We commit to EventBus + PluginSystem + ConfigManager as our future architecture.**

This means:
1. **Everything is a plugin** - Even core features (journal, calendar) as plugins
2. **Configuration is centralized** - ConfigManager + JSON Schema validation
3. **Communication is event-driven** - No direct dependencies between plugins
4. **Storage is abstracted** - Works with GitHub, Local Git, etc.

### Rationale

| Aspect | Legacy | Modern |
|--------|--------|--------|
| **Coupling** | High (direct calls) | Low (EventBus) |
| **Extensibility** | Hard (modify app.js) | Easy (add plugin) |
| **Testing** | Brittle (full app init) | Robust (mock deps) |
| **Configuration** | String-based (localStorage) | JSON Schema validated |
| **Scalability** | Max ~5 features | Unlimited plugins |

### Accepted Tradeoffs

✅ **ACCEPT**: More files/complexity initially  
✅ **ACCEPT**: Need for plugin development guide  
❌ **REJECT**: Supporting both systems indefinitely

### Migration Plan

```
Q1 2026:
├─ Stabilize tests (this week)
├─ Migrate all plugins to PluginSystem (week 2-3)
└─ Unify config (week 4)

Q2 2026:
├─ Deprecate legacy system
├─ Create plugin dev docs
└─ Implement first custom plugin as proof

Q3+ 2026:
├─ Community plugins
├─ Plugin marketplace
└─ Full modular ecosystem
```

### Dependencies

This decision depends on:
- ✅ EventBus implementation (done)
- ✅ PluginSystem implementation (done)
- ✅ ConfigManager implementation (done)
- 🔄 Tests stabilization (in progress)
- ⏳ Plugin documentation (pending)
- ⏳ Migration of existing plugins (pending)

### Success Metrics

- [ ] All 12 tests green
- [ ] All 4 existing plugins migrated to PluginSystem
- [ ] Custom plugin created and documented
- [ ] <100ms additional init time
- [ ] Zero breaking changes for end users

### Risks & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Tests remain flaky | Medium | High | Intensive debugging (done this week) |
| Plugin migration stalls | Low | Medium | Document as you go |
| Performance degradation | Low | Medium | Event system profiling |
| User config migration | Low | High | Automated migration script |

### Alternative Considered

**Alternative**: Keep both systems indefinitely

**Why Rejected**:
- Maintenance burden = 2x work
- Confuses new contributors
- Tests must support both paths
- No clear migration path
- Users stuck with legacy once they choose it

---

## Consequences

### What Changes

1. **For App Core**: 
   - EventBus becomes communication backbone
   - All plugins register with PluginSystem
   - Configuration via ConfigManager

2. **For Plugins**:
   - Must implement PluginInterface
   - Must emit standard events
   - Must register configSchema

3. **For Users**:
   - Settings unified in one UI
   - Configuration shared across plugins
   - Consistent experience

### What Stays the Same

1. **For End Users**: 
   - Same UI/UX
   - Same data (GitHub storage)
   - Same keyboard shortcuts

2. **For API**:
   - localStorage still works (via StorageManager)
   - GitHub API same
   - Markdown rendering same

---

## Next Actions

1. **This Week** (Jan 14-16):
   - [ ] Debug & fix 5 failing tests
   - [ ] Commit decision to repo
   - [ ] Create plugin development guide

2. **Next Week** (Jan 20-24):
   - [ ] Migrate journal-plugin to PluginSystem
   - [ ] Create first custom plugin example
   - [ ] Document plugin manifest

3. **Following Week** (Jan 27-31):
   - [ ] Migrate remaining plugins
   - [ ] Performance testing
   - [ ] User migration plan

---

## References

- Architecture Document: `docs/ARCHITECTURE_MODERN_CONFIG_SYSTEM.md`
- EventBus: `src/core/event-bus.js`
- PluginSystem: `src/core/plugin-system.js`
- ConfigManager: `src/core/config-manager.js`
- Tests: `tests/config-system-integration.spec.mjs`

---

**Record Keeper**: GitHub Copilot  
**Decision Date**: 2026-01-14  
**Last Updated**: 2026-01-14
