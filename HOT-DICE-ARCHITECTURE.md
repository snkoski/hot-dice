# Hot Dice Project: Detailed Architecture & Extensibility Analysis

This document provides a comprehensive rundown of how the hot-dice project is structured, how its components interact, and whether the current architecture will support future extensions. It is written to be human-readable while containing sufficient technical detail for both developers and LLM-assisted development.

---

## 1. Project Overview

**Hot Dice** (also known as Farkle) is a TypeScript-based dice game simulator with a pluggable strategy system. The project allows:

- Running full games to completion (headless)
- Running batch simulations (thousands of games) to compare strategies
- Step-through visualization (one roll at a time)
- Simultaneous play (all strategies use the same dice rolls per round)
- Interactive play (human players mixed with AI strategies)
- A web UI for all of the above

**Tech Stack:**
- **Runtime:** Node.js (ES2022, ESNext modules)
- **Server:** Fastify with CORS, static file serving, WebSocket
- **Build:** Vite (client), tsx (server dev)
- **Testing:** Vitest
- **RNG:** seedrandom (reproducible dice rolls)
- **External:** `@multi-mouse/client` (local file reference for shared cursor support)

---

## 2. Directory Structure

```
hot-dice/
├── src/
│   ├── core/                    # Game engine (pure logic)
│   │   ├── types.ts             # All TypeScript interfaces
│   │   ├── dice.ts              # Seedable dice rolling
│   │   ├── scoring.ts           # Scoring calculation
│   │   ├── turn.ts              # Turn management
│   │   └── game.ts              # Game orchestration
│   ├── strategies/              # Strategy system
│   │   ├── built-in.ts          # Simple threshold strategies
│   │   ├── HumanStrategy.ts     # Async human input bridge
│   │   ├── strategy-hash.ts     # Strategy identification for stats
│   │   └── composable/          # Composable strategy system
│   │       ├── index.ts
│   │       ├── types.ts
│   │       ├── builder.ts
│   │       ├── presets.ts
│   │       ├── dice-selectors.ts
│   │       ├── continue-evaluators.ts
│   │       ├── threshold-calculators.ts
│   │       └── threshold-modifiers.ts
│   ├── simulator/               # Batch simulation
│   │   ├── simulator.ts
│   │   └── types.ts
│   └── web/                     # Web server & game modes
│       ├── server.ts            # Fastify app + API + WebSocket
│       ├── step-game.ts         # Sequential step-through (unused by API)
│       ├── step-game-simultaneous.ts
│       └── interactive-step-game.ts
├── public/                      # Static frontend (vanilla JS)
│   ├── index.html
│   ├── app.js                   # Main UI logic (~2300 lines)
│   └── main.js                  # Entry point
├── tests/                       # Vitest tests
├── examples/                    # CLI examples
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## 3. Architecture Layers

The project is organized into three main layers:

```
┌─────────────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER                                              │
│  - public/app.js (vanilla JS UI)                                 │
│  - Fastify server (REST + WebSocket)                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  ORCHESTRATION LAYER                                             │
│  - Game (full game)                                              │
│  - Simulator (batch games)                                       │
│  - StepThroughGame / SimultaneousStepGame / InteractiveStepGame  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  CORE LAYER                                                      │
│  - DiceRoller, ScoringEngine, TurnManager                        │
│  - Strategy interface (selectDice, decideContinue)               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Core Layer (Game Engine)

### 4.1 Types (`src/core/types.ts`)

All shared interfaces live here. Key types:

| Type | Purpose |
|------|---------|
| `DieValue`, `DiceRoll` | Dice representation |
| `ScoreType` | Enum for scoring combination types |
| `ScoringCombination`, `ScoringResult` | Output of scoring analysis |
| `PlayerState`, `PlayerStats` | Player data |
| `TurnState` | State during a turn |
| `GameState` | Full game snapshot |
| `GameConfig` | Game configuration |
| `ScoringRules` | Configurable scoring rules |
| `Strategy`, `StrategyContext` | Strategy contract |
| `DiceSelectionDecision`, `ContinueDecision` | Strategy outputs |
| `HumanDecisionContext`, `PendingHumanDecision` | Human player support |

**Extensibility:** Types are well-defined and centralized. Adding new scoring rules or game modes would require extending `ScoringRules`, `GameConfig`, or `GameState`. The design is flexible enough for incremental extension.

### 4.2 Dice (`src/core/dice.ts`)

- **DiceRoller** class: seedable RNG via `seedrandom`
- `roll(count)` → `DiceRoll`
- `reset(seed)` for reproducible sequences (used for mirrored dice / same-round rolls)

**Extensibility:** Simple and focused. No changes needed for typical extensions.

### 4.3 Scoring (`src/core/scoring.ts`)

- **ScoringEngine** class with configurable `ScoringRules`
- `analyzeRoll(dice)` → `ScoringResult` (combinations, points, isFarkle, isHotDice)
- Handles: singles (1, 5), n-of-a-kind (3–6), straight, three pairs
- Rules can disable individual scoring types

**Extensibility:** Adding new scoring patterns (e.g., two triples) would require changes to `findCombinations` and possibly new `ScoreType` values. The `ScoringRules` interface is already extensible.

### 4.4 Turn (`src/core/turn.ts`)

- **TurnManager** manages a single player's turn
- `startTurn()` → initial state
- `rollDice()` → new state with roll + scoring analysis
- `selectDice(combinations)` → updates turn state, handles hot dice
- `bankPoints()` → applies points to player, checks "on board"

**Extensibility:** Turn logic is self-contained. The `TurnManager` receives `GameState` by reference and mutates it (via `bankPoints`). This is fine for current use but could complicate undo/replay if needed later.

### 4.5 Game (`src/core/game.ts`)

- **Game** class: main orchestrator
- Constructor: `GameConfig` + array of `Strategy` (one per player)
- `playTurn()` → single turn, returns `TurnRecord`
- `play()` → runs until game over
- Handles: turn order, final round when someone hits target, tie detection
- Uses `roundSeed = baseSeed + currentRound` for mirrored dice (same rolls per round)
- **Duplication:** `handleGameEnd()` contains a large copy of the turn loop for final-round play. This is a maintenance risk.

**Extensibility:** The game loop is tightly coupled to the turn structure. Adding variants (e.g., different win conditions, team play) would likely require a new orchestrator or significant refactoring.

---

## 5. Strategy System

### 5.1 Strategy Interface (`src/core/types.ts`)

```typescript
interface Strategy {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  selectDice(context: StrategyContext): DiceSelectionDecision;
  decideContinue(context: StrategyContext): ContinueDecision;
  onGameStart?(gameState: GameState): void;
  onGameEnd?(gameState: GameState): void;
  onTurnComplete?(turnRecord: TurnRecord): void;
}
```

Strategies are **synchronous**. `HumanStrategy` works around this with a promise queue (see below).

### 5.2 Built-in Strategies (`src/strategies/built-in.ts`)

- **Threshold strategies:** `createThresholdStrategy(threshold)` → stop when turn points ≥ threshold
- Presets: `conservative` (500), `moderate` (1000), `balanced` (1500), `aggressive` (2000), `veryAggressive` (2500)
- **Adaptive:** adjusts threshold by score difference vs leading opponent
- **Risk-aware:** uses `farkleRisk` and `expectedValue` from context
- `listStrategies()` = built-in + composable presets
- `getStrategy(id)` = lookup by ID

### 5.3 HumanStrategy (`src/strategies/HumanStrategy.ts`)

Bridges async human input with the sync `Strategy` interface:

1. `createDiceDecisionPromise()` / `createContinueDecisionPromise()` – create promises before the game needs a decision
2. UI waits for user input
3. `submitDiceSelection()` / `submitContinueDecision()` – resolve promises and store decisions
4. When the game calls `selectDice()` / `decideContinue()`, it receives the pre-loaded decision

**Extensibility:** This pattern works but is fragile: the game must call `create*Promise` before `selectDice`/`decideContinue`. The `InteractiveStepGame` handles this correctly.

### 5.4 Composable Strategy System (`src/strategies/composable/`)

A builder-based system for composing strategies from smaller pieces:

- **DiceSelector:** `(context, available) => ScoringCombination[]` – which combinations to keep
- **ThresholdCalculator:** `(context) => number` – base threshold
- **ThresholdModifier:** `(context) => number` – multiplier (0.5–1.5, etc.)
- **ContinueEvaluator:** `(context) => { shouldContinue, weight, reason }` – whether to continue
- **StrategyBuilder:** fluent API to combine these
- **Combination modes:** `all`, `any`, `weighted`, `priority` for multiple evaluators

**Presets:** `adaptiveComposed`, `riskAwareComposed`, `selectiveMinimum`, `dynamicMultiFactor`, `endgameAggressive`, `conservativeComposed`, `safe500`

**Extensibility:** Very good. New strategies can be built by adding:
- New `DiceSelector` functions
- New `ThresholdCalculator` / `ThresholdModifier` functions
- New `ContinueEvaluator` functions
- New presets using `StrategyBuilder`

---

## 6. Simulator (`src/simulator/`)

- **Simulator** runs N games with configurable strategies and game config
- `onProgress` callback for streaming progress
- Aggregates: win rate, farkle rate, score distribution, luck score, etc.
- **Luck score:** compares actual farkles vs expected (based on dice-count probabilities)

**Extensibility:** Adding new statistics requires changes to `StrategyStatistics` and `calculateStrategyStats`. The structure is clear but somewhat monolithic.

---

## 7. Web Layer

### 7.1 Server (`src/web/server.ts`)

**Fastify app** with:

- CORS, static files (dist or public), WebSocket
- **REST API:**
  - `GET /api/strategies` – list strategies
  - `POST /api/simulate` – run simulation (blocking)
  - `POST /api/game/init` – init step-through game
  - `POST /api/game/step` – advance step
  - `GET /api/game/steps` – get all steps
  - `POST /api/game/interactive/init` – init interactive game
  - `POST /api/game/interactive/decision` – submit human decision
  - `GET /api/game/interactive/history` – human decision history
  - `GET /api/health` – health check
- **WebSocket:**
  - `/api/simulate/stream` – streaming simulation with progress
  - `/ws/cursors` – proxy to multi-mouse server (port 3001)

**Custom strategies:** `getOrCreateCustomStrategy()` builds strategies from `{ id, threshold, minDice, type, name, description }` and caches them in memory.

**Session storage:** `stepGames` and `interactiveGames` are in-memory `Map`s. Games are pruned after 1 hour (by parsing timestamps from IDs). No persistence.

### 7.2 Game Modes

| Class | File | Purpose |
|-------|------|---------|
| `StepThroughGame` | step-game.ts | Sequential, one strategy per player, step-by-step. **Not used by API.** |
| `SimultaneousStepGame` | step-game-simultaneous.ts | All players share same dice per round, step-by-step. Used by `/api/game/*`. |
| `InteractiveStepGame` | interactive-step-game.ts | Mix of human and AI players, pauses for human decisions. |

**Duplication:** Each mode reimplements:
- Turn flow (roll → select dice → decide continue → bank)
- `createStrategyContext`, `calculateFarkleRisk`, `calculateExpectedValue`
- Player creation, state cloning

This is the main source of maintenance burden.

### 7.3 Frontend (`public/app.js`)

- Vanilla JavaScript, no framework
- ~2300+ lines
- Features: strategy selection, simulation (REST + WebSocket), step-through, interactive play, custom strategies, strategy stats (localStorage)
- Strategy hashing for persistent stats (mirrors `strategy-hash.ts` logic)

**Extensibility:** A single large file makes it harder to add features without conflicts. A component-based approach (e.g., React/Vue) would improve modularity.

---

## 8. Data Flow

### 8.1 Full Game (headless)

```
Game(config, strategies)
  → play() loop
    → playTurn()
      → TurnManager.rollDice()
      → strategy.selectDice(context)
      → TurnManager.selectDice(selection)
      → strategy.decideContinue(context)
      → [repeat or bank]
      → TurnManager.bankPoints()
  → getState()
```

### 8.2 Simulation

```
Simulator(config)
  → run()
    → for i = 0..gameCount:
        Game(config, strategies).play()
        → aggregate stats
    → calculateStrategyStats()
    → return SimulationResults
```

### 8.3 Step-through (Simultaneous)

```
SimultaneousStepGame(config, strategies)
  → nextStep()
    → startNewRound() | rollForAllPlayers() | completeRound()
    → each player: TurnManager, strategy.selectDice, strategy.decideContinue
    → same dice roll for all players per round
```

### 8.4 Interactive

```
InteractiveStepGame(config, strategies, humanIndices)
  → advanceToDecisionPoint()
    → nextStep() until awaiting_human_decision | game_end
  → On human turn:
      createHumanDiceDecision() | createHumanContinueDecision()
      → HumanStrategy.createDiceDecisionPromise() | createContinueDecisionPromise()
      → [wait for API call]
  → submitHumanDecision(decisionId, decision)
      → HumanStrategy.submitDiceSelection() | submitContinueDecision()
      → advanceToDecisionPoint()
```

---

## 9. Extensibility Assessment

### 9.1 What Works Well

| Area | Assessment |
|------|------------|
| **Strategy system** | Composable builders, clear interface, easy to add new strategies |
| **Core types** | Centralized, well-typed, extensible |
| **Scoring rules** | Configurable via `ScoringRules` |
| **RNG** | Seedable, supports mirrored dice |
| **Simulator** | Clean API, progress callback, rich stats |
| **API design** | REST + WebSocket, clear endpoints |

### 9.2 Pain Points

| Area | Issue |
|------|-------|
| **Turn loop duplication** | `Game`, `handleGameEnd`, `StepThroughGame`, `SimultaneousStepGame`, `InteractiveStepGame` all implement turn logic with slight variations |
| **Context creation** | `createStrategyContext`, `calculateFarkleRisk`, `calculateExpectedValue` duplicated in Game, StepThroughGame, SimultaneousStepGame, InteractiveStepGame |
| **StepThroughGame** | Unused by API; could be removed or consolidated |
| **Frontend** | Single large `app.js`; hard to extend without refactor |
| **Session storage** | In-memory only; no persistence, no multi-instance support |
| **Custom strategy API** | Limited to `{ threshold, minDice, type }`; no way to define full composable strategies via API |

### 9.3 Will It Support Extension?

**Yes, with caveats:**

- **Adding strategies:** Easy. Use composable system or implement `Strategy` directly.
- **Adding scoring rules:** Moderate. Extend `ScoringRules` and `ScoringEngine`.
- **Adding game modes:** Hard. Each mode reimplements turn logic.
- **Adding UI features:** Moderate. `app.js` is large but structured; new features can be added with care.
- **Persistence / scaling:** Would require replacing in-memory maps with a store (DB, Redis, etc.).

---

## 10. Recommendations for Future Expansion

### 10.1 Short-term (Low Effort)

1. **Extract shared turn logic** into a `TurnExecutor` or similar that all game modes call. This reduces duplication and bugs.
2. **Extract context creation** into a shared `createStrategyContext(state, player, turnState)` utility.
3. **Remove or integrate `StepThroughGame`** – either use it or delete it to avoid confusion.

### 10.2 Medium-term (Moderate Effort)

1. **Refactor `handleGameEnd`** in `Game` to reuse the main turn loop (e.g., parameterize "is final round").
2. **Add a strategy serialization format** so custom strategies can be defined via API (e.g., JSON describing composable components).
3. **Split `app.js`** into modules (e.g., `simulation.js`, `stepGame.js`, `interactive.js`, `strategyStats.js`).

### 10.3 Long-term (Higher Effort)

1. **Introduce a proper game mode abstraction** – e.g., `GameMode` interface with `init()`, `nextStep()`, `submitDecision?()`, so adding new modes is additive.
2. **Add persistence** for game sessions if you need replay, sharing, or multi-instance deployment.
3. **Consider a modern frontend** (React, Vue, Svelte) for easier feature development and testing.

---

## 11. Summary for LLM Consumption

When extending this codebase, an LLM should:

- **Prefer the composable strategy system** for new strategies; avoid adding one-off strategies to `built-in.ts` unless they are trivial.
- **Reuse `createStrategyContext`** patterns; do not duplicate farkle risk / expected value logic.
- **Avoid duplicating turn logic**; if adding a new game mode, consider extracting shared logic first.
- **Use `StrategyContext`** for any new strategy inputs; it already provides `gameState`, `playerState`, `turnState`, `availableScoring`, `opponents`, `leadingOpponentScore`, `farkleRisk`, `expectedValue`.
- **Match existing API patterns** when adding endpoints (e.g., `strategyIds` vs `strategies` for custom).
- **Be aware of `HumanStrategy`'s promise-based flow** when modifying interactive play.

---

*Document generated for the hot-dice project. Last updated: March 2025.*
