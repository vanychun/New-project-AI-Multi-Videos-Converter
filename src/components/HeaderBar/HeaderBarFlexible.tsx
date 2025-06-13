import React, { useState, useRef, useEffect } from 'react';
import KeyboardShortcutsHelp from '../common/KeyboardShortcutsHelp';
import './HeaderBarFlexible.css';

interface HeaderBarFlexibleProps {
  onToggleSidebar: () => void;
  onToggleSettings: () => void;
  onToggleTheme: () => void;
  theme: 'dark' | 'light';
  projectName?: string;
  videoCount?: number;
  selectedCount?: number;
  onImport?: () => void;
  onProcess?: () => void;
  hasSelection?: boolean;
}

const HeaderBarFlexible: React.FC<HeaderBarFlexibleProps> = ({
  onToggleSidebar,
  onToggleSettings,
  onToggleTheme,
  theme,
  projectName = "project-740902494127",
  videoCount = 0,
  selectedCount = 0,
  onImport,
  onProcess,
  hasSelection = false
}) => {
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Check for overflow and collapse elements if needed
  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current) {
        const container = containerRef.current;
        const isOverflowing = container.scrollWidth > container.clientWidth;
        setIsCollapsed(isOverflowing);
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, []);
  
  const handleImport = () => {
    onImport?.();
  };

  const handleProcess = () => {
    onProcess?.();
  };

  return (
    <header className={`header-flexible ${theme}`} ref={containerRef} data-testid="header-bar">
      {/* Left Section - Logo and Project Info */}
      <div className="header-left">
        <button 
          className="header-btn sidebar-toggle"
          onClick={onToggleSidebar}
          title="Toggle Sidebar"
          data-testid="sidebar-toggle"
        >
          <span className="icon">📁</span>
        </button>
        
        <div className="app-branding">
          <div className="logo-section" data-testid="app-logo">
            <span className="logo-icon">🤖</span>
            <h1 className={`app-title ${isCollapsed ? 'collapsed' : ''}`}>
              AI Multi Videos Converter
            </h1>
          </div>
          
          {!isCollapsed && (
            <div className="project-info">
              <span className="project-name" title={projectName}>
                {projectName}
              </span>
              <div className="video-stats">
                <span className="stat-item">{videoCount} videos</span>
                {selectedCount > 0 && (
                  <span className="stat-item selected">{selectedCount} selected</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center Section - Main Actions */}
      <div className="header-center">
        {!isCollapsed && (
          <div className="main-actions">
            <button 
              className="action-btn primary"
              onClick={handleImport}
              title="Import Videos (Ctrl+O)"
              data-testid="import-button"
            >
              <span className="btn-icon">📁</span>
              <span className="btn-text">Import</span>
            </button>
            
            <button 
              className={`action-btn accent ${!hasSelection ? 'disabled' : ''}`}
              onClick={handleProcess}
              disabled={!hasSelection}
              title="Process Selected Videos"
              data-testid="process-button"
            >
              <span className="btn-icon">⚙️</span>
              <span className="btn-text">Process</span>
            </button>
          </div>
        )}
      </div>

      {/* Right Section - Tools and Settings */}
      <div className="header-right">
        {/* Desktop Tools */}
        <div className="desktop-tools">
          <div className="view-controls">
            <select className="view-select" defaultValue="Grid View">
              <option>Grid View</option>
              <option>List View</option>
              <option>Timeline View</option>
            </select>
            
            <select className="size-select" defaultValue="Medium">
              <option>Small</option>
              <option>Medium</option>
              <option>Large</option>
            </select>
          </div>

          <div className="display-options">
            <label className="toggle-option">
              <input type="checkbox" defaultChecked />
              <span className="toggle-slider"></span>
              <span className="toggle-label">Thumbnails</span>
            </label>
            
            <label className="toggle-option">
              <input type="checkbox" defaultChecked />
              <span className="toggle-slider"></span>
              <span className="toggle-label">Metadata</span>
            </label>
          </div>

          <div className="action-tools">
            <button 
              className="tool-btn"
              onClick={() => setShowShortcutsHelp(true)}
              title="Keyboard Shortcuts"
            >
              <span className="icon">⌨️</span>
            </button>
            
            <button 
              className="tool-btn"
              title="Timeline"
            >
              <span className="icon">📈</span>
            </button>
            
            <button 
              className="tool-btn theme-toggle"
              onClick={onToggleTheme}
              title="Toggle Theme"
            >
              <span className="icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
            </button>
            
            <button 
              className="tool-btn settings"
              onClick={() => {
                console.log('Settings button clicked!');
                onToggleSettings();
              }}
              title="Settings"
              data-testid="settings-button"
            >
              <span className="icon">⚙️</span>
            </button>
          </div>
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="mobile-menu-btn"
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          title="Menu"
        >
          <span className="hamburger-icon">
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>

        {/* Performance Stats */}
        <div className="performance-stats">
          <div className="stat-group">
            <span className="stat-label">Videos:</span>
            <span className="stat-value">{videoCount}</span>
          </div>
          <div className="stat-group">
            <span className="stat-label">Render:</span>
            <span className="stat-value">0.0MB</span>
          </div>
          <div className="stat-group">
            <span className="stat-label">Memory:</span>
            <span className="stat-value">0.0MB</span>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {showMobileMenu && (
        <div className="mobile-menu">
          <div className="mobile-menu-content">
            <div className="mobile-section">
              <h3>Actions</h3>
              <button className="mobile-menu-item" onClick={handleImport}>
                <span className="icon">📁</span>
                Import Videos
              </button>
              <button 
                className="mobile-menu-item" 
                onClick={handleProcess}
                disabled={!hasSelection}
              >
                <span className="icon">⚙️</span>
                Process Selected
              </button>
            </div>
            
            <div className="mobile-section">
              <h3>View</h3>
              <button className="mobile-menu-item">
                <span className="icon">⊞</span>
                Grid View
              </button>
              <button className="mobile-menu-item">
                <span className="icon">📋</span>
                List View
              </button>
            </div>
            
            <div className="mobile-section">
              <h3>Settings</h3>
              <button className="mobile-menu-item" onClick={onToggleTheme}>
                <span className="icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
                {theme === 'dark' ? 'Light' : 'Dark'} Theme
              </button>
              <button className="mobile-menu-item" onClick={onToggleSettings}>
                <span className="icon">⚙️</span>
                Settings
              </button>
            </div>
          </div>
        </div>
      )}
      
      <KeyboardShortcutsHelp 
        isOpen={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
      />
    </header>
  );
};

export default HeaderBarFlexible; 