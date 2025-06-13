import React, { useState, useEffect, useCallback } from 'react';
import { performanceMonitor, memoryManager } from '../../utils/performanceMonitor';

interface PerformanceStats {
  memoryUsage: number;
  memoryTrend: 'increasing' | 'decreasing' | 'stable';
  componentRenders: Record<string, number>;
  averageRenderTimes: Record<string, number>;
  cacheStats: Record<string, { size: number; memoryUsage: number }>;
  totalCacheMemory: number;
}

export const PerformanceDashboard: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [stats, setStats] = useState<PerformanceStats>({
    memoryUsage: 0,
    memoryTrend: 'stable',
    componentRenders: {},
    averageRenderTimes: {},
    cacheStats: {},
    totalCacheMemory: 0
  });

  const updateStats = useCallback(() => {
    const metrics = performanceMonitor.getMetrics();
    const cacheStats = memoryManager.getStats();
    
    const componentRenders: Record<string, number> = {};
    const averageRenderTimes: Record<string, number> = {};
    
    metrics.componentRenders.forEach((count, component) => {
      componentRenders[component] = count;
    });
    
    metrics.renderTimes.forEach((times, component) => {
      if (times.length > 0) {
        averageRenderTimes[component] = times.reduce((sum, time) => sum + time, 0) / times.length;
      }
    });
    
    const totalCacheMemory = Object.values(cacheStats)
      .reduce((sum, cache) => sum + cache.memoryUsage, 0);
    
    setStats({
      memoryUsage: metrics.memoryUsage[metrics.memoryUsage.length - 1] || 0,
      memoryTrend: performanceMonitor.getMemoryTrend(),
      componentRenders,
      averageRenderTimes,
      cacheStats,
      totalCacheMemory
    });
  }, []);

  useEffect(() => {
    const unsubscribe = performanceMonitor.subscribe(updateStats);
    updateStats(); // Initial update
    
    const interval = setInterval(updateStats, 2000); // Update every 2 seconds
    
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [updateStats]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatTime = (ms: number): string => {
    return `${ms.toFixed(2)}ms`;
  };

  const getTrendColor = (trend: string): string => {
    switch (trend) {
      case 'increasing': return '#ef4444';
      case 'decreasing': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getTrendIcon = (trend: string): string => {
    switch (trend) {
      case 'increasing': return '📈';
      case 'decreasing': return '📉';
      default: return '➡️';
    }
  };

  const handleClearCaches = () => {
    memoryManager.clear();
    updateStats();
  };

  const handleOptimizeMemory = () => {
    // Trigger garbage collection if available
    if ('gc' in window) {
      (window as any).gc();
    }
    
    // Clear old caches
    memoryManager.cleanup();
    updateStats();
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: '#7461ef',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '48px',
          height: '48px',
          fontSize: '20px',
          cursor: 'pointer',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
        }}
        title="Performance Dashboard"
      >
        📊
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '400px',
      maxHeight: '600px',
      background: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      borderRadius: '12px',
      padding: '16px',
      fontSize: '12px',
      zIndex: 1000,
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(10px)',
      overflowY: 'auto'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Performance Dashboard</h3>
        <button
          onClick={() => setIsVisible(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          ✕
        </button>
      </div>

      {/* Memory Usage */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontWeight: 600 }}>Memory Usage:</span>
          <span>{formatBytes(stats.memoryUsage)}</span>
          <span style={{ color: getTrendColor(stats.memoryTrend) }}>
            {getTrendIcon(stats.memoryTrend)}
          </span>
        </div>
        
        <div style={{ marginBottom: '8px' }}>
          <span style={{ fontWeight: 600 }}>Cache Memory:</span>
          <span style={{ marginLeft: '8px' }}>{formatBytes(stats.totalCacheMemory)}</span>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleClearCaches}
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '10px',
              cursor: 'pointer'
            }}
          >
            Clear Caches
          </button>
          <button
            onClick={handleOptimizeMemory}
            style={{
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '10px',
              cursor: 'pointer'
            }}
          >
            Optimize
          </button>
        </div>
      </div>

      {/* Component Renders */}
      <div style={{ marginBottom: '16px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600 }}>Component Renders (Last Minute)</h4>
        <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
          {Object.entries(stats.componentRenders).map(([component, count]) => (
            <div key={component} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
              <span style={{ fontSize: '10px', opacity: 0.8 }}>{component}</span>
              <span style={{ fontSize: '10px', fontWeight: 600 }}>{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Render Times */}
      <div style={{ marginBottom: '16px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600 }}>Average Render Times</h4>
        <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
          {Object.entries(stats.averageRenderTimes).map(([component, time]) => (
            <div key={component} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
              <span style={{ fontSize: '10px', opacity: 0.8 }}>{component}</span>
              <span style={{ 
                fontSize: '10px', 
                fontWeight: 600,
                color: time > 16 ? '#ef4444' : time > 8 ? '#f59e0b' : '#10b981'
              }}>
                {formatTime(time)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Cache Statistics */}
      <div>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600 }}>Cache Statistics</h4>
        <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
          {Object.entries(stats.cacheStats).map(([cacheName, cache]) => (
            <div key={cacheName} style={{ marginBottom: '4px' }}>
              <div style={{ fontSize: '10px', opacity: 0.8 }}>{cacheName}</div>
              <div style={{ fontSize: '10px', marginLeft: '8px' }}>
                Items: {cache.size} | Memory: {formatBytes(cache.memoryUsage)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Tips */}
      <div style={{ marginTop: '16px', padding: '8px', background: 'rgba(116, 97, 239, 0.2)', borderRadius: '6px' }}>
        <div style={{ fontSize: '10px', opacity: 0.8 }}>
          💡 Tips: Keep renders &lt;16ms, watch memory trends, clear caches if high usage
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;