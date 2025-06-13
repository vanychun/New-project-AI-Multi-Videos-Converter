import React from 'react';

interface ProgressBarProps {
  progress: number; // 0-100
  message?: string;
  showPercentage?: boolean;
  color?: string;
  backgroundColor?: string;
  height?: number;
  animated?: boolean;
  striped?: boolean;
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  message,
  showPercentage = true,
  color = '#7461ef',
  backgroundColor = 'rgba(255, 255, 255, 0.1)',
  height = 8,
  animated = true,
  striped = false,
  className = ''
}) => {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  const containerStyle: React.CSSProperties = {
    width: '100%',
    background: backgroundColor,
    borderRadius: `${height / 2}px`,
    overflow: 'hidden',
    position: 'relative'
  };

  const barStyle: React.CSSProperties = {
    width: `${clampedProgress}%`,
    height: `${height}px`,
    background: striped 
      ? `repeating-linear-gradient(
          45deg,
          ${color},
          ${color} 10px,
          rgba(255,255,255,0.1) 10px,
          rgba(255,255,255,0.1) 20px
        )`
      : color,
    borderRadius: `${height / 2}px`,
    transition: animated ? 'width 0.3s ease' : 'none',
    ...(striped && animated && {
      backgroundSize: '20px 20px',
      animation: 'progressStripes 1s linear infinite'
    })
  };

  return (
    <div className={`progress-bar-container ${className}`}>
      {message && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
          fontSize: '14px',
          color: '#ffffff'
        }}>
          <span>{message}</span>
          {showPercentage && (
            <span style={{ fontWeight: '600' }}>
              {Math.round(clampedProgress)}%
            </span>
          )}
        </div>
      )}
      
      <div style={containerStyle}>
        <div style={barStyle} />
      </div>

      <style>{`
        @keyframes progressStripes {
          0% { background-position: 0 0; }
          100% { background-position: 20px 0; }
        }
      `}</style>
    </div>
  );
};

export default ProgressBar;