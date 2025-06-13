import React from 'react';

interface QuickFilter {
  id: string;
  label: string;
  icon: string;
  count: number;
  color: string;
  description: string;
}

interface QuickFiltersProps {
  filters: QuickFilter[];
  activeFilter: string | null;
  onFilterChange: (filterId: string | null) => void;
  onCreateCustomFilter: () => void;
}

const QuickFilters: React.FC<QuickFiltersProps> = ({
  filters,
  activeFilter,
  onFilterChange,
  onCreateCustomFilter,
}) => {
  return (
    <div className="quick-filters-container">
      <div className="filters-header">
        <span className="filters-title">Quick Filters</span>
        <button 
          className="create-filter-btn"
          onClick={onCreateCustomFilter}
          title="Create custom filter"
        >
          <span className="btn-icon">➕</span>
          <span className="btn-label">Custom</span>
        </button>
      </div>

      <div className="filters-grid">
        {/* All Videos Filter */}
        <button
          className={`filter-card ${activeFilter === null ? 'active' : ''}`}
          onClick={() => onFilterChange(null)}
        >
          <div className="filter-icon all">📁</div>
          <div className="filter-content">
            <div className="filter-label">All Videos</div>
            <div className="filter-count">{filters.reduce((sum, f) => sum + f.count, 0)}</div>
          </div>
        </button>

        {/* Dynamic Filters */}
        {filters.map((filter) => (
          <button
            key={filter.id}
            className={`filter-card ${activeFilter === filter.id ? 'active' : ''}`}
            onClick={() => onFilterChange(filter.id)}
            title={filter.description}
            style={{ '--filter-color': filter.color } as React.CSSProperties}
          >
            <div className="filter-icon" style={{ color: filter.color }}>
              {filter.icon}
            </div>
            <div className="filter-content">
              <div className="filter-label">{filter.label}</div>
              <div className="filter-count">{filter.count}</div>
            </div>
            {filter.count > 0 && (
              <div className="filter-indicator" style={{ backgroundColor: filter.color }} />
            )}
          </button>
        ))}

        {/* Smart Filters */}
        <button className="filter-card smart" title="Videos added recently">
          <div className="filter-icon">🆕</div>
          <div className="filter-content">
            <div className="filter-label">Recent</div>
            <div className="filter-count">3</div>
          </div>
        </button>

        <button className="filter-card smart" title="Large video files">
          <div className="filter-icon">💾</div>
          <div className="filter-content">
            <div className="filter-label">Large Files</div>
            <div className="filter-count">2</div>
          </div>
        </button>

        <button className="filter-card smart" title="High resolution videos">
          <div className="filter-icon">🎬</div>
          <div className="filter-content">
            <div className="filter-label">HD/4K</div>
            <div className="filter-count">4</div>
          </div>
        </button>

        <button className="filter-card smart" title="Videos with long duration">
          <div className="filter-icon">⏰</div>
          <div className="filter-content">
            <div className="filter-label">Long</div>
            <div className="filter-count">1</div>
          </div>
        </button>
      </div>

      {/* Filter Stats */}
      {activeFilter && (
        <div className="filter-stats">
          <div className="stats-row">
            <span className="stats-label">Filtered:</span>
            <span className="stats-value">
              {filters.find(f => f.id === activeFilter)?.count || 0} videos
            </span>
          </div>
          <button 
            className="clear-filter-btn"
            onClick={() => onFilterChange(null)}
          >
            Clear Filter
          </button>
        </div>
      )}
    </div>
  );
};

export default QuickFilters;