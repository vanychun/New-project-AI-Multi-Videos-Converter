import React, { Component, ReactNode } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import OutputVideos from './OutputVideos';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class SimpleErrorBoundary extends Component<
  { children: ReactNode; onError?: (error: Error) => void },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; onError?: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Output Videos Error:', error, errorInfo);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="output-videos" style={{ 
          padding: '40px', 
          textAlign: 'center',
          color: 'var(--text-secondary)',
          background: 'var(--bg-secondary)',
          borderRadius: '12px',
          margin: '20px'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '12px' }}>
            Output Videos Loading Error
          </h2>
          <p style={{ marginBottom: '20px', maxWidth: '500px', margin: '0 auto 20px' }}>
            There was an issue loading the output videos section. This might be due to a Redux store configuration issue.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => this.setState({ hasError: false, error: undefined })}
              style={{
                padding: '10px 20px',
                background: 'var(--accent-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              🔄 Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 20px',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              🔁 Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Test component to check store state
const OutputStoreTest: React.FC = () => {
  const storeState = useSelector((state: RootState) => state);
  
  // Check if output slice exists
  if (!storeState.output) {
    return (
      <div className="output-videos" style={{ 
        padding: '40px', 
        textAlign: 'center',
        color: 'var(--text-secondary)',
        background: 'var(--bg-secondary)',
        borderRadius: '12px',
        margin: '20px'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔧</div>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '12px' }}>
          Output Store Not Initialized
        </h2>
        <p style={{ marginBottom: '20px' }}>
          The output videos Redux store slice is not properly configured.
        </p>
        <details style={{ 
          textAlign: 'left', 
          background: 'var(--bg-primary)', 
          padding: '12px', 
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <summary style={{ cursor: 'pointer' }}>Available Store Slices:</summary>
          <pre style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {JSON.stringify(Object.keys(storeState), null, 2)}
          </pre>
        </details>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            background: 'var(--accent-primary)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          🔁 Reload App
        </button>
      </div>
    );
  }

  return <OutputVideos />;
};

const OutputVideosWrapper: React.FC = () => {
  return (
    <SimpleErrorBoundary>
      <OutputStoreTest />
    </SimpleErrorBoundary>
  );
};

export default OutputVideosWrapper;