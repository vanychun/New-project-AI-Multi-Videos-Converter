import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { loadInitialSettings } from '../../store/middleware/settingsMiddleware';

/**
 * Component that loads settings on app initialization
 * Must be placed inside the Redux Provider
 */
const SettingsLoader: React.FC = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    // Load settings from electron backend on app start
    loadInitialSettings(dispatch);
  }, [dispatch]);

  return null; // This component doesn't render anything
};

export default SettingsLoader;