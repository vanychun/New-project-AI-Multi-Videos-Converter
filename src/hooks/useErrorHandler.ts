import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { addNotification } from '../store/slices/uiSlice';

export interface ErrorContext {
  action?: string;
  component?: string;
  userId?: string;
  additionalData?: Record<string, any>;
}

export interface ErrorHandlingOptions {
  showNotification?: boolean;
  notificationType?: 'error' | 'warning' | 'info';
  autoRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  fallbackAction?: () => void;
  customMessage?: string;
}

export const useErrorHandler = () => {
  const dispatch = useDispatch();

  const handleError = useCallback((
    error: Error | string,
    context?: ErrorContext,
    options: ErrorHandlingOptions = {}
  ) => {
    const {
      showNotification = true,
      notificationType = 'error',
      customMessage,
      fallbackAction
    } = options;

    const errorMessage = typeof error === 'string' ? error : error.message;
    const userFriendlyMessage = customMessage || getUserFriendlyMessage(errorMessage, context);

    // Log error for debugging
    console.error('Error handled:', {
      error: errorMessage,
      context,
      stack: typeof error === 'object' ? error.stack : undefined
    });

    // Show notification to user
    if (showNotification) {
      dispatch(addNotification({
        type: notificationType,
        title: getErrorTitle(notificationType, context),
        message: userFriendlyMessage,
        autoClose: notificationType !== 'error',
        duration: notificationType === 'error' ? 8000 : 5000,
      }));
    }

    // Execute fallback action if provided
    if (fallbackAction) {
      try {
        fallbackAction();
      } catch (fallbackError) {
        console.error('Fallback action failed:', fallbackError);
      }
    }

    // Report error to analytics (if implemented)
    reportError(error, context);
  }, [dispatch]);

  const handleAsyncError = useCallback(async (
    asyncOperation: () => Promise<any>,
    context?: ErrorContext,
    options: ErrorHandlingOptions = {}
  ) => {
    const { autoRetry = false, maxRetries = 3, retryDelay = 1000 } = options;
    let attempts = 0;

    const executeWithRetry = async (): Promise<any> => {
      try {
        attempts++;
        return await asyncOperation();
      } catch (error) {
        if (autoRetry && attempts < maxRetries) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempts));
          return executeWithRetry();
        }
        
        // Final attempt failed or no retry - handle error
        handleError(error as Error, context, {
          ...options,
          customMessage: options.customMessage || 
            (attempts > 1 ? `Failed after ${attempts} attempts: ${(error as Error).message}` : undefined)
        });
        
        throw error;
      }
    };

    return executeWithRetry();
  }, [handleError]);

  const createErrorHandler = useCallback((
    context: ErrorContext,
    options: ErrorHandlingOptions = {}
  ) => {
    return (error: Error | string) => handleError(error, context, options);
  }, [handleError]);

  return {
    handleError,
    handleAsyncError,
    createErrorHandler
  };
};

// Helper functions
const getUserFriendlyMessage = (errorMessage: string, context?: ErrorContext): string => {
  // Map technical errors to user-friendly messages
  const errorMappings: Record<string, string> = {
    'Network Error': 'Unable to connect to the server. Please check your internet connection.',
    'Timeout': 'The operation took too long. Please try again.',
    'Permission denied': 'You don\'t have permission to perform this action.',
    'File not found': 'The requested file could not be found.',
    'Invalid format': 'The file format is not supported.',
    'Insufficient storage': 'Not enough storage space available.',
    'ENOENT': 'File or directory not found.',
    'EACCES': 'Permission denied to access this file.',
    'EMFILE': 'Too many files open. Please close some files and try again.',
    'ENOSPC': 'No space left on device.',
  };

  // Check for specific error patterns
  for (const [pattern, userMessage] of Object.entries(errorMappings)) {
    if (errorMessage.toLowerCase().includes(pattern.toLowerCase())) {
      return userMessage;
    }
  }

  // Context-specific messages
  if (context?.action) {
    switch (context.action) {
      case 'import':
        return 'Failed to import video file. Please check if the file is corrupted or in an unsupported format.';
      case 'export':
        return 'Export failed. Please check your export settings and available disk space.';
      case 'preview':
        return 'Unable to preview video. The file might be corrupted or in an unsupported format.';
      case 'delete':
        return 'Failed to delete video. The file might be in use by another application.';
      case 'save':
        return 'Failed to save changes. Please check your permissions and try again.';
      case 'load':
        return 'Failed to load data. Please refresh the application and try again.';
      default:
        break;
    }
  }

  // Fallback to original message if no mapping found
  return errorMessage.length > 100 
    ? 'An unexpected error occurred. Please try again or contact support if the problem persists.'
    : errorMessage;
};

const getErrorTitle = (type: string, context?: ErrorContext): string => {
  if (context?.action) {
    const actionTitles: Record<string, string> = {
      import: 'Import Failed',
      export: 'Export Failed',
      preview: 'Preview Failed',
      delete: 'Delete Failed',
      save: 'Save Failed',
      load: 'Load Failed',
    };
    
    return actionTitles[context.action] || 'Error';
  }

  switch (type) {
    case 'error': return 'Error';
    case 'warning': return 'Warning';
    case 'info': return 'Notice';
    default: return 'Error';
  }
};

const reportError = (error: Error | string, context?: ErrorContext) => {
  // Here you could send error reports to your analytics service
  const errorReport = {
    message: typeof error === 'string' ? error : error.message,
    stack: typeof error === 'object' ? error.stack : undefined,
    context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
  };

  // Example: Send to analytics service
  // analyticsService.reportError(errorReport);
  
  console.log('Error reported:', errorReport);
};