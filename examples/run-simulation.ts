/**
 * Example: Run multiple games and compare strategies
 */

import { Simulator } from '../src/simulator/simulator';
import { conservative, moderate, aggressive } from '../src/strategies/built-in';
import type { SimulationConfig } from '../src/simulator/types';

const config: SimulationConfig = {
  gameCount: 100,
  gameConfig: {
    targetScore: 10000,
    minimumScoreToBoard: 500,
    playerCount: 3,
    playerNames: ['Conservative', 'Moderate', 'Aggressive']
  },
  strategies: [conservative, moderate, aggressive],
  seed: 42,
  onProgress: (progress) => {
    if (progress.gamesCompleted % 10 === 0) {
      console.log(`Progress: ${progress.gamesCompleted}/${progress.totalGames} (${progress.percentComplete.toFixed(1)}%)`);
    }
  }
};

console.log('Running 100 game simulation...\n');

const simulator = new Simulator(config);
const results = await simulator.run();

console.log('\n=== Simulation Results ===\n');
console.log(`Games played: ${results.gamesPlayed}`);
console.log(`Total duration: ${(results.totalDuration / 1000).toFixed(2)}s\n`);

console.log('Strategy Performance:');
results.strategyStats
  .sort((a, b) => b.winRate - a.winRate)
  .forEach((stats, index) => {
    console.log(`\n${index + 1}. ${stats.strategyName}`);
    console.log(`   Win Rate: ${(stats.winRate * 100).toFixed(1)}%`);
    console.log(`   Wins: ${stats.wins}/${stats.gamesPlayed}`);
    console.log(`   Avg Score: ${stats.averageFinalScore.toFixed(0)}`);
    console.log(`   Avg Turns: ${stats.averageTurnsPerGame.toFixed(1)}`);
    console.log(`   Avg Farkles: ${stats.averageFarklesPerGame.toFixed(1)}`);
    console.log(`   Farkle Rate: ${(stats.farkleRate * 100).toFixed(1)}%`);
  });

console.log('\n=== Overall Stats ===');
console.log(`Average game length: ${results.overallStats.averageGameLength.toFixed(1)} turns`);
console.log(`Average rolls per game: ${results.overallStats.averageRollsPerGame.toFixed(1)}`);
console.log(`Average farkles per game: ${results.overallStats.averageFarklesPerGame.toFixed(1)}`);
