// State
let availableStrategies = [];
let selectedStrategyIds = [];
let ws = null;

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
  container.innerHTML = availableStrategies.map(strategy => `
    <div class="strategy-card" data-id="${strategy.id}" onclick="toggleStrategy('${strategy.id}')">
      <h3>${strategy.name}</h3>
      <p>${strategy.description}</p>
    </div>
  `).join('');
}

// Toggle strategy selection
function toggleStrategy(id) {
  const index = selectedStrategyIds.indexOf(id);
  if (index > -1) {
    selectedStrategyIds.splice(index, 1);
  } else {
    selectedStrategyIds.push(id);
  }

  // Update UI
  document.querySelectorAll('.strategy-card').forEach(card => {
    if (selectedStrategyIds.includes(card.dataset.id)) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  });

  // Update run button
  const runBtn = document.getElementById('runBtn');
  if (selectedStrategyIds.length >= 2) {
    runBtn.disabled = false;
    document.getElementById('selection-hint').textContent =
      `${selectedStrategyIds.length} strategies selected`;
  } else {
    runBtn.disabled = true;
    document.getElementById('selection-hint').textContent =
      'Select at least 2 strategies to compare';
  }
}

// Run simulation
async function runSimulation() {
  const gameCount = parseInt(document.getElementById('gameCount').value);
  const targetScore = parseInt(document.getElementById('targetScore').value);
  const minScore = parseInt(document.getElementById('minScore').value);

  // Show progress, hide results
  document.getElementById('progressSection').classList.remove('hidden');
  document.getElementById('resultsSection').classList.add('hidden');
  document.getElementById('runBtn').disabled = true;

  // Connect WebSocket for real-time updates
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${window.location.host}/api/simulate/stream`);

  ws.onopen = () => {
    // Send simulation config
    ws.send(JSON.stringify({
      gameCount,
      strategyIds: selectedStrategyIds,
      targetScore,
      minimumScoreToBoard: minScore
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

  container.innerHTML = sortedStats.map((stats, index) => `
    <div class="result-card ${index === 0 ? 'winner' : ''}">
      <div class="rank">#${index + 1} ${index === 0 ? '👑' : ''}</div>
      <h3>${stats.strategyName}</h3>

      <div class="stat-row">
        <span class="stat-label">Win Rate:</span>
        <span class="stat-value">${(stats.winRate * 100).toFixed(1)}%</span>
      </div>

      <div class="stat-row">
        <span class="stat-label">Wins:</span>
        <span class="stat-value">${stats.wins} / ${stats.gamesPlayed}</span>
      </div>

      <div class="stat-row">
        <span class="stat-label">Avg Score:</span>
        <span class="stat-value">${Math.round(stats.averageFinalScore).toLocaleString()}</span>
      </div>

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

      <div class="stat-row">
        <span class="stat-label">Score Range:</span>
        <span class="stat-value">${Math.round(stats.minScore).toLocaleString()} - ${Math.round(stats.maxScore).toLocaleString()}</span>
      </div>
    </div>
  `).join('');

  // Scroll to results
  document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
}

// Event listeners
document.getElementById('runBtn').addEventListener('click', runSimulation);

// Load strategies on startup
loadStrategies();
