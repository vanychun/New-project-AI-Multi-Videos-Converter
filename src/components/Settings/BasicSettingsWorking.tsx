import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { updateProcessingSettings } from '../../store/slices/settingsSlice';

const BasicSettingsWorking: React.FC = () => {
  const dispatch = useDispatch();
  const { processing } = useSelector((state: RootState) => state.settings);

  const handleSettingChange = (key: string, value: any) => {
    dispatch(updateProcessingSettings({ [key]: value }));
  };

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

      {/* Output Format */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ 
          margin: '0 0 12px 0', 
          fontSize: '16px', 
          fontWeight: '500',
          color: '#ffffff'
        }}>
          Output Format
        </h3>
        
        <select
          value={processing.outputFormat || 'mp4'}
          onChange={(e) => handleSettingChange('outputFormat', e.target.value)}
          style={{
            width: '200px',
            padding: '8px 12px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '14px'
          }}
        >
          <option value="mp4">MP4</option>
          <option value="avi">AVI</option>
          <option value="mov">MOV</option>
          <option value="mkv">MKV</option>
          <option value="webm">WebM</option>
        </select>
      </div>

      {/* Quality */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ 
          margin: '0 0 12px 0', 
          fontSize: '16px', 
          fontWeight: '500',
          color: '#ffffff'
        }}>
          Quality
        </h3>
        
        <select
          value={processing.quality || 'medium'}
          onChange={(e) => handleSettingChange('quality', e.target.value)}
          style={{
            width: '200px',
            padding: '8px 12px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '14px'
          }}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      {/* Resolution */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ 
          margin: '0 0 12px 0', 
          fontSize: '16px', 
          fontWeight: '500',
          color: '#ffffff'
        }}>
          Resolution
        </h3>
        
        <select
          value={processing.resolution || 'original'}
          onChange={(e) => handleSettingChange('resolution', e.target.value)}
          style={{
            width: '200px',
            padding: '8px 12px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '14px'
          }}
        >
          <option value="original">Original</option>
          <option value="480p">480p</option>
          <option value="720p">720p</option>
          <option value="1080p">1080p</option>
          <option value="1440p">1440p</option>
          <option value="2160p">4K</option>
        </select>
      </div>

      {/* Custom Quality Controls */}
      {processing.quality === 'custom' && (
        <div style={{ 
          marginBottom: '24px',
          padding: '16px', 
          background: 'rgba(255,255,255,0.05)', 
          borderRadius: '8px'
        }}>
          <h4 style={{ 
            margin: '0 0 16px 0', 
            fontSize: '14px', 
            fontWeight: '500',
            color: '#ffffff'
          }}>
            Custom Settings
          </h4>
          
          <div style={{ marginBottom: '12px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '4px', 
              fontSize: '12px', 
              color: '#b3b3b3'
            }}>
              Bitrate (kbps)
            </label>
            <input
              type="number"
              min="500"
              max="50000"
              value={processing.bitrate || 5000}
              onChange={(e) => handleSettingChange('bitrate', parseInt(e.target.value))}
              style={{
                width: '150px',
                padding: '6px 10px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '14px'
              }}
            />
          </div>
          
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '4px', 
              fontSize: '12px', 
              color: '#b3b3b3'
            }}>
              Frame Rate (fps)
            </label>
            <input
              type="number"
              min="1"
              max="120"
              value={processing.fps || 30}
              onChange={(e) => handleSettingChange('fps', parseInt(e.target.value))}
              style={{
                width: '150px',
                padding: '6px 10px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '14px'
              }}
            />
          </div>
        </div>
      )}

      {/* Output Path */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ 
          margin: '0 0 12px 0', 
          fontSize: '16px', 
          fontWeight: '500',
          color: '#ffffff'
        }}>
          Output Directory
        </h3>
        
        <div style={{ 
          padding: '8px 12px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#b3b3b3'
        }}>
          {processing.outputPath || 'Default output directory'}
        </div>
      </div>
    </div>
  );
};

export default BasicSettingsWorking;