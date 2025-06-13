import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { addVideoEffect, removeVideoEffect } from '../../store/slices/videoSlice';
import { addNotification } from '../../store/slices/uiSlice';

interface Effect {
  id: string;
  name: string;
  description: string;
  category: 'color' | 'audio' | 'transition' | 'filter' | 'transform';
  icon: string;
  settings: {
    [key: string]: {
      type: 'range' | 'select' | 'checkbox' | 'color' | 'number';
      value: any;
      min?: number;
      max?: number;
      step?: number;
      options?: string[];
      label: string;
    };
  };
  preset?: boolean;
  preview?: string;
}

const EffectsLibrary: React.FC = () => {
  const dispatch = useDispatch();
  const { selectedVideos, videos } = useSelector((state: RootState) => state.videos);
  
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'color' | 'audio' | 'transition' | 'filter' | 'transform'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEffect, setSelectedEffect] = useState<Effect | null>(null);
  const [effectSettings, setEffectSettings] = useState<any>({});
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  
  const availableEffects: Effect[] = [
    // Color Effects
    {
      id: 'brightness',
      name: 'Brightness',
      description: 'Adjust video brightness levels',
      category: 'color',
      icon: '🔆',
      settings: {
        brightness: {
          type: 'range',
          value: 0,
          min: -100,
          max: 100,
          step: 1,
          label: 'Brightness'
        },
        contrast: {
          type: 'range',
          value: 0,
          min: -100,
          max: 100,
          step: 1,
          label: 'Contrast'
        }
      }
    },
    {
      id: 'color_balance',
      name: 'Color Balance',
      description: 'Adjust color temperature and tint',
      category: 'color',
      icon: '🎨',
      settings: {
        temperature: {
          type: 'range',
          value: 0,
          min: -100,
          max: 100,
          step: 1,
          label: 'Temperature'
        },
        tint: {
          type: 'range',
          value: 0,
          min: -100,
          max: 100,
          step: 1,
          label: 'Tint'
        },
        saturation: {
          type: 'range',
          value: 0,
          min: -100,
          max: 100,
          step: 1,
          label: 'Saturation'
        }
      }
    },
    {
      id: 'lut',
      name: 'LUT Color Grading',
      description: 'Apply professional color grading LUTs',
      category: 'color',
      icon: '🎬',
      settings: {
        lut_file: {
          type: 'select',
          value: 'none',
          options: ['none', 'cinematic', 'warm', 'cool', 'vintage', 'vibrant'],
          label: 'LUT Style'
        },
        intensity: {
          type: 'range',
          value: 100,
          min: 0,
          max: 100,
          step: 1,
          label: 'Intensity'
        }
      }
    },
    
    // Audio Effects
    {
      id: 'volume',
      name: 'Volume Control',
      description: 'Adjust audio volume and normalize',
      category: 'audio',
      icon: '🔊',
      settings: {
        volume: {
          type: 'range',
          value: 100,
          min: 0,
          max: 200,
          step: 1,
          label: 'Volume (%)'
        },
        normalize: {
          type: 'checkbox',
          value: false,
          label: 'Auto Normalize'
        }
      }
    },
    {
      id: 'audio_eq',
      name: 'Audio Equalizer',
      description: 'Adjust frequency bands',
      category: 'audio',
      icon: '🎛️',
      settings: {
        bass: {
          type: 'range',
          value: 0,
          min: -20,
          max: 20,
          step: 0.5,
          label: 'Bass (dB)'
        },
        mid: {
          type: 'range',
          value: 0,
          min: -20,
          max: 20,
          step: 0.5,
          label: 'Mid (dB)'
        },
        treble: {
          type: 'range',
          value: 0,
          min: -20,
          max: 20,
          step: 0.5,
          label: 'Treble (dB)'
        }
      }
    },
    
    // Filter Effects
    {
      id: 'blur',
      name: 'Blur Effect',
      description: 'Apply gaussian or motion blur',
      category: 'filter',
      icon: '💫',
      settings: {
        type: {
          type: 'select',
          value: 'gaussian',
          options: ['gaussian', 'motion', 'radial'],
          label: 'Blur Type'
        },
        strength: {
          type: 'range',
          value: 5,
          min: 0,
          max: 50,
          step: 0.5,
          label: 'Strength'
        }
      }
    },
    {
      id: 'sharpen',
      name: 'Sharpen',
      description: 'Enhance image sharpness',
      category: 'filter',
      icon: '🔍',
      settings: {
        amount: {
          type: 'range',
          value: 0.5,
          min: 0,
          max: 2,
          step: 0.1,
          label: 'Amount'
        },
        radius: {
          type: 'range',
          value: 1,
          min: 0.1,
          max: 5,
          step: 0.1,
          label: 'Radius'
        }
      }
    },
    {
      id: 'noise_reduction',
      name: 'Noise Reduction',
      description: 'Remove video noise and grain',
      category: 'filter',
      icon: '✨',
      settings: {
        strength: {
          type: 'range',
          value: 3,
          min: 1,
          max: 10,
          step: 1,
          label: 'Strength'
        },
        preserve_detail: {
          type: 'checkbox',
          value: true,
          label: 'Preserve Detail'
        }
      }
    },
    
    // Transform Effects
    {
      id: 'scale',
      name: 'Scale & Crop',
      description: 'Resize and crop video',
      category: 'transform',
      icon: '📐',
      settings: {
        scale: {
          type: 'range',
          value: 100,
          min: 10,
          max: 500,
          step: 1,
          label: 'Scale (%)'
        },
        crop_x: {
          type: 'number',
          value: 0,
          label: 'Crop X'
        },
        crop_y: {
          type: 'number',
          value: 0,
          label: 'Crop Y'
        },
        crop_w: {
          type: 'number',
          value: 0,
          label: 'Crop Width'
        },
        crop_h: {
          type: 'number',
          value: 0,
          label: 'Crop Height'
        }
      }
    },
    {
      id: 'rotate',
      name: 'Rotate & Flip',
      description: 'Rotate and flip video orientation',
      category: 'transform',
      icon: '🔄',
      settings: {
        rotation: {
          type: 'select',
          value: '0',
          options: ['0', '90', '180', '270'],
          label: 'Rotation (degrees)'
        },
        flip_h: {
          type: 'checkbox',
          value: false,
          label: 'Flip Horizontal'
        },
        flip_v: {
          type: 'checkbox',
          value: false,
          label: 'Flip Vertical'
        }
      }
    },
    
    // Transition Effects
    {
      id: 'fade',
      name: 'Fade In/Out',
      description: 'Add fade transitions',
      category: 'transition',
      icon: '🌅',
      settings: {
        fade_in: {
          type: 'range',
          value: 0,
          min: 0,
          max: 10,
          step: 0.1,
          label: 'Fade In (seconds)'
        },
        fade_out: {
          type: 'range',
          value: 0,
          min: 0,
          max: 10,
          step: 0.1,
          label: 'Fade Out (seconds)'
        }
      }
    }
  ];
  
  const categories = [
    { id: 'all', label: 'All Effects', icon: '🎯' },
    { id: 'color', label: 'Color', icon: '🎨' },
    { id: 'audio', label: 'Audio', icon: '🔊' },
    { id: 'filter', label: 'Filters', icon: '✨' },
    { id: 'transform', label: 'Transform', icon: '📐' },
    { id: 'transition', label: 'Transitions', icon: '🌅' }
  ];
  
  const filteredEffects = availableEffects.filter(effect => {
    const matchesCategory = selectedCategory === 'all' || effect.category === selectedCategory;
    const matchesSearch = effect.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         effect.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });
  
  useEffect(() => {
    if (selectedEffect) {
      const initialSettings: any = {};
      Object.entries(selectedEffect.settings).forEach(([key, setting]) => {
        initialSettings[key] = setting.value;
      });
      setEffectSettings(initialSettings);
    }
  }, [selectedEffect]);
  
  const handleApplyEffect = () => {
    if (!selectedEffect || selectedVideos.length === 0) {
      dispatch(addNotification({
        type: 'warning',
        title: 'Cannot Apply Effect',
        message: 'Please select videos and an effect to apply.',
        autoClose: true,
        duration: 3000,
      }));
      return;
    }
    
    const effectData = {
      id: selectedEffect.id,
      name: selectedEffect.name,
      settings: effectSettings,
      timestamp: Date.now()
    };
    
    selectedVideos.forEach(videoId => {
      dispatch(addVideoEffect({ videoId, effect: effectData }));
    });
    
    dispatch(addNotification({
      type: 'success',
      title: 'Effect Applied',
      message: `${selectedEffect.name} applied to ${selectedVideos.length} video(s)`,
      autoClose: true,
      duration: 3000,
    }));
  };
  
  const handlePreviewEffect = () => {
    if (!selectedEffect || selectedVideos.length === 0) return;
    
    setIsPreviewMode(true);
    dispatch(addNotification({
      type: 'info',
      title: 'Preview Mode',
      message: 'Effect preview is being generated...',
      autoClose: true,
      duration: 2000,
    }));
    
    // Simulate preview generation
    setTimeout(() => {
      setIsPreviewMode(false);
    }, 3000);
  };
  
  const renderEffectSettings = () => {
    if (!selectedEffect) return null;
    
    return (
      <div className="effect-settings">
        <h4 className="settings-title">Effect Settings</h4>
        
        {Object.entries(selectedEffect.settings).map(([key, setting]) => (
          <div key={key} className="setting-control">
            <label className="setting-label">{setting.label}</label>
            
            {setting.type === 'range' && (
              <div className="range-control">
                <input
                  type="range"
                  min={setting.min}
                  max={setting.max}
                  step={setting.step}
                  value={effectSettings[key] || setting.value}
                  onChange={(e) => setEffectSettings((prev: any) => ({
                    ...prev,
                    [key]: parseFloat(e.target.value)
                  }))}
                  className="range-input"
                />
                <span className="range-value">
                  {effectSettings[key] || setting.value}
                </span>
              </div>
            )}
            
            {setting.type === 'select' && (
              <select
                value={effectSettings[key] || setting.value}
                onChange={(e) => setEffectSettings((prev: any) => ({
                  ...prev,
                  [key]: e.target.value
                }))}
                className="select-input"
              >
                {setting.options?.map(option => (
                  <option key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </option>
                ))}
              </select>
            )}
            
            {setting.type === 'checkbox' && (
              <label className="checkbox-control">
                <input
                  type="checkbox"
                  checked={effectSettings[key] !== undefined ? effectSettings[key] : setting.value}
                  onChange={(e) => setEffectSettings((prev: any) => ({
                    ...prev,
                    [key]: e.target.checked
                  }))}
                  className="checkbox-input"
                />
                <span className="checkbox-mark"></span>
              </label>
            )}
            
            {setting.type === 'number' && (
              <input
                type="number"
                value={effectSettings[key] || setting.value}
                onChange={(e) => setEffectSettings((prev: any) => ({
                  ...prev,
                  [key]: parseInt(e.target.value)
                }))}
                className="number-input"
              />
            )}
            
            {setting.type === 'color' && (
              <input
                type="color"
                value={effectSettings[key] || setting.value}
                onChange={(e) => setEffectSettings((prev: any) => ({
                  ...prev,
                  [key]: e.target.value
                }))}
                className="color-input"
              />
            )}
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div className="effects-library">
      {/* Header */}
      <div className="library-header">
        <h4 className="header-title">🎨 Effects Library</h4>
        <div className="header-info">
          {selectedVideos.length > 0 && (
            <span className="selected-count">
              {selectedVideos.length} video(s) selected
            </span>
          )}
        </div>
      </div>
      
      {/* Search and Filters */}
      <div className="library-controls">
        <div className="search-section">
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="Search effects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <div className="search-icon">🔍</div>
          </div>
        </div>
        
        <div className="category-filters">
          {categories.map(category => (
            <button
              key={category.id}
              className={`category-button ${selectedCategory === category.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category.id as any)}
            >
              <span className="category-icon">{category.icon}</span>
              <span className="category-label">{category.label}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Effects Grid */}
      <div className="effects-content">
        <div className="effects-grid">
          {filteredEffects.map(effect => (
            <div
              key={effect.id}
              className={`effect-card ${selectedEffect?.id === effect.id ? 'selected' : ''}`}
              onClick={() => setSelectedEffect(effect)}
            >
              <div className="effect-icon">{effect.icon}</div>
              <div className="effect-info">
                <div className="effect-name">{effect.name}</div>
                <div className="effect-description">{effect.description}</div>
              </div>
              <div className="effect-badge">
                {effect.category}
              </div>
            </div>
          ))}
        </div>
        
        {filteredEffects.length === 0 && (
          <div className="no-effects">
            <div className="no-effects-icon">🔍</div>
            <div className="no-effects-text">No effects found</div>
            <div className="no-effects-subtitle">
              Try adjusting your search or category filter
            </div>
          </div>
        )}
      </div>
      
      {/* Effect Settings Panel */}
      {selectedEffect && (
        <div className="settings-panel">
          <div className="panel-header">
            <div className="panel-title">
              <span className="effect-icon">{selectedEffect.icon}</span>
              <span className="effect-name">{selectedEffect.name}</span>
            </div>
            <button
              className="close-button"
              onClick={() => setSelectedEffect(null)}
            >
              ✕
            </button>
          </div>
          
          <div className="panel-content">
            <div className="effect-description">
              {selectedEffect.description}
            </div>
            
            {renderEffectSettings()}
            
            <div className="effect-actions">
              <button
                className="preview-button"
                onClick={handlePreviewEffect}
                disabled={selectedVideos.length === 0 || isPreviewMode}
              >
                {isPreviewMode ? '⏳ Generating...' : '👁️ Preview'}
              </button>
              
              <button
                className="apply-button"
                onClick={handleApplyEffect}
                disabled={selectedVideos.length === 0}
              >
                ✨ Apply Effect
              </button>
            </div>
            
            {selectedVideos.length === 0 && (
              <div className="no-selection-warning">
                ⚠️ Select videos in the library to apply effects
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Applied Effects Summary */}
      {selectedVideos.length > 0 && (
        <div className="applied-effects-summary">
          <h5 className="summary-title">Applied Effects</h5>
          {selectedVideos.map(videoId => {
            const video = videos.find(v => v.id === videoId);
            if (!video || !video.effects || video.effects.length === 0) return null;
            
            return (
              <div key={videoId} className="video-effects">
                <div className="video-name">{video.name}</div>
                <div className="effects-list">
                  {video.effects.map((effect, index) => (
                    <div key={index} className="applied-effect">
                      <span className="effect-name">{effect.name}</span>
                      <button
                        className="remove-effect"
                        onClick={() => dispatch(removeVideoEffect({ videoId, effectIndex: index }))}
                        title="Remove effect"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EffectsLibrary;