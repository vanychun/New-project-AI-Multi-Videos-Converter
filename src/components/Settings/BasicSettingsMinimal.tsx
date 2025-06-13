import React from 'react';

const BasicSettingsMinimal: React.FC = () => {
  return (
    <div style={{
      padding: '24px',
      color: '#ffffff',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <h2 style={{ 
        margin: '0 0 24px 0', 
        fontSize: '24px', 
        fontWeight: '600',
        color: '#ffffff'
      }}>
        Basic Settings
      </h2>
      
      <p style={{ color: '#b3b3b3', fontSize: '14px' }}>
        Basic video processing settings panel is now working!
      </p>
      
      <div style={{
        marginTop: '20px',
        padding: '16px',
        background: 'rgba(116, 97, 239, 0.1)',
        border: '1px solid rgba(116, 97, 239, 0.3)',
        borderRadius: '8px'
      }}>
        <p style={{ margin: 0, color: '#7461ef', fontSize: '14px' }}>
          ✅ BasicSettings component loaded successfully without errors!
        </p>
      </div>
    </div>
  );
};

export default BasicSettingsMinimal;