import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { assertTokensMatchCss } from './theme/tokens';

assertTokensMatchCss();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
