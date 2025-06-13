import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';

export interface QuickFilter {
  id: string;
  label: string;
  icon: string;
  count: number;
  active: boolean;
  color?: string;
}

interface QuickFiltersEnhancedProps {
  activeFilter: string | null;
  onFilterChange: (filterId: string | null) => void;
  className?: string;
}

export const QuickFiltersEnhanced: React.FC<QuickFiltersEnhancedProps> = ({
  activeFilter,
  onFilterChange,
  className = ''
}) => {
  const { videos } = useSelector((state: RootState) => state.videos);

  const generateFilters = (): QuickFilter[] => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;

    const counts = {
      all: videos.length,
      recent: videos.filter(v => (now - v.createdAt) < oneWeek).length,
      largeFiles: videos.filter(v => v.size > 100 * 1024 * 1024).length, // > 100MB
      longVideos: videos.filter(v => v.duration > 300).length, // > 5 minutes
      hd: videos.filter(v => v.metadata.width >= 1920).length,
      uhd: videos.filter(v => v.metadata.width >= 3840).length,
      withAudio: videos.filter(v => v.metadata.hasAudio).length,
      processing: videos.filter(v => v.status === 'processing').length,
      completed: videos.filter(v => v.status === 'completed').length,
      error: videos.filter(v => v.status === 'error').length,
      hasEffects: videos.filter(v => v.effects && v.effects.length > 0).length
    };

    return [
      {
        id: 'all',
        label: 'All Videos',
        icon: '📁',
        count: counts.all,
        active: activeFilter === 'all' || activeFilter === null,
        color: '#7461ef'
      },
      {
        id: 'recent',
        label: 'Recent',
        icon: '🕒',
        count: counts.recent,
        active: activeFilter === 'recent',
        color: '#34d399'
      },
      {
        id: 'largeFiles',
        label: 'Large Files',
        icon: '📊',
        count: counts.largeFiles,
        active: activeFilter === 'largeFiles',
        color: '#f59e0b'
      },
      {
        id: 'longVideos',
        label: 'Long Videos',
        icon: '⏱️',
        count: counts.longVideos,
        active: activeFilter === 'longVideos',
        color: '#8b5cf6'
      },
      {
        id: 'hd',
        label: 'HD',
        icon: '🎬',
        count: counts.hd,
        active: activeFilter === 'hd',
        color: '#06b6d4'
      },
      {
        id: 'uhd',
        label: '4K/8K',
        icon: '🎯',
        count: counts.uhd,
        active: activeFilter === 'uhd',
        color: '#ec4899'
      },
      {
        id: 'withAudio',
        label: 'With Audio',
        icon: '🔊',
        count: counts.withAudio,
        active: activeFilter === 'withAudio',
        color: '#10b981'
      },
      {
        id: 'hasEffects',
        label: 'Enhanced',
        icon: '✨',
        count: counts.hasEffects,
        active: activeFilter === 'hasEffects',
        color: '#f97316'
      }
    ].filter(filter => filter.count > 0 || filter.id === 'all');
  };

  const statusFilters = (): QuickFilter[] => {
    const counts = {
      processing: videos.filter(v => v.status === 'processing').length,
      completed: videos.filter(v => v.status === 'completed').length,
      error: videos.filter(v => v.status === 'error').length
    };

    return [
      {
        id: 'processing',
        label: 'Processing',
        icon: '⚡',
        count: counts.processing,
        active: activeFilter === 'processing',
        color: '#f59e0b'
      },
      {
        id: 'completed',
        label: 'Completed',
        icon: '✅',
        count: counts.completed,
        active: activeFilter === 'completed',
        color: '#10b981'
      },
      {
        id: 'error',
        label: 'Error',
        icon: '❌',
        count: counts.error,
        active: activeFilter === 'error',
        color: '#ef4444'
      }
    ].filter(filter => filter.count > 0);
  };

  const mainFilters = generateFilters();
  const statusFilterList = statusFilters();

  const handleFilterClick = (filterId: string) => {
    if (activeFilter === filterId) {
      onFilterChange(null); // Deactivate if already active
    } else {
      onFilterChange(filterId);
    }
  };

  return (
    <div className={`quick-filters-enhanced ${className}`}>
      {/* Main Filters */}
      <div className="filter-section main-filters">
        <div className="filter-section-title">Quick Filters</div>
        <div className="filter-grid">
          {mainFilters.map(filter => (
            <button
              key={filter.id}
              className={`filter-btn ${filter.active ? 'active' : ''}`}
              onClick={() => handleFilterClick(filter.id)}
              style={{
                '--filter-color': filter.color
              } as React.CSSProperties}
            >
              <span className="filter-icon">{filter.icon}</span>
              <span className="filter-label">{filter.label}</span>
              {filter.count > 0 && (
                <span className="filter-count">{filter.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Status Filters */}
      {statusFilterList.length > 0 && (
        <div className="filter-section status-filters">
          <div className="filter-section-title">Status</div>
          <div className="filter-grid status-grid">
            {statusFilterList.map(filter => (
              <button
                key={filter.id}
                className={`filter-btn status-btn ${filter.active ? 'active' : ''}`}
                onClick={() => handleFilterClick(filter.id)}
                style={{
                  '--filter-color': filter.color
                } as React.CSSProperties}
              >
                <span className="filter-icon">{filter.icon}</span>
                <span className="filter-label">{filter.label}</span>
                <span className="filter-count">{filter.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom Filter Button */}
      <div className="filter-section custom-filters">
        <button className="filter-btn custom-btn">
          <span className="filter-icon">🔧</span>
          <span className="filter-label">Custom</span>
        </button>
      </div>

      {/* Clear Filters */}
      {activeFilter && (
        <div className="filter-section clear-section">
          <button
            className="clear-filters-btn"
            onClick={() => onFilterChange(null)}
          >
            <span className="clear-icon">✕</span>
            <span className="clear-text">Clear Filter</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default QuickFiltersEnhanced;