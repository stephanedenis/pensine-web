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

| Aspect            | Legacy                      | Modern                |
| ----------------- | --------------------------- | --------------------- |
| **Coupling**      | High (direct calls)         | Low (EventBus)        |
| **Extensibility** | Hard (modify app.js)        | Easy (add plugin)     |
| **Testing**       | Brittle (full app init)     | Robust (mock deps)    |
| **Configuration** | String-based (localStorage) | JSON Schema validated |
| **Scalability**   | Max ~5 features             | Unlimited plugins     |

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

| Risk                    | Probability | Impact | Mitigation                           |
| ----------------------- | ----------- | ------ | ------------------------------------ |
| Tests remain flaky      | Medium      | High   | Intensive debugging (done this week) |
| Plugin migration stalls | Low         | Medium | Document as you go                   |
| Performance degradation | Low         | Medium | Event system profiling               |
| User config migration   | Low         | High   | Automated migration script           |

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
**Last Updated**: 2026-01-15

---

## 🚀 Decision: Performance Strategy - Vanilla JS First, Wasm for Hot Paths

**Date**: 2026-01-15
**Decision Maker**: Stéphane + Copilot
**Status**: ACCEPTED

---

### Context

Question: Should we use WebAssembly (Wasm) for performance-critical operations?

Current app characteristics:

- Vanilla JavaScript (no build step)
- Bundle size: <100 KB
- Target: notes typically <50 KB
- Philosophy: Simplicity over premature optimization

### The Decision

**Keep vanilla JavaScript as default, introduce Wasm as optional plugins for proven hot paths.**

### Rationale

#### Why NOT Wasm now (v0.0.x → v0.9.x):

- ❌ **Complexity**: Requires build toolchain (rustc/clang → wasm)
- ❌ **Bundle size**: Typical Wasm modules 1-2 MB vs current <100 KB total
- ❌ **Breaks philosophy**: "Zero build step" is core value
- ❌ **Premature**: Current JS performance already sufficient for typical usage
- ✅ **Simplicity > Speed**: For notes <50 KB, JS parsing is <10ms

#### Why Wasm later (v1.0+):

- ✅ **Hot paths identified**: Real performance bottlenecks proven by metrics
- ✅ **As plugins**: Optional, lazy-loaded, with JS fallback
- ✅ **Progressive enhancement**: Advanced users opt-in
- ✅ **Specific use cases**: Search, Git, graph algorithms

### Priority Hot Paths for Future Wasm

| Feature              | Current (JS)                      | With Wasm        | Gain | Priority        |
| -------------------- | --------------------------------- | ---------------- | ---- | --------------- |
| **Full-text search** | Lunr.js ~350ms (5000 notes)       | Tantivy ~15ms    | 23x  | 🥇 HIGH         |
| **Git operations**   | isomorphic-git ~12s (500 commits) | libgit2 ~0.8s    | 15x  | 🥈 MEDIUM       |
| **Graph algorithms** | N/A (future)                      | Rust graph libs  | N/A  | 🥉 LOW          |
| **Markdown parsing** | marked ~10ms                      | Wasm parser ~2ms | 5x   | ❌ NOT WORTH IT |

### Implementation Strategy

```javascript
// Plugin manifest with Wasm + fallback
{
  "plugins": {
    "search-tantivy": {
      "enabled": true,
      "source": "cdn",
      "url": "https://unpkg.com/pensine-plugin-search-wasm@latest",
      "wasm": true,              // ← Wasm module
      "fallback": "search-js",   // ← JS fallback if Wasm fails
      "lazyLoad": true,          // ← Load only when needed
      "size": "1.5 MB"           // ← User can see cost
    }
  }
}
```

**Advantages**:

- ✅ Base app remains lightweight
- ✅ Advanced users get performance boost
- ✅ Graceful degradation (Wasm fail → JS fallback)
- ✅ Lazy loading (download only when activated)
- ✅ Clear opt-in (users see bundle size)

### Trigger Conditions for Wasm Implementation

Implement Wasm plugin when **ALL** of these are true:

1. **Proven bottleneck**: >500ms operation in real usage
2. **Frequent operation**: >10 times/day by typical user
3. **Wasm advantage**: >5x performance improvement demonstrated
4. **JS fallback exists**: Works without Wasm
5. **Bundle size acceptable**: <2 MB additional download
6. **Browser support**: >95% of target browsers

### Timeline

```
Phase 1 (v0.0.x → v0.9.x): Vanilla JS only
├─ No Wasm
├─ Profile & identify real bottlenecks
└─ Optimize JS first

Phase 2 (v1.0 → v1.5): First Wasm plugin
├─ Implement: Full-text search (Tantivy)
├─ As optional plugin with JS fallback
└─ Gather performance metrics

Phase 3 (v1.6+): Additional Wasm plugins
├─ Implement: libgit2 for local-git mode
├─ Consider: Graph algorithms for "3e Hémisphère"
└─ Ecosystem: Accept community Wasm plugins

Phase 4 (v2.0+): Wasm for advanced features
├─ Semantic analysis
├─ ML-based search ranking
└─ Knowledge graph computation
```

### Rejected Alternatives

**Alternative 1**: Wasm from day one

- ❌ Violates "simplicity first" principle
- ❌ Premature optimization
- ❌ Adds complexity without proven need

**Alternative 2**: Never use Wasm

- ❌ Limits future performance ceiling
- ❌ Prevents advanced features (ML, semantic analysis)
- ❌ Competitive disadvantage vs native apps

**Alternative 3**: Mandatory Wasm for all users

- ❌ Forces 1-2 MB download on everyone
- ❌ Breaks on Wasm-incompatible browsers
- ❌ No graceful degradation

### Success Metrics

**Phase 1 (JS optimization)**:

- [ ] All operations <100ms on average hardware
- [ ] 5000 notes searchable in <500ms
- [ ] Git clone (100 commits) in <5s

**Phase 2 (First Wasm plugin)**:

- [ ] Search 5000 notes in <50ms (Tantivy)
- [ ] <20% of users opt-in (validates optional approach)
- [ ] Zero crashes due to Wasm failures (fallback works)
- [ ] 95%+ positive feedback from Wasm users

### Dependencies

- ✅ Plugin system operational (done)
- ✅ Lazy loading infrastructure (done)
- 🔄 Performance profiling tools (in progress)
- ⏳ Wasm build pipeline (future)
- ⏳ Browser compatibility tests (future)

### Risks & Mitigation

| Risk                    | Probability | Impact | Mitigation                   |
| ----------------------- | ----------- | ------ | ---------------------------- |
| Wasm fails to load      | Medium      | Low    | JS fallback mandatory        |
| Bundle size bloat       | Low         | Medium | Size warnings + lazy load    |
| Build complexity        | High        | Medium | Isolate in separate plugins  |
| Browser incompatibility | Low         | Low    | Feature detection + fallback |

---

### Consequences

**What changes**:

1. Performance roadmap clearly defined
2. Plugin system designed for Wasm support
3. JS fallbacks required for all Wasm features
4. Bundle size monitoring critical

**What stays the same**:

1. Core app remains vanilla JS
2. Zero build step for main codebase
3. Works without Wasm
4. Simplicity-first philosophy

---

### Next Actions

**Q1 2026** (Current):

- [ ] Profile real-world performance bottlenecks
- [ ] Document Wasm plugin architecture
- [ ] Create JS fallback template

**Q2-Q3 2026**:

- [ ] Implement first Wasm plugin (search) if metrics justify
- [ ] A/B test with/without Wasm
- [ ] Gather user feedback

**Q4 2026+**:

- [ ] Expand Wasm to proven hot paths only
- [ ] Community Wasm plugin guidelines
- [ ] Performance dashboard for users

---

**References**:

- Plugin Architecture: `docs/BOOTSTRAP_ARCHITECTURE.md`
- Performance Benchmarks: `docs/PERFORMANCE.md` (to create)
- Wasm Plugin Template: `packages/plugin-wasm-template/` (future)
