import { Middleware } from '@reduxjs/toolkit';
import { performanceMonitor, memoryManager } from '../../utils/performanceMonitor';

interface PerformanceConfig {
  logSlowActions: boolean;
  slowActionThreshold: number;
  enableCaching: boolean;
  maxStateHistory: number;
}

const defaultConfig: PerformanceConfig = {
  logSlowActions: true,
  slowActionThreshold: 100, // ms
  enableCaching: true,
  maxStateHistory: 50
};

export const createPerformanceMiddleware = (config: Partial<PerformanceConfig> = {}): Middleware => {
  const finalConfig = { ...defaultConfig, ...config };
  const stateHistory: any[] = [];
  
  return (store) => (next) => (action) => {
    const startTime = performance.now();
    
    // Log action for debugging
    if (process.env.NODE_ENV === 'development') {
      console.group(`🔄 Action: ${action.type}`);
      console.log('Payload:', action.payload);
    }
    
    const result = next(action);
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Log slow actions
    if (finalConfig.logSlowActions && duration > finalConfig.slowActionThreshold) {
      console.warn(`⚠️ Slow action detected: ${action.type} took ${duration.toFixed(2)}ms`);
    }
    
    // Track performance metrics
    performanceMonitor.recordRenderTime(`redux-action-${action.type}`, startTime);
    
    // Manage state history for time-travel debugging
    if (finalConfig.maxStateHistory > 0) {
      const currentState = store.getState();
      stateHistory.push({
        action,
        state: currentState,
        timestamp: Date.now()
      });
      
      // Keep only recent history
      if (stateHistory.length > finalConfig.maxStateHistory) {
        stateHistory.shift();
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Duration:', `${duration.toFixed(2)}ms`);
      console.groupEnd();
    }
    
    return result;
  };
};

// Selector memoization middleware
export const selectorCacheMiddleware: Middleware = (store) => (next) => (action) => {
  // Clear selector cache on state mutations
  if (action.type.includes('add') || action.type.includes('remove') || action.type.includes('update')) {
    memoryManager.clear('selectors');
  }
  
  return next(action);
};

// Memory cleanup middleware
export const memoryCleanupMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action);
  
  // Trigger cleanup periodically
  if (Math.random() < 0.01) { // 1% chance per action
    setTimeout(() => {
      memoryManager.cleanup();
      // Force garbage collection in development
      if (process.env.NODE_ENV === 'development' && 'gc' in window) {
        (window as any).gc();
      }
    }, 0);
  }
  
  return result;
};