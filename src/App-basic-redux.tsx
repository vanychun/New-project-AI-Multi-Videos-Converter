import React from 'react';
import { Provider } from 'react-redux';
import { configureStore, createSlice } from '@reduxjs/toolkit';

// Create a simple test slice
const testSlice = createSlice({
  name: 'test',
  initialState: { value: 'Hello Redux!' },
  reducers: {
    updateValue: (state, action) => {
      state.value = action.payload;
    }
  }
});

// Create a basic store
const testStore = configureStore({
  reducer: {
    test: testSlice.reducer
  }
});

const BasicReduxTest: React.FC = () => {
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
      <h1>🎬 Basic Redux Test</h1>
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        padding: '30px',
        borderRadius: '12px',
        textAlign: 'center'
      }}>
        <p>✅ Redux Toolkit Working</p>
        <p>✅ Store Created Successfully</p>
        <p>✅ Provider Connected</p>
      </div>
      <button 
        onClick={() => console.log('Basic Redux working!')}
        style={{
          background: '#7461ef',
          color: 'white',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '8px',
          cursor: 'pointer'
        }}
      >
        Test Basic Redux
      </button>
    </div>
  );
};

const AppBasicRedux: React.FC = () => {
  return (
    <Provider store={testStore}>
      <BasicReduxTest />
    </Provider>
  );
};

export default AppBasicRedux;