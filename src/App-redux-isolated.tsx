import React from 'react';

// Test Redux completely isolated - inline everything
const AppReduxIsolated: React.FC = () => {
  const [reduxTest, setReduxTest] = React.useState('Testing...');

  React.useEffect(() => {
    // Test if we can import Redux Toolkit at all
    import('@reduxjs/toolkit').then(() => {
      setReduxTest('✅ Redux Toolkit Import Success');
    }).catch((error) => {
      setReduxTest('❌ Redux Toolkit Import Failed: ' + error.message);
    });
  }, []);

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
      <h1>🔍 Redux Import Test</h1>
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        padding: '30px',
        borderRadius: '12px',
        textAlign: 'center'
      }}>
        <p>{reduxTest}</p>
      </div>
    </div>
  );
};

export default AppReduxIsolated;