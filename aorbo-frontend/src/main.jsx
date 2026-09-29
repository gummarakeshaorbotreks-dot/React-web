import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/theme.css';
import './styles/ui.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { initGlobalCrashHandlers } from './utils/crashReporter';

initGlobalCrashHandlers();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
