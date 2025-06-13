import { useState, useCallback } from 'react';

interface DeleteConfirmationConfig {
  title: string;
  message: string;
  itemName?: string;
  itemCount?: number;
  destructive?: boolean;
  confirmText?: string;
  cancelText?: string;
}

interface UseDeleteConfirmationReturn {
  isOpen: boolean;
  config: DeleteConfirmationConfig | null;
  showDeleteConfirmation: (config: DeleteConfirmationConfig, onConfirm: () => void) => void;
  hideDeleteConfirmation: () => void;
  handleConfirm: () => void;
  handleCancel: () => void;
}

export const useDeleteConfirmation = (): UseDeleteConfirmationReturn => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<DeleteConfirmationConfig | null>(null);
  const [onConfirmCallback, setOnConfirmCallback] = useState<(() => void) | null>(null);

  const showDeleteConfirmation = useCallback((
    confirmationConfig: DeleteConfirmationConfig, 
    onConfirm: () => void
  ) => {
    setConfig(confirmationConfig);
    setOnConfirmCallback(() => onConfirm);
    setIsOpen(true);
  }, []);

  const hideDeleteConfirmation = useCallback(() => {
    setIsOpen(false);
    setConfig(null);
    setOnConfirmCallback(null);
  }, []);

  const handleConfirm = useCallback(() => {
    if (onConfirmCallback) {
      onConfirmCallback();
    }
    hideDeleteConfirmation();
  }, [onConfirmCallback, hideDeleteConfirmation]);

  const handleCancel = useCallback(() => {
    hideDeleteConfirmation();
  }, [hideDeleteConfirmation]);

  return {
    isOpen,
    config,
    showDeleteConfirmation,
    hideDeleteConfirmation,
    handleConfirm,
    handleCancel,
  };
};

export default useDeleteConfirmation;