import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: (event: KeyboardEvent) => void;
  description: string;
  category?: string;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  disabled?: boolean;
}

export interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  target?: 'window' | 'document' | HTMLElement | null;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

export const useKeyboardShortcuts = (
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
) => {
  const {
    enabled = true,
    target = 'document',
    preventDefault = true,
    stopPropagation = true
  } = options;

  const shortcutsRef = useRef<KeyboardShortcut[]>([]);
  const handlerRef = useRef<(event: KeyboardEvent) => void>();

  // Update shortcuts ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when typing in inputs (unless explicitly allowed)
    const target = event.target as HTMLElement;
    const isInputElement = target.tagName === 'INPUT' || 
                          target.tagName === 'TEXTAREA' || 
                          target.contentEditable === 'true';
    
    if (isInputElement && !event.ctrlKey && !event.metaKey) {
      return;
    }

    for (const shortcut of shortcutsRef.current) {
      if (shortcut.disabled) continue;

      const keyMatches = shortcut.key.toLowerCase() === event.key.toLowerCase() ||
                        shortcut.key.toLowerCase() === event.code.toLowerCase();
      
      const modifiersMatch = 
        (shortcut.ctrlKey || false) === event.ctrlKey &&
        (shortcut.shiftKey || false) === event.shiftKey &&
        (shortcut.altKey || false) === event.altKey &&
        (shortcut.metaKey || false) === event.metaKey;

      if (keyMatches && modifiersMatch) {
        if (shortcut.preventDefault ?? preventDefault) {
          event.preventDefault();
        }
        if (shortcut.stopPropagation ?? stopPropagation) {
          event.stopPropagation();
        }
        
        shortcut.action(event);
        break; // Only trigger the first matching shortcut
      }
    }
  }, [enabled, preventDefault, stopPropagation]);

  useEffect(() => {
    if (!enabled) return;

    const targetElement = target === 'window' ? window :
                         target === 'document' ? document :
                         target instanceof HTMLElement ? target : document;

    handlerRef.current = handleKeyDown;
    targetElement.addEventListener('keydown', handleKeyDown as EventListener);

    return () => {
      targetElement.removeEventListener('keydown', handleKeyDown as EventListener);
    };
  }, [enabled, target, handleKeyDown]);

  return {
    shortcuts: shortcutsRef.current,
    enabled
  };
};

// Hook for common application shortcuts
export const useCommonShortcuts = (actions: {
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onSave?: () => void;
  onRefresh?: () => void;
  onEscape?: () => void;
  onEnter?: () => void;
  onSearch?: () => void;
  onToggleFullscreen?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
}) => {
  const shortcuts: KeyboardShortcut[] = [
    // Selection shortcuts
    ...(actions.onSelectAll ? [{
      key: 'a',
      ctrlKey: true,
      action: actions.onSelectAll,
      description: 'Select all items',
      category: 'Selection'
    }] : []),
    
    ...(actions.onDeselectAll ? [{
      key: 'Escape',
      action: actions.onDeselectAll,
      description: 'Deselect all items',
      category: 'Selection'
    }] : []),

    // Action shortcuts
    ...(actions.onDelete ? [{
      key: 'Delete',
      action: actions.onDelete,
      description: 'Delete selected items',
      category: 'Actions'
    }] : []),

    ...(actions.onCopy ? [{
      key: 'c',
      ctrlKey: true,
      action: actions.onCopy,
      description: 'Copy selected items',
      category: 'Actions'
    }] : []),

    ...(actions.onPaste ? [{
      key: 'v',
      ctrlKey: true,
      action: actions.onPaste,
      description: 'Paste items',
      category: 'Actions'
    }] : []),

    // History shortcuts
    ...(actions.onUndo ? [{
      key: 'z',
      ctrlKey: true,
      action: actions.onUndo,
      description: 'Undo last action',
      category: 'History'
    }] : []),

    ...(actions.onRedo ? [{
      key: 'z',
      ctrlKey: true,
      shiftKey: true,
      action: actions.onRedo,
      description: 'Redo last action',
      category: 'History'
    }] : []),

    // File shortcuts
    ...(actions.onSave ? [{
      key: 's',
      ctrlKey: true,
      action: actions.onSave,
      description: 'Save current work',
      category: 'File'
    }] : []),

    ...(actions.onRefresh ? [{
      key: 'F5',
      action: actions.onRefresh,
      description: 'Refresh content',
      category: 'Navigation'
    }] : []),

    // Navigation shortcuts
    ...(actions.onEscape ? [{
      key: 'Escape',
      action: actions.onEscape,
      description: 'Cancel current action',
      category: 'Navigation'
    }] : []),

    ...(actions.onEnter ? [{
      key: 'Enter',
      action: actions.onEnter,
      description: 'Confirm action',
      category: 'Navigation'
    }] : []),

    ...(actions.onSearch ? [{
      key: 'f',
      ctrlKey: true,
      action: actions.onSearch,
      description: 'Open search',
      category: 'Navigation'
    }] : []),

    // View shortcuts
    ...(actions.onToggleFullscreen ? [{
      key: 'F11',
      action: actions.onToggleFullscreen,
      description: 'Toggle fullscreen',
      category: 'View'
    }] : []),

    ...(actions.onZoomIn ? [{
      key: '=',
      ctrlKey: true,
      action: actions.onZoomIn,
      description: 'Zoom in',
      category: 'View'
    }] : []),

    ...(actions.onZoomOut ? [{
      key: '-',
      ctrlKey: true,
      action: actions.onZoomOut,
      description: 'Zoom out',
      category: 'View'
    }] : []),

    ...(actions.onZoomReset ? [{
      key: '0',
      ctrlKey: true,
      action: actions.onZoomReset,
      description: 'Reset zoom',
      category: 'View'
    }] : [])
  ];

  return useKeyboardShortcuts(shortcuts, {
    enabled: true,
    target: 'document'
  });
};

// Hook for media player shortcuts
export const useMediaShortcuts = (actions: {
  onPlayPause?: () => void;
  onStop?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onSeekForward?: () => void;
  onSeekBackward?: () => void;
  onVolumeUp?: () => void;
  onVolumeDown?: () => void;
  onMute?: () => void;
  onFullscreen?: () => void;
}) => {
  const shortcuts: KeyboardShortcut[] = [
    // Playback control
    ...(actions.onPlayPause ? [{
      key: ' ',
      action: (e) => {
        e.preventDefault();
        actions.onPlayPause!();
      },
      description: 'Play/Pause',
      category: 'Playback'
    }] : []),

    ...(actions.onStop ? [{
      key: 's',
      action: actions.onStop,
      description: 'Stop playback',
      category: 'Playback'
    }] : []),

    // Navigation
    ...(actions.onNext ? [{
      key: 'ArrowRight',
      action: actions.onNext,
      description: 'Next video',
      category: 'Navigation'
    }] : []),

    ...(actions.onPrevious ? [{
      key: 'ArrowLeft',
      action: actions.onPrevious,
      description: 'Previous video',
      category: 'Navigation'
    }] : []),

    // Seeking
    ...(actions.onSeekForward ? [{
      key: 'ArrowRight',
      shiftKey: true,
      action: actions.onSeekForward,
      description: 'Seek forward',
      category: 'Seeking'
    }] : []),

    ...(actions.onSeekBackward ? [{
      key: 'ArrowLeft',
      shiftKey: true,
      action: actions.onSeekBackward,
      description: 'Seek backward',
      category: 'Seeking'
    }] : []),

    // Volume control
    ...(actions.onVolumeUp ? [{
      key: 'ArrowUp',
      action: actions.onVolumeUp,
      description: 'Volume up',
      category: 'Audio'
    }] : []),

    ...(actions.onVolumeDown ? [{
      key: 'ArrowDown',
      action: actions.onVolumeDown,
      description: 'Volume down',
      category: 'Audio'
    }] : []),

    ...(actions.onMute ? [{
      key: 'm',
      action: actions.onMute,
      description: 'Toggle mute',
      category: 'Audio'
    }] : []),

    // View
    ...(actions.onFullscreen ? [{
      key: 'f',
      action: actions.onFullscreen,
      description: 'Toggle fullscreen',
      category: 'View'
    }] : [])
  ];

  return useKeyboardShortcuts(shortcuts, {
    enabled: true,
    target: 'document'
  });
};

// Hook for grid/list navigation
export const useGridNavigation = (
  gridRef: React.RefObject<HTMLElement>,
  actions: {
    onItemSelect?: (index: number) => void;
    onItemActivate?: (index: number) => void;
    itemCount: number;
    columnsCount?: number;
    currentIndex?: number;
  }
) => {
  const { itemCount, columnsCount = 1, currentIndex = 0 } = actions;

  const shortcuts: KeyboardShortcut[] = [
    // Arrow navigation
    {
      key: 'ArrowUp',
      action: () => {
        const newIndex = Math.max(0, currentIndex - columnsCount);
        actions.onItemSelect?.(newIndex);
      },
      description: 'Move up',
      category: 'Navigation'
    },
    {
      key: 'ArrowDown',
      action: () => {
        const newIndex = Math.min(itemCount - 1, currentIndex + columnsCount);
        actions.onItemSelect?.(newIndex);
      },
      description: 'Move down',
      category: 'Navigation'
    },
    {
      key: 'ArrowLeft',
      action: () => {
        const newIndex = Math.max(0, currentIndex - 1);
        actions.onItemSelect?.(newIndex);
      },
      description: 'Move left',
      category: 'Navigation'
    },
    {
      key: 'ArrowRight',
      action: () => {
        const newIndex = Math.min(itemCount - 1, currentIndex + 1);
        actions.onItemSelect?.(newIndex);
      },
      description: 'Move right',
      category: 'Navigation'
    },
    // Home/End navigation
    {
      key: 'Home',
      action: () => {
        actions.onItemSelect?.(0);
      },
      description: 'Go to first item',
      category: 'Navigation'
    },
    {
      key: 'End',
      action: () => {
        actions.onItemSelect?.(itemCount - 1);
      },
      description: 'Go to last item',
      category: 'Navigation'
    },
    // Activation
    {
      key: 'Enter',
      action: () => {
        actions.onItemActivate?.(currentIndex);
      },
      description: 'Activate item',
      category: 'Actions'
    }
  ];

  return useKeyboardShortcuts(shortcuts, {
    enabled: true,
    target: gridRef.current
  });
};

export default useKeyboardShortcuts;