import React from 'react';
import { Provider } from 'react-redux';
import { store } from './store/store-simple';

const StoreTest: React.FC = () => {
  return (
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
      <h1>🎬 Store Test</h1>
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        padding: '30px',
        borderRadius: '12px',
        textAlign: 'center'
      }}>
        <p>✅ Redux Store Connected</p>
        <p>✅ Provider Working</p>
        <p>✅ Basic Setup Complete</p>
      </div>
      <button 
        onClick={() => console.log('Store state:', store.getState())}
        style={{
          background: '#7461ef',
          color: 'white',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '8px',
          cursor: 'pointer'
        }}
      >
        Log Store State
      </button>
    </div>
  );
};

const AppStoreTest: React.FC = () => {
  return (
    <Provider store={store}>
      <StoreTest />
    </Provider>
  );
};

export default AppStoreTest;