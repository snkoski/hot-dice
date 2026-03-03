# Plan: React + TypeScript Frontend Rewrite

## Context

The current frontend (`public/app.js`) is ~2300 lines of monolithic vanilla JS with no component structure, global state variables, and heavy DOM mutation via innerHTML. Every new feature requires reading the entire file and risks breaking unrelated things. The goal is to rewrite it as a React + TypeScript app with proper component structure so that future features (multiplayer, shared components, new game modes) can be added cleanly.

Decisions: React, TypeScript, plain CSS files per component (keep existing class names and visual design).

---

## Packages to Install

```bash
pnpm add react react-dom clsx
pnpm add -D @vitejs/plugin-react @types/react @types/react-dom
```

**clsx** — optional but recommended for conditional class merging: `className={clsx('strategy-card', { active: isActive })}` instead of manual string concatenation.

---

## Vite Config Change

Change root from `public/` to `src/client/`. Add React plugin. Keep proxy behavior for `/api` and `/ws`; remove the `/node_modules` proxy. Fastify expects `dist/` output path (already absolute, no change needed).

**Critical — outDir when root changes:** By default, Vite builds `dist` relative to the new root. If you change root to `src/client` without overriding, build output would go to `src/client/dist/`, but Fastify expects `<project_root>/dist/`. **You must explicitly keep:**

```ts
build: {
  outDir: resolve(__dirname, 'dist'),
  emptyOutDir: true,  // Needed since outDir is outside the new root
}
```

**Port fix:** In `src/web/server.ts`, search for `3003` and change the default to `3000`:

```ts
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
```

Verify `package.json` dev/start scripts do not set a conflicting `PORT`. Update README/docs to match. **Migration:** Update any scripts, tunnels, or tooling that currently assume port 3003.

**File:** `vite.config.ts`

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  root: resolve(__dirname, 'src/client'),
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/ws': { target: 'ws://localhost:3000', ws: true },
    },
  },
});
```

---

## TypeScript Config

Add `tsconfig.client.json` — extends root tsconfig, adds `jsx: "react-jsx"`, `lib: ["ES2022", "DOM", "DOM.Iterable"]`, and `"types": ["vite/client"]` (required for `import './global.css'` and other Vite asset imports). The existing `tsconfig.json` stays untouched for server + tests.

Include only safe files: `src/client/**/*`, `src/core/types.ts`, `src/simulator/types.ts`, `src/strategies/strategy-hash.ts`.

**Client test environment:** For client-side tests (scoreComputer, reducer, hooks), use `environment: 'jsdom'` — either a separate vitest config for client tests, or `// @vitest-environment jsdom` per test file. `scoreComputer` and reducer tests are pure and don't need jsdom; hook tests will.

**Client test file location:** Put client tests in `tests/` alongside existing backend tests (e.g. `tests/client/scoreComputer.test.ts`, `tests/client/interactiveReducer.test.ts`). They are covered by the root tsconfig (which has `vitest/globals`). `tsconfig.client.json` covers only production source — this avoids type conflicts between `vite/client` and `vitest/globals`. Alternative: co-locate under `src/client/` and add `"vitest/globals"` to `tsconfig.client.json` types; the plan uses the `tests/` approach for simplicity.

---

## New Directory Structure

```
src/client/
├── index.html                   ← Minimal Vite entry HTML
├── main.tsx                     ← React root + multi-mouse init
├── App.tsx                      ← Layout, owns selectedStrategyIds + customStrategies
├── ErrorBoundary.tsx            ← Catches component crashes, prevents full white screen. Does not catch async errors (fetch/WS callbacks, event handlers, timers) — those must be handled in hooks/components via try/catch and error state.
│
├── types/                       ← Type-only re-exports (no value imports)
│   ├── game.ts                  ← from src/core/types.ts
│   ├── simulator.ts             ← from src/simulator/types.ts
│   └── stats.ts                 ← StrategyStats type only
│
├── lib/                         ← Pure functions, value re-exports, no React
│   ├── enums.ts                 ← Re-export ScoreType from core/types (enum = runtime value)
│   ├── strategyHash.ts          ← Re-export generateStrategyHash, createInitialStats, updateStrategyStats, calculateDerivedStats from strategy-hash.ts
│   ├── scoreComputer.ts
│   ├── farkleRisk.ts
│   └── formatters.ts
│
├── hooks/
│   ├── useSimulationWebSocket.ts  ← Close previous WS before opening new one; close in useEffect cleanup; runId/session token guard (ignore messages if runId !== currentRunId — AbortController doesn't cancel WS messages)
│   ├── useStrategyStats.ts        ← localStorage: {version, data} envelope; version 0→1 migration for legacy unversioned data
│   ├── useHumanDecisions.ts       ← localStorage: {version, data} envelope; version 0→1 migration for legacy unversioned data
│   └── useMultiMouse.ts           ← initCursors in useEffect; cleanup (destroyCursors) in effect return; also beforeunload for browser close/navigation
│
├── styles/
│   └── global.css               ← Body, *, .container, .card, button, input globals
│
└── components/
    ├── shared/
    │   ├── Modal.tsx             ← Generic overlay wrapper
    │   ├── DiceFace.tsx          ← Single die (unicode emoji ⚀-⚅)
    │   ├── StatRow.tsx           ← label + value pair
    │   ├── ProgressBar.tsx
    │   └── shared.css
    │
    ├── strategies/
    │   ├── StrategyPanel.tsx         ← Section 1 card
    │   ├── StrategyGrid.tsx
    │   ├── StrategyCard.tsx
    │   ├── CustomStrategyBuilder.tsx ← Simple + Safe builders
    │   ├── StrategyDetailsModal.tsx
    │   └── strategies.css
    │
    ├── simulation/
    │   ├── SimulationPanel.tsx       ← Section 2 card
    │   ├── ScoringRulesConfig.tsx    ← 7 checkboxes
    │   ├── SimulationProgress.tsx
    │   ├── SimulationResults.tsx
    │   ├── ResultCard.tsx
    │   └── simulation.css
    │
    ├── stats/
    │   ├── HistoricalStatsPanel.tsx  ← Section 3 card
    │   ├── AllStatsModal.tsx
    │   ├── PlayStyleModal.tsx
    │   └── stats.css
    │
    ├── step-through/
    │   ├── StepThroughPanel.tsx      ← Section card + Start button
    │   ├── StepGameDisplay.tsx       ← Game-in-progress (useState for step history array + current index)
    │   ├── StepControls.tsx          ← Prev/Next + counter
    │   ├── PlayerScores.tsx
    │   ├── DiceDisplay.tsx
    │   ├── TurnInfo.tsx
    │   ├── DecisionDisplay.tsx
    │   └── stepThrough.css
    │
    └── interactive/
        ├── InteractivePanel.tsx        ← Section card + Start button
        ├── InteractiveGameDisplay.tsx  ← useReducer state machine
        ├── DiceSelectionUI.tsx
        ├── ContinueDecisionUI.tsx
        ├── HumanDecisionUI.tsx         ← Switches between dice / continue modes
        ├── AiTurnSummary.tsx
        ├── TurnEndNotification.tsx     ← Timed bank/farkle flash
        └── interactive.css
```

---

## State Management

**React built-ins only.** No Zustand or Redux.

- `App.tsx` owns `selectedStrategyIds`, `customStrategies`, and a **default** `simulationConfig` — each panel (Simulation, Step-through, Interactive) maintains its own local config state initialized from the default, so adjusting simulation rules doesn't unexpectedly alter an in-progress interactive game
- Each panel owns its own local state
- `InteractiveGameDisplay` uses `useReducer` — the interactive game has enough state transitions to warrant it (see state machine below)
- `StepGameDisplay` uses `useState` for step history array + current index

### Interactive Game State Machine (useReducer)

```ts
type Phase =
  | { phase: 'idle' }
  | { phase: 'awaiting_dice_selection'; step; selectedIndices: number[] }
  | { phase: 'awaiting_continue'; step }
  | { phase: 'ai_summary'; skippedSteps; pendingStep }
  | { phase: 'turn_end_notification'; type: 'bank'|'farkle'; points; newTotal; pendingStep }
  | { phase: 'game_over'; finalStep }
  | { phase: 'error'; message }
```

Replaces the current nested-callback chain (setTimeout + global `_aiSummaryDone`) with clean dispatched transitions.

`**ai_summary` phase:** The UI must iterate through or animate `skippedSteps` (AI turns between the human's last action and current turn) before arriving at `pendingStep` (the human's turn). The current vanilla JS does this via `displayAiTurnSummary` / `resumeFromAiSummary`. The reducer makes this cleaner, but you may need a sub-state or timer hook within `InteractiveGameDisplay` to handle the visual stepping through of those AI summaries.

**Interactive game — async guard:** Disable submit buttons (dice selection, continue decision) while the API call is in flight to prevent double-submission. Use `disabled={isSubmitting}` or a ref to ignore duplicate clicks.

**Reducer purity:** React reducers must be pure — no side effects. Do **not** call `fetch()` from inside the reducer. API calls belong in event handlers (e.g. `handleConfirmDiceClick`); on response, dispatch `{ type: 'API_SUCCESS', payload }` to transition phase.

**Reducer exhaustiveness:** The reducer switches on `action.type`, not `state.phase`. Phase validation happens inside each action case. Use a `default` that assigns `action` to `never` so unhandled action types fail at compile time:

```ts
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'DICE_SELECTED':
      if (state.phase !== 'awaiting_dice_selection') return state;
      return { ...state, selectedIndices: action.indices };
    // ... other cases
    default: {
      const _: never = action;
      return state;
    }
  }
}
```

---

## Type Sharing (Server → Client)

Use `import type` in `src/client/types/` to re-export server types. These are erased at compile time — nothing server-specific is bundled. **Keep `types/` type-only** — no value imports. `types/stats.ts` re-exports only the `StrategyStats` type via `export type { StrategyStats } from '...'`.

`**ScoreType` enum:** Enums are runtime values. Put `ScoreType` in `lib/enums.ts` as `export { ScoreType } from '../../core/types'`. Import from `lib/enums` where needed. This keeps `types/` genuinely type-only.

**Do not import from:** `src/strategies/built-in.ts`, `src/web/server.ts`, or anything that pulls in `fastify`, `ws`, or Node built-ins.

---

## CSS Migration

Extract all `<style>` content from `public/index.html`:

- Global rules → `src/client/styles/global.css`
- Feature rules → co-located `.css` file in each component folder
- Class names stay identical — `className="strategy-card"` not `className={styles.strategyCard}`. Use `clsx('strategy-card', { active: isActive })` for conditionals.
- `**.hidden` class:** Prefer conditional rendering (`{isVisible && <Component />}`) for most cases. If the current app uses `.hidden` to keep elements in the DOM but invisible (e.g. retaining state, measuring dimensions, or preventing layout shifts), use `className={clsx({ hidden: !isVisible })}` instead of unmounting. Watch for this during Phase 7.
- `**#id`-based CSS migration:** The HTML has 40+ elements with IDs used for both `getElementById` and CSS `#id` selectors. React refs/state replace the JS side; the CSS side requires auditing every `#id` rule and converting to class names. Add this as a checklist item per phase where new components are introduced — not a single throwaway bullet.

---

## Build Order

### Phase 1 — Scaffolding

1. Install packages
2. Update `vite.config.ts`
3. Create `tsconfig.client.json`
4. Create `src/client/index.html`, `main.tsx`, `App.tsx`, `ErrorBoundary.tsx`, `styles/global.css`
5. Wrap app in `ErrorBoundary` so a component crash doesn't white-screen the whole app
6. **Verify:** `pnpm dev:client` renders blank page, no errors

### Phase 2 — Types & Utilities

1. Create `src/client/types/` re-export files (type-only; `types/stats.ts` = StrategyStats type only)
2. Create `lib/enums.ts` (ScoreType) and `lib/strategyHash.ts` as re-exports
3. **TDD for scoreComputer:** Write unit tests in `tests/client/scoreComputer.test.ts` against `public/app.js`'s current `computeScoreForSelectedDice` output (or copy existing tests) *before* porting. Then port `scoreComputer.ts`, `farkleRisk.ts`, `formatters.ts` into `lib/`.
4. **Shared components:** `Modal`, `ProgressBar`, `StatRow`, `DiceFace` — needed by Phase 3 (Modal), Phase 4 (ProgressBar), Phase 5 (Modal), Phase 6 (all). Build them now.

### Phase 3 — Strategy Panel

1. `StrategyCard` → `StrategyGrid` → `CustomStrategyBuilder` → `StrategyPanel` → `StrategyDetailsModal`
2. **Verify:** strategy selection UI (checkboxes, modal), custom builder form, info modal. Full integration with simulation/game APIs happens in later phases.

### Phase 4 — Simulation Panel

1. `useSimulationWebSocket` hook — close previous WebSocket before opening new one; close in useEffect cleanup; runId/session token guard (ignore messages if runId !== currentRunId); throttle or batch progress callback
2. `ScoringRulesConfig`, `SimulationProgress`, `ResultCard` (memoize with `React.memo` — results list doesn't change once simulation completes), `SimulationResults`
3. `useStrategyStats` hook (localStorage: `{version, data}` envelope; if no version field, treat as version 0 and migrate to `{version: 1, data: rawValue}`)
4. `SimulationPanel`
5. **Verify:** simulation runs, progress streams, results + cumulative stats display

### Phase 5 — Historical Stats

1. `useHumanDecisions` hook (localStorage: same version 0→1 migration as useStrategyStats), `AllStatsModal`, `PlayStyleModal`, `HistoricalStatsPanel`
2. Wire `GET /api/game/interactive/history` into stats/play-style system
3. **Verify:** stats accumulate, export works, clear works

### Phase 6 — Step-Through Game

1. `PlayerScores`, `DiceDisplay`, `TurnInfo`, `DecisionDisplay`, `StepControls`
2. `StepGameDisplay`, `StepThroughPanel` — wire `POST /api/game/step` to advance and `GET /api/game/steps` to fetch all steps for a game
3. **Verify:** full game, forward/back navigation

### Phase 7 — Interactive Game

1. `TurnEndNotification`, `AiTurnSummary`
2. `DiceSelectionUI`, `ContinueDecisionUI`, `HumanDecisionUI` (with `disabled` during API calls)
3. `InteractiveGameDisplay` (useReducer state machine), `InteractivePanel`
4. Add reducer transition tests in `tests/client/interactiveReducer.test.ts` (every valid phase transition + invalid transitions)
5. **Verify:** full interactive game including AI summary panel, notifications, no double-submit

### Phase 8 — Multi-Mouse

1. `useMultiMouse` hook, wire into `App.tsx` (wrap app in `ErrorBoundary` if not done in Phase 1)
2. **Verify:** cursor sharing works locally

### Phase 9 — Cleanup

1. Delete `public/index.html`, `public/app.js`, `public/main.js`
2. Update server: when `dist/index.html` is missing, fail fast with clear "Build required — run pnpm build" error instead of falling back to empty public/
3. `pnpm build` → verify `dist/` is correct
4. Start Fastify server → verify it serves the built React app
5. **Verify localStorage backward compatibility:** With pre-existing `hot-dice-strategy-stats` and `hot-dice-human-decisions` data in localStorage (from the old app), the new React app loads and displays stats correctly.

---

## Run Cancellation Policy

**New run cancels/invalidates prior in-flight work and suppresses stale UI updates.** For simulation and interactive API calls: when the user starts a new run (e.g. new simulation, new interactive game), the previous in-flight request/WebSocket is invalidated. Any in-flight responses or WS messages from the previous run are ignored (via runId/session token guard). This turns the stale-response guard into a concrete behavior rule and avoids subtle race bugs.

---

## Optional Optimizations (Post-Rewrite)

- **Typed API contract layer:** Shared request/response + WS message unions in `src/client/types/api.ts` (or similar) to prevent server/client schema drift.
- **Performance budget:** Throttle or batch simulation progress updates. `ResultCard` should be memoized (see Phase 4). `useMemo`/`useCallback` for expensive callbacks.

---

## Questions to Resolve Before Implementation

1. ~~**simulationConfig scope:**~~ **Resolved:** Allow panels to diverge. App holds default config; each panel has local state initialized from it.
2. ~~**Server without client:**~~ **Resolved:** Fail fast when `dist/` is missing — better DX than debugging a blank white screen.
3. ~~**Backend port:**~~ **Resolved:** Standardize on 3000. Vite proxy targets `localhost:3000`.
4. ~~**Frontend tests:**~~ **Resolved:** Yes. Add reducer transition tests for the interactive game state machine. Test every valid phase transition and at least one invalid transition per phase (e.g. dispatching `DICE_SELECTED` while in `idle` should be no-op or error). Reducer tests are pure — no DOM, no API, no async — fast and easy to write.

---

## Critical Files


| File                              | Role                                                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `vite.config.ts`                  | Single most impactful config change                                                                                 |
| `public/app.js`                   | Search for `computeScoreForSelectedDice` — most complex logic to port                                               |
| `public/app.js`                   | Search for `displayAiTurnSummary` / `resumeFromAiSummary` — interactive game callback chain to replace with reducer |
| `src/core/types.ts`               | All game types — re-exported into client types layer                                                                |
| `src/strategies/strategy-hash.ts` | Pure fns + StrategyStats type — imported as values in client                                                        |
| `src/web/server.ts`               | API contract reference for all hooks                                                                                |


---

## Key Gotchas

- `**computeScoreForSelectedDice`** handles STRAIGHT/THREE_PAIRS whole-hand detection, greedy n-of-a-kind, and THREE_OF_KIND fallback for 1s/5s. Port it precisely and test it — it's the highest-risk migration. Add unit tests for edge cases: 3 ones from a roll of 4 ones, STRAIGHT/THREE_PAIRS partial selection, mixed selections.
- `**ScoreType` enum** needs a value import (not `import type`) since enums compile to JS objects. Re-export from `lib/enums.ts` — keep `types/` type-only.
- `**@multi-mouse/client`** is `file:../multi-mouse/packages/client` — a local symlink. Import path in `main.tsx` is identical to current `main.js`. If Vite has module resolution errors with symlinks, add `resolve: { preserveSymlinks: true }` or `optimizeDeps.include: ['@multi-mouse/client']`.
- `**useMultiMouse`:** Use **both** `useEffect` cleanup (for React lifecycle: unmounts, Strict Mode re-mounts) **and** `beforeunload` (for browser lifecycle: close tab, navigate away). Effect cleanup does not run on browser close. Best-effort cleanup only on unload — browser close isn't guaranteed to flush async cleanup; server should tolerate orphaned sessions. Ensure `initCursors`/`destroyCursors` are idempotent or guard with a ref so duplicate connections don't occur.
- **localStorage version 0 migration:** The current app stores raw, unversioned data. On first read, if the value has no `version` field, treat as version 0 and migrate to `{version: 1, data: rawValue}`. Without this, users lose historical stats on upgrade.
- `**strategy-hash.ts`:** Verify `GET /api/strategies` returns the structure `generateStrategyHash` expects (especially `details.components` for composable strategies) so client-side hashes match.
- `**tsconfig.json` has no DOM lib** — adding it would break server type checking. The separate `tsconfig.client.json` is essential for this reason.
- **Dev mode vs built mode:** During development Vite serves on :5173 and proxies API to the backend port (standardize on 3000). If `dist/` exists from a previous build, the Fastify server would serve the old build — irrelevant for dev but worth knowing.
- `**#id`-based CSS selectors** (e.g. `#interactiveGameSection`) should become class names in the React version. See CSS Migration section for the 40+ IDs that need auditing.

`**key` props for list rendering:** Use stable, unique keys to avoid subtle selection bugs:

- `StrategyGrid`: `strategy.id`
- `DiceDisplay`: array index is correct here — the array length is fixed and order is stable. Using die values as keys would cause React to reorder DOM elements on re-roll, breaking index-based selection state.
- `SimulationResults`: `strategy.id` from results
- Step history: step number

---

## Verification

End-to-end test after each phase. **Each phase:** run `pnpm exec tsc -p tsconfig.client.json --noEmit` before considering the phase complete. Full verification at the end:

1. `pnpm test` — all existing backend tests still pass (nothing server-side changed)
2. `pnpm exec tsc -p tsconfig.client.json --noEmit` — **required** — Vite transpiles TS without full type-checking; this catches type errors that `pnpm build` would miss
3. `pnpm dev:client` — all 5 UI sections work in dev mode (ensure backend runs on same port as Vite proxy)
4. `pnpm build` — no build errors
5. `pnpm start` — Fastify serves `dist/`, all features work in production mode
6. **localStorage backward compatibility:** With pre-existing data from the old app in localStorage, the new app loads and displays stats correctly (see Phase 9 step 35).
7. **API shape lock:** One contract test (or snapshot) per key endpoint used by the new frontend: `/api/strategies`, `/api/simulate/stream`, interactive decision response, `POST /api/game/init`, `POST /api/game/step`, `GET /api/game/steps`.
8. **Manual race test:** Start a simulation, immediately start another; verify old run messages are ignored and UI only reflects the newest run.

**CI:** Add the type-check step to every phase verification and to CI (e.g. `pnpm exec tsc -p tsconfig.client.json --noEmit` before or after `pnpm build`).



shawn andres bedi guus darryl kaitlyn max torsten marco shammika