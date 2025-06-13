import React from 'react';
import { Provider } from 'react-redux';

// Test if the store import is the issue
const AppMinimal: React.FC = () => {
  let store;
  
  try {
    store = require('./store').store;
  } catch (error) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: '#1a1a2e',
        color: '#ff6b6b',
        fontFamily: 'monospace',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <h1>❌ Store Import Failed</h1>
        <pre style={{ background: '#2d2d2d', padding: '20px', borderRadius: '8px', overflow: 'auto' }}>
          {error?.toString()}
        </pre>
        <button 
          onClick={() => window.location.reload()}
          style={{
            marginTop: '20px',
            background: '#7461ef',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Reload
        </button>
      </div>
    );
  }

  return (
    <Provider store={store}>
      <div style={{
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        color: '#ffffff',
        fontFamily: 'Inter, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px'
      }}>
        <h1>✅ Store + Redux Working!</h1>
        <p>Redux store imported and connected successfully</p>
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          padding: '20px',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <p>🎬 AI Multi Videos Converter</p>
          <p>Redux Test: Passed</p>
          <p>Store: Connected</p>
        </div>
      </div>
    </Provider>
  );
};

export default AppMinimal;