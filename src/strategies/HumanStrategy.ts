import { Strategy, StrategyContext, DiceSelectionDecision, ContinueDecision } from '../core/types';

/**
 * Strategy implementation that bridges asynchronous human input with the synchronous Strategy interface.
 *
 * The Strategy interface requires synchronous return values, but human input is inherently asynchronous.
 * This class solves this by pre-loading decisions via a promise queue:
 *
 * 1. Game engine calls createDiceDecisionPromise() before needing the decision
 * 2. UI waits for user input and calls submitDiceSelection() when ready
 * 3. Game engine calls selectDice() which returns the pre-loaded decision
 *
 * This pattern allows the async UI to work with the sync game engine.
 */
export class HumanStrategy implements Strategy {
  id: string;
  name: string;
  description: string;
  version: string;

  private lastDiceDecision: DiceSelectionDecision | null = null;
  private lastContinueDecision: ContinueDecision | null = null;
  private pendingDiceDecision: Promise<DiceSelectionDecision> | null = null;
  private pendingContinueDecision: Promise<ContinueDecision> | null = null;
  private diceDecisionResolver: ((decision: DiceSelectionDecision) => void) | null = null;
  private continueDecisionResolver: ((decision: ContinueDecision) => void) | null = null;

  constructor(id: string, name: string, description: string, version: string) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.version = version;
  }

  /**
   * Called by game engine (synchronous) - returns last loaded decision.
   * Must call submitDiceSelection() first or this will throw an error.
   */
  selectDice(context: StrategyContext): DiceSelectionDecision {
    if (!this.lastDiceDecision) {
      throw new Error('No human dice selection available - must call waitForDiceSelection first');
    }
    return this.lastDiceDecision;
  }

  /**
   * Called by game engine (synchronous) - returns last loaded decision.
   * Must call submitContinueDecision() first or this will throw an error.
   */
  decideContinue(context: StrategyContext): ContinueDecision {
    if (!this.lastContinueDecision) {
      throw new Error('No human continue decision available - must call waitForContinueDecision first');
    }
    return this.lastContinueDecision;
  }

  /**
   * Called by InteractiveStepGame to create a pending decision promise.
   * This promise will be resolved when submitDiceSelection() is called.
   * @returns Promise that resolves when the human submits their dice selection
   */
  createDiceDecisionPromise(): Promise<DiceSelectionDecision> {
    this.pendingDiceDecision = new Promise((resolve) => {
      this.diceDecisionResolver = resolve;
    });
    return this.pendingDiceDecision;
  }

  /**
   * Called by InteractiveStepGame to create a pending decision promise.
   * This promise will be resolved when submitContinueDecision() is called.
   * @returns Promise that resolves when the human submits their continue decision
   */
  createContinueDecisionPromise(): Promise<ContinueDecision> {
    this.pendingContinueDecision = new Promise((resolve) => {
      this.continueDecisionResolver = resolve;
    });
    return this.pendingContinueDecision;
  }

  /**
   * Called by API endpoint when human submits their dice selection decision.
   * Resolves the pending promise and stores the decision for the game engine.
   * @param decision The dice selection decision made by the human
   */
  submitDiceSelection(decision: DiceSelectionDecision): void {
    this.lastDiceDecision = decision;
    if (this.diceDecisionResolver) {
      this.diceDecisionResolver(decision);
      this.diceDecisionResolver = null;
      this.pendingDiceDecision = null;
    }
  }

  /**
   * Called by API endpoint when human submits their continue/stop decision.
   * Resolves the pending promise and stores the decision for the game engine.
   * @param decision The continue decision made by the human
   */
  submitContinueDecision(decision: ContinueDecision): void {
    this.lastContinueDecision = decision;
    if (this.continueDecisionResolver) {
      this.continueDecisionResolver(decision);
      this.continueDecisionResolver = null;
      this.pendingContinueDecision = null;
    }
  }

  /**
   * Reset decision state for a new turn.
   * Clears both dice and continue decisions.
   */
  resetDecisions(): void {
    this.lastDiceDecision = null;
    this.lastContinueDecision = null;
  }
}
