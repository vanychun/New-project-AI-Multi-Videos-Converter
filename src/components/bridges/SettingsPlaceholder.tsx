import React, { useState } from 'react';
import './SettingsPlaceholder.css';

export interface SettingsPlaceholderProps {
  theme: 'dark' | 'light';
  onThemeChange: (theme: 'dark' | 'light') => void;
}

export const SettingsPlaceholder: React.FC<SettingsPlaceholderProps> = ({
  theme,
  onThemeChange
}) => {
  const [activeSection, setActiveSection] = useState('appearance');

  const sections = [
    { id: 'appearance', icon: '🎨', label: 'Appearance' },
    { id: 'export', icon: '📤', label: 'Export' },
    { id: 'performance', icon: '⚡', label: 'Performance' },
    { id: 'advanced', icon: '⚙️', label: 'Advanced' }
  ];

  return (
    <div className="settings-placeholder">
      <div className="settings-navigation">
        {sections.map((section) => (
          <button
            key={section.id}
            className={`nav-item ${activeSection === section.id ? 'active' : ''}`}
            onClick={() => setActiveSection(section.id)}
          >
            <span className="nav-icon">{section.icon}</span>
            <span className="nav-label">{section.label}</span>
          </button>
        ))}
      </div>

      <div className="settings-content">
        {activeSection === 'appearance' && (
          <div className="settings-section">
            <h3>Appearance Settings</h3>
            
            <div className="setting-group">
              <label className="setting-label">Theme</label>
              <div className="theme-selector">
                <button
                  className={`theme-option ${theme === 'light' ? 'active' : ''}`}
                  onClick={() => onThemeChange('light')}
                >
                  <span className="theme-icon">☀️</span>
                  Light
                </button>
                <button
                  className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
                  onClick={() => onThemeChange('dark')}
                >
                  <span className="theme-icon">🌙</span>
                  Dark
                </button>
              </div>
            </div>

            <div className="setting-group">
              <label className="setting-label">Grid Size</label>
              <select className="setting-select">
                <option value="small">Small (4 columns)</option>
                <option value="medium" selected>Medium (3 columns)</option>
                <option value="large">Large (2 columns)</option>
              </select>
            </div>

            <div className="setting-group">
              <label className="setting-label">Show Thumbnails</label>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        )}

        {activeSection === 'export' && (
          <div className="settings-section">
            <h3>Export Settings</h3>
            
            <div className="setting-group">
              <label className="setting-label">Default Format</label>
              <select className="setting-select">
                <option value="mp4" selected>MP4</option>
                <option value="avi">AVI</option>
                <option value="mov">MOV</option>
                <option value="webm">WebM</option>
              </select>
            </div>

            <div className="setting-group">
              <label className="setting-label">Quality Preset</label>
              <select className="setting-select">
                <option value="high" selected>High Quality</option>
                <option value="medium">Medium Quality</option>
                <option value="low">Low Quality</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div className="setting-group">
              <label className="setting-label">Output Directory</label>
              <div className="file-path-input">
                <input 
                  type="text" 
                  value="~/Videos/Converted" 
                  readOnly 
                  className="path-input"
                />
                <button className="browse-button">Browse</button>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'performance' && (
          <div className="settings-section">
            <h3>Performance Settings</h3>
            
            <div className="setting-group">
              <label className="setting-label">Hardware Acceleration</label>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider"></span>
              </label>
              <small className="setting-description">
                Use GPU acceleration when available
              </small>
            </div>

            <div className="setting-group">
              <label className="setting-label">Max Concurrent Jobs</label>
              <input 
                type="range" 
                min="1" 
                max="8" 
                defaultValue="4" 
                className="range-input"
              />
              <span className="range-value">4</span>
            </div>

            <div className="setting-group">
              <label className="setting-label">Memory Limit (GB)</label>
              <input 
                type="range" 
                min="1" 
                max="16" 
                defaultValue="8" 
                className="range-input"
              />
              <span className="range-value">8 GB</span>
            </div>
          </div>
        )}

        {activeSection === 'advanced' && (
          <div className="settings-section">
            <h3>Advanced Settings</h3>
            
            <div className="setting-group">
              <label className="setting-label">Auto-save Projects</label>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-group">
              <label className="setting-label">Debug Mode</label>
              <label className="toggle-switch">
                <input type="checkbox" />
                <span className="toggle-slider"></span>
              </label>
              <small className="setting-description">
                Enable detailed logging and debug information
              </small>
            </div>

            <div className="setting-group">
              <label className="setting-label">Cache Size (MB)</label>
              <input 
                type="number" 
                defaultValue="500" 
                min="100" 
                max="2000" 
                className="number-input"
              />
            </div>

            <div className="setting-actions">
              <button className="action-button danger">
                Clear Cache
              </button>
              <button className="action-button secondary">
                Reset Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};