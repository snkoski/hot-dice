import React from 'react';
import { ResultCard } from './ResultCard';

interface SimulationResultsProps {
  results: any;
}

export function SimulationResults({ results }: SimulationResultsProps) {
  if (!results || !results.strategyResults) return null;

  return (
    <div className="card" id="resultsSection">
      <h2 className="section-title">Results</h2>
      <p style={{ marginBottom: '20px', color: '#666' }}>
        Ran {results.totalGames.toLocaleString()} games. Total ties: {results.totalTies.toLocaleString()}
      </p>
      <div className="results-grid">
        {results.strategyResults.map((result: any, index: number) => (
          <ResultCard key={result.strategyId} result={result} rank={index + 1} />
        ))}
      </div>
    </div>
  );
}
