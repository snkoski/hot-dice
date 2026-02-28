import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Simulator } from '../simulator/simulator';
import { listStrategies, getStrategy } from '../strategies/built-in';
import { getStrategyDetails } from '../strategies/composable/presets';
import { createThresholdStrategy, StrategyBuilder } from '../strategies/composable/builder';
import { fixed } from '../strategies/composable/threshold-calculators';
import { greedy } from '../strategies/composable/dice-selectors';
import { thresholdBased, minDiceRemaining } from '../strategies/composable/continue-evaluators';
import { SimultaneousStepGame } from './step-game-simultaneous';
import { InteractiveStepGame } from './interactive-step-game';
import { HumanStrategy } from '../strategies/HumanStrategy';
import type { SimulationConfig, SimulationProgress } from '../simulator/types';
import type { Strategy } from '../core/types';

// Store custom strategies created during this session
const customStrategiesCache = new Map<string, Strategy>();

// Store step-through game sessions
const stepGames = new Map<string, SimultaneousStepGame>();

// Store interactive game sessions
const interactiveGames = new Map<string, InteractiveStepGame>();

/**
 * Get or create a custom strategy
 */
function getOrCreateCustomStrategy(customStrategyData: any): Strategy {
  const { id, threshold, minDice, name, description, type } = customStrategyData;

  // Check cache first
  if (customStrategiesCache.has(id)) {
    return customStrategiesCache.get(id)!;
  }

  let strategy: Strategy;

  if (type === 'safe' && minDice !== undefined) {
    // Safe strategy with threshold + dice safety check
    strategy = new StrategyBuilder()
      .withMetadata(
        id,
        name || `Safe ${threshold} (≤${minDice} dice)`,
        description || `Targets ${threshold} points but stops when ${minDice} or fewer dice remain`,
        '1.0.0'
      )
      .withDiceSelector(greedy())
      .withContinueEvaluators(
        thresholdBased(fixed(threshold), []),
        minDiceRemaining(minDice)
      )
      .withCombinationMode({ type: 'all' })
      .build();
  } else {
    // Simple threshold strategy
    strategy = createThresholdStrategy(
      fixed(threshold),
      [],
      greedy()
    );

    // Override metadata
    (strategy as any).id = id;
    (strategy as any).name = name || `Stop at ${threshold}`;
    (strategy as any).description = description || `Always stops when turn points reach ${threshold}`;
  }

  // Cache it
  customStrategiesCache.set(id, strategy);

  return strategy;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = Fastify({ logger: true });

// Enable CORS
await app.register(cors, {
  origin: true
});

// Enable WebSocket
await app.register(fastifyWebsocket);

// Serve static files (for the frontend)
await app.register(fastifyStatic, {
  root: join(__dirname, '../../public'),
  prefix: '/'
});

// API Routes

/**
 * Get all available strategies
 */
app.get('/api/strategies', async (request, reply) => {
  const strategies = listStrategies();
  return strategies.map(s => {
    const details = getStrategyDetails(s.id);
    return {
      id: s.id,
      name: s.name,
      description: s.description,
      version: s.version,
      details: details?.components || null
    };
  });
});

/**
 * Run a simulation
 */
app.post<{
  Body: {
    gameCount: number;
    strategyIds?: string[];
    strategies?: any[];
    targetScore?: number;
    minimumScoreToBoard?: number;
    seed?: number;
  };
}>('/api/simulate', async (request, reply) => {
  const { gameCount, strategyIds, strategies: customStrategies, targetScore = 10000, minimumScoreToBoard = 500, seed } = request.body;

  // Validate input
  if (!gameCount || gameCount < 1 || gameCount > 10000) {
    return reply.code(400).send({ error: 'Game count must be between 1 and 10000' });
  }

  // Get strategies (either from IDs or custom strategy objects)
  let strategies: Strategy[] = [];

  if (strategyIds && strategyIds.length > 0) {
    const builtInStrategies = strategyIds.map(id => getStrategy(id)).filter(s => s !== undefined) as Strategy[];
    if (builtInStrategies.length !== strategyIds.length) {
      return reply.code(400).send({ error: 'Invalid strategy IDs' });
    }
    strategies = [...strategies, ...builtInStrategies];
  }

  if (customStrategies && customStrategies.length > 0) {
    const customStrategyObjects = customStrategies.map(data => getOrCreateCustomStrategy(data));
    strategies = [...strategies, ...customStrategyObjects];
  }

  if (strategies.length < 1) {
    return reply.code(400).send({ error: 'At least 1 strategy required' });
  }

  // Create simulation config
  const config: SimulationConfig = {
    gameCount,
    gameConfig: {
      targetScore,
      minimumScoreToBoard,
      playerCount: strategies.length
    },
    strategies: strategies as any[],
    seed
  };

  // Run simulation
  const simulator = new Simulator(config);
  const results = await simulator.run();

  return results;
});

/**
 * WebSocket endpoint for real-time simulation updates
 */
app.register(async function (fastify) {
  fastify.get('/api/simulate/stream', { websocket: true }, (socket, req) => {
    socket.on('message', async (message: any) => {
      try {
        const data = JSON.parse(message.toString());
        const { gameCount, strategyIds, strategies: customStrategies, targetScore = 10000, minimumScoreToBoard = 500, seed, scoringRules } = data;

        // Get strategies (either from IDs or custom strategy objects)
        let strategies: Strategy[] = [];

        if (strategyIds && strategyIds.length > 0) {
          const builtInStrategies = strategyIds.map((id: string) => getStrategy(id)).filter((s: any) => s !== undefined) as Strategy[];
          if (builtInStrategies.length !== strategyIds.length) {
            socket.send(JSON.stringify({ error: 'Invalid strategy IDs' }));
            return;
          }
          strategies = [...strategies, ...builtInStrategies];
        }

        if (customStrategies && customStrategies.length > 0) {
          const customStrategyObjects = customStrategies.map((data: any) => getOrCreateCustomStrategy(data));
          strategies = [...strategies, ...customStrategyObjects];
        }

        if (strategies.length < 1) {
          socket.send(JSON.stringify({ error: 'At least 1 strategy required' }));
          return;
        }

        // Create simulation config with progress callback
        const config: SimulationConfig = {
          gameCount,
          gameConfig: {
            targetScore,
            minimumScoreToBoard,
            playerCount: strategies.length,
            scoringRules
          },
          strategies: strategies as any[],
          seed,
          onProgress: (progress: SimulationProgress) => {
            socket.send(JSON.stringify({
              type: 'progress',
              data: progress
            }));
          }
        };

        // Run simulation
        const simulator = new Simulator(config);
        const results = await simulator.run();

        // Send final results
        socket.send(JSON.stringify({
          type: 'complete',
          data: results
        }));
      } catch (error: any) {
        socket.send(JSON.stringify({
          type: 'error',
          error: error.message
        }));
      }
    });
  });
});

/**
 * Initialize a step-through game
 */
app.post<{
  Body: {
    strategyIds?: string[];
    strategies?: any[];
    targetScore?: number;
    minimumScoreToBoard?: number;
    seed?: number;
    scoringRules?: any;
  };
}>('/api/game/init', async (request, reply) => {
  const { strategyIds, strategies: customStrategies, targetScore = 10000, minimumScoreToBoard = 500, seed, scoringRules } = request.body;

  // Get strategies (either from IDs or custom strategy objects)
  let strategies: Strategy[] = [];

  if (strategyIds && strategyIds.length > 0) {
    const builtInStrategies = strategyIds.map(id => getStrategy(id)).filter(s => s !== undefined) as Strategy[];
    if (builtInStrategies.length !== strategyIds.length) {
      return reply.code(400).send({ error: 'Invalid strategy IDs' });
    }
    strategies = [...strategies, ...builtInStrategies];
  }

  if (customStrategies && customStrategies.length > 0) {
    const customStrategyObjects = customStrategies.map(data => getOrCreateCustomStrategy(data));
    strategies = [...strategies, ...customStrategyObjects];
  }

  if (strategies.length < 1) {
    return reply.code(400).send({ error: 'At least 1 strategy required' });
  }

  // Create game
  const gameId = `step-game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const game = new SimultaneousStepGame(
    {
      targetScore,
      minimumScoreToBoard,
      playerCount: strategies.length,
      seed,
      scoringRules
    },
    strategies
  );

  stepGames.set(gameId, game);

  // Clean up old games (older than 1 hour)
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [id, _] of stepGames.entries()) {
    const timestamp = parseInt(id.split('-')[2]);
    if (timestamp < oneHourAgo) {
      stepGames.delete(id);
    }
  }

  return {
    gameId,
    currentStep: game.getCurrentStep()
  };
});

/**
 * Advance to next step in game
 */
app.post<{
  Body: {
    gameId: string;
  };
}>('/api/game/step', async (request, reply) => {
  const { gameId } = request.body;

  const game = stepGames.get(gameId);
  if (!game) {
    return reply.code(404).send({ error: 'Game not found' });
  }

  const step = game.nextStep();

  return {
    step,
    stepNumber: game.getSteps().length - 1,
    isGameOver: step.gameState.isGameOver
  };
});

/**
 * Get all steps for a game
 */
app.get<{
  Querystring: {
    gameId: string;
  };
}>('/api/game/steps', async (request, reply) => {
  const { gameId } = request.query;

  const game = stepGames.get(gameId);
  if (!game) {
    return reply.code(404).send({ error: 'Game not found' });
  }

  return {
    steps: game.getSteps(),
    currentStep: game.getCurrentStep()
  };
});

/**
 * Initialize an interactive game with human players
 */
app.post<{
  Body: {
    strategyIds?: string[];
    humanPlayerIndices?: number[];
    targetScore?: number;
    minimumScoreToBoard?: number;
    seed?: number;
    scoringRules?: any;
  };
}>('/api/game/interactive/init', async (request, reply) => {
  const {
    strategyIds = [],
    humanPlayerIndices = [0],
    targetScore = 10000,
    minimumScoreToBoard = 500,
    seed,
    scoringRules
  } = request.body;

  // Validate input
  const totalPlayers = strategyIds.length + humanPlayerIndices.length;
  if (totalPlayers < 1) {
    return reply.code(400).send({ error: 'At least 1 player required' });
  }

  // Get AI strategies
  const aiStrategies: Strategy[] = [];
  for (const id of strategyIds) {
    const strategy = getStrategy(id);
    if (!strategy) {
      return reply.code(400).send({ error: `Invalid strategy ID: ${id}` });
    }
    aiStrategies.push(strategy);
  }

  // Create human strategies
  const humanStrategies: Strategy[] = humanPlayerIndices.map((index: number, i: number) =>
    new HumanStrategy(
      `human-${index}`,
      `Human Player ${index + 1}`,
      'Interactive human player',
      '1.0.0'
    )
  );

  // Merge strategies in correct order
  const allStrategies: Strategy[] = [];
  let aiIndex = 0;
  let humanIndex = 0;

  for (let i = 0; i < totalPlayers; i++) {
    if (humanPlayerIndices.includes(i)) {
      allStrategies.push(humanStrategies[humanIndex++]);
    } else {
      allStrategies.push(aiStrategies[aiIndex++]);
    }
  }

  // Create game config
  const gameConfig = {
    playerCount: allStrategies.length,
    targetScore,
    minimumScoreToBoard,
    seed,
    scoringRules
  };

  // Create interactive game
  const gameId = `interactive-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const game = new InteractiveStepGame(gameConfig, allStrategies, humanPlayerIndices);

  interactiveGames.set(gameId, game);

  // Clean up old interactive games (older than 1 hour)
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [id, _] of interactiveGames.entries()) {
    const timestamp = parseInt(id.split('-')[1]);
    if (timestamp < oneHourAgo) {
      interactiveGames.delete(id);
    }
  }

  // Advance past the game_start step to the first human decision
  return {
    gameId,
    currentStep: game.advanceToDecisionPoint()
  };
});

/**
 * Submit a human decision in an interactive game
 */
app.post<{
  Body: {
    gameId: string;
    decisionId: string;
    decision: any;
  };
}>('/api/game/interactive/decision', async (request, reply) => {
  const { gameId, decisionId, decision } = request.body;

  const game = interactiveGames.get(gameId);
  if (!game) {
    return reply.code(404).send({ error: 'Game not found' });
  }

  try {
    const nextStep = await game.submitHumanDecision(decisionId, decision);

    return {
      step: nextStep,
      stepNumber: game.getSteps().length - 1,
      isGameOver: nextStep.gameState.isGameOver
    };
  } catch (error: any) {
    return reply.code(400).send({ error: error.message });
  }
});

/**
 * Get human decision history for an interactive game
 */
app.get<{
  Querystring: {
    gameId: string;
  };
}>('/api/game/interactive/history', async (request, reply) => {
  const { gameId } = request.query;

  const game = interactiveGames.get(gameId);
  if (!game) {
    return reply.code(404).send({ error: 'Game not found' });
  }

  return {
    decisions: game.getHumanDecisionHistory()
  };
});

/**
 * Health check
 */
app.get('/api/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Start server
const start = async () => {
  try {
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`\n🎲 Hot Dice server running at http://localhost:${port}`);
    console.log(`📊 API available at http://localhost:${port}/api`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
