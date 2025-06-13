import React from 'react';
import './HeaderBarSimple.css';

export interface HeaderBarSimpleProps {
  projectName: string;
  videoCount: number;
  selectedCount: number;
  onImport: () => void;
  onProcess: () => void;
  onToggleTheme: () => void;
  theme: 'dark' | 'light';
  hasSelection: boolean;
}

export const HeaderBarSimple: React.FC<HeaderBarSimpleProps> = ({
  projectName,
  videoCount,
  selectedCount,
  onImport,
  onProcess,
  onToggleTheme,
  theme,
  hasSelection
}) => {
  return (
    <header className="header-bar-simple">
      <div className="header-left">
        <div className="app-logo">
          <span className="logo-icon">🎬</span>
          <h1 className="app-title">AI Multi Videos Converter</h1>
        </div>
        <div className="project-info">
          <span className="project-name">{projectName}</span>
          <span className="video-count">{videoCount} videos</span>
          {selectedCount > 0 && (
            <span className="selected-count">{selectedCount} selected</span>
          )}
        </div>
      </div>

      <div className="header-center">
        <div className="quick-actions">
          <button 
            className="action-button primary"
            onClick={onImport}
            title="Import videos (Ctrl+O)"
          >
            <span className="button-icon">📁</span>
            Import Videos
          </button>
          
          <button 
            className="action-button accent"
            onClick={onProcess}
            disabled={!hasSelection}
            title="Process selected videos"
          >
            <span className="button-icon">⚙️</span>
            Process Selected
          </button>
        </div>
      </div>

      <div className="header-right">
        <button
          className="icon-button"
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        <button
          className="icon-button"
          title="Settings"
        >
          ⚙️
        </button>

        <button
          className="icon-button"
          title="Help"
        >
          ❓
        </button>
      </div>
    </header>
  );
};