import React from 'react';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { debugStore, DebugRootState, updateName } from './store/store-debug';

const ReduxTestComponent: React.FC = () => {
  const appName = useSelector((state: DebugRootState) => state.app.name);
  const dispatch = useDispatch();

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      color: '#ffffff',
      fontFamily: 'Inter, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '20px'
    }}>
      <h1>🎬 Redux Debug Test</h1>
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        padding: '30px',
        borderRadius: '12px',
        textAlign: 'center'
      }}>
        <p>✅ Redux Store: Connected</p>
        <p>✅ useSelector: Working</p>
        <p>✅ useDispatch: Ready</p>
        <hr style={{ border: '1px solid #4a4a6a', margin: '20px 0' }} />
        <p><strong>App Name:</strong> {appName}</p>
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button 
          onClick={() => dispatch(updateName('Redux is Working!'))}
          style={{
            background: '#7461ef',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Test Redux Action
        </button>
        <button 
          onClick={() => console.log('Store state:', debugStore.getState())}
          style={{
            background: '#4a4a6a',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Log Store State
        </button>
      </div>
    </div>
  );
};

const AppReduxDebug: React.FC = () => {
  return (
    <Provider store={debugStore}>
      <ReduxTestComponent />
    </Provider>
  );
};

export default AppReduxDebug;