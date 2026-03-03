import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from './ErrorBoundary';
import { App } from './App';
import { MultiMouseStatus } from './components/MultiMouseStatus';
import './styles/global.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found');

createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
      <MultiMouseStatus />
    </ErrorBoundary>
  </StrictMode>
);
