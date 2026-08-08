import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

const filterConcurrentWarning = (...args: any[]) => {
  const msg = args
    .map(a => {
      if (a instanceof Error) {
        return a.message + ' ' + (a.stack || '');
      }
      if (a && typeof a === 'object') {
        if (a.message) return String(a.message) + ' ' + String(a.stack || '');
        try {
          return JSON.stringify(a);
        } catch {
          return String(a);
        }
      }
      return String(a);
    })
    .join(' ');

  return (
    msg.includes('concurrent rendering') ||
    msg.includes('synchronously rendering') ||
    msg.includes('recover by instead synchronously')
  );
};

const origWarn = console.warn;
console.warn = (...args: any[]) => {
  if (filterConcurrentWarning(...args)) return;
  origWarn(...args);
};

const origError = console.error;
console.error = (...args: any[]) => {
  if (filterConcurrentWarning(...args)) return;
  origError(...args);
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
