import React from 'react';

interface LibraryActionBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearLibrary: () => void;
  onExport: () => void;
  onImport: () => void;
  onAddToQueue: () => void;
  onBatchTrim: () => void;
  onApplyEffects: () => void;
  onRemoveSelected: () => void;
}

const LibraryActionBar: React.FC<LibraryActionBarProps> = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearLibrary,
  onExport,
  onImport,
  onAddToQueue,
  onBatchTrim,
  onApplyEffects,
  onRemoveSelected,
}) => {
  return (
    <div className="library-action-bar">
      {/* Primary Actions - Always Visible */}
      <div className="primary-actions">
        <div className="selection-controls">
          <button
            className="action-btn selection"
            onClick={onSelectAll}
            title={selectedCount === totalCount ? 'Deselect all' : 'Select all'}
          >
            <span className="btn-icon">
              {selectedCount === totalCount ? '☐' : selectedCount > 0 ? '☑️' : '☐'}
            </span>
            <span className="btn-label">
              {selectedCount > 0 ? `${selectedCount}/${totalCount}` : 'Select All'}
            </span>
          </button>
        </div>

        <div className="library-actions">
          <button
            className="action-btn secondary"
            onClick={onImport}
            title="Import videos"
          >
            <span className="btn-icon">📂</span>
            <span className="btn-label">Import</span>
          </button>

          <button
            className="action-btn secondary"
            onClick={onExport}
            title="Export library"
            disabled={totalCount === 0}
          >
            <span className="btn-icon">📄</span>
            <span className="btn-label">Export</span>
          </button>

          <button
            className="action-btn danger"
            onClick={onClearLibrary}
            title="Clear library"
            disabled={totalCount === 0}
          >
            <span className="btn-icon">🗑️</span>
            <span className="btn-label">Clear All</span>
          </button>
        </div>
      </div>

      {/* Selected Actions - Contextual */}
      {selectedCount > 0 && (
        <div className="selected-actions">
          <div className="selected-info">
            <span className="selected-count">{selectedCount}</span>
            <span className="selected-text">
              video{selectedCount !== 1 ? 's' : ''} selected
            </span>
          </div>

          <div className="batch-actions">
            <button
              className="batch-btn primary"
              onClick={onAddToQueue}
              title="Add selected videos to processing queue"
            >
              <span className="btn-icon">▶️</span>
              <span className="btn-label">Add to Queue</span>
            </button>

            <button
              className="batch-btn secondary"
              onClick={onBatchTrim}
              title="Batch trim selected videos"
            >
              <span className="btn-icon">✂️</span>
              <span className="btn-label">Batch Trim</span>
            </button>

            <button
              className="batch-btn secondary"
              onClick={onApplyEffects}
              title="Apply effects to selected videos"
            >
              <span className="btn-icon">🎨</span>
              <span className="btn-label">Apply Effects</span>
            </button>

            <button
              className="batch-btn danger"
              onClick={onRemoveSelected}
              title="Remove selected videos"
            >
              <span className="btn-icon">🗑️</span>
              <span className="btn-label">Remove</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibraryActionBar;