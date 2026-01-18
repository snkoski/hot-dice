/**
 * Example: Run a basic game with two strategies
 */

import { Game } from '../src/core/game';
import { conservative, aggressive } from '../src/strategies/built-in';
import type { GameConfig } from '../src/core/types';

// Configure the game
const config: GameConfig = {
  targetScore: 10000,
  minimumScoreToBoard: 500,
  playerCount: 2,
  playerNames: ['Conservative Player', 'Aggressive Player'],
  seed: 42 // For reproducible results
};

// Create game with strategies
const game = new Game(config, [conservative, aggressive]);

// Play the game
console.log('Starting Farkle game...\n');
const result = game.play();

// Display results
console.log('=== Game Over ===\n');

const winner = game.getWinner();
console.log(`Winner: ${winner?.name}`);
console.log(`Final Score: ${winner?.totalScore}\n`);

console.log('Final Standings:');
result.players.forEach((player, index) => {
  console.log(`${index + 1}. ${player.name}: ${player.totalScore} points`);
  console.log(`   Turns: ${player.stats.totalTurns}`);
  console.log(`   Rolls: ${player.stats.totalRolls}`);
  console.log(`   Farkles: ${player.stats.farkles}`);
  console.log(`   Max turn score: ${player.stats.maxTurnScore}\n`);
});

console.log(`Total turns in game: ${result.turnHistory.length}`);
