import React from 'react';
import './DeleteConfirmationDialog.css';

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  itemName?: string;
  itemCount?: number;
  destructive?: boolean;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  itemName,
  itemCount,
  destructive = true,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Enter') {
      onConfirm();
    }
  };

  return (
    <div 
      className="delete-confirmation-overlay"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className={`delete-confirmation-dialog ${destructive ? 'destructive' : ''}`}>
        {/* Icon */}
        <div className="dialog-icon">
          {destructive ? '⚠️' : '❓'}
        </div>

        {/* Content */}
        <div className="dialog-content">
          <h3 className="dialog-title">{title}</h3>
          
          <div className="dialog-message">
            {message}
          </div>

          {/* Item details */}
          {(itemName || itemCount) && (
            <div className="dialog-details">
              {itemName && (
                <div className="item-name">
                  <strong>"{itemName}"</strong>
                </div>
              )}
              {itemCount && itemCount > 1 && (
                <div className="item-count">
                  {itemCount} item{itemCount !== 1 ? 's' : ''} selected
                </div>
              )}
            </div>
          )}

          {/* Warning for destructive actions */}
          {destructive && (
            <div className="warning-notice">
              <span className="warning-icon">⚠️</span>
              <span className="warning-text">This action cannot be undone.</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="dialog-actions">
          <button
            className="dialog-button cancel"
            onClick={onCancel}
            autoFocus
          >
            {cancelText}
          </button>
          <button
            className={`dialog-button confirm ${destructive ? 'destructive' : 'primary'}`}
            onClick={onConfirm}
          >
            {destructive ? '🗑️' : ''} {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationDialog;