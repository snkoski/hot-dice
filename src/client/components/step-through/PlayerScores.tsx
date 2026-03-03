import type { GameState } from '../../types/game';
import './stepThrough.css';

interface PlayerScoresProps {
  gameState: GameState;
}

export function PlayerScores({ gameState }: PlayerScoresProps) {
  return (
    <div className="player-scores">
      {gameState.players.map((player) => (
        <div key={player.id} className="player-score-card">
          <h4>{player.name}</h4>
          <div style={{ fontSize: '1.5em', fontWeight: 600, color: '#667eea' }}>
            {player.totalScore.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.85em', color: '#666', marginTop: 5 }}>
            {player.stats.totalTurns} turns, {player.stats.farkles} farkles
          </div>
        </div>
      ))}
    </div>
  );
}
