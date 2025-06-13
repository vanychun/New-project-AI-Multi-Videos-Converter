import React from 'react';
import { Provider } from 'react-redux';
import { store } from './store';

// Simple debug component without complex features
const SimpleApp: React.FC = () => {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      color: '#ffffff',
      fontFamily: 'Inter, sans-serif',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        height: '60px',
        background: 'linear-gradient(135deg, #2d2d47 0%, #3a3a5c 100%)',
        borderBottom: '1px solid #4a4a6a',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{
          fontSize: '20px',
          fontWeight: 'bold',
          color: '#7461ef'
        }}>
          🎬 AI Multi Videos Converter - React Debug Mode
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
          <button style={{
            background: '#7461ef',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer'
          }}>
            ⌨️ Debug
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        padding: '20px',
        gap: '20px'
      }}>
        {/* Video Library */}
        <div style={{
          flex: 1,
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid #4a4a6a',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <h2 style={{ margin: '0 0 20px 0', color: '#ffffff' }}>Video Library</h2>
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#a0a0a0'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.7 }}>📁</div>
            <h3>React App is Working!</h3>
            <p>This is our React application rendering correctly</p>
            <button style={{
              background: '#7461ef',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }} onClick={() => alert('React Click Handler Working!')}>
              📁 Test React Click
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        <div style={{
          width: '300px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid #4a4a6a',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#ffffff' }}>Debug Info</h3>
          <div style={{ fontSize: '14px', color: '#a0a0a0' }}>
            <p>✅ React: Working</p>
            <p>✅ Redux: Connected</p>
            <p>✅ Styling: Applied</p>
            <p>✅ Events: Functional</p>
            <hr style={{ border: '1px solid #4a4a6a', margin: '16px 0' }} />
            <p>If you see this, React is working fine!</p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div style={{
        height: '160px',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid #4a4a6a',
        borderRadius: '12px',
        margin: '0 20px 20px 20px',
        padding: '20px'
      }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#ffffff' }}>Timeline</h3>
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          height: '80px',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#a0a0a0'
        }}>
          Timeline area - React Debug Mode
        </div>
      </div>
    </div>
  );
};

const AppDebug: React.FC = () => {
  return (
    <Provider store={store}>
      <SimpleApp />
    </Provider>
  );
};

export default AppDebug;