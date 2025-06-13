import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { 
  SearchQuery, 
  VideoFilter, 
  VideoFileEnhanced,
  SUPPORTED_VIDEO_FORMATS,
  SUPPORTED_VIDEO_CODECS,
  RESOLUTION_CATEGORIES
} from '../../types/video-enhanced.types';
import { SearchService } from '../../services/SearchService';

export interface SearchAndFilterProps {
  searchQuery: SearchQuery;
  videos: VideoFileEnhanced[];
  onSearchChange: (query: SearchQuery) => void;
  onClearFilters: () => void;
  className?: string;
}

interface FilterSectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

interface DateRangePickerProps {
  startDate?: Date;
  endDate?: Date;
  onChange: (start?: Date, end?: Date) => void;
}

interface RangeSliderProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  formatValue: (value: number) => string;
  step?: number;
}

const FilterSection: React.FC<FilterSectionProps> = ({ 
  title, 
  isExpanded, 
  onToggle, 
  children 
}) => (
  <div style={{
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    marginBottom: '8px'
  }}>
    <button
      onClick={onToggle}
      style={{
        width: '100%',
        background: 'transparent',
        border: 'none',
        color: '#ffffff',
        padding: '12px 0',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '600'
      }}
    >
      {title}
      <span style={{
        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 0.2s ease'
      }}>
        ▼
      </span>
    </button>
    {isExpanded && (
      <div style={{ paddingBottom: '12px' }}>
        {children}
      </div>
    )}
  </div>
);

const DateRangePicker: React.FC<DateRangePickerProps> = ({ 
  startDate, 
  endDate, 
  onChange 
}) => {
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const parseDate = (dateString: string) => {
    return dateString ? new Date(dateString) : undefined;
  };

  return (
    <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
      <div>
        <label style={{ 
          display: 'block', 
          fontSize: '12px', 
          color: '#a0a0a0', 
          marginBottom: '4px' 
        }}>
          From:
        </label>
        <input
          type="date"
          value={startDate ? formatDate(startDate) : ''}
          onChange={(e) => onChange(parseDate(e.target.value), endDate)}
          style={{
            width: '100%',
            padding: '6px',
            background: '#2d2d47',
            border: '1px solid #4a4a6a',
            borderRadius: '4px',
            color: '#ffffff',
            fontSize: '12px'
          }}
        />
      </div>
      <div>
        <label style={{ 
          display: 'block', 
          fontSize: '12px', 
          color: '#a0a0a0', 
          marginBottom: '4px' 
        }}>
          To:
        </label>
        <input
          type="date"
          value={endDate ? formatDate(endDate) : ''}
          onChange={(e) => onChange(startDate, parseDate(e.target.value))}
          style={{
            width: '100%',
            padding: '6px',
            background: '#2d2d47',
            border: '1px solid #4a4a6a',
            borderRadius: '4px',
            color: '#ffffff',
            fontSize: '12px'
          }}
        />
      </div>
    </div>
  );
};

const RangeSlider: React.FC<RangeSliderProps> = ({ 
  min, 
  max, 
  value, 
  onChange, 
  formatValue,
  step = 1
}) => {
  const handleMinChange = (newMin: number) => {
    onChange([Math.min(newMin, value[1]), value[1]]);
  };

  const handleMaxChange = (newMax: number) => {
    onChange([value[0], Math.max(newMax, value[0])]);
  };

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '8px',
        fontSize: '12px',
        color: '#a0a0a0'
      }}>
        <span>{formatValue(value[0])}</span>
        <span>{formatValue(value[1])}</span>
      </div>
      <div style={{ position: 'relative', height: '20px' }}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value[0]}
          onChange={(e) => handleMinChange(Number(e.target.value))}
          style={{
            position: 'absolute',
            width: '100%',
            height: '4px',
            background: '#4a4a6a',
            pointerEvents: 'none',
            appearance: 'none'
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value[1]}
          onChange={(e) => handleMaxChange(Number(e.target.value))}
          style={{
            position: 'absolute',
            width: '100%',
            height: '4px',
            background: '#4a4a6a',
            pointerEvents: 'none',
            appearance: 'none'
          }}
        />
      </div>
    </div>
  );
};

const CheckboxGroup: React.FC<{
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  maxVisible?: number;
}> = ({ options, selected, onChange, maxVisible = 5 }) => {
  const [showAll, setShowAll] = useState(false);
  const visibleOptions = showAll ? options : options.slice(0, maxVisible);

  const handleToggle = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(item => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div>
      {visibleOptions.map(option => (
        <label
          key={option}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 0',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          <input
            type="checkbox"
            checked={selected.includes(option)}
            onChange={() => handleToggle(option)}
            style={{
              width: '14px',
              height: '14px',
              accentColor: '#7461ef'
            }}
          />
          <span style={{ color: '#ffffff' }}>{option}</span>
        </label>
      ))}
      {options.length > maxVisible && (
        <button
          onClick={() => setShowAll(!showAll)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#7461ef',
            fontSize: '11px',
            cursor: 'pointer',
            marginTop: '4px'
          }}
        >
          {showAll ? 'Show Less' : `Show ${options.length - maxVisible} More`}
        </button>
      )}
    </div>
  );
};

export const SearchAndFilter: React.FC<SearchAndFilterProps> = ({
  searchQuery,
  videos,
  onSearchChange,
  onClearFilters,
  className
}) => {
  const [expandedSections, setExpandedSections] = useState(new Set(['basic']));
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchService = SearchService.getInstance();

  // Available filter options derived from videos
  const filterOptions = useMemo(() => {
    const formats = new Set<string>();
    const statuses = new Set<VideoFileEnhanced['status']>();
    const codecs = new Set<string>();
    const tags = new Set<string>();
    const resolutions = new Set<string>();

    videos.forEach(video => {
      if (video.metadata?.format) formats.add(video.metadata.format);
      statuses.add(video.status);
      if (video.metadata?.codec) codecs.add(video.metadata.codec);
      if (video.tags) video.tags.forEach(tag => tags.add(tag));
      
      if (video.metadata?.resolution) {
        const { width, height } = video.metadata.resolution;
        const pixels = width * height;
        
        for (const [category, limits] of Object.entries(RESOLUTION_CATEGORIES)) {
          if (pixels <= limits.maxWidth * limits.maxHeight) {
            resolutions.add(category);
            break;
          }
        }
      }
    });

    return {
      formats: Array.from(formats).sort(),
      statuses: Array.from(statuses).sort(),
      codecs: Array.from(codecs).sort(),
      tags: Array.from(tags).sort(),
      resolutions: Array.from(resolutions).sort()
    };
  }, [videos]);

  // Size and duration ranges from videos
  const ranges = useMemo(() => {
    let minSize = Infinity, maxSize = 0;
    let minDuration = Infinity, maxDuration = 0;

    videos.forEach(video => {
      const size = video.metadata?.size || video.file.size;
      const duration = video.metadata?.duration || 0;
      
      minSize = Math.min(minSize, size);
      maxSize = Math.max(maxSize, size);
      minDuration = Math.min(minDuration, duration);
      maxDuration = Math.max(maxDuration, duration);
    });

    return {
      size: { min: minSize === Infinity ? 0 : minSize, max: maxSize },
      duration: { min: minDuration === Infinity ? 0 : minDuration, max: maxDuration }
    };
  }, [videos]);

  // Handle search input change with suggestions
  const handleSearchChange = useCallback((text: string) => {
    const newQuery = { ...searchQuery, text };
    onSearchChange(newQuery);

    // Get search suggestions
    if (text.length >= 2) {
      const suggestions = searchService.getSearchSuggestions(text, 5);
      setSearchSuggestions(suggestions);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [searchQuery, onSearchChange, searchService]);

  // Handle filter changes
  const handleFilterChange = useCallback((filterUpdate: Partial<VideoFilter>) => {
    const newQuery = {
      ...searchQuery,
      filters: { ...searchQuery.filters, ...filterUpdate }
    };
    onSearchChange(newQuery);
  }, [searchQuery, onSearchChange]);

  // Toggle section expansion
  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  }, []);

  // Clear all filters
  const handleClearAll = useCallback(() => {
    onClearFilters();
    setShowSuggestions(false);
  }, [onClearFilters]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    const filters = searchQuery.filters;
    
    if (filters.formats?.length) count++;
    if (filters.statuses?.length) count++;
    if (filters.codecs?.length) count++;
    if (filters.tags?.length) count++;
    if (filters.resolutionCategories?.length) count++;
    if (filters.dateRange) count++;
    if (filters.sizeRange) count++;
    if (filters.durationRange) count++;
    if (filters.qualityRange) count++;
    if (filters.hasAudio !== undefined) count++;
    if (filters.aspectRatios?.length) count++;
    
    return count;
  }, [searchQuery.filters]);

  // Format file size
  const formatSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) return `${mb.toFixed(0)}MB`;
    return `${(mb / 1024).toFixed(1)}GB`;
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const hours = Math.floor(mins / 60);
    if (hours > 0) return `${hours}h ${mins % 60}m`;
    return `${mins}m`;
  };

  return (
    <div 
      className={className}
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '16px',
        maxHeight: '100%',
        overflowY: 'auto'
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px'
      }}>
        <h3 style={{
          margin: 0,
          color: '#ffffff',
          fontSize: '16px',
          fontWeight: '600'
        }}>
          Search & Filter
        </h3>
        {activeFilterCount > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{
              background: '#7461ef',
              color: 'white',
              borderRadius: '10px',
              padding: '2px 8px',
              fontSize: '11px',
              fontWeight: '600'
            }}>
              {activeFilterCount}
            </span>
            <button
              onClick={handleClearAll}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#e74c3c',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Search Input */}
      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search videos, tags, formats..."
          value={searchQuery.text}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={() => searchQuery.text.length >= 2 && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          style={{
            width: '100%',
            padding: '10px 12px',
            background: '#2d2d47',
            border: '1px solid #4a4a6a',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '14px'
          }}
        />
        
        {/* Search Suggestions */}
        {showSuggestions && searchSuggestions.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: '#2d2d47',
            border: '1px solid #4a4a6a',
            borderRadius: '8px',
            marginTop: '4px',
            maxHeight: '150px',
            overflowY: 'auto',
            zIndex: 10
          }}>
            {searchSuggestions.map((suggestion, index) => (
              <div
                key={index}
                onClick={() => {
                  handleSearchChange(suggestion);
                  setShowSuggestions(false);
                }}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: '#ffffff',
                  borderBottom: index < searchSuggestions.length - 1 ? '1px solid #4a4a6a' : 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(116, 97, 239, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {suggestion}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Basic Filters */}
      <FilterSection
        title="Basic Filters"
        isExpanded={expandedSections.has('basic')}
        onToggle={() => toggleSection('basic')}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Formats */}
          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '12px', 
              color: '#a0a0a0', 
              marginBottom: '6px' 
            }}>
              Formats:
            </label>
            <CheckboxGroup
              options={filterOptions.formats}
              selected={searchQuery.filters.formats || []}
              onChange={(formats) => handleFilterChange({ formats })}
            />
          </div>

          {/* Status */}
          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '12px', 
              color: '#a0a0a0', 
              marginBottom: '6px' 
            }}>
              Status:
            </label>
            <CheckboxGroup
              options={filterOptions.statuses}
              selected={searchQuery.filters.statuses || []}
              onChange={(statuses) => handleFilterChange({ statuses })}
            />
          </div>
        </div>
      </FilterSection>

      {/* Advanced Filters */}
      <FilterSection
        title="Advanced Filters"
        isExpanded={expandedSections.has('advanced')}
        onToggle={() => toggleSection('advanced')}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Date Range */}
          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '12px', 
              color: '#a0a0a0', 
              marginBottom: '6px' 
            }}>
              Date Range:
            </label>
            <DateRangePicker
              startDate={searchQuery.filters.dateRange?.start}
              endDate={searchQuery.filters.dateRange?.end}
              onChange={(start, end) => {
                const dateRange = start || end ? { start, end } : undefined;
                handleFilterChange({ dateRange });
              }}
            />
          </div>

          {/* File Size Range */}
          {ranges.size.max > 0 && (
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '12px', 
                color: '#a0a0a0', 
                marginBottom: '6px' 
              }}>
                File Size:
              </label>
              <RangeSlider
                min={ranges.size.min}
                max={ranges.size.max}
                value={[
                  searchQuery.filters.sizeRange?.min || ranges.size.min,
                  searchQuery.filters.sizeRange?.max || ranges.size.max
                ]}
                onChange={([min, max]) => handleFilterChange({ 
                  sizeRange: { min, max } 
                })}
                formatValue={formatSize}
                step={1024 * 1024} // 1MB steps
              />
            </div>
          )}

          {/* Duration Range */}
          {ranges.duration.max > 0 && (
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '12px', 
                color: '#a0a0a0', 
                marginBottom: '6px' 
              }}>
                Duration:
              </label>
              <RangeSlider
                min={ranges.duration.min}
                max={ranges.duration.max}
                value={[
                  searchQuery.filters.durationRange?.min || ranges.duration.min,
                  searchQuery.filters.durationRange?.max || ranges.duration.max
                ]}
                onChange={([min, max]) => handleFilterChange({ 
                  durationRange: { min, max } 
                })}
                formatValue={formatDuration}
                step={60} // 1 minute steps
              />
            </div>
          )}

          {/* Resolution Categories */}
          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '12px', 
              color: '#a0a0a0', 
              marginBottom: '6px' 
            }}>
              Resolution:
            </label>
            <CheckboxGroup
              options={filterOptions.resolutions}
              selected={searchQuery.filters.resolutionCategories || []}
              onChange={(resolutionCategories) => handleFilterChange({ resolutionCategories })}
            />
          </div>

          {/* Audio Filter */}
          <div>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontSize: '12px'
            }}>
              <input
                type="checkbox"
                checked={searchQuery.filters.hasAudio === true}
                onChange={(e) => handleFilterChange({ 
                  hasAudio: e.target.checked ? true : undefined 
                })}
                style={{
                  width: '14px',
                  height: '14px',
                  accentColor: '#7461ef'
                }}
              />
              <span style={{ color: '#ffffff' }}>Has Audio</span>
            </label>
          </div>
        </div>
      </FilterSection>

      {/* Technical Filters */}
      <FilterSection
        title="Technical"
        isExpanded={expandedSections.has('technical')}
        onToggle={() => toggleSection('technical')}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Codecs */}
          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '12px', 
              color: '#a0a0a0', 
              marginBottom: '6px' 
            }}>
              Codecs:
            </label>
            <CheckboxGroup
              options={filterOptions.codecs}
              selected={searchQuery.filters.codecs || []}
              onChange={(codecs) => handleFilterChange({ codecs })}
            />
          </div>

          {/* Tags */}
          {filterOptions.tags.length > 0 && (
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '12px', 
                color: '#a0a0a0', 
                marginBottom: '6px' 
              }}>
                Tags:
              </label>
              <CheckboxGroup
                options={filterOptions.tags}
                selected={searchQuery.filters.tags || []}
                onChange={(tags) => handleFilterChange({ tags })}
              />
            </div>
          )}
        </div>
      </FilterSection>

      {/* Sort Options */}
      <FilterSection
        title="Sort By"
        isExpanded={expandedSections.has('sort')}
        onToggle={() => toggleSection('sort')}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <select
            value={searchQuery.sortBy}
            onChange={(e) => onSearchChange({
              ...searchQuery,
              sortBy: e.target.value as SearchQuery['sortBy']
            })}
            style={{
              width: '100%',
              padding: '6px',
              background: '#2d2d47',
              border: '1px solid #4a4a6a',
              borderRadius: '4px',
              color: '#ffffff',
              fontSize: '12px'
            }}
          >
            <option value="name">Name</option>
            <option value="size">Size</option>
            <option value="duration">Duration</option>
            <option value="createdAt">Date Added</option>
            <option value="quality">Quality Score</option>
            <option value="status">Status</option>
          </select>
          
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => onSearchChange({
                ...searchQuery,
                sortOrder: 'asc'
              })}
              style={{
                flex: 1,
                padding: '6px',
                background: searchQuery.sortOrder === 'asc' ? '#7461ef' : 'transparent',
                border: '1px solid #4a4a6a',
                borderRadius: '4px',
                color: '#ffffff',
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              Ascending
            </button>
            <button
              onClick={() => onSearchChange({
                ...searchQuery,
                sortOrder: 'desc'
              })}
              style={{
                flex: 1,
                padding: '6px',
                background: searchQuery.sortOrder === 'desc' ? '#7461ef' : 'transparent',
                border: '1px solid #4a4a6a',
                borderRadius: '4px',
                color: '#ffffff',
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              Descending
            </button>
          </div>
        </div>
      </FilterSection>
    </div>
  );
};