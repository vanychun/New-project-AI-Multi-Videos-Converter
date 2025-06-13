import { 
  VideoFileEnhanced, 
  SearchQuery, 
  SearchResult, 
  SearchFacets, 
  VideoFilter,
  RESOLUTION_CATEGORIES 
} from '../types/video-enhanced.types';

export interface SearchIndex {
  id: string;
  name: string;
  normalizedName: string;
  tags: string[];
  format: string;
  status: VideoFileEnhanced['status'];
  resolution: { width: number; height: number };
  duration: number;
  size: number;
  createdAt: Date;
  qualityScore?: number;
  codec: string;
  hasAudio: boolean;
  aspectRatio: string;
}

export interface SearchOptions {
  enableFuzzySearch?: boolean;
  maxResults?: number;
  highlightMatches?: boolean;
  includeMetadata?: boolean;
  searchFields?: ('name' | 'tags' | 'codec' | 'format')[];
}

export interface SearchPerformanceMetrics {
  searchTime: number; // milliseconds
  indexTime: number; // milliseconds
  totalVideos: number;
  matchedVideos: number;
  filterApplied: boolean;
  facetsCalculated: boolean;
}

export class SearchService {
  private static instance: SearchService;
  private searchIndex = new Map<string, SearchIndex>();
  private lastIndexUpdate = 0;
  private readonly INDEX_REFRESH_INTERVAL = 60000; // 1 minute
  
  // Search performance optimization
  private searchCache = new Map<string, SearchResult>();
  private readonly CACHE_SIZE_LIMIT = 100;
  private readonly CACHE_TTL = 300000; // 5 minutes

  public static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  private constructor() {
    this.setupPeriodicIndexCleanup();
  }

  /**
   * Build search index from videos
   */
  public buildIndex(videos: VideoFileEnhanced[]): void {
    const startTime = performance.now();
    
    this.searchIndex.clear();
    
    for (const video of videos) {
      const indexEntry: SearchIndex = {
        id: video.id,
        name: video.name,
        normalizedName: this.normalizeText(video.name),
        tags: video.tags || [],
        format: video.metadata?.format || 'unknown',
        status: video.status,
        resolution: video.metadata?.resolution || { width: 0, height: 0 },
        duration: video.metadata?.duration || 0,
        size: video.metadata?.size || video.file.size,
        createdAt: video.createdAt,
        qualityScore: video.qualityScore,
        codec: video.metadata?.codec || 'unknown',
        hasAudio: video.metadata?.hasAudio || false,
        aspectRatio: video.metadata?.aspectRatio || '0:0'
      };
      
      this.searchIndex.set(video.id, indexEntry);
    }
    
    this.lastIndexUpdate = Date.now();
    this.clearSearchCache(); // Clear cache when index is rebuilt
    
    const indexTime = performance.now() - startTime;
    console.log(`Search index built for ${videos.length} videos in ${indexTime.toFixed(2)}ms`);
  }

  /**
   * Update index entry for a single video
   */
  public updateIndexEntry(video: VideoFileEnhanced): void {
    const indexEntry: SearchIndex = {
      id: video.id,
      name: video.name,
      normalizedName: this.normalizeText(video.name),
      tags: video.tags || [],
      format: video.metadata?.format || 'unknown',
      status: video.status,
      resolution: video.metadata?.resolution || { width: 0, height: 0 },
      duration: video.metadata?.duration || 0,
      size: video.metadata?.size || video.file.size,
      createdAt: video.createdAt,
      qualityScore: video.qualityScore,
      codec: video.metadata?.codec || 'unknown',
      hasAudio: video.metadata?.hasAudio || false,
      aspectRatio: video.metadata?.aspectRatio || '0:0'
    };
    
    this.searchIndex.set(video.id, indexEntry);
    this.clearSearchCache(); // Clear cache when index is updated
  }

  /**
   * Remove video from index
   */
  public removeFromIndex(videoId: string): void {
    this.searchIndex.delete(videoId);
    this.clearSearchCache();
  }

  /**
   * Perform comprehensive search with filtering and faceting
   */
  public async search(
    videos: VideoFileEnhanced[],
    query: SearchQuery,
    options: SearchOptions = {}
  ): Promise<SearchResult> {
    const startTime = performance.now();
    
    // Check cache first
    const cacheKey = this.generateCacheKey(query, options);
    const cachedResult = this.searchCache.get(cacheKey);
    if (cachedResult && this.isCacheValid(cachedResult)) {
      return cachedResult;
    }

    const defaultOptions: Required<SearchOptions> = {
      enableFuzzySearch: true,
      maxResults: 100,
      highlightMatches: false,
      includeMetadata: true,
      searchFields: ['name', 'tags', 'codec', 'format'],
      ...options
    };

    // Ensure index is up to date
    if (this.shouldRebuildIndex()) {
      this.buildIndex(videos);
    }

    // Start with all videos
    let matchedVideos = Array.from(this.searchIndex.values());

    // Apply text search
    if (query.text.trim()) {
      matchedVideos = this.performTextSearch(matchedVideos, query.text, defaultOptions);
    }

    // Apply filters
    if (this.hasFilters(query.filters)) {
      matchedVideos = this.applyFilters(matchedVideos, query.filters);
    }

    // Sort results
    matchedVideos = this.sortResults(matchedVideos, query.sortBy, query.sortOrder);

    // Apply pagination
    const totalCount = matchedVideos.length;
    const paginatedResults = this.applyPagination(matchedVideos, query.limit, query.offset);

    // Convert back to VideoFileEnhanced objects
    const resultVideos = this.mapIndexToVideos(paginatedResults, videos);

    // Calculate facets
    const facets = this.calculateFacets(matchedVideos);

    // Generate search suggestions
    const suggestions = this.generateSuggestions(query.text, matchedVideos.length);

    const searchTime = performance.now() - startTime;

    const result: SearchResult = {
      videos: resultVideos,
      totalCount,
      facets,
      suggestions,
      executionTime: searchTime
    };

    // Cache the result
    this.cacheSearchResult(cacheKey, result);

    return result;
  }

  /**
   * Get search suggestions based on current index
   */
  public getSearchSuggestions(partialText: string, limit: number = 10): string[] {
    const normalized = this.normalizeText(partialText);
    if (normalized.length < 2) return [];

    const suggestions = new Set<string>();

    // Search in video names
    for (const entry of this.searchIndex.values()) {
      if (entry.normalizedName.includes(normalized)) {
        suggestions.add(entry.name);
      }
      
      // Search in tags
      for (const tag of entry.tags) {
        if (this.normalizeText(tag).includes(normalized)) {
          suggestions.add(tag);
        }
      }
      
      if (suggestions.size >= limit) break;
    }

    return Array.from(suggestions).slice(0, limit);
  }

  /**
   * Get filter suggestions for faceted search
   */
  public getFilterSuggestions(): {
    formats: string[];
    codecs: string[];
    resolutions: string[];
    tags: string[];
    statuses: string[];
  } {
    const formats = new Set<string>();
    const codecs = new Set<string>();
    const resolutions = new Set<string>();
    const tags = new Set<string>();
    const statuses = new Set<string>();

    for (const entry of this.searchIndex.values()) {
      formats.add(entry.format);
      codecs.add(entry.codec);
      resolutions.add(this.categorizeResolution(entry.resolution));
      statuses.add(entry.status);
      entry.tags.forEach(tag => tags.add(tag));
    }

    return {
      formats: Array.from(formats).sort(),
      codecs: Array.from(codecs).sort(),
      resolutions: Array.from(resolutions).sort(),
      tags: Array.from(tags).sort(),
      statuses: Array.from(statuses).sort()
    };
  }

  /**
   * Advanced search with custom criteria
   */
  public advancedSearch(
    videos: VideoFileEnhanced[],
    criteria: {
      namePattern?: RegExp;
      sizeRange?: { min: number; max: number };
      durationRange?: { min: number; max: number };
      qualityThreshold?: number;
      createdAfter?: Date;
      createdBefore?: Date;
      customFilter?: (video: SearchIndex) => boolean;
    }
  ): VideoFileEnhanced[] {
    const matchedIndices: SearchIndex[] = [];

    for (const entry of this.searchIndex.values()) {
      let matches = true;

      if (criteria.namePattern && !criteria.namePattern.test(entry.name)) {
        matches = false;
      }

      if (criteria.sizeRange) {
        if (entry.size < criteria.sizeRange.min || entry.size > criteria.sizeRange.max) {
          matches = false;
        }
      }

      if (criteria.durationRange) {
        if (entry.duration < criteria.durationRange.min || entry.duration > criteria.durationRange.max) {
          matches = false;
        }
      }

      if (criteria.qualityThreshold && (!entry.qualityScore || entry.qualityScore < criteria.qualityThreshold)) {
        matches = false;
      }

      if (criteria.createdAfter && entry.createdAt < criteria.createdAfter) {
        matches = false;
      }

      if (criteria.createdBefore && entry.createdAt > criteria.createdBefore) {
        matches = false;
      }

      if (criteria.customFilter && !criteria.customFilter(entry)) {
        matches = false;
      }

      if (matches) {
        matchedIndices.push(entry);
      }
    }

    return this.mapIndexToVideos(matchedIndices, videos);
  }

  /**
   * Get search performance metrics
   */
  public getPerformanceMetrics(): {
    indexSize: number;
    lastIndexUpdate: Date;
    cacheHitRate: number;
    averageSearchTime: number;
  } {
    return {
      indexSize: this.searchIndex.size,
      lastIndexUpdate: new Date(this.lastIndexUpdate),
      cacheHitRate: this.calculateCacheHitRate(),
      averageSearchTime: this.calculateAverageSearchTime()
    };
  }

  /**
   * Private methods
   */
  private performTextSearch(
    entries: SearchIndex[], 
    text: string, 
    options: Required<SearchOptions>
  ): SearchIndex[] {
    const searchTerms = this.normalizeText(text).split(/\s+/).filter(term => term.length > 0);
    if (searchTerms.length === 0) return entries;

    const scored = entries.map(entry => ({
      entry,
      score: this.calculateSearchScore(entry, searchTerms, options)
    })).filter(item => item.score > 0);

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return scored.map(item => item.entry);
  }

  private calculateSearchScore(
    entry: SearchIndex, 
    searchTerms: string[], 
    options: Required<SearchOptions>
  ): number {
    let score = 0;

    for (const term of searchTerms) {
      // Exact name match gets highest score
      if (options.searchFields.includes('name')) {
        if (entry.normalizedName === term) score += 100;
        else if (entry.normalizedName.includes(term)) score += 50;
        else if (options.enableFuzzySearch && this.fuzzyMatch(entry.normalizedName, term)) score += 25;
      }

      // Tag matches
      if (options.searchFields.includes('tags')) {
        for (const tag of entry.tags) {
          const normalizedTag = this.normalizeText(tag);
          if (normalizedTag === term) score += 80;
          else if (normalizedTag.includes(term)) score += 40;
          else if (options.enableFuzzySearch && this.fuzzyMatch(normalizedTag, term)) score += 20;
        }
      }

      // Format matches
      if (options.searchFields.includes('format')) {
        const normalizedFormat = this.normalizeText(entry.format);
        if (normalizedFormat === term) score += 60;
        else if (normalizedFormat.includes(term)) score += 30;
      }

      // Codec matches
      if (options.searchFields.includes('codec')) {
        const normalizedCodec = this.normalizeText(entry.codec);
        if (normalizedCodec === term) score += 60;
        else if (normalizedCodec.includes(term)) score += 30;
      }
    }

    return score;
  }

  private applyFilters(entries: SearchIndex[], filters: VideoFilter): SearchIndex[] {
    return entries.filter(entry => {
      // Format filter
      if (filters.formats && filters.formats.length > 0) {
        if (!filters.formats.includes(entry.format)) return false;
      }

      // Status filter
      if (filters.statuses && filters.statuses.length > 0) {
        if (!filters.statuses.includes(entry.status)) return false;
      }

      // Date range filter
      if (filters.dateRange) {
        if (entry.createdAt < filters.dateRange.start || entry.createdAt > filters.dateRange.end) {
          return false;
        }
      }

      // Size range filter
      if (filters.sizeRange) {
        if (entry.size < filters.sizeRange.min || entry.size > filters.sizeRange.max) {
          return false;
        }
      }

      // Duration range filter
      if (filters.durationRange) {
        if (entry.duration < filters.durationRange.min || entry.duration > filters.durationRange.max) {
          return false;
        }
      }

      // Resolution categories filter
      if (filters.resolutionCategories && filters.resolutionCategories.length > 0) {
        const category = this.categorizeResolution(entry.resolution);
        if (!filters.resolutionCategories.includes(category as any)) return false;
      }

      // Quality range filter
      if (filters.qualityRange && entry.qualityScore !== undefined) {
        if (entry.qualityScore < filters.qualityRange.min || entry.qualityScore > filters.qualityRange.max) {
          return false;
        }
      }

      // Tags filter
      if (filters.tags && filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some(tag => entry.tags.includes(tag));
        if (!hasMatchingTag) return false;
      }

      // Audio filter
      if (filters.hasAudio !== undefined) {
        if (entry.hasAudio !== filters.hasAudio) return false;
      }

      // Aspect ratio filter
      if (filters.aspectRatios && filters.aspectRatios.length > 0) {
        if (!filters.aspectRatios.includes(entry.aspectRatio)) return false;
      }

      // Codec filter
      if (filters.codecs && filters.codecs.length > 0) {
        if (!filters.codecs.includes(entry.codec)) return false;
      }

      return true;
    });
  }

  private sortResults(
    entries: SearchIndex[], 
    sortBy: SearchQuery['sortBy'], 
    sortOrder: SearchQuery['sortOrder']
  ): SearchIndex[] {
    return entries.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'duration':
          comparison = a.duration - b.duration;
          break;
        case 'createdAt':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'quality':
          const aQuality = a.qualityScore || 0;
          const bQuality = b.qualityScore || 0;
          comparison = aQuality - bQuality;
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }

  private calculateFacets(entries: SearchIndex[]): SearchFacets {
    const formats: Record<string, number> = {};
    const statuses: Record<string, number> = {};
    const resolutions: Record<string, number> = {};
    const durations: Record<string, number> = {};
    const sizes: Record<string, number> = {};
    const tags: Record<string, number> = {};

    for (const entry of entries) {
      // Formats
      formats[entry.format] = (formats[entry.format] || 0) + 1;

      // Statuses
      statuses[entry.status] = (statuses[entry.status] || 0) + 1;

      // Resolutions
      const resCategory = this.categorizeResolution(entry.resolution);
      resolutions[resCategory] = (resolutions[resCategory] || 0) + 1;

      // Durations
      const durCategory = this.categorizeDuration(entry.duration);
      durations[durCategory] = (durations[durCategory] || 0) + 1;

      // Sizes
      const sizeCategory = this.categorizeSize(entry.size);
      sizes[sizeCategory] = (sizes[sizeCategory] || 0) + 1;

      // Tags
      for (const tag of entry.tags) {
        tags[tag] = (tags[tag] || 0) + 1;
      }
    }

    return { formats, statuses, resolutions, durations, sizes, tags };
  }

  private categorizeResolution(resolution: { width: number; height: number }): string {
    const pixels = resolution.width * resolution.height;
    
    for (const [category, limits] of Object.entries(RESOLUTION_CATEGORIES)) {
      if (pixels <= limits.maxWidth * limits.maxHeight) {
        return category;
      }
    }
    
    return '8K+';
  }

  private categorizeDuration(duration: number): string {
    if (duration < 60) return 'Under 1 min';
    if (duration < 300) return '1-5 min';
    if (duration < 900) return '5-15 min';
    if (duration < 1800) return '15-30 min';
    if (duration < 3600) return '30-60 min';
    return 'Over 1 hour';
  }

  private categorizeSize(size: number): string {
    const mb = size / (1024 * 1024);
    
    if (mb < 10) return 'Under 10 MB';
    if (mb < 100) return '10-100 MB';
    if (mb < 500) return '100-500 MB';
    if (mb < 1024) return '500 MB - 1 GB';
    if (mb < 5120) return '1-5 GB';
    return 'Over 5 GB';
  }

  private normalizeText(text: string): string {
    return text.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^\w\s]/g, ' ') // Replace special chars with space
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private fuzzyMatch(text: string, pattern: string): boolean {
    // Simple fuzzy matching using Levenshtein distance
    const maxDistance = Math.floor(pattern.length * 0.3); // 30% tolerance
    const distance = this.levenshteinDistance(text, pattern);
    return distance <= maxDistance;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private applyPagination(entries: SearchIndex[], limit?: number, offset?: number): SearchIndex[] {
    const start = offset || 0;
    const end = limit ? start + limit : undefined;
    return entries.slice(start, end);
  }

  private mapIndexToVideos(indices: SearchIndex[], allVideos: VideoFileEnhanced[]): VideoFileEnhanced[] {
    const videoMap = new Map(allVideos.map(video => [video.id, video]));
    return indices.map(index => videoMap.get(index.id)!).filter(Boolean);
  }

  private generateSuggestions(searchText: string, resultCount: number): string[] {
    if (resultCount > 0 || !searchText.trim()) return [];

    const suggestions: string[] = [];
    const normalized = this.normalizeText(searchText);

    // Suggest similar terms
    const allTerms = new Set<string>();
    for (const entry of this.searchIndex.values()) {
      allTerms.add(entry.name);
      entry.tags.forEach(tag => allTerms.add(tag));
      allTerms.add(entry.format);
      allTerms.add(entry.codec);
    }

    for (const term of allTerms) {
      if (this.fuzzyMatch(this.normalizeText(term), normalized)) {
        suggestions.push(term);
        if (suggestions.length >= 5) break;
      }
    }

    return suggestions;
  }

  private hasFilters(filters: VideoFilter): boolean {
    return !!(
      (filters.formats && filters.formats.length > 0) ||
      (filters.statuses && filters.statuses.length > 0) ||
      filters.dateRange ||
      filters.sizeRange ||
      filters.durationRange ||
      (filters.resolutionCategories && filters.resolutionCategories.length > 0) ||
      filters.qualityRange ||
      (filters.tags && filters.tags.length > 0) ||
      filters.hasAudio !== undefined ||
      (filters.aspectRatios && filters.aspectRatios.length > 0) ||
      (filters.codecs && filters.codecs.length > 0)
    );
  }

  private shouldRebuildIndex(): boolean {
    return Date.now() - this.lastIndexUpdate > this.INDEX_REFRESH_INTERVAL;
  }

  private generateCacheKey(query: SearchQuery, options: SearchOptions): string {
    return JSON.stringify({ query, options });
  }

  private isCacheValid(result: SearchResult): boolean {
    // Simple TTL-based cache validation
    return Date.now() - (result as any).cachedAt < this.CACHE_TTL;
  }

  private cacheSearchResult(key: string, result: SearchResult): void {
    if (this.searchCache.size >= this.CACHE_SIZE_LIMIT) {
      // Remove oldest entry
      const firstKey = this.searchCache.keys().next().value;
      this.searchCache.delete(firstKey);
    }
    
    (result as any).cachedAt = Date.now();
    this.searchCache.set(key, result);
  }

  private clearSearchCache(): void {
    this.searchCache.clear();
  }

  private calculateCacheHitRate(): number {
    // This would require tracking hits/misses in a real implementation
    return 0; // Placeholder
  }

  private calculateAverageSearchTime(): number {
    // This would require tracking search times in a real implementation
    return 0; // Placeholder
  }

  private setupPeriodicIndexCleanup(): void {
    // Clean up old cache entries periodically
    setInterval(() => {
      const now = Date.now();
      for (const [key, result] of this.searchCache.entries()) {
        if (now - (result as any).cachedAt > this.CACHE_TTL) {
          this.searchCache.delete(key);
        }
      }
    }, this.CACHE_TTL);
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    this.searchIndex.clear();
    this.searchCache.clear();
  }
}