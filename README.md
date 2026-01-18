# Hot Dice (Farkle) Simulator

A TypeScript-based game simulator for Farkle (also called Hot Dice) with pluggable strategy system for comparing different gameplay approaches.

## 🎲 What is Farkle?

Farkle is a dice game where players roll 6 dice to accumulate points. The challenge is deciding when to bank your points or keep rolling for more - but if you roll no scoring dice, you "farkle" and lose all points for that turn!

### Scoring Rules

- **Single dice**: 1 = 100 points, 5 = 50 points
- **Three of a kind**: 1s = 1000, 2s = 200, 3s = 300, etc.
- **Four of a kind**: Double the three-of-a-kind score
- **Five of a kind**: Triple the three-of-a-kind score
- **Six of a kind**: Quadruple the three-of-a-kind score
- **Straight (1-2-3-4-5-6)**: 1500 points
- **Three pairs**: 1500 points
- **Hot Dice**: Use all 6 dice for scoring? Roll all 6 again!

### Game Rules

- First to 10,000 points wins
- Must score 500+ in a single turn to get "on the board"
- Roll no scoring dice? Farkle! Lose all turn points
- When someone hits 10,000, everyone gets a final turn

## ✨ Features

- ✅ **Complete Game Engine** with full Farkle rules
- ✅ **Test-Driven Development** - 101 tests passing
- ✅ **Seedable RNG** for reproducible games
- ✅ **Pluggable Strategies** - easily compare different approaches
- ✅ **Built-in Strategies**:
  - Conservative (stop at 500)
  - Moderate (stop at 1000)
  - Balanced (stop at 1500)
  - Aggressive (stop at 2000)
  - Adaptive (adjusts based on game state)
  - Risk-aware (considers farkle probability)

## 🚀 Quick Start

### Installation

\`\`\`bash
npm install
\`\`\`

### Run Web Interface 🌐

\`\`\`bash
npm start
\`\`\`

Then open your browser to **http://localhost:3000**

The web interface lets you:
- Select multiple strategies to compare
- Configure simulation parameters
- Watch real-time progress
- See detailed results with win rates and statistics

### Run Example Game (CLI)

\`\`\`bash
npx tsx examples/basic-game.ts
\`\`\`

### Run Simulation (CLI)

\`\`\`bash
npx tsx examples/run-simulation.ts
\`\`\`

### Run Tests

\`\`\`bash
npm test
\`\`\`

## 📊 Usage

### Basic Game

\`\`\`typescript
import { Game } from './src/core/game';
import { conservative, aggressive } from './src/strategies/built-in';

const config = {
  targetScore: 10000,
  minimumScoreToBoard: 500,
  playerCount: 2,
  seed: 42 // Optional: for reproducible results
};

const game = new Game(config, [conservative, aggressive]);
const result = game.play();

console.log('Winner:', game.getWinner()?.name);
\`\`\`

### Custom Strategy

\`\`\`typescript
import type { Strategy, StrategyContext, DiceSelectionDecision, ContinueDecision } from './src/core/types';

const myStrategy: Strategy = {
  id: 'my-strategy',
  name: 'My Custom Strategy',
  description: 'Stop at 1200 points',
  version: '1.0.0',

  selectDice(context: StrategyContext): DiceSelectionDecision {
    // Take all available scoring
    return {
      selectedCombinations: context.availableScoring.combinations,
      points: context.availableScoring.totalPoints,
      diceKept: context.availableScoring.scoringDiceCount
    };
  },

  decideContinue(context: StrategyContext): ContinueDecision {
    return {
      continue: context.turnState.turnPoints < 1200,
      reason: \`Current: \${context.turnState.turnPoints}\`
    };
  }
};
\`\`\`

## 🧪 Test-Driven Development

This project was built using strict TDD methodology:

1. ✅ Write tests first
2. ✅ Watch them fail (red)
3. ✅ Implement code to pass (green)
4. ✅ Never modify tests to match implementation

**Test Coverage:**
- 17 tests for dice rolling
- 48 tests for scoring engine
- 18 tests for turn management
- 18 tests for game orchestration
- **Total: 101 tests passing** ✅

## 📁 Project Structure

\`\`\`
hot-dice/
├── src/
│   ├── core/              # Game engine
│   │   ├── types.ts       # TypeScript interfaces
│   │   ├── dice.ts        # Seedable dice rolling
│   │   ├── scoring.ts     # Scoring calculation
│   │   ├── turn.ts        # Turn management
│   │   └── game.ts        # Game orchestration
│   └── strategies/        # Strategy system
│       └── built-in.ts    # Built-in strategies
├── tests/                 # Test suites
├── examples/              # Example usage
└── README.md
\`\`\`

## 🎯 Strategy Context

When strategies make decisions, they receive rich context:

\`\`\`typescript
interface StrategyContext {
  gameState: Readonly<GameState>;          // Full game state
  playerState: Readonly<PlayerState>;      // Your current state
  turnState: Readonly<TurnState>;          // Current turn info
  availableScoring: ScoringResult;         // Scoring options
  opponents: ReadonlyArray<PlayerState>;   // Opponent info
  leadingOpponentScore: number;            // Leader's score
  farkleRisk: number;                      // Farkle probability (0-1)
  expectedValue: number;                   // Expected points
}
\`\`\`

This allows strategies to be as simple or complex as you want!

## 🎨 Web Interface Features

- ✅ **Strategy Selector** - Click to select multiple strategies to compare
- ✅ **Real-time Progress** - Watch simulations run with live progress bar
- ✅ **Detailed Statistics** - Win rates, average scores, farkle rates, and more
- ✅ **Beautiful UI** - Gradient design with responsive cards
- ✅ **WebSocket Updates** - Instant feedback as games complete

## 🔜 Future Enhancements

- 📈 **Charts & Graphs** - Visual score distributions and trend analysis
- 🎮 **Interactive Play** - Play against strategies yourself
- 🤖 **Advanced Strategies** - ML-based, Monte Carlo simulations
- 💾 **Save Results** - Export and compare historical simulations

## 🛠️ Development

\`\`\`bash
# Run tests in watch mode
npm run test:watch

# Build the project
npm run build

# Run example
npx tsx examples/basic-game.ts
\`\`\`

## 📝 License

MIT

---

**Built with ❤️ using Test-Driven Development**

101 tests passing ✅
