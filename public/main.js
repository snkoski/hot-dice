/**
 * Vite entry point - bundles app.js and multicursor client
 */
import './app.js';
import { initCursors } from '@multicursor/client';

const destroyCursors = initCursors({
  serverUrl: 'wss://multi.tunnel.shawnkoski.com',
  room: 'dice-room',

  onConnect: () => {
    console.log('Multicursor connected');
  },
  onDisconnect: () => {
    console.log('Multicursor disconnected — reconnecting...');
  },
  onUserJoin: () => {
    console.log('User joined');
  },
  onUserLeave: () => {
    console.log('User left');
  }
});

window.addEventListener('beforeunload', destroyCursors);
