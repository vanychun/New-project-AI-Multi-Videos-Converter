import React from 'react';

export const AppSimpleTest: React.FC = () => {
  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#1a1a2e',
      color: 'white',
      height: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1>🎬 AI Multi Videos Converter - Simple Test</h1>
      <p>If you can see this, the basic React app is working.</p>
      <div style={{
        marginTop: '20px',
        padding: '10px',
        backgroundColor: '#16213e',
        borderRadius: '8px'
      }}>
        <h3>Next Step:</h3>
        <p>Test individual components one by one to find the issue.</p>
      </div>
    </div>
  );
};