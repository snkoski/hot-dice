import type { GameState } from '../../types/game';

interface PlayerScoresProps {
  gameState: GameState;
}

export function PlayerScores({ gameState }: PlayerScoresProps) {
  return (
    <div id="playerScores" className="player-scores">
      {gameState.players.map((player) => (
        <div key={player.id} className="player-score-card">
          <h4>{player.name}</h4>
          <div className="player-score-value">
            {player.totalScore.toLocaleString()}
          </div>
          <div className="player-score-stats">
            {player.stats.totalTurns} turns, {player.stats.farkles} farkles
          </div>
        </div>
      ))}
    </div>
  );
}
