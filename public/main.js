/**
 * Vite entry point - bundles app.js and multi-mouse client
 */
import './app.js';
import { initCursors } from '@multi-mouse/client';

// Use local multi-mouse server when developing (run `npm run cursors` in another terminal)
// Use tunnel URL when deployed or accessed via the tunnel
// Override with ?multimouse=wss://your-url.com if needed
const urlParams = new URLSearchParams(window.location.search);
const serverUrl =
  urlParams.get('multimouse') ||
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'ws://localhost:3001'
    : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/cursors`);

console.log('[MultiMouse] Connecting to:', serverUrl);

// Visible connection status (helps debug when cursors don't show)
const statusEl = document.createElement('div');
statusEl.id = 'multimouse-status';
statusEl.style.cssText = `
  position: fixed;
  bottom: 12px;
  right: 12px;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  z-index: 999998;
  transition: background 0.3s;
`;
const setStatus = (connected, label) => {
  statusEl.textContent = label;
  statusEl.style.background = connected ? 'rgba(40, 167, 69, 0.9)' : 'rgba(220, 53, 69, 0.9)';
  statusEl.style.color = 'white';
};

// If still connecting after 15s, show timeout (WebSocket may be blocked or unreachable)
let connectTimeout = setTimeout(() => {
  if (statusEl.textContent === 'Cursors connecting…') {
    setStatus(false, 'Cursors timeout — check server');
  }
}, 15_000);

const destroyCursors = initCursors({
  serverUrl,
  room: 'dice-room',

  onConnect: () => {
    clearTimeout(connectTimeout);
    setStatus(true, 'Cursors connected');
    console.log('MultiMouse connected to', serverUrl);
  },
  onDisconnect: (code, reason) => {
    setStatus(false, `Cursors disconnected (${code || '?'})`);
    console.log('MultiMouse disconnected — reconnecting...', { code, reason });
  },
  onError: () => {
    clearTimeout(connectTimeout);
    setStatus(false, 'Cursors connection failed');
    console.warn('MultiMouse WebSocket error');
  },
  onUserJoin: () => {
    console.log('User joined');
  },
  onUserLeave: () => {
    console.log('User left');
  }
});

// Append status after body is ready (script runs at end of body)
document.body.appendChild(statusEl);
setStatus(false, 'Cursors connecting…');

window.addEventListener('beforeunload', destroyCursors);
