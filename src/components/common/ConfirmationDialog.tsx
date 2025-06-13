import React from 'react';
import LoadingButton from './LoadingButton';

export interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger';
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  icon?: string;
  details?: string[];
  showCheckbox?: boolean;
  checkboxLabel?: string;
  checkboxChecked?: boolean;
  onCheckboxChange?: (checked: boolean) => void;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
  loading = false,
  icon,
  details,
  showCheckbox,
  checkboxLabel,
  checkboxChecked,
  onCheckboxChange
}) => {
  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!loading) {
      await onConfirm();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !loading) {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !loading) {
      onCancel();
    } else if (e.key === 'Enter' && !loading) {
      handleConfirm();
    }
  };

  return (
    <div 
      className="confirmation-dialog-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div 
        className="confirmation-dialog"
        style={{
          background: 'linear-gradient(135deg, #2d2d47 0%, #3a3a5c 100%)',
          border: '1px solid #4a4a6a',
          borderRadius: '12px',
          padding: '24px',
          minWidth: '400px',
          maxWidth: '500px',
          boxShadow: '0 16px 64px rgba(0, 0, 0, 0.4)',
          animation: 'slideIn 0.3s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px'
        }}>
          {icon && (
            <div style={{
              fontSize: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: confirmVariant === 'danger' 
                ? 'rgba(220, 53, 69, 0.1)' 
                : 'rgba(116, 97, 239, 0.1)'
            }}>
              {icon}
            </div>
          )}
          <h3 style={{
            color: '#ffffff',
            fontSize: '18px',
            fontWeight: '600',
            margin: 0
          }}>
            {title}
          </h3>
        </div>

        {/* Message */}
        <div style={{
          color: '#e0e0e0',
          fontSize: '14px',
          lineHeight: '1.5',
          marginBottom: details || showCheckbox ? '16px' : '24px'
        }}>
          {message}
        </div>

        {/* Details List */}
        {details && details.length > 0 && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid #4a4a6a',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: showCheckbox ? '16px' : '24px',
            maxHeight: '120px',
            overflowY: 'auto'
          }}>
            <ul style={{
              margin: 0,
              padding: 0,
              listStyle: 'none'
            }}>
              {details.map((detail, index) => (
                <li key={index} style={{
                  color: '#c0c0c0',
                  fontSize: '12px',
                  padding: '2px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ color: '#7461ef' }}>•</span>
                  {detail}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Checkbox Option */}
        {showCheckbox && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '24px',
            padding: '8px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '6px',
            border: '1px solid #4a4a6a'
          }}>
            <input
              type="checkbox"
              id="confirmation-checkbox"
              checked={checkboxChecked || false}
              onChange={(e) => onCheckboxChange?.(e.target.checked)}
              style={{
                width: '16px',
                height: '16px',
                accentColor: '#7461ef'
              }}
            />
            <label 
              htmlFor="confirmation-checkbox"
              style={{
                color: '#e0e0e0',
                fontSize: '13px',
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              {checkboxLabel}
            </label>
          </div>
        )}

        {/* Actions */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <LoadingButton
            variant="secondary"
            size="medium"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </LoadingButton>
          
          <LoadingButton
            variant={confirmVariant}
            size="medium"
            loading={loading}
            loadingText="Processing..."
            onClick={handleConfirm}
            icon={icon && !loading ? icon : undefined}
          >
            {confirmText}
          </LoadingButton>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideIn {
          from { 
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
          }
          to { 
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default ConfirmationDialog;