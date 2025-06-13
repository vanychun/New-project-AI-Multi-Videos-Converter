import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'loading' | 'completion' | 'enhancement';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
    primary?: boolean;
  }>;
  progress?: number;
  metadata?: Record<string, any>;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => string;
  removeNotification: (id: string) => void;
  updateNotification: (id: string, updates: Partial<Notification>) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// Notification component
const NotificationItem: React.FC<{
  notification: Notification;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Notification>) => void;
}> = ({ notification, onRemove, onUpdate }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Animate in
    setTimeout(() => setIsVisible(true), 10);

    // Auto-remove after duration
    if (!notification.persistent && notification.duration) {
      const timer = setTimeout(() => {
        handleRemove();
      }, notification.duration);
      return () => clearTimeout(timer);
    }
  }, [notification.duration, notification.persistent]);

  const handleRemove = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onRemove(notification.id);
    }, 300);
  }, [notification.id, onRemove]);

  const getIcon = () => {
    switch (notification.type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      case 'loading': return '⏳';
      case 'completion': return '🎉';
      case 'enhancement': return '🚀';
      default: return 'ℹ️';
    }
  };

  const getColors = () => {
    switch (notification.type) {
      case 'success': return { bg: '#10b981', border: '#059669' };
      case 'error': return { bg: '#ef4444', border: '#dc2626' };
      case 'warning': return { bg: '#f59e0b', border: '#d97706' };
      case 'info': return { bg: '#3b82f6', border: '#2563eb' };
      case 'loading': return { bg: '#8b5cf6', border: '#7c3aed' };
      case 'completion': return { bg: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)', border: '#059669' };
      case 'enhancement': return { bg: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)', border: '#7c3aed' };
      default: return { bg: '#6b7280', border: '#4b5563' };
    }
  };

  const colors = getColors();

  return (
    <div
      style={{
        transform: isVisible && !isExiting ? 'translateX(0)' : 'translateX(100%)',
        opacity: isVisible && !isExiting ? 1 : 0,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        marginBottom: '12px',
        background: 'rgba(0, 0, 0, 0.9)',
        backdropFilter: 'blur(10px)',
        border: `1px solid ${colors.border}`,
        borderRadius: '12px',
        padding: '16px',
        minWidth: '320px',
        maxWidth: '480px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Progress bar for loading notifications */}
      {notification.type === 'loading' && notification.progress !== undefined && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: `${notification.progress}%`,
            height: '3px',
            background: colors.bg,
            transition: 'width 0.3s ease'
          }}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ fontSize: '20px', lineHeight: 1, marginTop: '2px' }}>
          {getIcon()}
        </div>
        
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ 
            color: 'white', 
            fontWeight: 600, 
            fontSize: '14px',
            marginBottom: notification.message ? '4px' : 0
          }}>
            {notification.title}
          </div>
          
          {notification.message && (
            <div style={{ 
              color: 'rgba(255, 255, 255, 0.8)', 
              fontSize: '13px',
              lineHeight: 1.4
            }}>
              {notification.message}
            </div>
          )}

          {/* Progress text for loading notifications */}
          {notification.type === 'loading' && notification.progress !== undefined && (
            <div style={{ 
              color: 'rgba(255, 255, 255, 0.6)', 
              fontSize: '12px',
              marginTop: '4px'
            }}>
              {Math.round(notification.progress)}% complete
            </div>
          )}

          {/* Action buttons */}
          {notification.actions && notification.actions.length > 0 && (
            <div style={{ 
              display: 'flex', 
              gap: '8px', 
              marginTop: '12px' 
            }}>
              {notification.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => {
                    action.action();
                    if (!notification.persistent) {
                      handleRemove();
                    }
                  }}
                  style={{
                    background: action.primary ? colors.bg : 'transparent',
                    color: action.primary ? 'white' : colors.bg,
                    border: `1px solid ${colors.bg}`,
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Close button */}
        {!notification.persistent && (
          <button
            onClick={handleRemove}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '16px',
              cursor: 'pointer',
              padding: '4px',
              lineHeight: 1
            }}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

// Notification container
export const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification, updateNotification } = useNotifications();

  if (notifications.length === 0) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        zIndex: 9999,
        pointerEvents: 'none'
      }}
    >
      <div style={{ pointerEvents: 'auto' }}>
        {notifications.map(notification => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onRemove={removeNotification}
            onUpdate={updateNotification}
          />
        ))}
      </div>
    </div>,
    document.body
  );
};

// Provider component
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>): string => {
    const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: Notification = {
      id,
      duration: 5000,
      ...notification
    };

    setNotifications(prev => [...prev, newNotification]);
    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const updateNotification = useCallback((id: string, updates: Partial<Notification>) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, ...updates } : n)
    );
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const value = {
    notifications,
    addNotification,
    removeNotification,
    updateNotification,
    clearAll
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
};

// Utility hooks for common notification patterns
export const useNotificationHelpers = () => {
  const { addNotification, updateNotification } = useNotifications();

  const showSuccess = useCallback((title: string, message?: string) => {
    return addNotification({ type: 'success', title, message });
  }, [addNotification]);

  const showError = useCallback((title: string, message?: string, actions?: Notification['actions']) => {
    return addNotification({ 
      type: 'error', 
      title, 
      message, 
      duration: 8000,
      actions
    });
  }, [addNotification]);

  const showWarning = useCallback((title: string, message?: string) => {
    return addNotification({ type: 'warning', title, message, duration: 6000 });
  }, [addNotification]);

  const showInfo = useCallback((title: string, message?: string) => {
    return addNotification({ type: 'info', title, message });
  }, [addNotification]);

  const showLoading = useCallback((title: string, message?: string) => {
    return addNotification({ 
      type: 'loading', 
      title, 
      message, 
      persistent: true,
      progress: 0
    });
  }, [addNotification]);

  const updateProgress = useCallback((id: string, progress: number, title?: string) => {
    updateNotification(id, { progress, ...(title && { title }) });
  }, [updateNotification]);

  const showCompletion = useCallback((
    videoName: string, 
    metrics: {
      processingTime?: number;
      outputSize?: number;
      inputSize?: number;
      qualityScore?: number;
      enhancementType?: string;
    } = {},
    actions?: Notification['actions']
  ) => {
    const timeText = metrics.processingTime ? ` in ${Math.floor(metrics.processingTime / 60)}m ${Math.floor(metrics.processingTime % 60)}s` : '';
    const sizeChange = metrics.outputSize && metrics.inputSize 
      ? ((metrics.outputSize - metrics.inputSize) / metrics.inputSize * 100).toFixed(1)
      : null;
    const sizeText = sizeChange ? ` (${sizeChange > 0 ? '+' : ''}${sizeChange}% size)` : '';
    
    return addNotification({
      type: 'completion',
      title: `🎉 ${videoName} Enhanced!`,
      message: `${metrics.enhancementType || 'Video processing'} completed${timeText}${sizeText}. Quality score: ${metrics.qualityScore || 95}%`,
      duration: 10000,
      actions: actions || [
        {
          label: '📂 Open File',
          action: () => console.log('Open file action'),
          primary: true
        },
        {
          label: '👁️ Show in Folder',
          action: () => console.log('Show in folder action')
        }
      ]
    });
  }, [addNotification]);

  const showEnhancement = useCallback((
    title: string,
    details: {
      enhancementType: string;
      factor: string;
      quality: number;
      outputPath?: string;
    },
    actions?: Notification['actions']
  ) => {
    return addNotification({
      type: 'enhancement',
      title,
      message: `${details.enhancementType} enhancement complete! ${details.factor} upscaling with ${details.quality}% quality improvement.`,
      duration: 12000,
      metadata: details,
      actions: actions || [
        {
          label: '🎬 Preview',
          action: () => console.log('Preview action'),
          primary: true
        },
        {
          label: '📂 Open',
          action: () => console.log('Open action')
        }
      ]
    });
  }, [addNotification]);

  const showBatchComplete = useCallback((
    completedCount: number,
    totalCount: number,
    totalTime: number,
    actions?: Notification['actions']
  ) => {
    const timeText = `${Math.floor(totalTime / 60)}m ${Math.floor(totalTime % 60)}s`;
    const successRate = ((completedCount / totalCount) * 100).toFixed(0);
    
    return addNotification({
      type: 'completion',
      title: `🎊 Batch Processing Complete!`,
      message: `${completedCount}/${totalCount} videos processed successfully (${successRate}% success rate) in ${timeText}`,
      duration: 15000,
      actions: actions || [
        {
          label: '📂 Open Output Folder',
          action: () => console.log('Open output folder'),
          primary: true
        },
        {
          label: '📊 View Report',
          action: () => console.log('View report')
        }
      ]
    });
  }, [addNotification]);

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading,
    updateProgress,
    showCompletion,
    showEnhancement,
    showBatchComplete
  };
};

export default NotificationProvider;