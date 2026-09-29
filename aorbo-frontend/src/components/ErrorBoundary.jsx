import React from 'react';
import { reportCrash } from '../utils/crashReporter';

// Wraps the whole app once (see main.jsx) so a render-time crash on ANY
// page is caught here instead of showing a blank white screen. Must be a
// class component — React error boundaries have no hooks equivalent.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    reportCrash({
      error_message: error?.message || String(error),
      stack_trace: error?.stack || info?.componentStack || '',
      severity: 'fatal',
      extra_context: { componentStack: info?.componentStack?.slice(0, 2000) },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container section">
          <div className="empty-state">
            <h2>Something went wrong.</h2>
            <p>This page hit an unexpected error. Please try refreshing.</p>
            <button type="button" className="button button--brand" onClick={() => window.location.reload()}>
              Refresh page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
