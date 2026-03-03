import React, { useState, useEffect } from 'react';
import { PlayerScores } from './PlayerScores';
import { TurnInfo } from './TurnInfo';
import { DiceDisplay } from './DiceDisplay';
import { DecisionDisplay } from './DecisionDisplay';
import { StepControls } from './StepControls';

interface StepGameDisplayProps {
  gameId: string;
  onClose: () => void;
}

export function StepGameDisplay({ gameId, onClose }: StepGameDisplayProps) {
  const [steps, setSteps] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/game/steps?gameId=${gameId}`)
      .then(res => res.json())
      .then(data => {
        setSteps(data.steps || []);
        setCurrentIndex((data.steps || []).length - 1);
      })
      .catch(err => console.error(err));
  }, [gameId]);

  const handleNext = async () => {
    if (currentIndex < steps.length - 1) {
      setCurrentIndex(prev => prev + 1);
      return;
    }

    const currentStep = steps[currentIndex];
    if (currentStep && currentStep.gameState && currentStep.gameState.isGameOver) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/game/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      setSteps(prev => [...prev, data.step]);
      setCurrentIndex(prev => prev + 1);
    } catch (err) {
      console.error(err);
      alert('Failed to advance game');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const step = steps[currentIndex];
  if (!step) return <div>Loading game...</div>;

  const { gameState, type } = step;
  const isGameOver = gameState?.isGameOver;
  const isAtEnd = currentIndex === steps.length - 1;
  const disableNext = isLoading || (isAtEnd && isGameOver);

  let playerName = '';
  if (gameState && gameState.currentPlayerIndex !== undefined && gameState.players) {
    playerName = gameState.players[gameState.currentPlayerIndex]?.name || '';
  }

  let selectedIndices: number[] = [];
  if (type === 'decision' && step.decision?.type === 'dice') {
    selectedIndices = step.decision.decision.selectedCombinations.flatMap((c: any) => c.diceIndices);
  }

  return (
    <div className="card" id="stepGameSection">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 className="section-title" style={{ margin: 0 }}>🎮 Game in Progress</h2>
        <button onClick={onClose} style={{ padding: '8px 20px', fontSize: '0.9em', width: 'auto', background: '#6c757d' }}>
          ✕ Close
        </button>
      </div>

      <StepControls 
        currentIndex={currentIndex} 
        totalSteps={isGameOver ? steps.length : 0} 
        onPrev={handlePrev} 
        onNext={handleNext} 
        isLoading={disableNext} 
        stepDescription={step.type === 'game_start' ? 'Game Start' : 
                         step.type === 'game_over' ? 'Game Over' : 
                         step.type === 'roll' ? 'Dice Rolled' : 
                         step.type === 'decision' ? 'Strategy Decision' : 
                         step.type === 'farkle' ? 'Farkle' : 'Step'} 
      />

      {gameState && (
        <PlayerScores 
          players={gameState.players} 
          currentPlayerIndex={gameState.currentPlayerIndex} 
        />
      )}

      {gameState && gameState.currentTurn && (
        <TurnInfo turn={gameState.currentTurn} playerName={playerName} />
      )}

      <DecisionDisplay step={step} />

      {gameState && gameState.currentTurn && gameState.currentTurn.lastRoll && (
        <DiceDisplay 
          diceRolled={gameState.currentTurn.lastRoll} 
          selectedIndices={selectedIndices} 
          farkle={type === 'farkle'} 
        />
      )}
    </div>
  );
}
