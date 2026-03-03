import type { GameState } from '../../types/game';

interface PlayerScoresDisplayProps {
  gameState: GameState;
}

export function PlayerScoresDisplay({ gameState }: PlayerScoresDisplayProps) {
  const currentPlayerId = gameState.players[gameState.currentPlayerIndex]?.id;

  return (
    <div id="playerScoresDisplay" className="player-scores-interactive">
      {gameState.players.map((player) => {
        const isCurrent = player.id === currentPlayerId;
        return (
          <div
            key={player.id}
            className={`player-score-card-interactive ${isCurrent ? 'current' : ''}`}
            style={{
              background: isCurrent
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : '#f8f9fa',
              color: isCurrent ? 'white' : '#333',
            }}
          >
            <div className="player-score-name">{player.name}</div>
            <div className="player-score-value-interactive">{player.totalScore}</div>
            <div className="player-score-status">
              {player.isOnBoard ? '✓ On Board' : 'Not on board'}
            </div>
          </div>
        );
      })}
    </div>
  );
}
