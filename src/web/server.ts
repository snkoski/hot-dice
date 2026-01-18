import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Simulator } from '../simulator/simulator';
import { listStrategies, getStrategy } from '../strategies/built-in';
import type { SimulationConfig, SimulationProgress } from '../simulator/types';

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
  return strategies.map(s => ({
    id: s.id,
    name: s.name,
    description: s.description,
    version: s.version
  }));
});

/**
 * Run a simulation
 */
app.post<{
  Body: {
    gameCount: number;
    strategyIds: string[];
    targetScore?: number;
    minimumScoreToBoard?: number;
    seed?: number;
  };
}>('/api/simulate', async (request, reply) => {
  const { gameCount, strategyIds, targetScore = 10000, minimumScoreToBoard = 500, seed } = request.body;

  // Validate input
  if (!gameCount || gameCount < 1 || gameCount > 10000) {
    return reply.code(400).send({ error: 'Game count must be between 1 and 10000' });
  }

  if (!strategyIds || strategyIds.length < 2) {
    return reply.code(400).send({ error: 'At least 2 strategies required' });
  }

  // Get strategies
  const strategies = strategyIds.map(id => getStrategy(id)).filter(s => s !== undefined);

  if (strategies.length !== strategyIds.length) {
    return reply.code(400).send({ error: 'Invalid strategy IDs' });
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
    socket.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        const { gameCount, strategyIds, targetScore = 10000, minimumScoreToBoard = 500, seed } = data;

        // Get strategies
        const strategies = strategyIds.map((id: string) => getStrategy(id)).filter((s: any) => s !== undefined);

        if (strategies.length !== strategyIds.length) {
          socket.send(JSON.stringify({ error: 'Invalid strategy IDs' }));
          return;
        }

        // Create simulation config with progress callback
        const config: SimulationConfig = {
          gameCount,
          gameConfig: {
            targetScore,
            minimumScoreToBoard,
            playerCount: strategies.length
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
