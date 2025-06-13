interface PerformanceMetrics {
  componentRenders: Map<string, number>;
  memoryUsage: number[];
  renderTimes: Map<string, number[]>;
  lastCleanup: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    componentRenders: new Map(),
    memoryUsage: [],
    renderTimes: new Map(),
    lastCleanup: Date.now()
  };

  private observers: Set<(metrics: PerformanceMetrics) => void> = new Set();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startMonitoring();
  }

  private startMonitoring() {
    // Clean up old metrics every 30 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 30000);

    // Monitor memory usage every 5 seconds
    setInterval(() => {
      this.recordMemoryUsage();
    }, 5000);
  }

  recordComponentRender(componentName: string) {
    const current = this.metrics.componentRenders.get(componentName) || 0;
    this.metrics.componentRenders.set(componentName, current + 1);
    this.notifyObservers();
  }

  recordRenderTime(componentName: string, startTime: number) {
    const renderTime = performance.now() - startTime;
    const times = this.metrics.renderTimes.get(componentName) || [];
    times.push(renderTime);
    
    // Keep only last 50 render times
    if (times.length > 50) {
      times.shift();
    }
    
    this.metrics.renderTimes.set(componentName, times);
    this.notifyObservers();
  }

  private recordMemoryUsage() {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      const usage = {
        used: memInfo.usedJSHeapSize,
        total: memInfo.totalJSHeapSize,
        limit: memInfo.jsHeapSizeLimit
      };
      
      this.metrics.memoryUsage.push(usage.used);
      
      // Keep only last 100 memory samples
      if (this.metrics.memoryUsage.length > 100) {
        this.metrics.memoryUsage.shift();
      }
    }
  }

  private cleanup() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Reset render counts older than 1 minute
    this.metrics.componentRenders.clear();
    
    // Clean up old render times
    for (const [component, times] of this.metrics.renderTimes.entries()) {
      const recentTimes = times.slice(-20); // Keep last 20 samples
      this.metrics.renderTimes.set(component, recentTimes);
    }

    this.metrics.lastCleanup = now;
    this.notifyObservers();
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  getAverageRenderTime(componentName: string): number {
    const times = this.metrics.renderTimes.get(componentName) || [];
    if (times.length === 0) return 0;
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  getMemoryTrend(): 'increasing' | 'decreasing' | 'stable' {
    const samples = this.metrics.memoryUsage;
    if (samples.length < 5) return 'stable';

    const recent = samples.slice(-5);
    const earlier = samples.slice(-10, -5);
    
    if (earlier.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, val) => sum + val, 0) / earlier.length;
    
    const threshold = earlierAvg * 0.1; // 10% threshold
    
    if (recentAvg > earlierAvg + threshold) return 'increasing';
    if (recentAvg < earlierAvg - threshold) return 'decreasing';
    return 'stable';
  }

  subscribe(callback: (metrics: PerformanceMetrics) => void) {
    this.observers.add(callback);
    return () => this.observers.delete(callback);
  }

  private notifyObservers() {
    this.observers.forEach(callback => callback(this.metrics));
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.observers.clear();
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export function usePerformanceMonitor(componentName: string) {
  const recordRender = () => {
    performanceMonitor.recordComponentRender(componentName);
  };

  const measureRender = (fn: () => void) => {
    const startTime = performance.now();
    fn();
    performanceMonitor.recordRenderTime(componentName, startTime);
  };

  return { recordRender, measureRender };
}

// Memory management utilities
export class MemoryManager {
  private static instance: MemoryManager;
  private caches: Map<string, Map<string, any>> = new Map();
  private cacheTimestamps: Map<string, Map<string, number>> = new Map();
  private maxCacheSize = 100;
  private maxCacheAge = 300000; // 5 minutes

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  createCache(name: string): void {
    if (!this.caches.has(name)) {
      this.caches.set(name, new Map());
      this.cacheTimestamps.set(name, new Map());
    }
  }

  set(cacheName: string, key: string, value: any): void {
    this.createCache(cacheName);
    
    const cache = this.caches.get(cacheName)!;
    const timestamps = this.cacheTimestamps.get(cacheName)!;
    
    // Remove oldest entries if cache is full
    if (cache.size >= this.maxCacheSize) {
      const oldestKey = Array.from(timestamps.entries())
        .sort(([, a], [, b]) => a - b)[0][0];
      cache.delete(oldestKey);
      timestamps.delete(oldestKey);
    }
    
    cache.set(key, value);
    timestamps.set(key, Date.now());
  }

  get(cacheName: string, key: string): any | null {
    const cache = this.caches.get(cacheName);
    const timestamps = this.cacheTimestamps.get(cacheName);
    
    if (!cache || !timestamps || !cache.has(key)) {
      return null;
    }
    
    const timestamp = timestamps.get(key)!;
    const age = Date.now() - timestamp;
    
    // Remove expired entries
    if (age > this.maxCacheAge) {
      cache.delete(key);
      timestamps.delete(key);
      return null;
    }
    
    return cache.get(key);
  }

  clear(cacheName?: string): void {
    if (cacheName) {
      this.caches.get(cacheName)?.clear();
      this.cacheTimestamps.get(cacheName)?.clear();
    } else {
      this.caches.clear();
      this.cacheTimestamps.clear();
    }
  }

  cleanup(): void {
    const now = Date.now();
    
    for (const [cacheName, timestamps] of this.cacheTimestamps.entries()) {
      const cache = this.caches.get(cacheName)!;
      
      for (const [key, timestamp] of timestamps.entries()) {
        if (now - timestamp > this.maxCacheAge) {
          cache.delete(key);
          timestamps.delete(key);
        }
      }
    }
  }

  getStats() {
    const stats: Record<string, { size: number; memoryUsage: number }> = {};
    
    for (const [name, cache] of this.caches.entries()) {
      stats[name] = {
        size: cache.size,
        memoryUsage: this.estimateMemoryUsage(cache)
      };
    }
    
    return stats;
  }

  private estimateMemoryUsage(cache: Map<string, any>): number {
    let estimate = 0;
    
    for (const [key, value] of cache.entries()) {
      estimate += key.length * 2; // Assume UTF-16
      estimate += this.estimateValueSize(value);
    }
    
    return estimate;
  }

  private estimateValueSize(value: any): number {
    if (typeof value === 'string') return value.length * 2;
    if (typeof value === 'number') return 8;
    if (typeof value === 'boolean') return 4;
    if (value === null || value === undefined) return 0;
    if (typeof value === 'object') {
      return JSON.stringify(value).length * 2;
    }
    return 0;
  }
}

export const memoryManager = MemoryManager.getInstance();