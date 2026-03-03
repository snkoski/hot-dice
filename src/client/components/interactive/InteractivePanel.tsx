import React, { useState } from 'react';
import { SimulationUIConfig } from '../../App';
import { StrategyDTO } from '../strategies/StrategyCard';
import { InteractiveGameDisplay } from './InteractiveGameDisplay';

interface InteractivePanelProps {
  defaultConfig: SimulationUIConfig;
  selectedStrategyIds: string[];
  customStrategies: StrategyDTO[];
}

export function InteractivePanel({ defaultConfig, selectedStrategyIds, customStrategies }: InteractivePanelProps) {
  const [gameData, setGameData] = useState<{ gameId: string, initialStep: any } | null>(null);
  const [mirroredDice, setMirroredDice] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleStart = async () => {
    setIsLoading(true);
    try {
      const payload = {
        targetScore: defaultConfig.targetScore,
        minimumScoreToBoard: defaultConfig.minimumScoreToBoard,
        scoringRules: defaultConfig.scoringRules,
        strategyIds: selectedStrategyIds.filter(id => !customStrategies.find(c => c.id === id)),
        humanPlayerIndices: [0], // For simplicity, human is always player 0 in interactive
        strategies: customStrategies.filter(c => selectedStrategyIds.includes(c.id)).map(c => ({
          id: c.id,
          name: c.name,
          description: c.description,
          ...c.details
        })),
        mirroredDice
      };

      const res = await fetch('/api/game/interactive/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);
      
      setGameData({ gameId: data.gameId, initialStep: data.currentStep });
    } catch (err) {
      console.error(err);
      alert('Failed to start interactive game');
    } finally {
      setIsLoading(false);
    }
  };

  if (gameData) {
    return <InteractiveGameDisplay gameId={gameData.gameId} initialStep={gameData.initialStep} onClose={() => setGameData(null)} />;
  }

  return (
    <div className="card">
      <h2 className="section-title">🎮 Play Interactive Game</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Play against AI strategies! Make real decisions, see immediate results, and build your play history for analysis.
      </p>
      
      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', cursor: 'pointer', width: 'fit-content' }}>
        <input 
          type="checkbox" 
          checked={mirroredDice} 
          onChange={e => setMirroredDice(e.target.checked)} 
          style={{ width: '18px', height: '18px', accentColor: '#667eea' }} 
        />
        <span style={{ fontSize: '0.95em', color: '#444' }}>
          <strong>Mirrored dice</strong> — all players roll the same dice each round
        </span>
      </label>

      <button 
        onClick={handleStart} 
        disabled={isLoading || selectedStrategyIds.length < 1}
        style={{ padding: '12px 24px', background: '#28a745', fontWeight: 'bold' }}
      >
        {isLoading ? 'Starting...' : '🎮 Start Interactive Game'}
      </button>
    </div>
  );
}
