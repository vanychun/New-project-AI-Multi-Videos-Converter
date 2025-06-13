import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';

const AIEnhancementSimple: React.FC = () => {
  const dispatch = useDispatch();
  const { ai: aiSettings } = useSelector((state: RootState) => state.settings);
  
  return (
    <div style={{ color: 'white', padding: '20px' }}>
      <h3 style={{ color: 'white', marginBottom: '20px' }}>🚀 AI Enhancement Suite</h3>
      
      <div style={{ 
        background: 'rgba(116, 97, 239, 0.1)', 
        border: '1px solid rgba(116, 97, 239, 0.3)',
        borderRadius: '12px', 
        padding: '16px',
        marginBottom: '16px'
      }}>
        <h4 style={{ color: 'white', margin: '0 0 8px 0' }}>🔍 AI Video Upscaling</h4>
        <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
          Status: {aiSettings.upscaling.enabled ? 'Enabled' : 'Disabled'}
        </p>
        <p style={{ color: '#94a3b8', fontSize: '14px', margin: '4px 0 0 0' }}>
          Factor: {aiSettings.upscaling.factor}x, Model: {aiSettings.upscaling.model}
        </p>
      </div>

      <div style={{ 
        background: 'rgba(116, 97, 239, 0.1)', 
        border: '1px solid rgba(116, 97, 239, 0.3)',
        borderRadius: '12px', 
        padding: '16px',
        marginBottom: '16px'
      }}>
        <h4 style={{ color: 'white', margin: '0 0 8px 0' }}>🎨 AI Denoising</h4>
        <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
          Status: {aiSettings.denoising.enabled ? 'Enabled' : 'Disabled'}
        </p>
        <p style={{ color: '#94a3b8', fontSize: '14px', margin: '4px 0 0 0' }}>
          Level: {aiSettings.denoising.level}
        </p>
      </div>

      <div style={{ 
        background: 'rgba(116, 97, 239, 0.1)', 
        border: '1px solid rgba(116, 97, 239, 0.3)',
        borderRadius: '12px', 
        padding: '16px',
        marginBottom: '16px'
      }}>
        <h4 style={{ color: 'white', margin: '0 0 8px 0' }}>👤 Face Enhancement</h4>
        <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
          Status: {aiSettings.faceEnhancement.enabled ? 'Enabled' : 'Disabled'}
        </p>
        <p style={{ color: '#94a3b8', fontSize: '14px', margin: '4px 0 0 0' }}>
          Strength: {aiSettings.faceEnhancement.strength}%
        </p>
      </div>

      <div style={{ 
        background: 'rgba(116, 97, 239, 0.1)', 
        border: '1px solid rgba(116, 97, 239, 0.3)',
        borderRadius: '12px', 
        padding: '16px'
      }}>
        <h4 style={{ color: 'white', margin: '0 0 8px 0' }}>🎬 Frame Interpolation</h4>
        <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
          Status: {aiSettings.frameInterpolation.enabled ? 'Enabled' : 'Disabled'}
        </p>
        <p style={{ color: '#94a3b8', fontSize: '14px', margin: '4px 0 0 0' }}>
          Target FPS: {aiSettings.frameInterpolation.targetFps}
        </p>
      </div>
    </div>
  );
};

export default AIEnhancementSimple;