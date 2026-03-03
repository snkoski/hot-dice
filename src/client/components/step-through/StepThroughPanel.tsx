import React, { useState } from 'react';
import { SimulationUIConfig } from '../../App';
import { StrategyDTO } from '../strategies/StrategyCard';
import { StepGameDisplay } from './StepGameDisplay';

interface StepThroughPanelProps {
  defaultConfig: SimulationUIConfig;
  selectedStrategyIds: string[];
  customStrategies: StrategyDTO[];
}

export function StepThroughPanel({ defaultConfig, selectedStrategyIds, customStrategies }: StepThroughPanelProps) {
  const [gameId, setGameId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleStartGame = async () => {
    setIsLoading(true);
    try {
      const payload = {
        targetScore: defaultConfig.targetScore,
        minimumScoreToBoard: defaultConfig.minimumScoreToBoard,
        scoringRules: defaultConfig.scoringRules,
        strategyIds: selectedStrategyIds.filter(id => !customStrategies.find(c => c.id === id)),
        strategies: customStrategies.filter(c => selectedStrategyIds.includes(c.id)).map(c => ({
          id: c.id,
          name: c.name,
          description: c.description,
          ...c.details
        }))
      };

      const res = await fetch('/api/game/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);
      
      setGameId(data.gameId);
    } catch (err) {
      console.error(err);
      alert('Failed to start step-through game');
    } finally {
      setIsLoading(false);
    }
  };

  if (gameId) {
    return <StepGameDisplay gameId={gameId} onClose={() => setGameId(null)} />;
  }

  return (
    <div className="card">
      <h2 className="section-title">🔍 Step-Through Mode</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Watch a single game unfold step by step. See each dice roll and how strategies make decisions in real-time.
      </p>
      <button 
        onClick={handleStartGame} 
        disabled={isLoading || selectedStrategyIds.length < 1}
        style={{ background: '#28a745' }}
      >
        {isLoading ? 'Starting...' : '🎮 Start Step-Through Game'}
      </button>
    </div>
  );
}
