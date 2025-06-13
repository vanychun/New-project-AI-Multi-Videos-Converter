import { useState, useCallback } from 'react';

export interface ConfirmationConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger';
  icon?: string;
  details?: string[];
  showCheckbox?: boolean;
  checkboxLabel?: string;
  checkboxDefaultChecked?: boolean;
}

export interface ConfirmationState {
  isOpen: boolean;
  config: ConfirmationConfig | null;
  onConfirm: (() => void | Promise<void>) | null;
  loading: boolean;
  checkboxChecked: boolean;
}

export const useConfirmation = () => {
  const [state, setState] = useState<ConfirmationState>({
    isOpen: false,
    config: null,
    onConfirm: null,
    loading: false,
    checkboxChecked: false
  });

  const confirm = useCallback((
    config: ConfirmationConfig,
    onConfirm: () => void | Promise<void>
  ): Promise<{ confirmed: boolean; checkboxChecked?: boolean }> => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        config,
        onConfirm: async () => {
          try {
            setState(prev => ({ ...prev, loading: true }));
            await onConfirm();
            setState({
              isOpen: false,
              config: null,
              onConfirm: null,
              loading: false,
              checkboxChecked: false
            });
            resolve({ 
              confirmed: true, 
              checkboxChecked: config.showCheckbox ? state.checkboxChecked : undefined 
            });
          } catch (error) {
            setState(prev => ({ ...prev, loading: false }));
            throw error;
          }
        },
        loading: false,
        checkboxChecked: config.checkboxDefaultChecked || false
      });

      const originalOnConfirm = onConfirm;
      setState(prev => ({
        ...prev,
        onConfirm: async () => {
          try {
            setState(prev => ({ ...prev, loading: true }));
            await originalOnConfirm();
            setState({
              isOpen: false,
              config: null,
              onConfirm: null,
              loading: false,
              checkboxChecked: false
            });
            resolve({ 
              confirmed: true, 
              checkboxChecked: config.showCheckbox ? prev.checkboxChecked : undefined 
            });
          } catch (error) {
            setState(prev => ({ ...prev, loading: false }));
            throw error;
          }
        }
      }));
    });
  }, [state.checkboxChecked]);

  const cancel = useCallback(() => {
    setState({
      isOpen: false,
      config: null,
      onConfirm: null,
      loading: false,
      checkboxChecked: false
    });
  }, []);

  const setCheckboxChecked = useCallback((checked: boolean) => {
    setState(prev => ({ ...prev, checkboxChecked: checked }));
  }, []);

  return {
    ...state,
    confirm,
    cancel,
    setCheckboxChecked
  };
};

// Quick confirmation dialogs
export const useQuickConfirmation = () => {
  const confirmation = useConfirmation();

  const confirmDelete = useCallback((
    itemName: string,
    onConfirm: () => void | Promise<void>,
    details?: string[]
  ) => {
    return confirmation.confirm({
      title: 'Confirm Deletion',
      message: `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
      icon: '🗑️',
      details
    }, onConfirm);
  }, [confirmation]);

  const confirmBulkDelete = useCallback((
    count: number,
    onConfirm: () => void | Promise<void>,
    details?: string[]
  ) => {
    return confirmation.confirm({
      title: 'Confirm Bulk Deletion',
      message: `Are you sure you want to delete ${count} item(s)? This action cannot be undone.`,
      confirmText: 'Delete All',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
      icon: '🗑️',
      details
    }, onConfirm);
  }, [confirmation]);

  const confirmOverwrite = useCallback((
    fileName: string,
    onConfirm: () => void | Promise<void>
  ) => {
    return confirmation.confirm({
      title: 'File Already Exists',
      message: `The file "${fileName}" already exists. Do you want to overwrite it?`,
      confirmText: 'Overwrite',
      cancelText: 'Cancel',
      confirmVariant: 'primary',
      icon: '⚠️',
      showCheckbox: true,
      checkboxLabel: 'Apply to all remaining files'
    }, onConfirm);
  }, [confirmation]);

  const confirmExport = useCallback((
    count: number,
    estimatedTime: string,
    onConfirm: () => void | Promise<void>
  ) => {
    return confirmation.confirm({
      title: 'Start Export',
      message: `Ready to export ${count} video(s). Estimated time: ${estimatedTime}`,
      confirmText: 'Start Export',
      cancelText: 'Cancel',
      confirmVariant: 'primary',
      icon: '🚀',
      showCheckbox: true,
      checkboxLabel: 'Close application when complete'
    }, onConfirm);
  }, [confirmation]);

  return {
    ...confirmation,
    confirmDelete,
    confirmBulkDelete,
    confirmOverwrite,
    confirmExport
  };
};

export default useConfirmation;