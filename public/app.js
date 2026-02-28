// State
let availableStrategies = [];
let customStrategies = [];
let selectedStrategyIds = [];
let ws = null;

// Step-through game state
let currentGameId = null;
let currentStepNumber = 0;
let gameStepHistory = []; // Store all steps locally
let currentHistoryIndex = 0; // Current position in history

// Interactive game state
let currentInteractiveGameId = null;
let humanDecisionState = null;
let selectedDiceIndices = [];

// Strategy hash and statistics management
const STATS_STORAGE_KEY = 'hot-dice-strategy-stats';

// Simple hash function (djb2 algorithm)
function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

// Generate hash for a strategy
function generateStrategyHash(strategy) {
  // Built-in simple threshold strategies
  if (strategy.id.startsWith('threshold-')) {
    const threshold = strategy.id.split('-')[1];
    return hashString(`threshold:${threshold}`);
  }

  // Composable strategies with details
  if (strategy.details?.components) {
    const c = strategy.details.components;
    const parts = [
      `dice:${c.diceSelector?.name || 'unknown'}`,
      `calc:${c.thresholdCalculator?.name || 'none'}:${c.thresholdCalculator?.description || ''}`,
      `mods:${(c.modifiers || []).map(m => m.name).sort().join(',')}`,
      `eval:${(c.evaluators || []).map(e => e.name).sort().join(',')}`,
      `mode:${c.combinationMode}`
    ];
    return hashString(parts.join('|'));
  }

  // Custom strategies
  if (strategy.threshold !== undefined) {
    if (strategy.type === 'safe' && strategy.minDice !== undefined) {
      return hashString(`safe:${strategy.threshold}:${strategy.minDice}`);
    }
    return hashString(`custom:${strategy.threshold}`);
  }

  // Fallback
  return hashString(`id:${strategy.id}`);
}

// Load all strategy stats from localStorage
function loadStrategyStats() {
  try {
    const stored = localStorage.getItem(STATS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    console.error('Failed to load strategy stats:', e);
    return {};
  }
}

// Save strategy stats to localStorage
function saveStrategyStats(stats) {
  try {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
  } catch (e) {
    console.error('Failed to save strategy stats:', e);
  }
}

// Get or create stats for a strategy
function getStrategyStats(hash, name, description) {
  const allStats = loadStrategyStats();

  if (!allStats[hash]) {
    const now = new Date().toISOString();
    allStats[hash] = {
      hash,
      name,
      description,
      totalGames: 0,
      totalWins: 0,
      totalTurns: 0,
      totalRolls: 0,
      totalFarkles: 0,
      totalPoints: 0,
      totalSuccessfulTurns: 0,
      totalFarkleDice: 0,
      totalFarkleEvents: 0,
      totalExpectedFarkles: 0,
      totalActualFarkles: 0,
      firstSeen: now,
      lastSeen: now,
      gamesCount: 0
    };
  }

  return allStats[hash];
}

// Update stats after simulation
function updateStrategyStats(hash, results) {
  const allStats = loadStrategyStats();
  const existing = allStats[hash] || getStrategyStats(hash, results.name || 'Unknown', '');

  allStats[hash] = {
    ...existing,
    name: results.name || existing.name, // Update name in case it changed
    totalGames: existing.totalGames + results.gamesPlayed,
    totalWins: existing.totalWins + results.wins,
    totalTurns: existing.totalTurns + results.totalTurns,
    totalRolls: existing.totalRolls + results.totalRolls,
    totalFarkles: existing.totalFarkles + results.totalFarkles,
    totalPoints: existing.totalPoints + results.totalPoints,
    totalSuccessfulTurns: (existing.totalSuccessfulTurns || 0) + (results.totalSuccessfulTurns || 0),
    totalFarkleDice: (existing.totalFarkleDice || 0) + (results.totalFarkleDice || 0),
    totalFarkleEvents: (existing.totalFarkleEvents || 0) + (results.totalFarkleEvents || 0),
    totalExpectedFarkles: (existing.totalExpectedFarkles || 0) + (results.totalExpectedFarkles || 0),
    totalActualFarkles: (existing.totalActualFarkles || 0) + (results.totalActualFarkles || 0),
    lastSeen: new Date().toISOString(),
    gamesCount: existing.gamesCount + 1
  };

  saveStrategyStats(allStats);
  return allStats[hash];
}

// Calculate derived statistics
function calculateDerivedStats(stats) {
  const result = { ...stats };

  if (stats.totalGames > 0) {
    result.winRate = stats.totalWins / stats.totalGames;
    result.avgTurnsPerGame = stats.totalTurns / stats.totalGames;
    result.avgRollsPerGame = stats.totalRolls / stats.totalGames;
    result.avgFarklesPerGame = stats.totalFarkles / stats.totalGames;
    result.avgPointsPerGame = stats.totalPoints / stats.totalGames;
  }

  if (stats.totalRolls > 0) {
    result.farkleRate = stats.totalFarkles / stats.totalRolls;
  }

  if (stats.totalSuccessfulTurns > 0) {
    result.avgPointsWhenScoring = stats.totalPoints / stats.totalSuccessfulTurns;
  }

  if (stats.totalTurns > 0) {
    result.avgPointsPerTurnIncludingFarkles = stats.totalPoints / stats.totalTurns;
  }

  if (stats.totalFarkleEvents && stats.totalFarkleEvents > 0 && stats.totalFarkleDice !== undefined) {
    result.avgFarkleDiceCount = stats.totalFarkleDice / stats.totalFarkleEvents;
  }

  if (stats.totalExpectedFarkles && stats.totalExpectedFarkles > 0 && stats.totalActualFarkles !== undefined) {
    result.luckScore = ((stats.totalExpectedFarkles - stats.totalActualFarkles) / stats.totalExpectedFarkles) * 100;
  }

  return result;
}

// Load strategies on page load
async function loadStrategies() {
  try {
    const response = await fetch('/api/strategies');
    availableStrategies = await response.json();
    renderStrategies();
  } catch (error) {
    console.error('Failed to load strategies:', error);
  }
}

// Render strategy cards
function renderStrategies() {
  const container = document.getElementById('strategies');

  // Render built-in strategies
  const builtInHtml = availableStrategies.map(strategy => `
    <div class="strategy-card" data-id="${strategy.id}" onclick="toggleStrategy('${strategy.id}')">
      <div class="strategy-header">
        <h3>${strategy.name}</h3>
        ${strategy.details ? `<button class="info-btn" onclick="event.stopPropagation(); showStrategyDetails('${strategy.id}')" title="Show strategy details">ℹ️</button>` : ''}
      </div>
      <p>${strategy.description}</p>
    </div>
  `).join('');

  // Render custom strategies
  const customHtml = customStrategies.map(strategy => `
    <div class="strategy-card custom" data-id="${strategy.id}" onclick="toggleStrategy('${strategy.id}')">
      <div class="strategy-header">
        <h3>${strategy.name}</h3>
        <button class="remove-btn" onclick="event.stopPropagation(); removeCustomStrategy('${strategy.id}')" title="Remove this custom strategy">✕</button>
      </div>
      <p>${strategy.description}</p>
    </div>
  `).join('');

  container.innerHTML = builtInHtml + customHtml;

  // Update selected states
  updateSelectedStates();
}

// Add custom simple threshold strategy
function addCustomStrategy() {
  const threshold = parseInt(document.getElementById('customThreshold').value);

  if (!threshold || threshold < 100 || threshold > 5000) {
    alert('Please enter a threshold between 100 and 5000');
    return;
  }

  const id = `custom-simple-${threshold}-${Date.now()}`;
  const customStrategy = {
    id: id,
    name: `Custom: ${threshold}`,
    description: `Stops at ${threshold} points`,
    version: '1.0.0',
    isCustom: true,
    type: 'simple',
    threshold: threshold
  };

  customStrategies.push(customStrategy);
  renderStrategies();

  // Show success feedback
  const input = document.getElementById('customThreshold');
  const originalBg = input.style.background;
  input.style.background = '#d4edda';
  setTimeout(() => {
    input.style.background = originalBg;
  }, 500);
}

// Add custom safe strategy (threshold + dice safety)
function addSafeStrategy() {
  const threshold = parseInt(document.getElementById('safeThreshold').value);
  const minDice = parseInt(document.getElementById('minDice').value);

  if (!threshold || threshold < 100 || threshold > 5000) {
    alert('Please enter a threshold between 100 and 5000');
    return;
  }

  if (!minDice || minDice < 1 || minDice > 5) {
    alert('Please enter a minimum dice count between 1 and 5');
    return;
  }

  const id = `custom-safe-${threshold}-${minDice}-${Date.now()}`;
  const customStrategy = {
    id: id,
    name: `Safe ${threshold} (≤${minDice} dice)`,
    description: `Targets ${threshold} points but stops when ${minDice} or fewer dice remain`,
    version: '1.0.0',
    isCustom: true,
    type: 'safe',
    threshold: threshold,
    minDice: minDice
  };

  customStrategies.push(customStrategy);
  renderStrategies();

  // Show success feedback
  const input = document.getElementById('safeThreshold');
  const originalBg = input.style.background;
  input.style.background = '#d4edda';
  setTimeout(() => {
    input.style.background = originalBg;
  }, 500);
}

// Remove custom strategy
function removeCustomStrategy(id) {
  customStrategies = customStrategies.filter(s => s.id !== id);

  // Remove from selection if selected
  const index = selectedStrategyIds.indexOf(id);
  if (index > -1) {
    selectedStrategyIds.splice(index, 1);
    updateRunButton();
  }

  renderStrategies();
}

// Update selected states in UI
function updateSelectedStates() {
  document.querySelectorAll('.strategy-card').forEach(card => {
    if (selectedStrategyIds.includes(card.dataset.id)) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  });
}

// Toggle strategy selection
function toggleStrategy(id) {
  const index = selectedStrategyIds.indexOf(id);
  if (index > -1) {
    selectedStrategyIds.splice(index, 1);
  } else {
    selectedStrategyIds.push(id);
  }

  updateSelectedStates();
  updateRunButton();
}

// Update run button state
function updateRunButton() {
  const runBtn = document.getElementById('runBtn');
  const stepBtn = document.getElementById('startStepGameBtn');
  const interactiveBtn = document.getElementById('startInteractiveBtn');

  // Simulate and step-through require at least 1 strategy
  if (selectedStrategyIds.length >= 1) {
    runBtn.disabled = false;
    stepBtn.disabled = false;
    document.getElementById('selection-hint').textContent =
      `${selectedStrategyIds.length} ${selectedStrategyIds.length === 1 ? 'strategy' : 'strategies'} selected`;
  } else {
    runBtn.disabled = true;
    stepBtn.disabled = true;
    document.getElementById('selection-hint').textContent =
      'Select at least 1 strategy';
  }

  // Interactive game is always available (human-only is valid)
  interactiveBtn.disabled = false;
}

// Get scoring rules from UI
function getScoringRules() {
  return {
    enableStraight: document.getElementById('enableStraight').checked,
    enableThreePairs: document.getElementById('enableThreePairs').checked,
    enableFourOfKindBonus: document.getElementById('enableFourOfKindBonus').checked,
    enableFiveOfKindBonus: document.getElementById('enableFiveOfKindBonus').checked,
    enableSixOfKindBonus: document.getElementById('enableSixOfKindBonus').checked,
    enableSingleOnes: document.getElementById('enableSingleOnes').checked,
    enableSingleFives: document.getElementById('enableSingleFives').checked,
    minimumScoreToBoard: parseInt(document.getElementById('minScore').value)
  };
}

// Run simulation
async function runSimulation() {
  const gameCount = parseInt(document.getElementById('gameCount').value);
  const targetScore = parseInt(document.getElementById('targetScore').value);
  const minScore = parseInt(document.getElementById('minScore').value);
  const scoringRules = getScoringRules();

  // Show progress, hide results
  document.getElementById('progressSection').classList.remove('hidden');
  document.getElementById('resultsSection').classList.add('hidden');
  document.getElementById('runBtn').disabled = true;

  // Connect WebSocket for real-time updates
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${window.location.host}/api/simulate/stream`);

  ws.onopen = () => {
    // Separate built-in strategy IDs from custom strategies
    const builtInIds = selectedStrategyIds.filter(id =>
      !id.startsWith('custom-')
    );
    const customStrategyData = selectedStrategyIds
      .filter(id => id.startsWith('custom-'))
      .map(id => customStrategies.find(s => s.id === id))
      .filter(s => s !== undefined);

    // Send simulation config
    ws.send(JSON.stringify({
      gameCount,
      strategyIds: builtInIds,
      strategies: customStrategyData,
      targetScore,
      minimumScoreToBoard: minScore,
      scoringRules: scoringRules
    }));
  };

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);

    if (message.type === 'progress') {
      updateProgress(message.data);
    } else if (message.type === 'complete') {
      displayResults(message.data);
      ws.close();
      document.getElementById('progressSection').classList.add('hidden');
      document.getElementById('runBtn').disabled = false;
    } else if (message.type === 'error') {
      console.error('Simulation error:', message.error);
      alert('Simulation failed: ' + message.error);
      ws.close();
      document.getElementById('progressSection').classList.add('hidden');
      document.getElementById('runBtn').disabled = false;
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    alert('Connection error. Please try again.');
    document.getElementById('progressSection').classList.add('hidden');
    document.getElementById('runBtn').disabled = false;
  };
}

// Update progress bar
function updateProgress(progress) {
  const fill = document.getElementById('progressFill');
  const text = document.getElementById('progressText');

  fill.style.width = progress.percentComplete + '%';
  fill.textContent = Math.round(progress.percentComplete) + '%';

  const remaining = Math.round(progress.estimatedTimeRemaining / 1000);
  text.textContent = `${progress.gamesCompleted} / ${progress.totalGames} games completed (~${remaining}s remaining)`;
}

// Display results
function displayResults(results) {
  const container = document.getElementById('results');
  document.getElementById('resultsSection').classList.remove('hidden');

  // Sort by win rate
  const sortedStats = results.strategyStats.sort((a, b) => b.winRate - a.winRate);

  // Process each strategy: generate hash, update cumulative stats
  const enrichedStats = sortedStats.map(stats => {
    // Find the full strategy object
    const strategy = availableStrategies.find(s => s.id === stats.strategyId) ||
                     customStrategies.find(s => s.id === stats.strategyId);

    if (!strategy) {
      console.warn('Strategy not found:', stats.strategyId);
      return { ...stats, hash: null, cumulativeStats: null };
    }

    // Generate hash
    const hash = generateStrategyHash(strategy);

    // Calculate totals for this simulation
    const totalTurns = Math.round(stats.averageTurnsPerGame * stats.gamesPlayed);
    const totalPoints = Math.round(stats.averagePointsPerTurnIncludingFarkles * totalTurns);
    const totalSuccessfulTurns = stats.averagePointsWhenScoring > 0
      ? Math.round(totalPoints / stats.averagePointsWhenScoring)
      : 0;

    // Calculate farkle dice stats if available
    const totalFarkles = Math.round(stats.averageFarklesPerGame * stats.gamesPlayed);
    const totalFarkleDice = stats.averageFarkleDiceCount
      ? Math.round(stats.averageFarkleDiceCount * totalFarkles)
      : undefined;
    const totalFarkleEvents = stats.averageFarkleDiceCount ? totalFarkles : undefined;

    const simulationResults = {
      name: stats.strategyName,
      gamesPlayed: stats.gamesPlayed,
      wins: stats.wins,
      totalTurns: totalTurns,
      totalRolls: Math.round(stats.averageRollsPerGame * stats.gamesPlayed),
      totalFarkles: totalFarkles,
      totalPoints: totalPoints,
      totalSuccessfulTurns: totalSuccessfulTurns,
      totalFarkleDice: totalFarkleDice,
      totalFarkleEvents: totalFarkleEvents,
      totalExpectedFarkles: stats.totalExpectedFarkles,
      totalActualFarkles: stats.totalActualFarkles
    };

    // Update cumulative stats
    const cumulativeStats = updateStrategyStats(hash, simulationResults);
    const enrichedCumulative = calculateDerivedStats(cumulativeStats);

    return {
      ...stats,
      hash,
      cumulativeStats: enrichedCumulative
    };
  });

  container.innerHTML = enrichedStats.map((stats, index) => `
    <div class="result-card ${index === 0 ? 'winner' : ''}">
      <div class="rank">#${index + 1} ${index === 0 ? '👑' : ''}</div>
      <h3>${stats.strategyName}</h3>

      <div style="background: #f8f9fa; padding: 10px; border-radius: 6px; margin: 10px 0;">
        <div style="font-weight: 600; color: #667eea; margin-bottom: 8px;">📊 This Simulation</div>

        <div class="stat-row">
          <span class="stat-label">Win Rate:</span>
          <span class="stat-value">${(stats.winRate * 100).toFixed(1)}%</span>
        </div>

        <div class="stat-row">
          <span class="stat-label">Wins:</span>
          <span class="stat-value">${stats.wins} / ${stats.gamesPlayed}</span>
        </div>

        ${stats.ties > 0 ? `
        <div class="stat-row">
          <span class="stat-label">Ties:</span>
          <span class="stat-value" style="color: #9ca3af">${stats.ties} (${(stats.tieRate * 100).toFixed(1)}%)</span>
        </div>
        ` : ''}

        ${stats.losses > 0 ? `
        <div class="stat-row">
          <span class="stat-label">Losses:</span>
          <span class="stat-value">${stats.losses}</span>
        </div>
        ` : ''}

        <div class="stat-row">
          <span class="stat-label">Avg Turns:</span>
          <span class="stat-value">${stats.averageTurnsPerGame.toFixed(1)}</span>
        </div>

        <div class="stat-row">
          <span class="stat-label">Avg Farkles:</span>
          <span class="stat-value">${stats.averageFarklesPerGame.toFixed(1)}</span>
        </div>

        <div class="stat-row">
          <span class="stat-label">Farkle Rate:</span>
          <span class="stat-value">${(stats.farkleRate * 100).toFixed(1)}%</span>
        </div>

        ${stats.averageFarkleDiceCount ? `
        <div class="stat-row">
          <span class="stat-label">Avg Farkle Dice:</span>
          <span class="stat-value">${stats.averageFarkleDiceCount.toFixed(1)} dice</span>
        </div>
        ` : ''}

        ${stats.luckScore !== undefined ? `
        <div class="stat-row">
          <span class="stat-label">Luck Score:</span>
          <span class="stat-value" style="color: ${stats.luckScore > 0 ? '#10b981' : stats.luckScore < 0 ? '#ef4444' : '#6b7280'}">${stats.luckScore > 0 ? '+' : ''}${stats.luckScore.toFixed(1)}%</span>
        </div>
        ` : ''}

        <div class="stat-row">
          <span class="stat-label">Avg When Scoring:</span>
          <span class="stat-value">${stats.averagePointsWhenScoring.toFixed(0)}</span>
        </div>

        <div class="stat-row">
          <span class="stat-label">Avg Per Turn (w/ Farkles):</span>
          <span class="stat-value">${stats.averagePointsPerTurnIncludingFarkles.toFixed(0)}</span>
        </div>
      </div>

      ${stats.winStats || stats.tieStats || stats.lossStats ? `
        <div style="display: grid; grid-template-columns: ${stats.tieStats ? '1fr 1fr 1fr' : '1fr 1fr'}; gap: 10px; margin: 10px 0;">
          ${stats.winStats ? `
            <div style="background: #d1fae5; padding: 10px; border-radius: 6px;">
              <div style="font-weight: 600; color: #065f46; margin-bottom: 8px;">✅ Wins (${stats.wins - (stats.ties || 0)})</div>
              <div class="stat-row">
                <span class="stat-label">Avg Score:</span>
                <span class="stat-value">${stats.winStats.averageScore.toFixed(0)}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Avg Turns:</span>
                <span class="stat-value">${stats.winStats.averageTurns.toFixed(1)}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Avg Farkles:</span>
                <span class="stat-value">${stats.winStats.averageFarkles.toFixed(1)}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Farkle Rate:</span>
                <span class="stat-value">${(stats.winStats.farkleRate * 100).toFixed(1)}%</span>
              </div>
              ${stats.winStats.averageFarkleDiceCount ? `
              <div class="stat-row">
                <span class="stat-label">Avg Farkle Dice:</span>
                <span class="stat-value">${stats.winStats.averageFarkleDiceCount.toFixed(1)}</span>
              </div>
              ` : ''}
              ${stats.winStats.luckScore !== undefined ? `
              <div class="stat-row">
                <span class="stat-label">Luck Score:</span>
                <span class="stat-value" style="color: ${stats.winStats.luckScore > 0 ? '#065f46' : stats.winStats.luckScore < 0 ? '#991b1b' : '#6b7280'}">${stats.winStats.luckScore > 0 ? '+' : ''}${stats.winStats.luckScore.toFixed(1)}%</span>
              </div>
              ` : ''}
              <div class="stat-row">
                <span class="stat-label">Avg When Scoring:</span>
                <span class="stat-value">${stats.winStats.averagePointsWhenScoring.toFixed(0)}</span>
              </div>
            </div>
          ` : ''}

          ${stats.tieStats ? `
            <div style="background: #f3f4f6; padding: 10px; border-radius: 6px;">
              <div style="font-weight: 600; color: #6b7280; margin-bottom: 8px;">🤝 Ties (${stats.ties})</div>
              <div class="stat-row">
                <span class="stat-label">Avg Score:</span>
                <span class="stat-value">${stats.tieStats.averageScore.toFixed(0)}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Avg Turns:</span>
                <span class="stat-value">${stats.tieStats.averageTurns.toFixed(1)}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Avg Farkles:</span>
                <span class="stat-value">${stats.tieStats.averageFarkles.toFixed(1)}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Farkle Rate:</span>
                <span class="stat-value">${(stats.tieStats.farkleRate * 100).toFixed(1)}%</span>
              </div>
              ${stats.tieStats.averageFarkleDiceCount ? `
              <div class="stat-row">
                <span class="stat-label">Avg Farkle Dice:</span>
                <span class="stat-value">${stats.tieStats.averageFarkleDiceCount.toFixed(1)}</span>
              </div>
              ` : ''}
              ${stats.tieStats.luckScore !== undefined ? `
              <div class="stat-row">
                <span class="stat-label">Luck Score:</span>
                <span class="stat-value" style="color: ${stats.tieStats.luckScore > 0 ? '#065f46' : stats.tieStats.luckScore < 0 ? '#991b1b' : '#6b7280'}">${stats.tieStats.luckScore > 0 ? '+' : ''}${stats.tieStats.luckScore.toFixed(1)}%</span>
              </div>
              ` : ''}
              <div class="stat-row">
                <span class="stat-label">Avg When Scoring:</span>
                <span class="stat-value">${stats.tieStats.averagePointsWhenScoring.toFixed(0)}</span>
              </div>
            </div>
          ` : ''}

          ${stats.lossStats ? `
            <div style="background: #fee2e2; padding: 10px; border-radius: 6px;">
              <div style="font-weight: 600; color: #991b1b; margin-bottom: 8px;">❌ Losses (${stats.losses})</div>
              <div class="stat-row">
                <span class="stat-label">Avg Score:</span>
                <span class="stat-value">${stats.lossStats.averageScore.toFixed(0)}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Avg Turns:</span>
                <span class="stat-value">${stats.lossStats.averageTurns.toFixed(1)}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Avg Farkles:</span>
                <span class="stat-value">${stats.lossStats.averageFarkles.toFixed(1)}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Farkle Rate:</span>
                <span class="stat-value">${(stats.lossStats.farkleRate * 100).toFixed(1)}%</span>
              </div>
              ${stats.lossStats.averageFarkleDiceCount ? `
              <div class="stat-row">
                <span class="stat-label">Avg Farkle Dice:</span>
                <span class="stat-value">${stats.lossStats.averageFarkleDiceCount.toFixed(1)}</span>
              </div>
              ` : ''}
              ${stats.lossStats.luckScore !== undefined ? `
              <div class="stat-row">
                <span class="stat-label">Luck Score:</span>
                <span class="stat-value" style="color: ${stats.lossStats.luckScore > 0 ? '#065f46' : stats.lossStats.luckScore < 0 ? '#991b1b' : '#6b7280'}">${stats.lossStats.luckScore > 0 ? '+' : ''}${stats.lossStats.luckScore.toFixed(1)}%</span>
              </div>
              ` : ''}
              <div class="stat-row">
                <span class="stat-label">Avg When Scoring:</span>
                <span class="stat-value">${stats.lossStats.averagePointsWhenScoring.toFixed(0)}</span>
              </div>
            </div>
          ` : ''}
        </div>
      ` : ''}

      ${stats.cumulativeStats ? `
        <div style="background: #e8f0fe; padding: 10px; border-radius: 6px; margin: 10px 0;">
          <div style="font-weight: 600; color: #1a73e8; margin-bottom: 8px;">📈 All Time (${stats.cumulativeStats.totalGames} games)</div>

          <div class="stat-row">
            <span class="stat-label">Win Rate:</span>
            <span class="stat-value">${(stats.cumulativeStats.winRate * 100).toFixed(1)}%</span>
          </div>

          <div class="stat-row">
            <span class="stat-label">Total Wins:</span>
            <span class="stat-value">${stats.cumulativeStats.totalWins.toLocaleString()}</span>
          </div>

          <div class="stat-row">
            <span class="stat-label">Avg Turns:</span>
            <span class="stat-value">${stats.cumulativeStats.avgTurnsPerGame.toFixed(1)}</span>
          </div>

          <div class="stat-row">
            <span class="stat-label">Avg Farkles:</span>
            <span class="stat-value">${stats.cumulativeStats.avgFarklesPerGame.toFixed(1)}</span>
          </div>

          <div class="stat-row">
            <span class="stat-label">Farkle Rate:</span>
            <span class="stat-value">${(stats.cumulativeStats.farkleRate * 100).toFixed(1)}%</span>
          </div>

          ${stats.cumulativeStats.avgFarkleDiceCount ? `
          <div class="stat-row">
            <span class="stat-label">Avg Farkle Dice:</span>
            <span class="stat-value">${stats.cumulativeStats.avgFarkleDiceCount.toFixed(1)} dice</span>
          </div>
          ` : ''}

          ${stats.cumulativeStats.luckScore !== undefined ? `
          <div class="stat-row">
            <span class="stat-label">Luck Score:</span>
            <span class="stat-value" style="color: ${stats.cumulativeStats.luckScore > 0 ? '#10b981' : stats.cumulativeStats.luckScore < 0 ? '#ef4444' : '#6b7280'}">${stats.cumulativeStats.luckScore > 0 ? '+' : ''}${stats.cumulativeStats.luckScore.toFixed(1)}%</span>
          </div>
          ` : ''}

          <div class="stat-row">
            <span class="stat-label">Avg When Scoring:</span>
            <span class="stat-value">${stats.cumulativeStats.avgPointsWhenScoring ? stats.cumulativeStats.avgPointsWhenScoring.toFixed(0) : 'N/A'}</span>
          </div>

          <div class="stat-row">
            <span class="stat-label">Avg Per Turn (w/ Farkles):</span>
            <span class="stat-value">${stats.cumulativeStats.avgPointsPerTurnIncludingFarkles ? stats.cumulativeStats.avgPointsPerTurnIncludingFarkles.toFixed(0) : 'N/A'}</span>
          </div>

          <div style="font-size: 0.85em; color: #666; margin-top: 8px; font-style: italic;">
            Tracked since ${new Date(stats.cumulativeStats.firstSeen).toLocaleDateString()}
          </div>
        </div>
      ` : ''}
    </div>
  `).join('');

  // Scroll to results
  document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
}

// Show strategy details modal
function showStrategyDetails(id) {
  const strategy = availableStrategies.find(s => s.id === id);
  if (!strategy || !strategy.details) return;

  const details = strategy.details;
  const modal = document.getElementById('strategyModal');
  const content = document.getElementById('modalContent');

  let html = `
    <h2>${strategy.name}</h2>
    <p style="color: #666; margin-bottom: 20px;">${strategy.description}</p>
  `;

  // Dice Selector
  html += `
    <div class="modal-section">
      <h3>🎲 Dice Selection</h3>
      <div class="component-item">
        <div class="component-name">${details.diceSelector.name}</div>
        <div class="component-desc">${details.diceSelector.description}</div>
      </div>
    </div>
  `;

  // Continue Decision Logic
  html += `
    <div class="modal-section">
      <h3>🤔 Continue Decision Logic</h3>
      <div style="margin-bottom: 10px;">
        <span class="badge">Mode: ${details.combinationMode.toUpperCase()}</span>
        ${details.combinationMode === 'all' ? '<span style="color: #666; font-size: 0.9em; margin-left: 8px;">All conditions must be met</span>' : ''}
        ${details.combinationMode === 'any' ? '<span style="color: #666; font-size: 0.9em; margin-left: 8px;">Any condition can trigger continue</span>' : ''}
      </div>
  `;

  // Threshold Calculator
  if (details.thresholdCalculator) {
    html += `
      <div class="component-item">
        <div class="component-name">📊 ${details.thresholdCalculator.name}</div>
        <div class="component-desc">${details.thresholdCalculator.description}</div>
      </div>
    `;
  }

  // Modifiers
  if (details.modifiers && details.modifiers.length > 0) {
    details.modifiers.forEach(modifier => {
      html += `
        <div class="component-item">
          <div class="component-name">⚙️ ${modifier.name}</div>
          <div class="component-desc">${modifier.description}</div>
        </div>
      `;
    });
  }

  // Evaluators
  if (details.evaluators && details.evaluators.length > 0) {
    details.evaluators.forEach(evaluator => {
      html += `
        <div class="component-item">
          <div class="component-name">✓ ${evaluator.name}</div>
          <div class="component-desc">${evaluator.description}</div>
        </div>
      `;
    });
  }

  html += `</div>`;

  // How it works summary
  html += `
    <div class="modal-section" style="background: #e8f0fe;">
      <h3>💡 How It Works</h3>
      <p style="color: #666; line-height: 1.6;">
        ${generateStrategyExplanation(strategy.id, details)}
      </p>
    </div>
  `;

  content.innerHTML = html;
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

// Generate plain English explanation of strategy
function generateStrategyExplanation(id, details) {
  const explanations = {
    'adaptive-composed': 'This strategy adjusts its risk tolerance based on your position in the game. When behind, it becomes more aggressive (higher thresholds). When ahead, it plays more conservatively.',
    'risk-aware-composed': 'Starts with a moderate 1500-point threshold but reduces it when farkle risk is high. Automatically stops when risk reaches 40%, preventing risky situations.',
    'selective-minimum': 'Smart dice management: keeps only the best scoring combo when you have many dice (preserving reroll options), but switches to keeping all scoring dice when few remain.',
    'dynamic-multi-factor': 'The most sophisticated strategy. Combines opponent tracking, dice count, farkle risk, and hot streak detection. All safety checks must pass before continuing.',
    'endgame-aggressive': 'Becomes increasingly aggressive as you approach the target score (1000 → 3000 point threshold). Uses "any" mode so it will continue if either the threshold OR expected value check passes.',
    'conservative-composed': 'Very safe approach with a low 800-point threshold that gets reduced even further by dice count and risk adjustments. Has three safety checks that all must pass.',
    'safe-500': 'Aims for 500 points per turn but includes a critical safety feature: automatically stops rolling if you\'re down to 2 or fewer dice, even if you haven\'t reached 500 yet. This prevents high-risk situations where a farkle would lose all your points.'
  };

  return explanations[id] || 'This strategy uses a combination of composable functions to make decisions.';
}

// View all accumulated statistics
function viewAllStats() {
  const allStats = loadStrategyStats();
  const statsArray = Object.values(allStats).map(calculateDerivedStats);

  if (statsArray.length === 0) {
    alert('No statistics recorded yet. Run some simulations first!');
    return;
  }

  // Sort by total games (most played first)
  statsArray.sort((a, b) => b.totalGames - a.totalGames);

  const modal = document.getElementById('allStatsModal');
  const content = document.getElementById('allStatsContent');

  let html = `
    <h2 style="color: #667eea; margin-bottom: 10px;">📊 All Time Statistics</h2>
    <p style="color: #666; margin-bottom: 20px;">
      Cumulative performance across all simulations. Total strategies tracked: ${statsArray.length}
    </p>

    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
      <div style="display: flex; gap: 30px; flex-wrap: wrap;">
        <div>
          <div style="font-size: 0.85em; color: #666;">Total Games Simulated</div>
          <div style="font-size: 1.5em; font-weight: 600; color: #667eea;">
            ${statsArray.reduce((sum, s) => sum + s.totalGames, 0).toLocaleString()}
          </div>
        </div>
        <div>
          <div style="font-size: 0.85em; color: #666;">Total Turns Played</div>
          <div style="font-size: 1.5em; font-weight: 600; color: #667eea;">
            ${statsArray.reduce((sum, s) => sum + s.totalTurns, 0).toLocaleString()}
          </div>
        </div>
        <div>
          <div style="font-size: 0.85em; color: #666;">Total Simulations Run</div>
          <div style="font-size: 1.5em; font-weight: 600; color: #667eea;">
            ${statsArray.reduce((sum, s) => sum + s.gamesCount, 0).toLocaleString()}
          </div>
        </div>
      </div>
    </div>

    <div style="max-height: 60vh; overflow-y: auto;">
  `;

  statsArray.forEach((stats, index) => {
    html += `
      <div style="background: white; border: 2px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 15px;">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
          <div>
            <div style="font-size: 1.2em; font-weight: 600; color: #333;">${stats.name}</div>
            ${stats.description ? `<div style="font-size: 0.9em; color: #666; margin-top: 4px;">${stats.description}</div>` : ''}
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.85em; color: #666;">Rank</div>
            <div style="font-size: 1.3em; font-weight: 600; color: #667eea;">#${index + 1}</div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px;">
          <div>
            <div style="font-size: 0.85em; color: #666; margin-bottom: 4px;">Win Rate</div>
            <div style="font-size: 1.3em; font-weight: 600; color: ${stats.winRate >= 0.5 ? '#28a745' : '#333'};">
              ${(stats.winRate * 100).toFixed(1)}%
            </div>
          </div>

          <div>
            <div style="font-size: 0.85em; color: #666; margin-bottom: 4px;">Total Games</div>
            <div style="font-size: 1.3em; font-weight: 600;">${stats.totalGames.toLocaleString()}</div>
          </div>

          <div>
            <div style="font-size: 0.85em; color: #666; margin-bottom: 4px;">Total Wins</div>
            <div style="font-size: 1.3em; font-weight: 600; color: #28a745;">${stats.totalWins.toLocaleString()}</div>
          </div>

          <div>
            <div style="font-size: 0.85em; color: #666; margin-bottom: 4px;">Avg Turns/Game</div>
            <div style="font-size: 1.3em; font-weight: 600;">${stats.avgTurnsPerGame.toFixed(1)}</div>
          </div>

          <div>
            <div style="font-size: 0.85em; color: #666; margin-bottom: 4px;">Avg Farkles/Game</div>
            <div style="font-size: 1.3em; font-weight: 600;">${stats.avgFarklesPerGame.toFixed(1)}</div>
          </div>

          <div>
            <div style="font-size: 0.85em; color: #666; margin-bottom: 4px;">Farkle Rate</div>
            <div style="font-size: 1.3em; font-weight: 600;">${(stats.farkleRate * 100).toFixed(1)}%</div>
          </div>
        </div>

        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e0e0e0; font-size: 0.85em; color: #666;">
          <div style="display: flex; justify-content: space-between;">
            <span>First seen: ${new Date(stats.firstSeen).toLocaleDateString()}</span>
            <span>Last seen: ${new Date(stats.lastSeen).toLocaleDateString()}</span>
            <span>Simulations: ${stats.gamesCount}</span>
          </div>
        </div>
      </div>
    `;
  });

  html += `</div>`;

  content.innerHTML = html;
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

// Clear all accumulated statistics
function clearAllStats() {
  const allStats = loadStrategyStats();
  const count = Object.keys(allStats).length;

  if (count === 0) {
    alert('No statistics to clear.');
    return;
  }

  if (confirm(`Are you sure you want to clear all accumulated statistics?\n\nThis will delete data for ${count} strategies and cannot be undone.`)) {
    localStorage.removeItem(STATS_STORAGE_KEY);
    alert('All statistics have been cleared!');

    // Close the modal if it's open
    const modal = document.getElementById('allStatsModal');
    if (!modal.classList.contains('hidden')) {
      closeAllStatsModal();
    }
  }
}

// Close all stats modal
function closeAllStatsModal(event) {
  if (!event || event.target.classList.contains('modal-overlay') || event.target.classList.contains('modal-close')) {
    document.getElementById('allStatsModal').classList.add('hidden');
    document.body.style.overflow = '';
  }
}

// Close modal
function closeModal(event) {
  if (!event || event.target.classList.contains('modal-overlay') || event.target.classList.contains('modal-close')) {
    document.getElementById('strategyModal').classList.add('hidden');
    document.body.style.overflow = '';
  }
}

// ===== Step-Through Game Functions =====

/**
 * Start a new step-through game
 */
async function startStepGame() {
  const targetScore = parseInt(document.getElementById('targetScore').value);
  const minScore = parseInt(document.getElementById('minScore').value);
  const scoringRules = getScoringRules();

  // Separate built-in strategy IDs from custom strategies
  const builtInIds = selectedStrategyIds.filter(id => !id.startsWith('custom-'));
  const customStrategyData = selectedStrategyIds
    .filter(id => id.startsWith('custom-'))
    .map(id => customStrategies.find(s => s.id === id))
    .filter(s => s !== undefined);

  try {
    const response = await fetch('/api/game/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        strategyIds: builtInIds,
        strategies: customStrategyData,
        targetScore,
        minimumScoreToBoard: minScore,
        scoringRules: scoringRules
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to start game');
    }

    currentGameId = data.gameId;
    currentStepNumber = 0;

    // Initialize history with first step
    gameStepHistory = [data.currentStep];
    currentHistoryIndex = 0;

    // Show step game section
    document.getElementById('stepGameSection').classList.remove('hidden');

    // Display initial step
    displayStep(data.currentStep);
    updateStepControls();

    // Scroll to game
    document.getElementById('stepGameSection').scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    console.error('Failed to start step game:', error);
    alert('Failed to start game: ' + error.message);
  }
}

/**
 * Advance to next step
 */
async function nextStep() {
  if (!currentGameId) return;

  // If we're not at the end of history, just navigate forward
  if (currentHistoryIndex < gameStepHistory.length - 1) {
    currentHistoryIndex++;
    displayStep(gameStepHistory[currentHistoryIndex]);
    updateStepControls();
    return;
  }

  // Otherwise, fetch the next step from the server
  const nextBtn = document.getElementById('nextStepBtn');
  nextBtn.disabled = true;

  try {
    const response = await fetch('/api/game/step', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId: currentGameId })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to advance step');
    }

    currentStepNumber = data.stepNumber;

    // Add to history
    gameStepHistory.push(data.step);
    currentHistoryIndex = gameStepHistory.length - 1;

    displayStep(data.step);
    updateStepControls();

    // If game is over, update button text
    if (data.isGameOver) {
      nextBtn.textContent = '🏆 Game Complete';
    }
  } catch (error) {
    console.error('Failed to advance step:', error);
    alert('Failed to advance step: ' + error.message);
    nextBtn.disabled = false;
  }
}

/**
 * Go back to previous step
 */
function previousStep() {
  if (currentHistoryIndex > 0) {
    currentHistoryIndex--;
    displayStep(gameStepHistory[currentHistoryIndex]);
    updateStepControls();
  }
}

/**
 * Update step control buttons and counter
 */
function updateStepControls() {
  const prevBtn = document.getElementById('prevStepBtn');
  const nextBtn = document.getElementById('nextStepBtn');
  const counter = document.getElementById('stepCounter');
  const description = document.getElementById('stepDescription');

  // Update counter
  counter.textContent = `Step ${currentHistoryIndex + 1} of ${gameStepHistory.length}`;

  // Update description
  const currentStep = gameStepHistory[currentHistoryIndex];
  const typeDescriptions = {
    'game_start': 'Game Start',
    'round_start': `Round ${currentStep.roundNumber} Start`,
    'roll': `Roll ${currentStep.rollNumber}`,
    'decisions': 'Strategy Decisions',
    'round_complete': 'Round Complete',
    'game_end': 'Game Over'
  };
  description.textContent = typeDescriptions[currentStep.type] || currentStep.type;

  // Enable/disable previous button
  prevBtn.disabled = currentHistoryIndex === 0;

  // Enable/disable next button
  const isGameOver = currentStep.type === 'game_end';
  nextBtn.disabled = isGameOver;

  if (isGameOver) {
    nextBtn.textContent = '🏆 Game Complete';
  } else if (currentHistoryIndex < gameStepHistory.length - 1) {
    nextBtn.textContent = 'Next ▶️';
  } else {
    nextBtn.textContent = 'Next ▶️';
  }
}

/**
 * Display a game step
 */
function displayStep(step) {
  // Handle interactive game steps (human decision or game end)
  if (currentInteractiveGameId) {
    const scoresDiv = document.getElementById('playerScoresDisplay');
    if (scoresDiv) scoresDiv.innerHTML = generatePlayerScoresHTML(step.gameState);
    const messageDiv = document.getElementById('gameMessage');
    if (messageDiv) messageDiv.textContent = step.message || '';

    if (step.type === 'awaiting_human_decision') {
      displayHumanDecisionUI(step);
    } else if (step.type === 'game_end') {
      const decisionDiv = document.getElementById('decisionBox');
      if (decisionDiv) {
        decisionDiv.classList.remove('hidden');
        decisionDiv.innerHTML = `
          <h4 style="color: #667eea; margin-top: 0;">🏆 Game Over!</h4>
          <p style="font-size: 1.1em; color: #333;">${step.message}</p>
        `;
      }
    }
    return;
  }

  // Step-through game display below

  // Check if this is an interactive game with human decision needed
  if (step.type === 'awaiting_human_decision') {
    displayHumanDecisionUI(step);
    return;
  }

  // Update player scores
  displayPlayerScores(step.gameState);

  // Update message
  document.getElementById('messageBox').textContent = step.message || '';

  // Handle different step types
  switch (step.type) {
    case 'game_start':
      document.getElementById('turnInfo').classList.add('hidden');
      document.getElementById('diceContainer').classList.add('hidden');
      document.getElementById('stepDecisionBox').innerHTML = '';
      document.getElementById('stepDecisionBox').classList.add('hidden');
      break;

    case 'round_start':
      document.getElementById('turnInfo').classList.remove('hidden');
      displayRoundInfo(step);
      document.getElementById('diceContainer').classList.add('hidden');
      document.getElementById('stepDecisionBox').innerHTML = '';
      document.getElementById('stepDecisionBox').classList.add('hidden');
      break;

    case 'roll':
      document.getElementById('turnInfo').classList.remove('hidden');
      displayRoundInfo(step);
      document.getElementById('diceContainer').classList.remove('hidden');
      displayDice(step.diceRolled, []);
      displayScoringCombinations(step.scoringCombinations);
      break;

    case 'decisions':
      document.getElementById('turnInfo').classList.remove('hidden');
      displayRoundInfo(step);
      document.getElementById('diceContainer').classList.remove('hidden');
      displayDice(step.diceRolled, []);
      displayAllDecisions(step.playerDecisions);
      break;

    case 'round_complete':
      document.getElementById('turnInfo').classList.add('hidden');
      document.getElementById('diceContainer').classList.add('hidden');
      displayRoundResults(step.roundResults);
      break;

    case 'game_end':
      document.getElementById('turnInfo').classList.add('hidden');
      document.getElementById('diceContainer').classList.add('hidden');
      displayRoundResults(step.roundResults);
      break;
  }
}

/**
 * Display player scores
 */
function displayPlayerScores(gameState) {
  const container = document.getElementById('playerScores');

  container.innerHTML = gameState.players.map(player => `
    <div class="player-score-card">
      <h4>${player.name}</h4>
      <div style="font-size: 1.5em; font-weight: 600; color: #667eea;">
        ${player.totalScore.toLocaleString()}
      </div>
      <div style="font-size: 0.85em; color: #666; margin-top: 5px;">
        ${player.stats.totalTurns} turns, ${player.stats.farkles} farkles
      </div>
    </div>
  `).join('');
}

/**
 * Display round information
 */
function displayRoundInfo(step) {
  const details = document.getElementById('turnDetails');
  details.innerHTML = `
    <div style="display: flex; gap: 30px; flex-wrap: wrap;">
      <div>
        <div style="font-size: 0.85em; color: #666;">Round</div>
        <div style="font-size: 1.5em; font-weight: 600;">${step.roundNumber || 0}</div>
      </div>
      <div>
        <div style="font-size: 0.85em; color: #666;">Roll Number</div>
        <div style="font-size: 1.5em; font-weight: 600;">${step.rollNumber || 0}</div>
      </div>
    </div>
  `;
}

/**
 * Display dice
 */
function displayDice(diceValues, selectedIndices = [], isFarkle = false) {
  const container = document.getElementById('diceContainer');

  if (!diceValues || diceValues.length === 0) {
    container.innerHTML = '';
    return;
  }

  const diceFaces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

  container.innerHTML = diceValues.map((value, index) => {
    const isSelected = selectedIndices.includes(index);
    const classes = ['die'];
    if (isSelected) classes.push('selected');
    if (isFarkle) classes.push('farkle');

    return `<div class="${classes.join(' ')}">${diceFaces[value - 1]}</div>`;
  }).join('');
}

/**
 * Display scoring combinations found
 */
function displayScoringCombinations(combinations) {
  if (!combinations || combinations.length === 0) return;

  const decisionBox = document.getElementById('stepDecisionBox');
  decisionBox.classList.remove('hidden');
  decisionBox.className = 'decision-box';

  decisionBox.innerHTML = `
    <h5>Scoring Combinations Available</h5>
    ${combinations.map(combo => `
      <div style="background: white; padding: 8px; margin: 5px 0; border-radius: 4px;">
        <strong>${combo.type}:</strong> ${combo.points} points
      </div>
    `).join('')}
  `;
}

/**
 * Display selected combinations
 */
function displaySelectedCombinations(combinations) {
  if (!combinations || combinations.length === 0) return;

  const decisionBox = document.getElementById('stepDecisionBox');
  decisionBox.classList.remove('hidden');
  decisionBox.className = 'decision-box';

  const totalPoints = combinations.reduce((sum, c) => sum + c.points, 0);

  decisionBox.innerHTML = `
    <h5>✓ Strategy Selected</h5>
    ${combinations.map(combo => `
      <div style="background: white; padding: 8px; margin: 5px 0; border-radius: 4px;">
        <strong>${combo.type}:</strong> ${combo.points} points
      </div>
    `).join('')}
    <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd; font-weight: 600;">
      Total: ${totalPoints} points
    </div>
  `;
}

/**
 * Display all player decisions simultaneously
 */
function displayAllDecisions(playerDecisions) {
  const decisionBox = document.getElementById('stepDecisionBox');
  decisionBox.classList.remove('hidden');
  decisionBox.className = 'decision-box';

  let html = '<h5>All Strategies Respond</h5>';

  playerDecisions.forEach(pd => {
    const statusColor = pd.wasFarkle ? '#ff6b6b' : (pd.isActive ? '#28a745' : '#ffa500');
    const statusIcon = pd.wasFarkle ? '💥' : (pd.isActive ? '▶️' : '⏸');
    const statusText = pd.wasFarkle ? 'FARKLE' : (pd.decision.continue ? 'CONTINUING' : 'STOPPED');

    html += `
      <div style="background: white; padding: 12px; margin: 10px 0; border-radius: 6px; border-left: 4px solid ${statusColor};">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <strong style="color: #333;">${pd.strategyName}</strong>
          <span style="color: ${statusColor}; font-weight: 600;">${statusIcon} ${statusText}</span>
        </div>

        ${!pd.wasFarkle ? `
          <div style="font-size: 0.9em; color: #666; margin: 4px 0;">
            Selected ${pd.selectedCombinations.length} combination(s) for ${pd.selectedCombinations.reduce((sum, c) => sum + c.points, 0)} points
          </div>
          <div style="font-size: 0.9em; color: #666; margin: 4px 0;">
            Turn total: <strong>${pd.turnPoints}</strong> points | Dice remaining: <strong>${pd.diceRemaining}</strong>
          </div>
          <div style="font-size: 0.85em; color: #888; margin-top: 6px; font-style: italic;">
            ${pd.decision.reason}
          </div>
        ` : `
          <div style="font-size: 0.9em; color: #ff6b6b;">
            No scoring combinations - loses all turn points!
          </div>
        `}
      </div>
    `;
  });

  decisionBox.innerHTML = html;
}

/**
 * Display round results
 */
function displayRoundResults(roundResults) {
  const decisionBox = document.getElementById('stepDecisionBox');
  decisionBox.classList.remove('hidden');
  decisionBox.className = 'decision-box';

  let html = '<h5>📊 Round Results</h5>';

  // Sort by points banked (highest first)
  const sorted = [...roundResults].sort((a, b) => b.pointsBanked - a.pointsBanked);

  sorted.forEach((result, index) => {
    const rankIcon = index === 0 && result.pointsBanked > 0 ? '🏆' : '';
    const color = result.wasFarkle ? '#ff6b6b' : (result.pointsBanked > 0 ? '#28a745' : '#ffa500');

    let statusText = '';
    if (result.wasFarkle) {
      statusText = '💥 Farkled - gained 0 points';
    } else if (result.pointsBanked > 0) {
      statusText = `Banked <strong style="color: ${color};">${result.pointsBanked}</strong> points`;
    } else {
      statusText = '⚠️ Not on board yet - needs minimum score to start scoring (gained 0 this round)';
    }

    html += `
      <div style="background: white; padding: 12px; margin: 10px 0; border-radius: 6px; border-left: 4px solid ${color};">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="color: #333;">${rankIcon} ${result.playerName}</strong>
            <div style="font-size: 0.9em; color: #666; margin-top: 4px;">
              ${statusText}
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.85em; color: #666;">New Score</div>
            <div style="font-size: 1.3em; font-weight: 600; color: #667eea;">${result.newScore.toLocaleString()}</div>
          </div>
        </div>
      </div>
    `;
  });

  decisionBox.innerHTML = html;
}

/**
 * Update interactive game navigation controls
 */
function updateInteractiveControls() {
  const prevBtn = document.getElementById('prevStepBtn2');
  const counter = document.getElementById('stepCounter2');
  const nextBtn = document.getElementById('nextStepBtn2');

  if (prevBtn) prevBtn.disabled = currentHistoryIndex === 0;
  if (counter) counter.textContent = `Step ${currentHistoryIndex + 1} of ${gameStepHistory.length}`;
  // Next button stays disabled - game auto-advances through AI turns
  if (nextBtn) nextBtn.disabled = true;
}

/**
 * Close step-through game
 */
function closeStepGame() {
  currentGameId = null;
  currentStepNumber = 0;
  gameStepHistory = [];
  currentHistoryIndex = 0;
  document.getElementById('stepGameSection').classList.add('hidden');
  document.getElementById('nextStepBtn').textContent = 'Next ▶️';
  document.getElementById('nextStepBtn').disabled = false;
  document.getElementById('prevStepBtn').disabled = true;
}

// ===== Helper Functions =====

/**
 * Generate HTML for player scores display
 */
function generatePlayerScoresHTML(gameState) {
  return `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
      ${gameState.players.map(player => `
        <div style="background: ${player.id === gameState.players[gameState.currentPlayerIndex]?.id ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f8f9fa'};
                    color: ${player.id === gameState.players[gameState.currentPlayerIndex]?.id ? 'white' : '#333'};
                    padding: 15px; border-radius: 8px; text-align: center;">
          <div style="font-weight: bold; margin-bottom: 8px;">${player.name}</div>
          <div style="font-size: 2em; font-weight: bold;">${player.totalScore}</div>
          <div style="font-size: 0.85em; opacity: 0.8; margin-top: 5px;">
            ${player.isOnBoard ? '✓ On Board' : 'Not on board'}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ===== Human Decision Tracking (localStorage) =====

const HUMAN_DECISIONS_KEY = 'hot-dice-human-decisions';

/**
 * Save a human decision to localStorage
 */
function saveHumanDecision(decisionRecord) {
  const allDecisions = loadHumanDecisions();

  const record = {
    id: `decision-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: decisionRecord.timestamp,
    gameId: currentInteractiveGameId,

    // Context
    diceRolled: decisionRecord.context.diceRolled,
    diceRemaining: decisionRecord.context.diceRemaining,
    turnPoints: decisionRecord.context.turnPoints,
    playerScore: decisionRecord.context.playerScore,
    opponentScores: decisionRecord.context.opponentScores,
    farkleRisk: decisionRecord.context.farkleRisk,
    availableCombinations: decisionRecord.context.scoringCombinations,

    // Decision
    continue: decisionRecord.decision.continue,
    reason: decisionRecord.decision.reason
  };

  allDecisions.push(record);
  localStorage.setItem(HUMAN_DECISIONS_KEY, JSON.stringify(allDecisions));

  return record.id;
}

/**
 * Load all human decisions from localStorage
 */
function loadHumanDecisions() {
  try {
    const stored = localStorage.getItem(HUMAN_DECISIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Failed to load human decisions:', e);
    return [];
  }
}

/**
 * Analyze human play style from decision history
 */
function analyzeHumanPlayStyle() {
  const decisions = loadHumanDecisions();

  if (decisions.length === 0) {
    return null;
  }

  const continueDecisions = decisions.filter(d => d.continue);
  const stopDecisions = decisions.filter(d => !d.continue);

  return {
    totalDecisions: decisions.length,
    continueCount: continueDecisions.length,
    stopCount: stopDecisions.length,
    continueRate: continueDecisions.length / decisions.length,

    // Risk tolerance
    avgRiskWhenContinuing: continueDecisions.length > 0
      ? continueDecisions.reduce((sum, d) => sum + d.farkleRisk, 0) / continueDecisions.length
      : 0,
    avgRiskWhenStopping: stopDecisions.length > 0
      ? stopDecisions.reduce((sum, d) => sum + d.farkleRisk, 0) / stopDecisions.length
      : 0,

    // Banking behavior
    avgPointsWhenStopping: stopDecisions.length > 0
      ? stopDecisions.reduce((sum, d) => sum + d.turnPoints, 0) / stopDecisions.length
      : 0,

    // Dice count patterns
    avgDiceWhenContinuing: continueDecisions.length > 0
      ? continueDecisions.reduce((sum, d) => sum + d.diceRemaining, 0) / continueDecisions.length
      : 0
  };
}

/**
 * View human decision history and play style analysis
 */
function viewHumanDecisionHistory() {
  const decisions = loadHumanDecisions();

  if (decisions.length === 0) {
    alert('No decision history yet. Play some interactive games first!');
    return;
  }

  const analysis = analyzeHumanPlayStyle();

  const modalContent = document.getElementById('allStatsContent');
  modalContent.innerHTML = `
    <h2 style="margin-bottom: 20px; color: #667eea;">📊 Your Play Style Analysis</h2>

    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <h3 style="margin-top: 0; color: white;">Overall Statistics</h3>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
        <div>
          <div style="font-size: 0.9em; opacity: 0.9;">Total Decisions</div>
          <div style="font-size: 2em; font-weight: bold;">${analysis.totalDecisions}</div>
        </div>
        <div>
          <div style="font-size: 0.9em; opacity: 0.9;">Continue Rate</div>
          <div style="font-size: 2em; font-weight: bold;">${(analysis.continueRate * 100).toFixed(0)}%</div>
        </div>
        <div>
          <div style="font-size: 0.9em; opacity: 0.9;">Risk Tolerance</div>
          <div style="font-size: 1.5em; font-weight: bold;">${(analysis.avgRiskWhenContinuing * 100).toFixed(0)}%</div>
        </div>
        <div>
          <div style="font-size: 0.9em; opacity: 0.9;">Avg Bank Amount</div>
          <div style="font-size: 1.5em; font-weight: bold;">${Math.round(analysis.avgPointsWhenStopping)}</div>
        </div>
      </div>
    </div>

    <h3 style="color: #667eea;">Recent Decisions (Last 20)</h3>
    <div style="max-height: 400px; overflow-y: auto;">
      ${decisions.slice(-20).reverse().map(d => `
        <div style="background: white; padding: 15px; border-radius: 6px; margin-bottom: 10px; border-left: 4px solid ${d.continue ? '#667eea' : '#28a745'};">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <strong style="color: ${d.continue ? '#667eea' : '#28a745'};">
              ${d.continue ? '🎲 Continued Rolling' : '⏸ Stopped & Banked'}
            </strong>
            <span style="color: #999; font-size: 0.85em;">${new Date(d.timestamp).toLocaleString()}</span>
          </div>
          <div style="font-size: 0.9em; color: #666; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
            <div><strong>Turn:</strong> ${d.turnPoints} pts</div>
            <div><strong>Dice:</strong> ${d.diceRemaining}</div>
            <div><strong>Risk:</strong> ${(d.farkleRisk * 100).toFixed(0)}%</div>
          </div>
        </div>
      `).join('')}
    </div>

    <div style="display: flex; gap: 10px; margin-top: 20px;">
      <button onclick="exportHumanDecisions()" style="flex: 1; padding: 12px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
        📥 Export Data (JSON)
      </button>
      <button onclick="clearHumanDecisions()" style="flex: 1; padding: 12px; background: #dc3545; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
        🗑️ Clear History
      </button>
    </div>
  `;

  document.getElementById('allStatsModal').classList.remove('hidden');
}

/**
 * Export human decisions as JSON file
 */
function exportHumanDecisions() {
  const decisions = loadHumanDecisions();
  const dataStr = JSON.stringify(decisions, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `hot-dice-decisions-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Clear all human decision history
 */
function clearHumanDecisions() {
  if (confirm('Are you sure you want to clear all decision history? This cannot be undone.')) {
    localStorage.removeItem(HUMAN_DECISIONS_KEY);
    alert('Decision history cleared!');
    closeAllStatsModal();
  }
}

// ===== Interactive Game Functions =====

/**
 * Start an interactive game with human player
 */
async function startInteractiveGame() {
  const strategyIds = selectedStrategyIds.filter(id => !id.startsWith('custom-'));
  const targetScore = parseInt(document.getElementById('targetScore').value);
  const minScore = parseInt(document.getElementById('minScore').value);

  try {
    const response = await fetch('/api/game/interactive/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        strategyIds,
        humanPlayerIndices: [0],  // Human is first player
        targetScore,
        minimumScoreToBoard: minScore
      })
    });

    if (!response.ok) {
      const error = await response.json();
      alert('Failed to start game: ' + error.error);
      return;
    }

    const data = await response.json();
    currentInteractiveGameId = data.gameId;
    gameStepHistory = [data.currentStep];
    currentHistoryIndex = 0;

    // Show game UI
    document.getElementById('interactiveGameSection').classList.remove('hidden');
    displayStep(data.currentStep);
    updateInteractiveControls();
  } catch (error) {
    console.error('Failed to start interactive game:', error);
    alert('Failed to start game: ' + error.message);
  }
}

/**
 * Display human decision UI for dice selection or continue decision
 */
function displayHumanDecisionUI(step) {
  if (step.type !== 'awaiting_human_decision' || !step.humanDecisions || step.humanDecisions.length === 0) {
    return;
  }

  const humanDecision = step.humanDecisions[0];
  humanDecisionState = humanDecision;
  selectedDiceIndices = [];

  const decisionBox = document.getElementById('decisionBox');
  decisionBox.classList.remove('hidden');

  if (humanDecision.type === 'dice') {
    const diceFaces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    const diceRolled = humanDecision.context.diceRolled;
    const combos = humanDecision.context.scoringCombinations;

    // Determine which dice indices can score
    const scoringDiceSet = new Set(combos.flatMap(c => c.diceIndices));

    const diceButtonsHTML = diceRolled.map((die, i) => {
      const canScore = scoringDiceSet.has(i);
      return `<button class="die-btn${canScore ? '' : ' non-scoring'}"
                      data-index="${i}"
                      ${canScore ? `onclick="toggleDie(${i})"` : 'disabled'}
                      title="${canScore ? 'Click to select' : 'This die cannot score'}">${diceFaces[die - 1]}</button>`;
    }).join('');

    decisionBox.innerHTML = `
      <h4 style="margin-top: 0; color: #667eea;">🎲 Your Turn — Pick Dice to Keep</h4>

      <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin: 20px 0;" id="diceContainer">
        ${diceButtonsHTML}
      </div>

      <div id="scoringDisplay" style="min-height: 56px; background: white; border-radius: 8px; padding: 12px 16px; margin-bottom: 15px; text-align: center; border: 2px solid #e0e0e0;">
        <span style="color: #999; font-size: 0.95em;">Select scoring dice above</span>
      </div>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; text-align: center; background: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 15px;">
        <div>
          <div style="font-size: 0.8em; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Turn Total</div>
          <div style="font-size: 1.3em; font-weight: bold; color: #667eea;">${humanDecision.context.turnPoints}</div>
        </div>
        <div>
          <div style="font-size: 0.8em; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">This Pick</div>
          <div style="font-size: 1.3em; font-weight: bold; color: #28a745;" id="selectedPoints">—</div>
        </div>
        <div>
          <div style="font-size: 0.8em; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Dice Left</div>
          <div style="font-size: 1.3em; font-weight: bold; color: #333;" id="diceLeftDisplay">${diceRolled.length}</div>
        </div>
      </div>

      <button onclick="confirmDiceSelection()" id="confirmDiceBtn" disabled
              style="width: 100%; padding: 15px; font-size: 1.1em; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; opacity: 0.5;">
        ✓ Confirm Selection
      </button>
    `;
  } else {
    displayContinueDecisionUI(humanDecision.context);
  }
}

/**
 * Toggle selection of an individual die by its index in the roll
 */
function toggleDie(index) {
  const btn = document.querySelector(`.die-btn[data-index="${index}"]`);

  if (selectedDiceIndices.includes(index)) {
    selectedDiceIndices = selectedDiceIndices.filter(i => i !== index);
    btn.classList.remove('selected');
  } else {
    selectedDiceIndices.push(index);
    btn.classList.add('selected');
  }

  updateDieSelectionDisplay();
}

/**
 * Given selected die indices, compute the best scoring combinations.
 * Greedily applies n-of-a-kind first, then singles.
 * Falls back to manual THREE_OF_KIND for 1s/5s when only smaller n-of-a-kind
 * options are present in the server list (e.g., 3 selected from FOUR_OF_KIND).
 */
function computeScoreForSelectedDice(selectedIndices, scoringCombinations, diceRolled) {
  const byValue = {};
  for (const i of selectedIndices) {
    const v = diceRolled[i];
    if (!byValue[v]) byValue[v] = [];
    byValue[v].push(i);
  }

  const resultCombos = [];

  for (const [vStr, indices] of Object.entries(byValue)) {
    const v = parseInt(vStr);
    let remaining = [...indices];

    // Find n-of-a-kind combos from the server's expanded list, largest first
    const nCombos = scoringCombinations
      .filter(c => ['THREE_OF_KIND', 'FOUR_OF_KIND', 'FIVE_OF_KIND', 'SIX_OF_KIND'].includes(c.type) && c.dice[0] === v)
      .sort((a, b) => b.diceIndices.length - a.diceIndices.length);

    for (const nc of nCombos) {
      if (remaining.length >= nc.diceIndices.length) {
        resultCombos.push({ ...nc, diceIndices: remaining.slice(0, nc.diceIndices.length) });
        remaining = remaining.slice(nc.diceIndices.length);
        break;
      }
    }

    // Fallback for 1s/5s: if 3+ dice remain with no matching n-of-a-kind from server list
    // (e.g., user selected exactly 3 ones from a roll of 4 ones — FOUR_OF_KIND exists but requires 4)
    if (remaining.length >= 3 && (v === 1 || v === 5)) {
      const baseScore = v === 1 ? 1000 : v * 100;
      resultCombos.push({
        type: 'THREE_OF_KIND',
        dice: Array(3).fill(v),
        points: baseScore,
        diceIndices: remaining.slice(0, 3)
      });
      remaining = remaining.slice(3);
    }

    // Remaining single-die scoring (1s and 5s only)
    for (const i of remaining) {
      const single = scoringCombinations.find(c =>
        (c.type === 'SINGLE_ONE' || c.type === 'SINGLE_FIVE') && c.diceIndices.includes(i)
      );
      if (single) resultCombos.push(single);
    }
  }

  return resultCombos;
}

/**
 * Refresh the scoring label and confirm button after each die toggle
 */
function updateDieSelectionDisplay() {
  const combos = humanDecisionState.context.scoringCombinations;
  const diceRolled = humanDecisionState.context.diceRolled;
  const totalDice = diceRolled.length;

  const scoringDisplay = document.getElementById('scoringDisplay');
  const selectedPointsEl = document.getElementById('selectedPoints');
  const diceLeftEl = document.getElementById('diceLeftDisplay');
  const confirmBtn = document.getElementById('confirmDiceBtn');

  if (selectedDiceIndices.length === 0) {
    scoringDisplay.innerHTML = '<span style="color: #999; font-size: 0.95em;">Select scoring dice above</span>';
    selectedPointsEl.textContent = '—';
    diceLeftEl.textContent = totalDice;
    confirmBtn.disabled = true;
    confirmBtn.style.opacity = '0.5';
    return;
  }

  const resultCombos = computeScoreForSelectedDice(selectedDiceIndices, combos, diceRolled);
  const totalPoints = resultCombos.reduce((s, c) => s + c.points, 0);
  const diceLeft = totalDice - selectedDiceIndices.length;

  const comboLabel = resultCombos.map(c => formatScoreType(c.type)).join(' + ');
  scoringDisplay.innerHTML = `
    <div style="font-weight: 600; color: #333; font-size: 1.05em;">${comboLabel}</div>
    <div style="color: #28a745; font-size: 0.9em; margin-top: 3px;">+${totalPoints} pts</div>
  `;

  selectedPointsEl.textContent = totalPoints;
  diceLeftEl.textContent = diceLeft === 0 ? '6 🔥' : diceLeft;
  confirmBtn.disabled = false;
  confirmBtn.style.opacity = '1';
}

/**
 * Confirm dice selection and show continue decision
 */
async function confirmDiceSelection() {
  const combos = humanDecisionState.context.scoringCombinations;
  const diceRolled = humanDecisionState.context.diceRolled;
  const selectedCombos = computeScoreForSelectedDice(selectedDiceIndices, combos, diceRolled);

  const totalPoints = selectedCombos.reduce((sum, c) => sum + c.points, 0);

  const decision = {
    selectedCombinations: selectedCombos,
    points: totalPoints,
    diceKept: selectedDiceIndices.length,
    reason: 'Human dice selection'
  };

  try {
    const response = await fetch('/api/game/interactive/decision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: currentInteractiveGameId,
        decisionId: humanDecisionState.decisionId,
        decision
      })
    });

    if (!response.ok) {
      const error = await response.json();
      alert('Failed to submit decision: ' + error.error);
      return;
    }

    const data = await response.json();

    // Add to history
    gameStepHistory.push(data.step);
    currentHistoryIndex = gameStepHistory.length - 1;

    // Display next step (should be continue decision)
    displayStep(data.step);
    updateInteractiveControls();

  } catch (error) {
    console.error('Failed to submit dice selection:', error);
    alert('Failed to submit decision: ' + error.message);
  }
}

/**
 * Display continue/stop decision UI
 */
function displayContinueDecisionUI(context) {
  const farkleRisk = calculateFarkleRisk(context.diceRemaining);

  const decisionBox = document.getElementById('decisionBox');
  decisionBox.innerHTML = `
    <h4 style="margin-top: 0; color: #667eea;">🤔 Decision Time</h4>

    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
      <div style="font-size: 1.1em; color: #666; margin-bottom: 10px;">Turn Total So Far</div>
      <div style="font-size: 2.5em; font-weight: bold; color: #667eea; margin-bottom: 15px;">${context.turnPoints}</div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px; text-align: center;">
        <div>
          <div style="font-size: 0.9em; color: #666;">Dice Remaining</div>
          <div style="font-size: 1.5em; font-weight: bold; color: #333;">${context.diceRemaining}</div>
        </div>
        <div>
          <div style="font-size: 0.9em; color: #666;">Farkle Risk</div>
          <div style="font-size: 1.5em; font-weight: bold; color: ${farkleRisk > 0.3 ? '#dc3545' : '#28a745'};">${(farkleRisk * 100).toFixed(0)}%</div>
        </div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
      <button onclick="submitContinueDecision(false)"
              style="padding: 20px; font-size: 1.1em; background: #28a745; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
        <div style="font-size: 1.5em; margin-bottom: 5px;">⏸</div>
        <div>Stop & Bank</div>
        <div style="font-size: 1.3em; margin-top: 5px;">${context.turnPoints} pts</div>
      </button>

      <button onclick="submitContinueDecision(true)"
              style="padding: 20px; font-size: 1.1em; background: ${context.diceRemaining <= 2 ? '#dc3545' : '#667eea'}; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
        <div style="font-size: 1.5em; margin-bottom: 5px;">🎲</div>
        <div>Roll Again</div>
        <div style="font-size: 1.3em; margin-top: 5px;">${context.diceRemaining} dice</div>
      </button>
    </div>
  `;
}

/**
 * Submit continue/stop decision
 */
async function submitContinueDecision(continueRolling) {
  const decision = {
    continue: continueRolling,
    reason: continueRolling ? 'Human chose to continue' : 'Human chose to stop'
  };

  try {
    const response = await fetch('/api/game/interactive/decision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: currentInteractiveGameId,
        decisionId: humanDecisionState.decisionId,
        decision
      })
    });

    if (!response.ok) {
      const error = await response.json();
      alert('Failed to submit decision: ' + error.error);
      return;
    }

    const data = await response.json();

    // Save decision to localStorage
    saveHumanDecision({
      ...humanDecisionState,
      decision,
      timestamp: new Date().toISOString()
    });

    // Add to history
    gameStepHistory.push(data.step);
    currentHistoryIndex = gameStepHistory.length - 1;

    // Display next step
    displayStep(data.step);
    updateInteractiveControls();

    // Clear state
    humanDecisionState = null;
    selectedDiceIndices = [];

  } catch (error) {
    console.error('Failed to submit continue decision:', error);
    alert('Failed to submit decision: ' + error.message);
  }
}

/**
 * Calculate farkle risk based on dice remaining
 */
function calculateFarkleRisk(diceRemaining) {
  const risks = { 1: 0.667, 2: 0.444, 3: 0.278, 4: 0.154, 5: 0.077, 6: 0.023 };
  return risks[diceRemaining] || 0.5;
}

/**
 * Format score type for display
 */
function formatScoreType(type) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Close interactive game
 */
function closeInteractiveGame() {
  currentInteractiveGameId = null;
  humanDecisionState = null;
  selectedDiceIndices = [];
  document.getElementById('interactiveGameSection').classList.add('hidden');
}

// Event listeners
document.getElementById('runBtn').addEventListener('click', runSimulation);

// Load strategies on startup
loadStrategies();
