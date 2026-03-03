# Hot Dice — Detailed Architecture & Codebase Rundown

## What This Project Is

Hot Dice is a TypeScript implementation of Farkle (also called Hot Dice), a dice game where players roll six dice, set aside scoring combinations, and choose whether to keep rolling for more points or bank what they have. Rolling with no scoring dice — a "farkle" — loses all points accumulated that turn.

The project is built around three distinct goals that exist at the same time:

1. **A headless simulator** — run thousands of games in batch mode to compare AI strategies statistically.
2. **A step-through visualizer** — watch a game unfold one roll at a time through a web UI.
3. **An interactive game** — a human plays against AI opponents in real time through the browser.

All three share the same core game engine. The server is a Fastify HTTP + WebSocket app that serves a vanilla JavaScript frontend.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js, ESM modules (`"type": "module"`) |
| Language | TypeScript 5.3, `strict: true`, ES2022 target |
| Server | Fastify 5 with `@fastify/cors`, `@fastify/static`, `@fastify/websocket` |
| Dev server | `tsx --watch` (no compile step during development) |
| Build | Vite 7 (bundles frontend only; server runs as TypeScript directly) |
| Testing | Vitest 1 |
| RNG | `seedrandom` (reproducible dice rolls via seeded pseudo-random) |
| Package manager | pnpm 9 |
| Extras | `ws` (raw WebSocket client for proxy), `@multi-mouse/client` (local file dep for cursor sharing) |

---

## Directory Structure

```
hot-dice/
├── src/
│   ├── core/                        # Pure game logic, no I/O
│   │   ├── types.ts                 # All shared TypeScript interfaces
│   │   ├── dice.ts                  # DiceRoller: seedable roll(count)
│   │   ├── scoring.ts               # ScoringEngine: analyzeRoll()
│   │   ├── turn.ts                  # TurnManager: roll → select → bank
│   │   └── game.ts                  # Game: orchestrates full game lifecycle
│   │
│   ├── strategies/                  # All strategy implementations
│   │   ├── built-in.ts              # Simple threshold strategies + adaptive
│   │   ├── HumanStrategy.ts         # Async-to-sync bridge for human players
│   │   ├── strategy-hash.ts         # Hashing for persistent stats tracking
│   │   └── composable/              # Builder pattern for complex strategies
│   │       ├── index.ts             # Re-exports everything
│   │       ├── types.ts             # Types: DiceSelector, ThresholdCalculator, etc.
│   │       ├── builder.ts           # StrategyBuilder fluent API
│   │       ├── presets.ts           # 7 pre-built composable strategies
│   │       ├── dice-selectors.ts    # greedy, keepMinimum, conditionalByDiceCount, etc.
│   │       ├── continue-evaluators.ts # thresholdBased, highRiskExit, expectedValueBased, etc.
│   │       ├── threshold-calculators.ts # fixed, adaptiveToOpponent, endgameAdjusted, etc.
│   │       └── threshold-modifiers.ts   # diceCountAdjustment, riskAdjustment, rollCountAdjustment
│   │
│   ├── simulator/                   # Batch simulation runner
│   │   ├── simulator.ts             # Runs N games, aggregates statistics
│   │   └── types.ts                 # SimulationConfig, SimulationResults, StrategyStatistics
│   │
│   └── web/                         # Web server and game session classes
│       ├── server.ts                # Fastify app: all routes, WebSocket, session maps
│       ├── step-game.ts             # Sequential step-through (NOT used by API — dead code)
│       ├── step-game-simultaneous.ts # All strategies use same dice per round
│       └── interactive-step-game.ts # Human + AI, pauses for human decisions
│
├── public/                          # Frontend (vanilla JS, served as static files)
│   ├── index.html                   # Single HTML page
│   ├── main.js                      # Vite entry: imports app.js + initializes multi-mouse
│   └── app.js                       # All UI logic (~2300+ lines, monolithic)
│
├── dist/                            # Vite build output (bundled JS, used in production)
├── tests/                           # Vitest tests for core + composable strategies
├── examples/                        # CLI scripts (basic-game.ts, run-simulation.ts)
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

---

## Architecture: Three Layers

The project is conceptually organized into three layers that communicate one way (top calls down, bottom never calls up):

```
┌──────────────────────────────────────────────────────────────┐
│  PRESENTATION                                                 │
│  • public/app.js  — vanilla JS browser UI                    │
│  • src/web/server.ts  — HTTP + WebSocket API                 │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  ORCHESTRATION                                                │
│  • Game  — headless full-game runner                         │
│  • Simulator  — runs many Games, collects stats              │
│  • SimultaneousStepGame  — step-through for visualization    │
│  • InteractiveStepGame  — step-through with human input      │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  CORE ENGINE                                                  │
│  • DiceRoller  — seedable dice                               │
│  • ScoringEngine  — analyzes rolls                           │
│  • TurnManager  — manages one player's turn                  │
│  • Strategy interface  — pluggable decision-making           │
└──────────────────────────────────────────────────────────────┘
```

---

## Core Layer: The Game Engine

### `src/core/types.ts` — The Central Contract

Every interface in the project lives here. This file is the authoritative source of truth for what data looks like as it flows through the system. There are no other interface definitions scattered around — if you want to know the shape of something, look here first.

Key types to understand:

**`DieValue`** — A TypeScript union type `1 | 2 | 3 | 4 | 5 | 6`. Not just `number`. This catches bugs at compile time.

**`DiceRoll`** — `DieValue[]`. An array of individual die results.

**`ScoreType`** — An enum listing every scoring combination the engine knows about: `SINGLE_ONE`, `SINGLE_FIVE`, `THREE_OF_KIND`, `FOUR_OF_KIND`, `FIVE_OF_KIND`, `SIX_OF_KIND`, `STRAIGHT`, `THREE_PAIRS`.

**`ScoringCombination`** — One identified scoring combination: its type, which dice values it uses, how many points it's worth, and crucially, the *indices* of those dice in the original roll array. Indices matter because a human player needs to know which specific dice to pick up.

**`ScoringResult`** — The full output of analyzing a roll: all combinations found, total points, how many dice are "scoring dice", which dice are left over (`nonScoringDice`), whether it was a farkle, and whether it was a hot-dice roll (all 6 dice scored).

**`PlayerState`** — Everything about a player persisted across turns: ID, name, total score, whether they're "on the board" (have hit the minimum score to start banking), games won, and a `PlayerStats` object with detailed performance data.

**`TurnState`** — The mutable state for one player's current turn: points accumulated so far, which roll number we're on, how many dice remain, the last roll, the last scoring result, which combinations have been banked, and flags for whether the turn can continue or ended in a farkle.

**`GameState`** — A snapshot of the entire game at any moment: game ID, all players, whose turn it is (by index), the current turn state, target score, minimum score to board, whether the game is over, winner IDs, and the full turn history.

**`GameConfig`** — What you pass to start a game: target score, minimum to board, player count, optional player names, an optional seed for reproducibility, optional custom `ScoringRules`, and an optional `mirroredDice` flag (explained below).

**`ScoringRules`** — A feature-flag object. Every major scoring rule can be individually enabled or disabled: straights, three pairs, the bonus multipliers for 4/5/6-of-a-kind, single 1s and 5s, and the minimum score to get on board. This allows simulating variant rulesets.

**`StrategyContext`** — Everything the Strategy interface is given when it needs to make a decision: the full game state (frozen), the current player's state, the current turn state, the scoring result from the last roll (`availableScoring`), all opponents, the leading opponent's score, a precomputed `farkleRisk` (0–1 probability), and a precomputed `expectedValue` (estimated points if continuing).

**`Strategy`** — The core plug-in interface. Any object implementing this interface can be plugged into the game as a player. Two required methods: `selectDice(context)` (which scoring combinations to keep) and `decideContinue(context)` (roll again or bank?). Three optional lifecycle hooks: `onGameStart`, `onGameEnd`, `onTurnComplete`.

**`HumanStrategy` support types** — `HumanDecisionContext`, `PendingHumanDecision`, and `HumanDecisionRecord` exist to support the interactive game mode. They carry all the information the frontend needs to display a decision prompt to a human player.

---

### `src/core/dice.ts` — Seedable Dice Rolling

A single `DiceRoller` class wrapping the `seedrandom` library. The seed is optional — without one, you get a random game; with one, you get a fully reproducible sequence.

- `roll(count: number): DiceRoll` — Roll `count` dice.
- `reset(seed?: number)` — Reset the RNG. Used heavily: before each round to give all players the same dice in "mirrored dice" mode.

The seeding strategy is important. The `Game` class sets `roundSeed = baseSeed + currentRound` before each round. This means you can run two strategies in the same game and they'll both encounter the same dice sequence — useful for fair comparisons.

---

### `src/core/scoring.ts` — The Scoring Engine

`ScoringEngine` takes a `ScoringRules` config and provides one main method: `analyzeRoll(dice: DiceRoll): ScoringResult`.

The analysis order matters. It checks special patterns first (straight, three pairs) because these consume all 6 dice and are mutually exclusive with n-of-a-kind logic. Then it looks for n-of-a-kind (anything 3+), and finally for single 1s and 5s among any remaining dice.

Each combination carries `diceIndices` — the positions in the original roll that this combination uses. This prevents the same die from being counted twice (tracked via a `Set<number>`).

Score calculation for n-of-a-kind: three 1s = 1000, three X = X * 100 for X ≠ 1. Four-of-a-kind = 3x points * 2 (if enabled). Five-of-a-kind = 3x points * 3. Six-of-a-kind = 3x points * 4. All of these bonus multipliers are individually gated by `ScoringRules`.

---

### `src/core/turn.ts` — Turn Management

`TurnManager` manages one player's turn as a state machine. It's constructed with a player ID, the current game state (by reference — it mutates it in `bankPoints`), a roller, and a scorer.

The turn lifecycle:
1. `startTurn()` — Reset to initial state (6 dice, 0 points).
2. `rollDice()` — Roll the remaining dice, run `analyzeRoll`, check for farkle. On farkle, zeroes out `turnPoints` and sets `canContinue = false`.
3. `selectDice(combinations)` — Add the selected combinations' points to `turnPoints`, decrement `diceRemaining` by the dice used, and handle hot dice (reset to 6 dice when all are used).
4. `bankPoints()` — Apply `turnPoints` to the player's `totalScore` in the game state, handle "getting on the board" logic.

One subtle thing: `bankPoints()` mutates the shared `GameState.players` array by reference. This is fine for the current architecture but means you cannot independently replay or undo a turn without external state management.

---

### `src/core/game.ts` — The Orchestrator

`Game` is the main class for running a complete game headlessly. It takes `GameConfig` and an array of `Strategy` objects (one per player, in order).

The main loop is `playTurn()` which:
1. Gets the current player and their strategy.
2. Resets the dice roller with `baseSeed + currentRound` to support mirrored dice.
3. Creates a `TurnManager`.
4. Loops: `rollDice` → build `StrategyContext` → `strategy.selectDice` → `TurnManager.selectDice` → `strategy.decideContinue` → break or loop.
5. Banks points, records a `TurnRecord`, updates stats.
6. Advances to the next player (or increments the round counter when wrapping back to player 0).
7. If a player hits `targetScore`, calls `handleGameEnd()`.

**`handleGameEnd()` is the most significant pain point in the codebase.** When someone hits the target score, all remaining players in that round get a final turn. This is implemented as a near-duplicate of the entire `playTurn()` loop inside `handleGameEnd()`. Any changes to how turns work must be made in both places. This is a maintenance risk.

After `handleGameEnd()`, winners are determined by finding everyone with the maximum score (ties are supported via `winnerIds`), and each strategy's `onGameEnd` hook is called.

`calculateFarkleRisk()` and `calculateExpectedValue()` in `Game` are hardcoded lookup tables. The farkle risk values are approximate but close to actual probabilities. The expected value table is rougher. Both are duplicated across `Game`, `SimultaneousStepGame`, and `InteractiveStepGame`.

---

## Strategy System

### The Interface (Synchronous)

The `Strategy` interface is **synchronous**. Both `selectDice` and `decideContinue` must return immediately. This is intentional for the batch simulator (thousands of games must run fast), but creates a problem for human players, which is solved by `HumanStrategy`.

### Built-in Strategies (`src/strategies/built-in.ts`)

Simple functional strategies that return objects implementing `Strategy`:

- **Threshold strategies** (`createThresholdStrategy(threshold)`): Stop rolling when `turnPoints >= threshold`. Always takes all available scoring combinations ("greedy" dice selection). Presets at 500 (`conservative`), 1000 (`moderate`), 1500 (`balanced`), 2000 (`aggressive`), 2500 (`veryAggressive`).
- **Adaptive**: Adjusts the threshold based on score difference vs. the leading opponent. Far behind = aggressive (2500 threshold), slightly ahead = conservative (800 threshold).
- **Risk-aware**: Uses `farkleRisk` from context to lower the effective threshold when dice are few, and stops early if risk exceeds 40%.

`listStrategies()` returns built-ins plus all composable presets. `getStrategy(id)` looks up by ID across both.

### HumanStrategy (`src/strategies/HumanStrategy.ts`)

The central design challenge for interactive play: the `Strategy` interface is synchronous, but a human player needs async time to make a decision.

The solution is a promise queue:

1. `InteractiveStepGame` calls `humanStrategy.createDiceDecisionPromise()` before it needs the answer. This creates a `Promise<DiceSelectionDecision>` and stores the resolver.
2. The game pauses and returns an `awaiting_human_decision` step to the API.
3. The frontend shows the decision prompt and waits for user input.
4. When the user clicks, the frontend POSTs to `/api/game/interactive/decision`.
5. The server calls `humanStrategy.submitDiceSelection(decision)`. This resolves the promise and stores the decision in `this.lastDiceDecision`.
6. The `InteractiveStepGame` awaits the promise, then continues — calling `strategy.selectDice()` which synchronously returns `this.lastDiceDecision`.

This pattern is fragile in one important way: `create*DecisionPromise()` must always be called before `selectDice()` or `decideContinue()`. The `InteractiveStepGame` is carefully written to always do this, but any new game mode that uses `HumanStrategy` must follow the same discipline.

### Composable Strategy System (`src/strategies/composable/`)

This is the most sophisticated part of the strategy system. It provides a vocabulary of small, named, typed functions that can be assembled into complex strategies using a builder.

**The building blocks:**

| Type | Role | Signature |
|---|---|---|
| `DiceSelector` | Which dice to keep | `(context, available) => ScoringCombination[]` |
| `ThresholdCalculator` | What score to aim for | `(context) => number` |
| `ThresholdModifier` | Multiplier on the threshold | `(context) => number` |
| `ContinueEvaluator` | Vote on whether to roll again | `(context) => { shouldContinue, weight, reason }` |

**Dice selectors available:** `greedy` (keep everything), `keepMinimum` (keep only the highest-value single combo), `minimumValue(n)` (filter combos below n points), `preferLargeCombos` (prefer 3+ of a kind over singles), `conditionalByDiceCount(high, low, threshold)` (switch behavior based on remaining dice count).

**Threshold calculators available:** `fixed(n)` (constant), `adaptiveToOpponent()` (scales from 800 to 2500 based on score gap), `endgameAdjusted(base)` (ramps up near target score), `ensureBoarding()` (returns minimum-to-board if not yet on board).

**Threshold modifiers available:** `diceCountAdjustment()` (reduces when fewer dice remain), `riskAdjustment()` (reduces when farkle probability is high), `rollCountAdjustment()` (increases on "hot streaks" — more rolls in same turn).

**Continue evaluators available:** `thresholdBased(calculator, modifiers[])` (the main one — computes final adjusted threshold and compares to turn points), `highRiskExit(riskThreshold)` (stop if farkle risk exceeds limit), `expectedValueBased(minEV)` (only continue if EV is worth it), `minDiceRemaining(minDice)` (stop if too few dice left).

**The builder:**
```typescript
new StrategyBuilder()
  .withMetadata(id, name, description, version)
  .withDiceSelector(greedy())
  .withContinueEvaluators(
    thresholdBased(adaptiveToOpponent(), [diceCountAdjustment(), riskAdjustment()]),
    highRiskExit(0.45),
    minDiceRemaining(2)
  )
  .withCombinationMode({ type: 'all' }) // all | any | weighted | priority
  .build()
```

**Combination modes** — how multiple `ContinueEvaluator` votes are combined:
- `all` — every evaluator must agree to continue (most conservative; any "stop" vote wins)
- `any` — if any evaluator wants to continue, continue (most aggressive)
- `weighted` — weighted average > 0.5 to continue
- `priority` — first evaluator's decision is final

**The 7 preset composable strategies** in `presets.ts` include: `adaptiveComposed` (mirrors the built-in adaptive), `riskAwareComposed` (mirrors risk-aware), `selectiveMinimum` (switches dice selection mode based on dice count), `dynamicMultiFactor` (uses all three modifiers with multiple evaluators), `endgameAggressive` (pushes hard near the winning score), `conservativeComposed` (multiple safety checks with low threshold), `safe500` (simple: aim for 500, stop at 2 dice).

Each composable function has `name` and `description` properties attached via `Object.defineProperties` (because `name` is read-only on functions). This metadata is used by the strategy details API and by the strategy hash system.

---

## Simulator (`src/simulator/simulator.ts`)

`Simulator` runs `config.gameCount` games sequentially (not parallel — JavaScript is single-threaded). Each game gets a seed offset by game index (`seed + i`) so games are independent but reproducible.

After all games, it aggregates statistics per strategy. The stats object (`StrategyStatistics`) is comprehensive: win/loss/tie rates, score distribution, farkle rate, average farkles per game, a "luck score" metric, win/loss/tie subset statistics, score distribution buckets, and more.

**The luck score** is interesting. For each farkle, the engine knows how many dice were being rolled. For each dice count 1–6, there's a known approximate farkle probability. The luck score compares actual farkles to expected farkles: positive = lucky (fewer farkles than probability predicts), negative = unlucky.

Progress callbacks via `onProgress: (SimulationProgress) => void` — the WebSocket streaming endpoint uses this to push progress events to the browser while a large simulation runs.

---

## Web Layer

### Server (`src/web/server.ts`)

A Fastify app that handles everything. On startup it detects whether a `dist/index.html` exists (Vite production build) and serves that; otherwise falls back to `public/`. This means the same server binary works in dev and production.

**In-memory session storage:**

```typescript
const customStrategiesCache = new Map<string, Strategy>();
const stepGames = new Map<string, SimultaneousStepGame>();
const interactiveGames = new Map<string, InteractiveStepGame>();
```

All sessions are in process memory. No database, no Redis. Games older than 1 hour are pruned on each new game creation (the cleanup logic parses timestamps out of the game ID string). If the server restarts, all sessions are lost.

**REST API routes:**

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/strategies` | List all strategies with their composable details |
| POST | `/api/simulate` | Run N games synchronously, return full results |
| POST | `/api/game/init` | Create a SimultaneousStepGame session |
| POST | `/api/game/step` | Advance to next step in a step-through game |
| GET | `/api/game/steps` | Retrieve all steps for a game session |
| POST | `/api/game/interactive/init` | Create an InteractiveStepGame session |
| POST | `/api/game/interactive/decision` | Submit a human player's decision |
| GET | `/api/game/interactive/history` | Get the human decision history |
| GET | `/api/health` | Health check |

**WebSocket endpoints:**

- `/api/simulate/stream` — Same as `/api/simulate` but streams progress events before sending final results. The client sends the config as a JSON message, receives `{ type: 'progress', data }` updates, and finally `{ type: 'complete', data }`.
- `/ws/cursors` — Proxy to the multi-mouse server on port 3001. This exists so that in production (behind a tunnel), clients only need one WebSocket connection to one origin. The proxy forwards all messages bidirectionally.

**Custom strategy creation:** The API supports a `strategies` field (array of plain objects) in addition to `strategyIds`. The server calls `getOrCreateCustomStrategy(data)` which interprets `{ type, threshold, minDice, name, description }` and builds either a plain threshold strategy or a safe-stop strategy (threshold + min-dice guard). Custom strategies are cached by their ID in `customStrategiesCache`.

---

### Step-Through Game Modes

Three classes implement step-through games, each with the same general API: a constructor that sets up the game, a `nextStep()` method that advances state and returns the new step, and a `getSteps()` to retrieve history.

**`SimultaneousStepGame`** — Used by the API's `/api/game/*` endpoints. All players share the same dice roll each round (every player experiences the same luck). The step sequence is: `game_start` → `round_start` → (`roll` → `decisions`)* → `round_complete` → (repeat) → `game_end`. The "decisions" step includes every player's selected combinations and continue/stop choice, all visible simultaneously.

**`InteractiveStepGame`** — Used by `/api/game/interactive/*`. Handles a mix of human and AI players. The step sequence differs: for AI players it auto-advances through `roll` → AI decision; for human players it pauses and emits `awaiting_human_decision`. The `advanceToDecisionPoint()` method fast-forwards through AI turns until it needs human input (or game ends). The `submitHumanDecision()` method is async — it resolves the `HumanStrategy` promise, then calls `advanceToDecisionPoint()` again. It also returns `skippedSteps` so the frontend can optionally show what the AI did between human decisions.

**`StepThroughGame` (`step-game.ts`)** — Sequential, one strategy per player. Not referenced by the server or any API route. Effectively dead code.

---

### Frontend (`public/app.js`, `public/main.js`, `public/index.html`)

A single-page vanilla JavaScript app (~2300+ lines in `app.js`). There is no framework, no bundler for `app.js` itself (Vite only bundles `main.js` which imports `app.js` and the multi-mouse client). In development, `public/` is served directly. For production, `vite build` bundles everything into `dist/`.

`main.js` is the Vite entry point. It imports `app.js` and initializes the multi-mouse cursor system. The multi-mouse URL is determined at runtime: `ws://localhost:3001` when running locally, `/ws/cursors` (the proxy) when running via a tunnel or deployed.

`app.js` handles:
- Strategy selection (fetches `/api/strategies`, renders as checkboxes/dropdowns)
- Simulation (calls `/api/simulate` for blocking, `/api/simulate/stream` WebSocket for progress)
- Step-through game visualization (calls `/api/game/init` then repeats `/api/game/step`)
- Interactive game (calls `/api/game/interactive/init`, listens for human decision prompts, submits to `/api/game/interactive/decision`)
- Custom strategy builder UI (generates strategy object and posts alongside standard strategies)
- Strategy stats persistence (stores cumulative stats across simulation runs in `localStorage`, uses a client-side reimplementation of the `strategy-hash.ts` logic to identify strategies across sessions)

The strategy stats system maintains a `localStorage` key-value store of strategy hashes → cumulative stats. After each simulation, it merges the new results into the stored stats. Strategy performance data accumulates across browser sessions without any server-side persistence.

---

## Data Flow Diagrams

### Batch Simulation (Headless)

```
POST /api/simulate
  → Simulator(config)
    → for each game:
        Game(gameConfig, strategies).play()
          → while not over:
              Game.playTurn()
                → TurnManager.startTurn()
                → while canContinue:
                    TurnManager.rollDice()
                    → ScoringEngine.analyzeRoll()
                    strategy.selectDice(StrategyContext)
                    TurnManager.selectDice(selectedCombinations)
                    strategy.decideContinue(StrategyContext)
                    → break or continue
                TurnManager.bankPoints()
                → mutates GameState.players[].totalScore
    → calculateStrategyStats(allGameStats)
  → return SimulationResults
```

### WebSocket Streaming Simulation

```
WS /api/simulate/stream
  Client sends: { gameCount, strategyIds, ... }
  Server:
    → Simulator(config, onProgress: (p) => socket.send({ type: 'progress', data: p }))
    → simulator.run()
      → sends progress events during execution
    → socket.send({ type: 'complete', data: results })
```

### Step-Through Visualization

```
POST /api/game/init → creates SimultaneousStepGame, returns gameId + first step
POST /api/game/step (gameId)
  → SimultaneousStepGame.nextStep()
    → startNewRound() if no active turns
        → resets roller with round seed
        → creates TurnManager for each player
    → rollForAllPlayers() if active turns exist
        → one dice roll for all
        → for each active player:
            strategy.selectDice(context)
            strategy.decideContinue(context)
            → mark inactive if stopping or farkled
        → returns 'roll' step + 'decisions' step
    → completeRound() when all inactive
        → banks points, checks for winner
        → returns 'round_complete' or 'game_end'
```

### Interactive Game (Human vs AI)

```
POST /api/game/interactive/init
  → creates InteractiveStepGame(config, [humanStrategy, aiStrategy], [0])
  → advanceToDecisionPoint()
    → nextStep() in a loop until 'awaiting_human_decision' or 'game_end'
    → on human player's turn:
        humanStrategy.createDiceDecisionPromise()
        → returns step { type: 'awaiting_human_decision', decisionId, context }
  → returns step to client

Client shows dice, scoring options → user picks → client POSTs:
POST /api/game/interactive/decision { gameId, decisionId, decision }
  → game.submitHumanDecision(decisionId, decision)
    → humanStrategy.submitDiceSelection(decision)
        → resolves pending promise, stores in lastDiceDecision
    → advanceToDecisionPoint()
        → game processes AI turns automatically
        → pauses again at next human decision (or game_end)
    → returns { step, skippedSteps }
```

---

## Known Architectural Issues

These are not bugs — the game works correctly — but they are places where the code will resist you when adding new features.

**1. Turn loop duplication.** The full turn loop (roll → selectDice → decideContinue → bank) is implemented four separate times: in `Game.playTurn()`, in `Game.handleGameEnd()`, in `SimultaneousStepGame.rollForAllPlayers()`, and in `InteractiveStepGame`. They have subtle differences (stats tracking, hot dice handling, event emission), which means a bug fix or behavior change in one rarely gets applied to all.

**2. `handleGameEnd()` in `Game`.** When a player hits the target score, the remaining players need their final turn. This is a full copy of `playTurn()`'s inner loop inside `handleGameEnd()`. It's the longest single block of duplicated code in the project.

**3. Context creation duplication.** `createStrategyContext()`, `calculateFarkleRisk()`, and `calculateExpectedValue()` are implemented identically (or near-identically) in `Game`, `SimultaneousStepGame`, and `InteractiveStepGame`. They could be shared utilities in `src/core/`.

**4. `step-game.ts` is dead code.** The `StepThroughGame` class is imported nowhere in the server or in any other file. It can cause confusion when adding new game modes.

**5. Farkle risk is a lookup table, not a calculation.** The probabilities are hardcoded as `{ 1: 0.667, 2: 0.444, ... }` in three separate places. These are approximations of the actual combinatorial probabilities. Improving the math requires finding and updating all three locations.

**6. The `isOnBoard` logic is inconsistent across game modes.** In `Game`, `bankPoints()` in `TurnManager` handles the on-board transition. In `SimultaneousStepGame`, it's re-implemented in `completeRound()`. In `InteractiveStepGame`, `isOnBoard` is initialized to `true` if `minimumScoreToBoard === 0`, which is a different approach.

**7. `app.js` is a single 2300+ line file.** All UI code in one file makes it difficult to work on individual features without reading through everything. No modules, no component system.

**8. In-memory session storage.** `stepGames` and `interactiveGames` are process-local Maps. Server restart = all sessions lost. Multiple server instances cannot share sessions. Cleanup is time-based and only triggers when a new game is created.

**9. Custom strategy API is limited.** The `getOrCreateCustomStrategy()` function only supports `{ threshold, minDice, type }` — a small subset of what the composable system can express. There's no way to define a full composable strategy via the API without writing TypeScript code on the server.

---

## Extensibility Assessment

### What's easy to add

- **New strategies.** Use `StrategyBuilder` with new composable functions, or implement `Strategy` directly. Register them in `listStrategies()` for them to appear in the API.
- **New dice selectors, evaluators, calculators, or modifiers.** Add a function to the appropriate file in `src/strategies/composable/`. They're pure functions with no side effects.
- **New scoring rules.** Add a flag to `ScoringRules` and handle it in `ScoringEngine.findCombinations()` or a new check method. All existing code that passes `ScoringRules` will carry it automatically.
- **New API routes.** Fastify routes are just functions registered on the app object. The server file is already set up and the patterns are consistent.
- **New simulation statistics.** Add fields to `StrategyStatistics` in `src/simulator/types.ts` and compute them in `calculateStrategyStats()`.

### What's moderate effort

- **New game modes.** You'll have to decide whether to extend an existing game class or create a new one. Creating a new one means reimplementing the shared turn logic again. The right solution — extracting shared turn logic into a utility — is medium effort but pays off immediately.
- **Persistence.** Swapping the in-memory Maps for a database requires touching the server's session management. The data shapes are well-defined (TypeScript types exist), which helps.
- **Better farkle risk math.** The lookup table in three files needs to be replaced with a calculation function exported from one place in `src/core/`.
- **Extended custom strategy API.** The server's `getOrCreateCustomStrategy()` would need to interpret a richer JSON description of composable components. Tractable because the composable types are well-defined.

### What's hard

- **Real multi-user multiplayer (human vs human, separate browsers).** `InteractiveStepGame` supports multiple human players, but all within one server session. For two browsers to play against each other, you need: a shareable game URL/join code, a way to assign human players to game slots from different HTTP sessions, and a real-time push channel. The infrastructure partially exists (the `/ws/cursors` proxy pattern, the `MULTI-USER-FEATURES-PLAN.md` document), but the game session model doesn't support multiple independent HTTP clients yet.
- **Replay / undo.** `TurnManager.bankPoints()` mutates `GameState` directly. There's no snapshot history or event sourcing. Undo would require restructuring the mutation model.
- **Frontend modularization.** Breaking `app.js` into ES modules would be a near-complete rewrite of the frontend.

---

## Summary for LLM-Assisted Development

When extending this codebase, keep these things in mind:

1. **All types live in `src/core/types.ts`.** Always check there first before defining new interfaces.

2. **New strategies belong in the composable system.** Use `StrategyBuilder` with the existing building blocks. Only add to `built-in.ts` for trivial one-off strategies.

3. **Do not duplicate turn logic.** If adding a new game mode, plan to extract shared logic into a utility first, or explicitly accept the duplication and document it.

4. **Do not duplicate farkle risk or expected value.** These lookup tables should ideally live in a shared utility in `src/core/` so all orchestration classes import from one place.

5. **HumanStrategy requires careful ordering.** `createDiceDecisionPromise()` must be called before the game needs `selectDice()`. If touching the interactive game flow, trace through the promise lifecycle carefully.

6. **The `Strategy` interface is synchronous.** Any new player type that needs async input (network, AI model, external API) must use the same promise-preloading pattern as `HumanStrategy`.

7. **`StrategyContext` is the full universe of strategy inputs.** Before adding a new field to `StrategyContext`, check that it's genuinely something strategies need. Adding noise to the context makes strategies harder to write correctly.

8. **The server's in-memory maps have no cross-request locking.** Node.js is single-threaded so concurrent requests don't create race conditions, but there's also no protection against a game being advanced by two concurrent API calls.

9. **The frontend duplicates the strategy hash logic.** `app.js` has its own reimplementation of the hashing from `strategy-hash.ts`. If you change the hash algorithm, both must be updated.

10. **Mirrored dice works by resetting the RNG before each round.** Any new game mode that wants fair comparison must call `roller.reset(baseSeed + roundNumber)` at the start of each round.

---

*Document generated March 2026. Based on full codebase review of the hot-dice project.*
