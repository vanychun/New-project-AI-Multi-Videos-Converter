import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ViewModeControls, { ViewMode, SortBy, SortOrder } from '../ViewModeControls';

const mockProps = {
  viewMode: 'grid' as ViewMode,
  onViewModeChange: jest.fn(),
  sortBy: 'name' as SortBy,
  onSortByChange: jest.fn(),
  sortOrder: 'asc' as SortOrder,
  onSortOrderChange: jest.fn(),
  thumbnailSize: 200,
  onThumbnailSizeChange: jest.fn(),
  showThumbnails: true,
  onShowThumbnailsChange: jest.fn()
};

describe('ViewModeControls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all view mode buttons', () => {
    render(<ViewModeControls {...mockProps} />);
    
    expect(screen.getByTitle('Grid View')).toBeInTheDocument();
    expect(screen.getByTitle('List View')).toBeInTheDocument();
    expect(screen.getByTitle('Tiles View')).toBeInTheDocument();
  });

  it('shows active view mode correctly', () => {
    render(<ViewModeControls {...mockProps} />);
    
    const gridButton = screen.getByTitle('Grid View');
    expect(gridButton).toHaveClass('active');
  });

  it('calls onViewModeChange when view mode button is clicked', () => {
    render(<ViewModeControls {...mockProps} />);
    
    const listButton = screen.getByTitle('List View');
    fireEvent.click(listButton);
    
    expect(mockProps.onViewModeChange).toHaveBeenCalledWith('list');
  });

  it('renders sort options correctly', () => {
    render(<ViewModeControls {...mockProps} />);
    
    const sortSelect = screen.getByDisplayValue('Name');
    expect(sortSelect).toBeInTheDocument();
    
    // Check that all sort options are available
    fireEvent.click(sortSelect);
    expect(screen.getByText('Duration')).toBeInTheDocument();
    expect(screen.getByText('File Size')).toBeInTheDocument();
    expect(screen.getByText('Date Added')).toBeInTheDocument();
    expect(screen.getByText('Last Modified')).toBeInTheDocument();
  });

  it('calls onSortByChange when sort option is changed', () => {
    render(<ViewModeControls {...mockProps} />);
    
    const sortSelect = screen.getByDisplayValue('Name');
    fireEvent.change(sortSelect, { target: { value: 'duration' } });
    
    expect(mockProps.onSortByChange).toHaveBeenCalledWith('duration');
  });

  it('shows correct sort order arrow', () => {
    render(<ViewModeControls {...mockProps} />);
    
    const sortOrderButton = screen.getByTitle('Sort Descending');
    expect(sortOrderButton).toHaveTextContent('↑');
  });

  it('calls onSortOrderChange when sort order button is clicked', () => {
    render(<ViewModeControls {...mockProps} />);
    
    const sortOrderButton = screen.getByTitle('Sort Descending');
    fireEvent.click(sortOrderButton);
    
    expect(mockProps.onSortOrderChange).toHaveBeenCalledWith('desc');
  });

  it('shows thumbnail size control only in grid view', () => {
    render(<ViewModeControls {...mockProps} />);
    
    expect(screen.getByText('Size:')).toBeInTheDocument();
    expect(screen.getByDisplayValue('200')).toBeInTheDocument();
  });

  it('hides thumbnail size control in list view', () => {
    render(<ViewModeControls {...mockProps} viewMode="list" />);
    
    expect(screen.queryByText('Size:')).not.toBeInTheDocument();
  });

  it('calls onThumbnailSizeChange when size slider is moved', () => {
    render(<ViewModeControls {...mockProps} />);
    
    const sizeSlider = document.querySelector('.size-slider') as HTMLInputElement;
    fireEvent.change(sizeSlider, { target: { value: '240' } });
    
    expect(mockProps.onThumbnailSizeChange).toHaveBeenCalledWith(240);
  });

  it('shows thumbnail toggle correctly', () => {
    render(<ViewModeControls {...mockProps} />);
    
    const thumbnailToggle = screen.getByText('Thumbnails');
    expect(thumbnailToggle).toBeInTheDocument();
    
    const toggleInput = document.querySelector('.toggle-input') as HTMLInputElement;
    expect(toggleInput.checked).toBe(true);
  });

  it('calls onShowThumbnailsChange when thumbnail toggle is clicked', () => {
    render(<ViewModeControls {...mockProps} />);
    
    const toggleInput = document.querySelector('.toggle-input') as HTMLInputElement;
    fireEvent.click(toggleInput);
    
    expect(mockProps.onShowThumbnailsChange).toHaveBeenCalledWith(false);
  });

  it('renders additional control buttons', () => {
    render(<ViewModeControls {...mockProps} />);
    
    expect(screen.getByTitle('Refresh Library')).toBeInTheDocument();
    expect(screen.getByTitle('View Settings')).toBeInTheDocument();
  });

  it('has correct accessibility attributes', () => {
    render(<ViewModeControls {...mockProps} />);
    
    const gridButton = screen.getByTitle('Grid View');
    expect(gridButton).toHaveAttribute('title', 'Grid View');
    
    const sortSelect = screen.getByDisplayValue('Name');
    expect(sortSelect).toHaveAttribute('aria-label', 'Sort videos by');
  });

  it('updates thumbnail size display correctly', () => {
    render(<ViewModeControls {...mockProps} thumbnailSize={180} />);
    
    expect(screen.getByText('180px')).toBeInTheDocument();
  });

  it('shows correct sort order for descending', () => {
    render(<ViewModeControls {...mockProps} sortOrder="desc" />);
    
    const sortOrderButton = screen.getByTitle('Sort Ascending');
    expect(sortOrderButton).toHaveTextContent('↓');
  });

  it('maintains proper slider constraints', () => {
    render(<ViewModeControls {...mockProps} />);
    
    const sizeSlider = document.querySelector('.size-slider') as HTMLInputElement;
    expect(sizeSlider).toHaveAttribute('min', '120');
    expect(sizeSlider).toHaveAttribute('max', '300');
    expect(sizeSlider).toHaveAttribute('step', '20');
  });

  it('renders with different view modes correctly', () => {
    const { rerender } = render(<ViewModeControls {...mockProps} viewMode="tiles" />);
    
    const tilesButton = screen.getByTitle('Tiles View');
    expect(tilesButton).toHaveClass('active');
    
    rerender(<ViewModeControls {...mockProps} viewMode="list" />);
    
    const listButton = screen.getByTitle('List View');
    expect(listButton).toHaveClass('active');
  });
});