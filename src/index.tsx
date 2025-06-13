import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import AppDebug from './App-Debug';
import AppSimple from './App-simple';
import AppGradual from './App-gradual';
import AppMinimal from './App-minimal';
import AppStoreTest from './App-store-test';
import AppBasicRedux from './App-basic-redux';
import AppWorking from './App-working';
import AppReduxDebug from './App-redux-debug';
import AppReduxIsolated from './App-redux-isolated';
import { AppIntegrated } from './AppIntegrated';
import { AppSimpleTest } from './AppSimpleTest';
import { AppHookTest } from './AppHookTest';
import { AppMainLayoutTest } from './AppMainLayoutTest';
import { AppHeaderTest } from './AppHeaderTest';
import { AppBatchTest } from './AppBatchTest';
import { AppFullTest } from './AppFullTest';
// import AppTest from './App-test'; // TODO: Implement test app
import './styles/globals.css';

// Get the root element
const container = document.getElementById('root');
if (!container) {
  throw new Error('Failed to find the root element');
}

// Create root and render app
const root = ReactDOM.createRoot(container);

// Use test app for debugging - currently unused
// const _isDevelopment = false; // Change to true for test app

// Error boundary component
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          backgroundColor: '#1a1a1a',
          color: 'white',
          height: '100vh',
          fontFamily: 'monospace'
        }}>
          <h1>🚨 App Error</h1>
          <h3>Something went wrong:</h3>
          <pre style={{
            backgroundColor: '#2d2d2d',
            padding: '15px',
            borderRadius: '5px',
            overflow: 'auto'
          }}>
            {this.state.error?.toString()}
            {this.state.error?.stack}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#0078d4',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Choose which app version to use:
// 0 = Test app (basic functionality test)
// 1 = Simple app (Redux + basic UI)
// 2 = Gradual app (testing components one by one)
// 3 = Full app (all components)
// const _appMode = 2; // Currently unused - directly using AppGradual

const getApp = () => {
  // Using the main app with proper Redux integration
  return <App />;
};

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      {getApp()}
    </ErrorBoundary>
  </React.StrictMode>
);