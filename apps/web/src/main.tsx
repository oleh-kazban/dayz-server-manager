import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';

import './styles/theme.css';

import './core/i18n';

const rootElement = document.getElementById('root');

if (rootElement) {
  const root =
    (window as unknown as { __dsmRoot?: ReturnType<typeof createRoot> }).__dsmRoot ??
    createRoot(rootElement);
  (window as unknown as { __dsmRoot?: ReturnType<typeof createRoot> }).__dsmRoot = root;

  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
