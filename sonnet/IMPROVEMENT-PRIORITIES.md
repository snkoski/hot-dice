# Hot Dice — Improvement Priorities

These are the biggest improvements to make to the codebase, ordered by impact. Time and effort are not constraints — the goal is to get the project on the right foundation for future expansion.

---

## 1. Rewrite the Frontend with a Modern Framework

**Impact: Highest**

`app.js` at 2300+ lines of vanilla JS is going to be the thing that slows everything down the most as features are added. Every new feature means finding the right spot in a giant file, making sure nothing three hundred lines away breaks, and mentally tracking state that has no structure.

React, Vue, or Svelte would let the UI be broken into components that each own their own state and behavior:

- The simulation panel is one component
- The step-through viewer is another
- The interactive game is another
- The shared dice widget or multiplayer lobby becomes a new component you add — not something you splice into a 2300-line file

Given where this project is heading, this is the foundation everything else builds on. **Do this first.**

---

## 2. Extract the Turn Loop into a Shared Utility

**Impact: High**

The turn logic — roll dice, let strategy select, decide to continue or bank — is written out four separate times:

- `Game.playTurn()`
- `Game.handleGameEnd()`
- `SimultaneousStepGame`
- `InteractiveStepGame`

They're slightly different each time. Bugs get fixed in one place and not the others. Adding any new turn behavior (a special rule, a new event hook) requires touching all four.

This should be a single `TurnExecutor` class or function that all game modes call. It's not a huge refactor but it eliminates a compounding maintenance cost that only gets worse over time.

---

## 3. Make the `Strategy` Interface Async

**Impact: High**

Right now strategies must return synchronously. This is why `HumanStrategy` has the awkward promise-preloading pattern — create the promise before the game needs the answer, resolve it when the human responds, return the stored result synchronously. It works, but it's fragile and confusing.

If `selectDice` and `decideContinue` returned `Promise<T>` instead of `T`:

- Human players become simple to implement
- AI agents that call external APIs become possible
- The entire interactive game flow gets cleaner and easier to reason about

The batch simulator would still be fast — awaiting an already-resolved promise is essentially free in JavaScript.

---

## 4. Define a Proper Game Mode Abstraction

**Impact: Medium-High**

The three game mode classes (`SimultaneousStepGame`, `InteractiveStepGame`, and the dead `StepThroughGame`) all expose roughly the same API — init, next step, get steps — but there's no shared interface or base class enforcing that. Adding a new mode means starting from scratch or copy-pasting.

A `GameMode` interface with `init()`, `nextStep()`, and optionally `submitDecision()` would make new modes additive. Combined with the shared turn executor from priority 2, a new mode would mostly be about how steps are structured and emitted — not about reimplementing turn logic from scratch.

---

## 5. Replace the Farkle Risk Lookup Tables

**Impact: Low-Medium**

The hardcoded probability table `{ 1: 0.667, 2: 0.444, 3: 0.278 ... }` appears in three separate places and the values are approximations. This should be one function in `src/core/` that returns the probability for a given dice count, imported everywhere it's needed.

Small change, but it removes duplication and makes it easy to improve the math later without hunting down every location.

---

## Deprioritize for Now

- **Session persistence** — only matters when real multiplayer is ready
- **Custom strategy API extension** — limited but functional for current needs
- **Removing `step-game.ts`** — dead code, but harmless

---

## Recommended Starting Point

**Start with the frontend rewrite.**

Everything else is backend cleanup that can happen incrementally and in parallel with new features. The frontend is the thing you'll be fighting every single time you try to add something new. Getting that right first means every subsequent feature is easier to build and easier to reason about.
