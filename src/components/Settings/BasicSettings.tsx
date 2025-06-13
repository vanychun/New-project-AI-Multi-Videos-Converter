import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { updateProcessingSettings } from '../../store/slices/settingsSlice';
import { addNotification } from '../../store/slices/uiSlice';
import { ProcessingSettings } from '../../types/video.types';

const BasicSettings: React.FC = () => {
  const dispatch = useDispatch();
  const { processing } = useSelector((state: RootState) => state.settings);
  const [selectedOutputPath, setSelectedOutputPath] = useState(processing.outputPath || '');

  const handleSettingChange = (key: keyof ProcessingSettings, value: any) => {
    dispatch(updateProcessingSettings({ [key]: value }));
  };

  const handleSelectOutputDirectory = async () => {
    try {
      if (window.electronAPI?.selectDirectory) {
        const result = await window.electronAPI.selectDirectory({
          title: 'Select Output Directory',
          defaultPath: selectedOutputPath || undefined
        });
        
        if (result && !result.canceled && result.filePaths && result.filePaths[0]) {
          const newPath = result.filePaths[0];
          setSelectedOutputPath(newPath);
          handleSettingChange('outputPath', newPath);
          
          dispatch(addNotification({
            type: 'success',
            title: 'Output Directory Updated',
            message: `Videos will be saved to: ${newPath}`,
            autoClose: true,
            duration: 3000,
          }));
        }
      }
    } catch (error) {
      console.error('Failed to select directory:', error);
      dispatch(addNotification({
        type: 'error',
        title: 'Directory Selection Failed',
        message: 'Could not open directory selector. Please try again.',
        autoClose: true,
        duration: 5000,
      }));
    }
  };

  const formatOptions = [
    { value: 'mp4', label: 'MP4', description: 'Most compatible format' },
    { value: 'avi', label: 'AVI', description: 'Legacy format with good compatibility' },
    { value: 'mov', label: 'MOV', description: 'Apple QuickTime format' },
    { value: 'mkv', label: 'MKV', description: 'Open standard with advanced features' },
    { value: 'webm', label: 'WebM', description: 'Web-optimized format' },
    { value: 'wmv', label: 'WMV', description: 'Windows Media format' },
    { value: 'flv', label: 'FLV', description: 'Flash video format' }
  ];

  const qualityOptions = [
    { value: 'low', label: 'Low Quality', description: 'Smaller file size, lower quality' },
    { value: 'medium', label: 'Medium Quality', description: 'Balanced size and quality' },
    { value: 'high', label: 'High Quality', description: 'Larger file size, better quality' },
    { value: 'custom', label: 'Custom', description: 'Manual bitrate control' }
  ];

  const resolutionOptions = [
    { value: 'original', label: 'Original', description: 'Keep original resolution' },
    { value: '480p', label: '480p (SD)', description: '854×480 pixels' },
    { value: '720p', label: '720p (HD)', description: '1280×720 pixels' },
    { value: '1080p', label: '1080p (Full HD)', description: '1920×1080 pixels' },
    { value: '1440p', label: '1440p (2K)', description: '2560×1440 pixels' },
    { value: '2160p', label: '2160p (4K)', description: '3840×2160 pixels' },
    { value: '1080x1920', label: 'Mobile (9:16)', description: '1080×1920 pixels (vertical)' }
  ];

  const codecOptions = [
    { value: 'h264', label: 'H.264/AVC', description: 'Most compatible codec' },
    { value: 'h265', label: 'H.265/HEVC', description: 'Better compression, newer devices' },
    { value: 'av1', label: 'AV1', description: 'Latest codec, excellent compression' },
    { value: 'vp9', label: 'VP9', description: 'Google codec, web-friendly' }
  ];

  return (
    <div style={{
      padding: '24px',
      maxWidth: '800px',
      color: '#ffffff',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ 
          margin: '0 0 8px 0', 
          fontSize: '24px', 
          fontWeight: '600',
          color: '#ffffff'
        }}>
          Basic Settings
        </h2>
        <p style={{ 
          margin: 0, 
          color: '#b3b3b3', 
          fontSize: '14px' 
        }}>
          Configure essential video processing options
        </p>
      </div>

      {/* Output Format */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ 
          margin: '0 0 16px 0', 
          fontSize: '18px', 
          fontWeight: '500',
          color: '#ffffff'
        }}>
          Output Format
        </h3>
        
        <div style={{ 
          display: 'grid', 
          gap: '12px', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' 
        }}>
          {formatOptions.map(option => (
            <div
              key={option.value}
              onClick={() => handleSettingChange('outputFormat', option.value)}
              style={{
                padding: '16px',
                border: `2px solid ${processing.outputFormat === option.value ? '#7461ef' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: processing.outputFormat === option.value 
                  ? 'rgba(116, 97, 239, 0.1)' 
                  : 'rgba(255,255,255,0.05)',
              }}
            >
              <div style={{ 
                fontWeight: '500', 
                fontSize: '14px',
                color: processing.outputFormat === option.value ? '#7461ef' : '#ffffff',
                marginBottom: '4px'
              }}>
                {option.label}
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: '#b3b3b3',
                lineHeight: '1.4'
              }}>
                {option.description}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quality Settings */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ 
          margin: '0 0 16px 0', 
          fontSize: '18px', 
          fontWeight: '500',
          color: '#ffffff'
        }}>
          Quality Settings
        </h3>
        
        <div style={{ 
          display: 'grid', 
          gap: '12px', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' 
        }}>
          {qualityOptions.map(option => (
            <div
              key={option.value}
              onClick={() => handleSettingChange('quality', option.value)}
              style={{
                padding: '16px',
                border: `2px solid ${processing.quality === option.value ? '#7461ef' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: processing.quality === option.value 
                  ? 'rgba(116, 97, 239, 0.1)' 
                  : 'rgba(255,255,255,0.05)',
              }}
            >
              <div style={{ 
                fontWeight: '500', 
                fontSize: '14px',
                color: processing.quality === option.value ? '#7461ef' : '#ffffff',
                marginBottom: '4px'
              }}>
                {option.label}
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: '#b3b3b3',
                lineHeight: '1.4'
              }}>
                {option.description}
              </div>
            </div>
          ))}
        </div>

        {/* Custom Quality Controls */}
        {processing.quality === 'custom' && (
          <div style={{ 
            marginTop: '16px', 
            padding: '20px', 
            background: 'rgba(255,255,255,0.05)', 
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{ 
              display: 'grid', 
              gap: '16px', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' 
            }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '13px', 
                  fontWeight: '500',
                  color: '#ffffff'
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
                    width: '100%',
                    padding: '8px 12px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '13px', 
                  fontWeight: '500',
                  color: '#ffffff'
                }}>
                  Frame Rate (fps)
                </label>
                <select
                  value={processing.fps || 30}
                  onChange={(e) => handleSettingChange('fps', parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '14px'
                  }}
                >
                  <option value={24}>24 fps</option>
                  <option value={25}>25 fps</option>
                  <option value={30}>30 fps</option>
                  <option value={50}>50 fps</option>
                  <option value={60}>60 fps</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Resolution */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ 
          margin: '0 0 16px 0', 
          fontSize: '18px', 
          fontWeight: '500',
          color: '#ffffff'
        }}>
          Resolution
        </h3>
        
        <div style={{ 
          display: 'grid', 
          gap: '12px', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' 
        }}>
          {resolutionOptions.map(option => (
            <div
              key={option.value}
              onClick={() => handleSettingChange('resolution', option.value)}
              style={{
                padding: '16px',
                border: `2px solid ${processing.resolution === option.value ? '#7461ef' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: processing.resolution === option.value 
                  ? 'rgba(116, 97, 239, 0.1)' 
                  : 'rgba(255,255,255,0.05)',
              }}
            >
              <div style={{ 
                fontWeight: '500', 
                fontSize: '14px',
                color: processing.resolution === option.value ? '#7461ef' : '#ffffff',
                marginBottom: '4px'
              }}>
                {option.label}
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: '#b3b3b3',
                lineHeight: '1.4'
              }}>
                {option.description}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Video Codec */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ 
          margin: '0 0 16px 0', 
          fontSize: '18px', 
          fontWeight: '500',
          color: '#ffffff'
        }}>
          Video Codec
        </h3>
        
        <div style={{ 
          display: 'grid', 
          gap: '12px', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' 
        }}>
          {codecOptions.map(option => (
            <div
              key={option.value}
              onClick={() => handleSettingChange('codec', option.value)}
              style={{
                padding: '16px',
                border: `2px solid ${processing.codec === option.value ? '#7461ef' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: processing.codec === option.value 
                  ? 'rgba(116, 97, 239, 0.1)' 
                  : 'rgba(255,255,255,0.05)',
              }}
            >
              <div style={{ 
                fontWeight: '500', 
                fontSize: '14px',
                color: processing.codec === option.value ? '#7461ef' : '#ffffff',
                marginBottom: '4px'
              }}>
                {option.label}
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: '#b3b3b3',
                lineHeight: '1.4'
              }}>
                {option.description}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Output Directory */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ 
          margin: '0 0 16px 0', 
          fontSize: '18px', 
          fontWeight: '500',
          color: '#ffffff'
        }}>
          Output Directory
        </h3>
        
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center'
        }}>
          <div style={{
            flex: 1,
            padding: '12px 16px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#b3b3b3',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {selectedOutputPath || processing.outputPath || 'No directory selected'}
          </div>
          
          <button
            onClick={handleSelectOutputDirectory}
            style={{
              padding: '12px 20px',
              background: '#7461ef',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#6248d4'}
            onMouseOut={(e) => e.currentTarget.style.background = '#7461ef'}
          >
            Browse
          </button>
        </div>
        
        <p style={{ 
          margin: '8px 0 0 0', 
          fontSize: '12px', 
          color: '#b3b3b3' 
        }}>
          Choose where processed videos will be saved
        </p>
      </div>

      {/* Filename Pattern */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ 
          margin: '0 0 16px 0', 
          fontSize: '18px', 
          fontWeight: '500',
          color: '#ffffff'
        }}>
          Filename Pattern
        </h3>
        
        <input
          type="text"
          value={processing.filenamePattern || '{name}_converted.{ext}'}
          onChange={(e) => handleSettingChange('filenamePattern', e.target.value)}
          placeholder="{name}_converted.{ext}"
          style={{
            width: '100%',
            padding: '12px 16px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '14px',
            marginBottom: '8px'
          }}
        />
        
        <div style={{ 
          fontSize: '12px', 
          color: '#b3b3b3',
          lineHeight: '1.4'
        }}>
          Available placeholders: <code style={{ color: '#7461ef' }}>{'{name}'}</code>, <code style={{ color: '#7461ef' }}>{'{ext}'}</code>, <code style={{ color: '#7461ef' }}>{'{timestamp}'}</code>, <code style={{ color: '#7461ef' }}>{'{date}'}</code>
        </div>
      </div>
    </div>
  );
};

export default BasicSettings;