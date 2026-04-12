import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} catch (e) {
  console.error("Critical Render Error:", e);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<div style="padding: 20px; color: red; font-family: sans-serif;">
      <h1>Critical Error</h1>
      <pre>${e instanceof Error ? e.stack : String(e)}</pre>
    </div>`;
  }
}
