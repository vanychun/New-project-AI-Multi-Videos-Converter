import React from 'react';

// Ultra-simple React component to test if React itself works
const AppSimple: React.FC = () => {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#1a1a2e',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        background: '#7461ef',
        padding: '40px',
        borderRadius: '20px',
        textAlign: 'center',
        maxWidth: '600px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
      }}>
        <h1 style={{ margin: '0 0 20px 0', fontSize: '32px' }}>
          🎉 React is Working!
        </h1>
        <p style={{ margin: '0 0 20px 0', fontSize: '18px' }}>
          This is our AI Multi Videos Converter React app successfully running!
        </p>
        <div style={{ margin: '20px 0' }}>
          <button 
            onClick={() => alert('React event handlers are working!')}
            style={{
              background: '#ffffff',
              color: '#7461ef',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              margin: '0 10px'
            }}
          >
            Test Click 🖱️
          </button>
          <button 
            onClick={() => window.location.reload()}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
              margin: '0 10px'
            }}
          >
            Reload 🔄
          </button>
        </div>
        <hr style={{ border: '1px solid rgba(255,255,255,0.3)', margin: '20px 0' }} />
        <p style={{ fontSize: '14px', margin: 0, opacity: 0.8 }}>
          Port: 3001 | Status: ✅ Working | React: ✅ Loaded
        </p>
      </div>
    </div>
  );
};

export default AppSimple;