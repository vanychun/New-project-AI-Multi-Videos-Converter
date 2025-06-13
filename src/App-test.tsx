import React from 'react';
import './styles/globals.css';

const AppTest: React.FC = () => {
  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#1a1a1a', 
      color: 'white', 
      height: '100vh',
      fontSize: '18px'
    }}>
      <h1>🎬 AI Multi Videos Converter - Test Mode</h1>
      <p>✅ React is working!</p>
      <p>✅ TypeScript is working!</p>
      <p>✅ CSS is loading!</p>
      
      <div style={{
        margin: '20px 0',
        padding: '15px',
        border: '1px solid #404040',
        borderRadius: '8px',
        backgroundColor: '#2d2d2d'
      }}>
        <h3>🔧 Debug Information:</h3>
        <p>• Time: {new Date().toLocaleTimeString()}</p>
        <p>• User Agent: {navigator.userAgent.split(' ')[0]}</p>
        <p>• Screen: {window.screen.width}x{window.screen.height}</p>
      </div>
      
      <button 
        onClick={() => alert('Button works!')}
        style={{
          padding: '10px 20px',
          backgroundColor: '#0078d4',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '16px'
        }}
      >
        Test Button
      </button>
    </div>
  );
};

export default AppTest;