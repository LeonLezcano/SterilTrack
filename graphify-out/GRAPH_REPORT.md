# Graph Report - c:\Users\Regondi Calidad\Desktop\QM\SterilTrack  (2026-11-17)

## Corpus Check
- Corpus is ~9,467 words - fits in a single context window. You may not need a graph.

## Summary
- 116 nodes · 218 edges · 13 communities (10 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10

## God Nodes (most connected - your core abstractions)
1. `runAllTests()` - 19 edges
2. `seedDemoData()` - 11 edges
3. `renderApp()` - 11 edges
4. `keywords` - 10 edges
5. `handleQuickDispatchMock()` - 10 edges
6. `SurgicalTrayLifecycleEngine` - 9 edges
7. `purgeDemoData()` - 8 edges
8. `SterilTrackCache` - 8 edges
9. `ensureProtocolSeals()` - 7 edges
10. `restoreDemoData()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `runAllTests()` --calls--> `ensureProtocolSeals()`  [EXTRACTED]
  tests/run_tests.js → src/app.js
- `runAllTests()` --calls--> `seedDemoData()`  [EXTRACTED]
  tests/run_tests.js → src/app.js
- `runAllTests()` --calls--> `purgeDemoData()`  [EXTRACTED]
  tests/run_tests.js → src/app.js
- `runAllTests()` --references--> `SterilTrackCache`  [EXTRACTED]
  tests/run_tests.js → src/services/sterilTrackCache.service.js
- `runAllTests()` --calls--> `sealSterilizationProtocol()`  [EXTRACTED]
  tests/run_tests.js → src/utils/cryptoSeal.js

## Import Cycles
- None detected.

## Communities (13 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.12
Nodes (10): state, AnmatImplantConsumptionEngine, SplitBillingLedgerEngine, TRAY_STATES, VALID_TRANSITIONS, computeSHA256(), sealSterilizationProtocol(), __dirname (+2 more)

### Community 1 - "Community 1"
Cohesion: 0.24
Nodes (18): attachEventListeners(), autoclaveEngine, billingEngine, consumptionEngine, ensureProtocolSeals(), getTabButtonClasses(), handleQuickDispatchMock(), ICONS (+10 more)

### Community 2 - "Community 2"
Cohesion: 0.17
Nodes (11): author, description, license, name, scripts, security:full, test, test:security (+3 more)

### Community 3 - "Community 3"
Cohesion: 0.18
Nodes (10): background_color, description, display, icons, lang, name, scope, short_name (+2 more)

### Community 4 - "Community 4"
Cohesion: 0.27
Nodes (9): renderActiveView(), renderBillingView(), renderConsumptionsView(), renderCyclesView(), renderFeedbackBanner(), renderTraysView(), formatCurrency(), formatDate() (+1 more)

### Community 5 - "Community 5"
Cohesion: 0.20
Nodes (10): keywords, anmat, autoclave, bioseguridad, cajas-quirurgicas, esterilizacion, implantes, offline-first (+2 more)

### Community 6 - "Community 6"
Cohesion: 0.36
Nodes (3): SurgicalTrayLifecycleEngine, assert(), runAllTests()

### Community 7 - "Community 7"
Cohesion: 0.33
Nodes (5): __dirname, __filename, mime, root, server

## Knowledge Gaps
- **44 isolated node(s):** `name`, `short_name`, `description`, `start_url`, `scope` (+39 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `runAllTests()` connect `Community 6` to `Community 0`, `Community 1`, `Community 4`, `Community 8`, `Community 9`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `SurgicalTrayLifecycleEngine` connect `Community 6` to `Community 0`, `Community 1`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `AnmatImplantConsumptionEngine` connect `Community 0` to `Community 1`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `name`, `short_name`, `description` to the rest of the system?**
  _44 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.12380952380952381 - nodes in this community are weakly interconnected._