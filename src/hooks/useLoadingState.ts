import { useState, useCallback, useRef } from 'react';

export interface LoadingState {
  isLoading: boolean;
  progress?: number;
  message?: string;
  error?: string;
}

export interface LoadingOperation {
  start: (message?: string) => void;
  update: (progress: number, message?: string) => void;
  complete: (message?: string) => void;
  error: (error: string) => void;
  reset: () => void;
}

export const useLoadingState = (initialMessage?: string): [LoadingState, LoadingOperation] => {
  const [state, setState] = useState<LoadingState>({
    isLoading: false,
    progress: undefined,
    message: initialMessage,
    error: undefined
  });

  const timeoutRef = useRef<NodeJS.Timeout>();

  const start = useCallback((message?: string) => {
    setState({
      isLoading: true,
      progress: 0,
      message: message || initialMessage,
      error: undefined
    });
  }, [initialMessage]);

  const update = useCallback((progress: number, message?: string) => {
    setState(prev => ({
      ...prev,
      progress: Math.max(0, Math.min(100, progress)),
      message: message || prev.message
    }));
  }, []);

  const complete = useCallback((message?: string) => {
    setState(prev => ({
      ...prev,
      isLoading: false,
      progress: 100,
      message: message || 'Completed',
      error: undefined
    }));

    // Auto-reset after completion
    timeoutRef.current = setTimeout(() => {
      setState(prev => ({
        ...prev,
        progress: undefined,
        message: initialMessage
      }));
    }, 2000);
  }, [initialMessage]);

  const error = useCallback((errorMessage: string) => {
    setState(prev => ({
      ...prev,
      isLoading: false,
      error: errorMessage,
      message: 'Error occurred'
    }));

    // Auto-reset after error
    timeoutRef.current = setTimeout(() => {
      setState(prev => ({
        ...prev,
        error: undefined,
        message: initialMessage
      }));
    }, 5000);
  }, [initialMessage]);

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setState({
      isLoading: false,
      progress: undefined,
      message: initialMessage,
      error: undefined
    });
  }, [initialMessage]);

  const operations: LoadingOperation = {
    start,
    update,
    complete,
    error,
    reset
  };

  return [state, operations];
};

// Hook for managing multiple loading states
export const useMultipleLoadingStates = () => {
  const [states, setStates] = useState<Record<string, LoadingState>>({});

  const createOperation = useCallback((key: string, initialMessage?: string): LoadingOperation => {
    const start = (message?: string) => {
      setStates(prev => ({
        ...prev,
        [key]: {
          isLoading: true,
          progress: 0,
          message: message || initialMessage,
          error: undefined
        }
      }));
    };

    const update = (progress: number, message?: string) => {
      setStates(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          progress: Math.max(0, Math.min(100, progress)),
          message: message || prev[key]?.message
        }
      }));
    };

    const complete = (message?: string) => {
      setStates(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          isLoading: false,
          progress: 100,
          message: message || 'Completed',
          error: undefined
        }
      }));

      // Auto-reset after completion
      setTimeout(() => {
        setStates(prev => {
          const newStates = { ...prev };
          if (newStates[key]) {
            newStates[key] = {
              ...newStates[key],
              progress: undefined,
              message: initialMessage
            };
          }
          return newStates;
        });
      }, 2000);
    };

    const error = (errorMessage: string) => {
      setStates(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          isLoading: false,
          error: errorMessage,
          message: 'Error occurred'
        }
      }));

      // Auto-reset after error
      setTimeout(() => {
        setStates(prev => {
          const newStates = { ...prev };
          if (newStates[key]) {
            newStates[key] = {
              ...newStates[key],
              error: undefined,
              message: initialMessage
            };
          }
          return newStates;
        });
      }, 5000);
    };

    const reset = () => {
      setStates(prev => ({
        ...prev,
        [key]: {
          isLoading: false,
          progress: undefined,
          message: initialMessage,
          error: undefined
        }
      }));
    };

    return {
      start,
      update,
      complete,
      error,
      reset
    };
  }, []);

  const getState = useCallback((key: string): LoadingState => {
    return states[key] || {
      isLoading: false,
      progress: undefined,
      message: undefined,
      error: undefined
    };
  }, [states]);

  const isAnyLoading = useCallback((): boolean => {
    return Object.values(states).some(state => state.isLoading);
  }, [states]);

  return {
    getState,
    createOperation,
    isAnyLoading,
    states
  };
};