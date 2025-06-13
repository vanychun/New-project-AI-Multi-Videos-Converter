import React, { useState } from 'react';
import BasicSettingsMinimal from './BasicSettingsMinimal';
import AIEnhancement from './AIEnhancement';
import EffectsLibrary from './EffectsLibrary';
import ExportSettings from './ExportSettings';
import './Settings.css';

interface SettingsPanelProps {
  collapsed: boolean;
  onToggle: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ collapsed, onToggle }) => {
  const [activeTab, setActiveTab] = useState('ai');
  
  const tabs = [
    { id: 'ai', label: 'AI', icon: '🤖' },
    { id: 'basic', label: 'Basic', icon: '⚙️' },
    { id: 'effects', label: 'Effects', icon: '✨' },
    { id: 'export', label: 'Export', icon: '📤' }
  ];
  
  if (collapsed) {
    return (
      <div 
        className="settings-panel collapsed"
        data-testid="settings-panel"
        style={{
          width: '60px',
          background: '#2d2d47',
          borderLeft: '1px solid #4a4a6a',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '8px 0'
        }}>
        <button
          onClick={onToggle}
          style={{
            background: 'none',
            border: 'none',
            color: '#a0a0a0',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '8px'
          }}
        >
          ⚙️
        </button>
      </div>
    );
  }
  
  return (
    <div 
      className={`settings-panel ${collapsed ? 'collapsed' : ''}`}
      data-testid="settings-panel"
      style={{
        width: collapsed ? '60px' : '350px',
        background: '#2d2d47',
        borderLeft: '1px solid #4a4a6a',
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px',
        borderBottom: '1px solid #4a4a6a'
      }}>
        <div>
          <h3 style={{
            margin: 0,
            color: '#ffffff',
            fontSize: '16px',
            fontWeight: '600'
          }}>
            {activeTab === 'ai' ? 'AI Enhancements' : 'Settings'}
          </h3>
        </div>
        
        <button
          onClick={onToggle}
          style={{
            background: 'none',
            border: 'none',
            color: '#a0a0a0',
            fontSize: '14px',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          ▶️
        </button>
      </div>
      
      {/* Tabs */}
      <div style={{
        display: 'flex',
        background: '#3a3a5c',
        borderBottom: '1px solid #4a4a6a'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              background: activeTab === tab.id ? '#7461ef' : 'transparent',
              border: 'none',
              color: activeTab === tab.id ? 'white' : '#a0a0a0',
              padding: '8px 4px',
              fontSize: '10px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              transition: 'all 0.2s ease'
            }}
          >
            <span style={{ fontSize: '14px' }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
      
      {/* Content */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '16px'
      }}>
        {activeTab === 'ai' && <AIEnhancement />}
        {activeTab === 'basic' && <BasicSettingsMinimal />}
        {activeTab === 'effects' && <EffectsLibrary />}
        {activeTab === 'export' && <ExportSettings />}
      </div>
    </div>
  );
};

export default SettingsPanel;