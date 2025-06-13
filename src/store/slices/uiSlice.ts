import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ModalState {
  id?: string;
  type: string | null;
  isOpen: boolean;
  title?: string;
  content?: any;
  data?: any;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface NotificationState {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  autoClose: boolean;
  duration: number;
  timestamp: number;
}

export interface UIState {
  // Layout
  sidebarCollapsed: boolean;
  settingsPanelCollapsed: boolean;
  queuePanelCollapsed: boolean;
  panelSizes: {
    sidebar: number;
    settings: number;
    queue: number;
  };
  
  // Theme and appearance
  theme: 'dark' | 'light';
  fontSize: 'small' | 'medium' | 'large';
  density: 'compact' | 'comfortable' | 'spacious';
  
  // Modals
  modals: ModalState[];
  activeModal: ModalState;
  modalStack: ModalState[];
  
  // Notifications
  notifications: NotificationState[];
  maxNotifications: number;
  
  // Loading states
  isLoading: boolean;
  loadingMessage: string;
  loadingProgress: number;
  
  // Drag and drop
  isDragging: boolean;
  dragData: any;
  dropZoneActive: string | null;
  
  // Selection
  selectedItems: string[];
  selectionMode: 'single' | 'multiple';
  
  // Context menu
  contextMenu: {
    isOpen: boolean;
    position: { x: number; y: number };
    items: Array<{
      label: string;
      action: string;
      icon?: string;
      disabled?: boolean;
      separator?: boolean;
    }>;
  };
  
  // Tooltips
  activeTooltip: {
    id: string;
    content: string;
    position: { x: number; y: number };
  } | null;
  
  // Focus management
  focusedElement: string | null;
  keyboardNavigation: boolean;
  
  // Error states
  errors: Array<{
    id: string;
    message: string;
    timestamp: number;
    context?: string;
  }>;
  
  // Performance monitoring
  performance: {
    fps: number;
    memoryUsage: number;
    renderTime: number;
    lastUpdate: number;
  };
  
  // Preferences
  preferences: {
    autoSaveInterval: number;
    showTooltips: boolean;
    enableAnimations: boolean;
    enableSounds: boolean;
    confirmDestructiveActions: boolean;
    rememberWindowState: boolean;
  };
}

const initialState: UIState = {
  sidebarCollapsed: false,
  settingsPanelCollapsed: false,
  queuePanelCollapsed: false,
  panelSizes: {
    sidebar: 300,
    settings: 350,
    queue: 150,
  },
  
  theme: 'dark',
  fontSize: 'medium',
  density: 'comfortable',
  
  modals: [],
  activeModal: {
    type: null,
    isOpen: false,
  },
  modalStack: [],
  
  notifications: [],
  maxNotifications: 5,
  
  isLoading: false,
  loadingMessage: '',
  loadingProgress: 0,
  
  isDragging: false,
  dragData: null,
  dropZoneActive: null,
  
  selectedItems: [],
  selectionMode: 'multiple',
  
  contextMenu: {
    isOpen: false,
    position: { x: 0, y: 0 },
    items: [],
  },
  
  activeTooltip: null,
  
  focusedElement: null,
  keyboardNavigation: false,
  
  errors: [],
  
  performance: {
    fps: 60,
    memoryUsage: 0,
    renderTime: 0,
    lastUpdate: Date.now(),
  },
  
  preferences: {
    autoSaveInterval: 300000, // 5 minutes
    showTooltips: true,
    enableAnimations: true,
    enableSounds: false,
    confirmDestructiveActions: true,
    rememberWindowState: true,
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Layout actions
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    
    toggleSettingsPanel: (state) => {
      state.settingsPanelCollapsed = !state.settingsPanelCollapsed;
    },
    
    toggleQueuePanel: (state) => {
      state.queuePanelCollapsed = !state.queuePanelCollapsed;
    },
    
    setPanelSize: (state, action: PayloadAction<{ panel: keyof UIState['panelSizes']; size: number }>) => {
      const { panel, size } = action.payload;
      state.panelSizes[panel] = Math.max(100, Math.min(800, size));
    },
    
    // Theme actions
    setTheme: (state, action: PayloadAction<'dark' | 'light'>) => {
      state.theme = action.payload;
    },
    
    setFontSize: (state, action: PayloadAction<'small' | 'medium' | 'large'>) => {
      state.fontSize = action.payload;
    },
    
    setDensity: (state, action: PayloadAction<'compact' | 'comfortable' | 'spacious'>) => {
      state.density = action.payload;
    },
    
    // Modal actions
    openModal: (state, action: PayloadAction<{ type: string; data?: any }>) => {
      const { type, data } = action.payload;
      
      // Add current modal to stack if open
      if (state.activeModal.isOpen) {
        state.modalStack.push({ ...state.activeModal });
      }
      
      state.activeModal = {
        type,
        isOpen: true,
        data,
      };
    },
    
    closeModal: (state) => {
      if (state.modalStack.length > 0) {
        // Return to previous modal
        state.activeModal = state.modalStack.pop()!;
      } else {
        state.activeModal = {
          type: null,
          isOpen: false,
        };
      }
    },
    
    closeAllModals: (state) => {
      state.activeModal = {
        type: null,
        isOpen: false,
      };
      state.modalStack = [];
    },
    
    // Notification actions
    addNotification: (state, action: PayloadAction<Omit<NotificationState, 'id' | 'timestamp'>>) => {
      const notification: NotificationState = {
        ...action.payload,
        id: `notification_${Date.now()}_${Math.random()}`,
        timestamp: Date.now(),
      };
      
      state.notifications.unshift(notification);
      
      // Remove oldest notifications if exceeding max
      if (state.notifications.length > state.maxNotifications) {
        state.notifications = state.notifications.slice(0, state.maxNotifications);
      }
    },
    
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
    
    clearNotifications: (state) => {
      state.notifications = [];
    },
    
    // Loading actions
    setLoading: (state, action: PayloadAction<{ isLoading: boolean; message?: string; progress?: number }>) => {
      const { isLoading, message = '', progress = 0 } = action.payload;
      state.isLoading = isLoading;
      state.loadingMessage = message;
      state.loadingProgress = progress;
    },
    
    updateLoadingProgress: (state, action: PayloadAction<number>) => {
      state.loadingProgress = Math.max(0, Math.min(100, action.payload));
    },
    
    // Drag and drop actions
    startDrag: (state, action: PayloadAction<any>) => {
      state.isDragging = true;
      state.dragData = action.payload;
    },
    
    endDrag: (state) => {
      state.isDragging = false;
      state.dragData = null;
      state.dropZoneActive = null;
    },
    
    setDropZoneActive: (state, action: PayloadAction<string | null>) => {
      state.dropZoneActive = action.payload;
    },
    
    // Selection actions
    selectItem: (state, action: PayloadAction<string>) => {
      const item = action.payload;
      
      if (state.selectionMode === 'single') {
        state.selectedItems = [item];
      } else {
        if (!state.selectedItems.includes(item)) {
          state.selectedItems.push(item);
        }
      }
    },
    
    deselectItem: (state, action: PayloadAction<string>) => {
      state.selectedItems = state.selectedItems.filter(id => id !== action.payload);
    },
    
    selectAll: (state, action: PayloadAction<string[]>) => {
      state.selectedItems = action.payload;
    },
    
    clearSelection: (state) => {
      state.selectedItems = [];
    },
    
    setSelectionMode: (state, action: PayloadAction<'single' | 'multiple'>) => {
      state.selectionMode = action.payload;
      if (action.payload === 'single' && state.selectedItems.length > 1) {
        state.selectedItems = state.selectedItems.slice(0, 1);
      }
    },
    
    // Context menu actions
    openContextMenu: (state, action: PayloadAction<{
      position: { x: number; y: number };
      items: UIState['contextMenu']['items'];
    }>) => {
      state.contextMenu = {
        isOpen: true,
        position: action.payload.position,
        items: action.payload.items,
      };
    },
    
    closeContextMenu: (state) => {
      state.contextMenu.isOpen = false;
    },
    
    // Tooltip actions
    showTooltip: (state, action: PayloadAction<{
      id: string;
      content: string;
      position: { x: number; y: number };
    }>) => {
      state.activeTooltip = action.payload;
    },
    
    hideTooltip: (state) => {
      state.activeTooltip = null;
    },
    
    // Focus actions
    setFocusedElement: (state, action: PayloadAction<string | null>) => {
      state.focusedElement = action.payload;
    },
    
    setKeyboardNavigation: (state, action: PayloadAction<boolean>) => {
      state.keyboardNavigation = action.payload;
    },
    
    // Error actions
    addError: (state, action: PayloadAction<{ message: string; context?: string }>) => {
      const error = {
        id: `error_${Date.now()}_${Math.random()}`,
        message: action.payload.message,
        context: action.payload.context,
        timestamp: Date.now(),
      };
      
      state.errors.unshift(error);
      
      // Keep only last 10 errors
      if (state.errors.length > 10) {
        state.errors = state.errors.slice(0, 10);
      }
    },
    
    removeError: (state, action: PayloadAction<string>) => {
      state.errors = state.errors.filter(error => error.id !== action.payload);
    },
    
    clearErrors: (state) => {
      state.errors = [];
    },
    
    // Performance actions
    updatePerformance: (state, action: PayloadAction<Partial<UIState['performance']>>) => {
      state.performance = { ...state.performance, ...action.payload, lastUpdate: Date.now() };
    },
    
    // Preferences actions
    updatePreferences: (state, action: PayloadAction<Partial<UIState['preferences']>>) => {
      state.preferences = { ...state.preferences, ...action.payload };
    },
  },
});

export const {
  toggleSidebar,
  toggleSettingsPanel,
  toggleQueuePanel,
  setPanelSize,
  setTheme,
  setFontSize,
  setDensity,
  openModal,
  closeModal,
  closeAllModals,
  addNotification,
  removeNotification,
  clearNotifications,
  setLoading,
  updateLoadingProgress,
  startDrag,
  endDrag,
  setDropZoneActive,
  selectItem,
  deselectItem,
  selectAll,
  clearSelection,
  setSelectionMode,
  openContextMenu,
  closeContextMenu,
  showTooltip,
  hideTooltip,
  setFocusedElement,
  setKeyboardNavigation,
  addError,
  removeError,
  clearErrors,
  updatePerformance,
  updatePreferences,
} = uiSlice.actions;

export default uiSlice.reducer;