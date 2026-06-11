import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import React from 'react';
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', fontFamily: 'monospace', background: '#fff5f5', color: '#c53030', minHeight: '100vh' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>⚠️ Application Error</h1>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem', background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #fed7d7' }}>
            {this.state.error?.toString()}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: '16px', padding: '8px 20px', background: '#c53030', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)
