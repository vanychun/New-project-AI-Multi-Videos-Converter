import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { setCurrentTime, togglePlayback, stepFrame } from '../../store/slices/timelineSlice';
import KeyboardShortcutsHelp from '../common/KeyboardShortcutsHelp';

interface HeaderBarProps {
  onToggleSidebar: () => void;
  onToggleSettings: () => void;
  onToggleTheme: () => void;
  theme: 'dark' | 'light';
}

const HeaderBar: React.FC<HeaderBarProps> = ({
  onToggleSidebar,
  onToggleSettings,
  onToggleTheme,
  theme
}) => {
  const dispatch = useDispatch();
  const { isPlaying, currentTime } = useSelector((state: RootState) => state.timeline);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  
  const handlePlayPause = () => {
    dispatch(togglePlayback());
  };
  
  const handlePreviousFrame = () => {
    dispatch(stepFrame('backward'));
  };
  
  const handleNextFrame = () => {
    dispatch(stepFrame('forward'));
  };
  const headerStyle: React.CSSProperties = {
    height: '56px',
    background: 'linear-gradient(135deg, #2d2d47 0%, #3a3a5c 100%)',
    borderBottom: '1px solid #4a4a6a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    flexShrink: 0
  };

  const buttonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: '#ffffff',
    cursor: 'pointer',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '16px',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  const titleStyle: React.CSSProperties = {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: '-0.5px'
  };

  return (
    <div style={headerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button 
          style={buttonStyle}
          onClick={onToggleSidebar}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
        >
          📁
        </button>
        <h1 style={titleStyle}>🤖 AI Video Multi-Converter Pro</h1>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <button 
            style={{...buttonStyle, padding: '6px 10px', fontSize: '14px'}}
            onClick={handlePreviousFrame}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
            title="Previous frame"
          >
            ⏮️
          </button>
          <button 
            style={{
              ...buttonStyle, 
              padding: '6px 10px', 
              fontSize: '16px',
              background: 'rgba(116, 97, 239, 0.3)',
              border: '1px solid rgba(116, 97, 239, 0.5)'
            }}
            onClick={handlePlayPause}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(116, 97, 239, 0.5)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(116, 97, 239, 0.3)'}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸️' : '▶️'}
          </button>
          <button 
            style={{...buttonStyle, padding: '6px 10px', fontSize: '14px'}}
            onClick={handleNextFrame}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
            title="Next frame"
          >
            ⏭️
          </button>
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button 
          style={buttonStyle}
          onClick={() => setShowShortcutsHelp(true)}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
          title="Keyboard shortcuts (?)"
        >
          ⌨️
        </button>
        <button 
          style={buttonStyle}
          onClick={onToggleTheme}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
          title="Toggle theme"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <button 
          style={{
            ...buttonStyle,
            background: 'rgba(0, 120, 212, 0.2)',
            border: '1px solid rgba(0, 120, 212, 0.3)'
          }}
          onClick={onToggleSettings}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 120, 212, 0.3)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 120, 212, 0.2)'}
          title="Settings"
        >
          ⚙️
        </button>
      </div>
      
      <KeyboardShortcutsHelp 
        isOpen={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
      />
    </div>
  );
};

export default HeaderBar;