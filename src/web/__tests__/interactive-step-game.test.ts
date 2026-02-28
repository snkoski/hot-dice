import { InteractiveStepGame } from '../interactive-step-game';
import { HumanStrategy } from '../../strategies/HumanStrategy';
import { GameConfig, DiceSelectionDecision, ContinueDecision, ScoringCombination, ScoreType } from '../../core/types';
import { conservative } from '../../strategies/built-in';

describe('InteractiveStepGame', () => {
  describe('Initialization', () => {
    test('should initialize with human player indices', () => {
      const aiStrategy = conservative;
      const humanStrategy = new HumanStrategy('human-1', 'Human Player', 'Test human', '1.0.0');

      const config: GameConfig = {
        playerCount: 2,
        targetScore: 10000,
        minimumScoreToBoard: 500
      };

      const game = new InteractiveStepGame(config, [humanStrategy, aiStrategy], [0]);

      const currentStep = game.getCurrentStep();
      expect(currentStep.type).toBe('game_start');
      expect(currentStep.gameState.players).toHaveLength(2);
    });

    test('should support multiple human players', () => {
      const human1 = new HumanStrategy('human-1', 'Human 1', 'Test human 1', '1.0.0');
      const human2 = new HumanStrategy('human-2', 'Human 2', 'Test human 2', '1.0.0');
      const aiStrategy = conservative;

      const config: GameConfig = {
        playerCount: 3,
        targetScore: 10000,
        minimumScoreToBoard: 500
      };

      const game = new InteractiveStepGame(config, [human1, aiStrategy, human2], [0, 2]);

      const currentStep = game.getCurrentStep();
      expect(currentStep.gameState.players).toHaveLength(3);
    });

    test('should throw error if player count mismatches strategy count', () => {
      const humanStrategy = new HumanStrategy('human-1', 'Human', 'Test', '1.0.0');
      const config: GameConfig = {
        playerCount: 3,
        targetScore: 10000,
        minimumScoreToBoard: 500
      };

      expect(() => {
        new InteractiveStepGame(config, [humanStrategy], [0]);
      }).toThrow();
    });
  });

  describe('Human decision detection', () => {
    test('should pause when human decision is needed', () => {
      const humanStrategy = new HumanStrategy('human-1', 'Human', 'Test', '1.0.0');
      const aiStrategy = conservative;

      const config: GameConfig = {
        playerCount: 2,
        targetScore: 10000,
        minimumScoreToBoard: 500,
        seed: 12345 // Use seed for deterministic rolls
      };

      const game = new InteractiveStepGame(config, [humanStrategy, aiStrategy], [0]);

      // Start the game and advance to first roll
      let step = game.nextStep(); // round_start

      // Keep advancing until we hit a human decision point or game over
      let maxSteps = 10;
      while (step.type !== 'awaiting_human_decision' && !step.gameState.isGameOver && maxSteps > 0) {
        step = game.nextStep();
        maxSteps--;
      }

      // Should eventually hit a point where human needs to decide
      // (either dice selection or continue decision)
      expect(['awaiting_human_decision', 'game_end']).toContain(step.type);
    });
  });

  describe('Decision submission', () => {
    test('should accept and process human dice selection', async () => {
      const humanStrategy = new HumanStrategy('human-1', 'Human', 'Test', '1.0.0');
      const config: GameConfig = {
        playerCount: 1,
        targetScore: 10000,
        minimumScoreToBoard: 500,
        seed: 12345
      };

      const game = new InteractiveStepGame(config, [humanStrategy], [0]);

      // Advance to human decision point
      let step = game.nextStep();
      let maxSteps = 10;
      while (step.type !== 'awaiting_human_decision' && !step.gameState.isGameOver && maxSteps > 0) {
        step = game.nextStep();
        maxSteps--;
      }

      if (step.type === 'awaiting_human_decision' && step.humanDecisions && step.humanDecisions.length > 0) {
        let humanDecision = step.humanDecisions[0];

        if (humanDecision.type === 'dice') {
          // Submit a dice selection decision
          const diceDecision: DiceSelectionDecision = {
            selectedCombinations: humanDecision.context.scoringCombinations.slice(0, 1),
            points: humanDecision.context.scoringCombinations[0]?.points || 0,
            diceKept: humanDecision.context.scoringCombinations[0]?.dice.length || 0,
            reason: 'Test selection'
          };

          let nextStep = await game.submitHumanDecision(humanDecision.decisionId, diceDecision);
          expect(nextStep).toBeDefined();

          // After dice selection, should get continue decision
          if (nextStep.type === 'awaiting_human_decision' && nextStep.humanDecisions && nextStep.humanDecisions.length > 0) {
            humanDecision = nextStep.humanDecisions[0];
            expect(humanDecision.type).toBe('continue');

            // Submit continue decision
            const continueDecision: ContinueDecision = {
              continue: false,
              reason: 'Test stop'
            };

            nextStep = await game.submitHumanDecision(humanDecision.decisionId, continueDecision);
            expect(nextStep).toBeDefined();
            expect(nextStep.type).not.toBe('awaiting_human_decision'); // Should have moved on now
          }
        }
      }
    });

    test('should throw error for invalid decision ID', async () => {
      const humanStrategy = new HumanStrategy('human-1', 'Human', 'Test', '1.0.0');
      const config: GameConfig = {
        playerCount: 1,
        targetScore: 10000,
        minimumScoreToBoard: 500
      };

      const game = new InteractiveStepGame(config, [humanStrategy], [0]);

      const decision: DiceSelectionDecision = {
        selectedCombinations: [],
        points: 0,
        diceKept: 0,
        reason: 'Test'
      };

      await expect(game.submitHumanDecision('invalid-id', decision)).rejects.toThrow(
        'Decision invalid-id not found'
      );
    });
  });

  describe('Decision history tracking', () => {
    test('should track human decision history', async () => {
      const humanStrategy = new HumanStrategy('human-1', 'Human', 'Test', '1.0.0');
      const config: GameConfig = {
        playerCount: 1,
        targetScore: 10000,
        minimumScoreToBoard: 500,
        seed: 12345
      };

      const game = new InteractiveStepGame(config, [humanStrategy], [0]);

      // Advance to human decision and submit it
      let step = game.nextStep();
      let maxSteps = 10;
      while (step.type !== 'awaiting_human_decision' && !step.gameState.isGameOver && maxSteps > 0) {
        step = game.nextStep();
        maxSteps--;
      }

      if (step.type === 'awaiting_human_decision' && step.humanDecisions && step.humanDecisions.length > 0) {
        const humanDecision = step.humanDecisions[0];

        const decision: any = humanDecision.type === 'dice'
          ? {
              selectedCombinations: humanDecision.context.scoringCombinations.slice(0, 1),
              points: humanDecision.context.scoringCombinations[0]?.points || 0,
              diceKept: humanDecision.context.scoringCombinations[0]?.dice.length || 0,
              reason: 'Test'
            }
          : {
              continue: false,
              reason: 'Test'
            };

        await game.submitHumanDecision(humanDecision.decisionId, decision);

        const history = game.getHumanDecisionHistory();
        expect(history.length).toBeGreaterThan(0);
        expect(history[0].decisionId).toBe(humanDecision.decisionId);
      }
    });

    test('should include context in decision history', async () => {
      const humanStrategy = new HumanStrategy('human-1', 'Human', 'Test', '1.0.0');
      const config: GameConfig = {
        playerCount: 1,
        targetScore: 10000,
        minimumScoreToBoard: 500,
        seed: 12345
      };

      const game = new InteractiveStepGame(config, [humanStrategy], [0]);

      let step = game.nextStep();
      let maxSteps = 10;
      while (step.type !== 'awaiting_human_decision' && !step.gameState.isGameOver && maxSteps > 0) {
        step = game.nextStep();
        maxSteps--;
      }

      if (step.type === 'awaiting_human_decision' && step.humanDecisions && step.humanDecisions.length > 0) {
        const humanDecision = step.humanDecisions[0];

        const decision: any = humanDecision.type === 'dice'
          ? {
              selectedCombinations: [],
              points: 0,
              diceKept: 0,
              reason: 'Test'
            }
          : {
              continue: false,
              reason: 'Test'
            };

        await game.submitHumanDecision(humanDecision.decisionId, decision);

        const history = game.getHumanDecisionHistory();
        expect(history[0].context).toBeDefined();
        expect(history[0].context.diceRolled).toBeDefined();
        expect(history[0].gameStateBefore).toBeDefined();
      }
    });
  });
});
