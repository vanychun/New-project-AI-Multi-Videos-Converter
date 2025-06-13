import React from 'react';
import LoadingSpinner from './LoadingSpinner';

interface LoadingButtonProps {
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  className?: string;
  loadingText?: string;
  icon?: string;
}

const LoadingButton: React.FC<LoadingButtonProps> = ({
  onClick,
  loading = false,
  disabled = false,
  children,
  variant = 'primary',
  size = 'medium',
  className = '',
  loadingText,
  icon
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          background: loading || disabled ? '#4a4a6a' : '#7461ef',
          border: 'none',
          color: '#ffffff'
        };
      case 'secondary':
        return {
          background: 'none',
          border: '1px solid #4a4a6a',
          color: '#ffffff'
        };
      case 'danger':
        return {
          background: loading || disabled ? '#4a4a6a' : '#dc3545',
          border: 'none',
          color: '#ffffff'
        };
      default:
        return {
          background: '#7461ef',
          border: 'none',
          color: '#ffffff'
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          padding: '6px 12px',
          fontSize: '12px'
        };
      case 'medium':
        return {
          padding: '8px 16px',
          fontSize: '14px'
        };
      case 'large':
        return {
          padding: '12px 24px',
          fontSize: '16px'
        };
      default:
        return {
          padding: '8px 16px',
          fontSize: '14px'
        };
    }
  };

  const buttonStyle: React.CSSProperties = {
    ...getVariantStyles(),
    ...getSizeStyles(),
    borderRadius: '6px',
    cursor: loading || disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontWeight: '500',
    outline: 'none',
    opacity: loading || disabled ? 0.7 : 1,
    ...(!loading && !disabled && variant === 'primary' && {
      ':hover': {
        background: '#8b73ff'
      }
    })
  };

  const handleClick = () => {
    if (!loading && !disabled && onClick) {
      onClick();
    }
  };

  const getSpinnerSize = () => {
    switch (size) {
      case 'small': return 'small';
      case 'large': return 'medium';
      default: return 'small';
    }
  };

  return (
    <button
      className={`loading-button ${className}`}
      style={buttonStyle}
      onClick={handleClick}
      disabled={loading || disabled}
      onMouseEnter={(e) => {
        if (!loading && !disabled && variant === 'primary') {
          e.currentTarget.style.background = '#8b73ff';
        } else if (!loading && !disabled && variant === 'secondary') {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
        } else if (!loading && !disabled && variant === 'danger') {
          e.currentTarget.style.background = '#ff6b7a';
        }
      }}
      onMouseLeave={(e) => {
        if (!loading && !disabled) {
          const styles = getVariantStyles();
          e.currentTarget.style.background = styles.background || '';
        }
      }}
    >
      {loading && (
        <LoadingSpinner 
          size={getSpinnerSize() as 'small' | 'medium' | 'large'} 
          color="#ffffff" 
        />
      )}
      {icon && !loading && <span>{icon}</span>}
      <span>
        {loading && loadingText ? loadingText : children}
      </span>
    </button>
  );
};

export default LoadingButton;