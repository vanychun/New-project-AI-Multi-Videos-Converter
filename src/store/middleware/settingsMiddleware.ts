import { Middleware } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { loadSettingsFromStorage } from '../slices/settingsSlice';

// Debounce function to avoid saving too frequently
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Save settings to electron backend
const saveSettings = async (settings: any) => {
  try {
    if (window.electronAPI && window.electronAPI.saveSettings) {
      const result = await window.electronAPI.saveSettings(settings);
      if (!result.success) {
        console.error('Failed to save settings:', result.error);
      }
    }
  } catch (error) {
    console.error('Error saving settings:', error);
  }
};

// Debounced save function (save at most once per second)
const debouncedSave = debounce(saveSettings, 1000);

// Settings persistence middleware
export const settingsMiddleware: Middleware<{}, RootState> = (store) => (next) => (action) => {
  const result = next(action);
  
  // Check if this is a settings action
  if (action.type.startsWith('settings/') && !action.type.includes('loadSettingsFromStorage')) {
    // Get current settings state after the action
    const state = store.getState();
    const settings = state.settings;
    
    // Save settings asynchronously with debouncing
    debouncedSave(settings);
  }
  
  return result;
};

// Load settings on app initialization
export const loadInitialSettings = async (dispatch: any) => {
  try {
    if (window.electronAPI && window.electronAPI.loadSettings) {
      const result = await window.electronAPI.loadSettings();
      
      if (result.success && result.settings) {
        dispatch(loadSettingsFromStorage(result.settings));
        console.log('Settings loaded successfully');
      } else if (!result.success) {
        console.error('Failed to load settings:', result.error);
      }
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
};