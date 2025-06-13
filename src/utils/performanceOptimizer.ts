/**
 * Performance optimization utilities for handling 50+ videos and large files
 */

export interface PerformanceConfig {
  // Memory management
  maxMemoryUsage: number; // bytes
  thumbnailCacheLimit: number; // number of thumbnails to keep in memory
  metadataCacheLimit: number; // number of metadata objects to cache
  
  // Rendering optimization
  virtualScrollThreshold: number; // number of items before enabling virtualization
  lazyLoadOffset: number; // pixels before triggering lazy load
  debounceDelay: number; // ms for debouncing user interactions
  
  // Processing optimization
  maxConcurrentOperations: number;
  batchSize: number; // items to process in each batch
  
  // Garbage collection
  gcInterval: number; // ms between cleanup cycles
  cacheCleanupThreshold: number; // usage percentage before cleanup
}

export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  maxMemoryUsage: 512 * 1024 * 1024, // 512MB
  thumbnailCacheLimit: 100,
  metadataCacheLimit: 200,
  virtualScrollThreshold: 20,
  lazyLoadOffset: 200,
  debounceDelay: 300,
  maxConcurrentOperations: 3,
  batchSize: 10,
  gcInterval: 30000, // 30 seconds
  cacheCleanupThreshold: 80 // 80%
};

export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private config: PerformanceConfig;
  private memoryUsage: number = 0;
  private caches = new Map<string, LRUCache<any>>();
  private gcInterval: NodeJS.Timeout | null = null;
  private observers = new Map<string, IntersectionObserver>();

  public static getInstance(config?: Partial<PerformanceConfig>): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer(config);
    }
    return PerformanceOptimizer.instance;
  }

  private constructor(config?: Partial<PerformanceConfig>) {
    this.config = { ...DEFAULT_PERFORMANCE_CONFIG, ...config };
    this.initializeCaches();
    this.startGarbageCollection();
  }

  /**
   * Initialize LRU caches for different data types
   */
  private initializeCaches(): void {
    this.caches.set('thumbnails', new LRUCache(this.config.thumbnailCacheLimit));
    this.caches.set('metadata', new LRUCache(this.config.metadataCacheLimit));
    this.caches.set('waveforms', new LRUCache(50));
    this.caches.set('searchResults', new LRUCache(20));
  }

  /**
   * Start periodic garbage collection
   */
  private startGarbageCollection(): void {
    this.gcInterval = setInterval(() => {
      this.performGarbageCollection();
    }, this.config.gcInterval);
  }

  /**
   * Perform garbage collection to free up memory
   */
  private performGarbageCollection(): void {
    const memoryUsagePercent = (this.memoryUsage / this.config.maxMemoryUsage) * 100;
    
    if (memoryUsagePercent > this.config.cacheCleanupThreshold) {
      // Clean up caches starting with least critical
      this.caches.get('searchResults')?.clear();
      this.caches.get('waveforms')?.cleanup(0.5); // Remove 50% of oldest entries
      
      if (memoryUsagePercent > 90) {
        this.caches.get('thumbnails')?.cleanup(0.3); // Remove 30% of oldest thumbnails
      }
      
      // Force garbage collection if available
      if (typeof window !== 'undefined' && 'gc' in window) {
        (window as any).gc();
      }
      
      this.updateMemoryUsage();
    }
  }

  /**
   * Create an optimized image loader with lazy loading
   */
  public createLazyImageLoader(): {
    loadImage: (src: string, element: HTMLImageElement) => Promise<void>;
    observer: IntersectionObserver;
  } {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.dataset.src;
            
            if (src) {
              this.loadImage(src, img).then(() => {
                observer.unobserve(img);
              });
            }
          }
        });
      },
      {
        rootMargin: `${this.config.lazyLoadOffset}px`,
        threshold: 0.1
      }
    );

    return {
      loadImage: this.loadImage.bind(this),
      observer
    };
  }

  /**
   * Optimized image loading with caching
   */
  private async loadImage(src: string, element: HTMLImageElement): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check cache first
      const thumbnailCache = this.caches.get('thumbnails');
      const cached = thumbnailCache?.get(src);
      
      if (cached) {
        element.src = cached;
        element.onload = () => resolve();
        return;
      }

      // Load image
      const img = new Image();
      img.onload = () => {
        // Cache the loaded image
        thumbnailCache?.set(src, src);
        element.src = src;
        this.updateMemoryUsage();
        resolve();
      };
      
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  }

  /**
   * Create a debounced function for user interactions
   */
  public debounce<T extends (...args: any[]) => any>(
    func: T,
    delay?: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    const debounceDelay = delay || this.config.debounceDelay;

    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), debounceDelay);
    };
  }

  /**
   * Create a throttled function for high-frequency events
   */
  public throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Optimize array operations for large datasets
   */
  public createBatchProcessor<T, R>(
    processor: (items: T[]) => Promise<R[]>,
    batchSize?: number
  ): (items: T[]) => Promise<R[]> {
    const size = batchSize || this.config.batchSize;

    return async (items: T[]): Promise<R[]> => {
      const results: R[] = [];
      
      for (let i = 0; i < items.length; i += size) {
        const batch = items.slice(i, i + size);
        const batchResults = await processor(batch);
        results.push(...batchResults);
        
        // Yield control to prevent blocking UI
        await this.yieldToMain();
      }
      
      return results;
    };
  }

  /**
   * Yield control to the main thread
   */
  private yieldToMain(): Promise<void> {
    return new Promise(resolve => {
      if ('scheduler' in window && 'postTask' in (window as any).scheduler) {
        (window as any).scheduler.postTask(resolve, { priority: 'user-blocking' });
      } else {
        setTimeout(resolve, 0);
      }
    });
  }

  /**
   * Create a virtual scroll helper for large lists
   */
  public createVirtualScrollHelper(
    containerHeight: number,
    itemHeight: number,
    overscan: number = 5
  ): {
    getVisibleRange: (scrollTop: number, totalItems: number) => { start: number; end: number };
    getTotalHeight: (totalItems: number) => number;
    getItemTop: (index: number) => number;
  } {
    return {
      getVisibleRange: (scrollTop: number, totalItems: number) => {
        const visibleCount = Math.ceil(containerHeight / itemHeight);
        const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
        const end = Math.min(totalItems, start + visibleCount + 2 * overscan);
        return { start, end };
      },
      
      getTotalHeight: (totalItems: number) => totalItems * itemHeight,
      
      getItemTop: (index: number) => index * itemHeight
    };
  }

  /**
   * Optimize component rendering with memoization
   */
  public createMemoizer<T extends (...args: any[]) => any>(
    func: T,
    keyGenerator?: (...args: Parameters<T>) => string
  ): T {
    const cache = new Map<string, ReturnType<T>>();
    
    return ((...args: Parameters<T>): ReturnType<T> => {
      const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
      
      if (cache.has(key)) {
        return cache.get(key)!;
      }
      
      const result = func(...args);
      cache.set(key, result);
      
      // Limit cache size
      if (cache.size > 100) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }
      
      return result;
    }) as T;
  }

  /**
   * Monitor memory usage
   */
  private updateMemoryUsage(): void {
    if ('memory' in performance) {
      const perfMemory = (performance as any).memory;
      this.memoryUsage = perfMemory.usedJSHeapSize;
    } else {
      // Estimate based on cache sizes
      let estimated = 0;
      this.caches.forEach(cache => {
        estimated += cache.size * 1024; // Rough estimate
      });
      this.memoryUsage = estimated;
    }
  }

  /**
   * Get performance metrics
   */
  public getMetrics(): {
    memoryUsage: number;
    memoryUsagePercent: number;
    cacheStats: Record<string, { size: number; hitRate: number }>;
    gcStats: { lastCleanup: Date; cleanupCount: number };
  } {
    this.updateMemoryUsage();
    
    const cacheStats: Record<string, { size: number; hitRate: number }> = {};
    this.caches.forEach((cache, name) => {
      cacheStats[name] = {
        size: cache.size,
        hitRate: cache.getHitRate()
      };
    });

    return {
      memoryUsage: this.memoryUsage,
      memoryUsagePercent: (this.memoryUsage / this.config.maxMemoryUsage) * 100,
      cacheStats,
      gcStats: {
        lastCleanup: new Date(),
        cleanupCount: 0
      }
    };
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
    }
    
    this.caches.forEach(cache => cache.clear());
    this.observers.forEach(observer => observer.disconnect());
    
    this.caches.clear();
    this.observers.clear();
  }
}

/**
 * Simple LRU Cache implementation
 */
class LRUCache<T> {
  private cache = new Map<string, T>();
  private maxSize: number;
  private hits = 0;
  private misses = 0;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: string): T | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
      this.hits++;
      return value;
    }
    this.misses++;
    return undefined;
  }

  set(key: string, value: T): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  get size(): number {
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  cleanup(percentage: number): void {
    const itemsToRemove = Math.floor(this.cache.size * percentage);
    const keys = Array.from(this.cache.keys());
    
    for (let i = 0; i < itemsToRemove; i++) {
      this.cache.delete(keys[i]);
    }
  }

  getHitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? this.hits / total : 0;
  }
}

/**
 * Memory-efficient video thumbnail manager
 */
export class ThumbnailManager {
  private optimizer: PerformanceOptimizer;
  private loadingPromises = new Map<string, Promise<string>>();

  constructor(optimizer?: PerformanceOptimizer) {
    this.optimizer = optimizer || PerformanceOptimizer.getInstance();
  }

  async getThumbnail(videoId: string, generateFunc: () => Promise<string>): Promise<string> {
    const cache = this.optimizer['caches'].get('thumbnails');
    
    // Check cache first
    const cached = cache?.get(videoId);
    if (cached) {
      return cached;
    }

    // Check if already loading
    const loadingPromise = this.loadingPromises.get(videoId);
    if (loadingPromise) {
      return loadingPromise;
    }

    // Generate thumbnail
    const promise = generateFunc().then(thumbnail => {
      cache?.set(videoId, thumbnail);
      this.loadingPromises.delete(videoId);
      return thumbnail;
    }).catch(error => {
      this.loadingPromises.delete(videoId);
      throw error;
    });

    this.loadingPromises.set(videoId, promise);
    return promise;
  }

  preloadThumbnails(videoIds: string[], generateFunc: (id: string) => Promise<string>): void {
    const batchProcessor = this.optimizer.createBatchProcessor(
      async (ids: string[]) => {
        return Promise.all(ids.map(id => this.getThumbnail(id, () => generateFunc(id))));
      }
    );

    // Process in background
    batchProcessor(videoIds).catch(console.error);
  }

  clearThumbnailCache(): void {
    const cache = this.optimizer['caches'].get('thumbnails');
    cache?.clear();
    this.loadingPromises.clear();
  }
}

/**
 * Performance monitoring hook for React components
 */
export const usePerformanceMonitor = (componentName: string) => {
  const optimizer = PerformanceOptimizer.getInstance();
  
  return {
    measureRender: (renderFunc: () => void) => {
      const start = performance.now();
      renderFunc();
      const duration = performance.now() - start;
      
      if (duration > 16.67) { // Slower than 60fps
        console.warn(`Slow render in ${componentName}: ${duration.toFixed(2)}ms`);
      }
    },
    
    debounce: optimizer.debounce.bind(optimizer),
    throttle: optimizer.throttle.bind(optimizer),
    memoize: optimizer.createMemoizer.bind(optimizer)
  };
};

export default PerformanceOptimizer;