import React, { useState, useEffect } from 'react';

interface DiagnosticResult {
  name: string;
  status: 'success' | 'error' | 'pending';
  result?: any;
  error?: string;
}

const ElectronDiagnostics: React.FC = () => {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const diagnosticTests = [
    {
      name: 'Window.electronAPI Available',
      test: () => Promise.resolve(!!window.electronAPI)
    },
    {
      name: 'ElectronAPI Methods',
      test: () => Promise.resolve(window.electronAPI ? Object.keys(window.electronAPI) : 'N/A')
    },
    {
      name: 'IPC Test Connection',
      test: () => window.electronAPI?.testConnection?.() || Promise.reject('Method not available')
    },
    {
      name: 'Get Diagnostics',
      test: () => window.electronAPI?.getDiagnostics?.() || Promise.reject('Method not available')
    },
    {
      name: 'Select Files Method',
      test: () => Promise.resolve(typeof window.electronAPI?.selectFiles === 'function')
    },
    {
      name: 'App Version',
      test: () => window.electronAPI?.getAppVersion?.() || Promise.reject('Method not available')
    },
    {
      name: 'Platform Info',
      test: () => window.electronAPI?.getPlatform?.() || Promise.reject('Method not available')
    },
    {
      name: 'FFmpeg Availability',
      test: () => window.electronAPI?.testFFmpeg?.() || Promise.reject('Method not available')
    }
  ];

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);

    for (const diagnostic of diagnosticTests) {
      try {
        console.log(`Running diagnostic: ${diagnostic.name}`);
        const result = await diagnostic.test();
        setResults(prev => [...prev, {
          name: diagnostic.name,
          status: 'success',
          result: result
        }]);
      } catch (error) {
        console.error(`Diagnostic failed: ${diagnostic.name}`, error);
        setResults(prev => [...prev, {
          name: diagnostic.name,
          status: 'error',
          error: error instanceof Error ? error.message : String(error)
        }]);
      }
    }

    setIsRunning(false);
  };

  const testFileSelection = async () => {
    try {
      console.log('Testing file selection...');
      
      if (!window.electronAPI?.selectFiles) {
        throw new Error('selectFiles method not available');
      }

      const files = await window.electronAPI.selectFiles();
      console.log('File selection result:', files);
      
      setResults(prev => [...prev, {
        name: 'File Selection Test',
        status: 'success',
        result: files
      }]);
    } catch (error) {
      console.error('File selection test failed:', error);
      setResults(prev => [...prev, {
        name: 'File Selection Test',
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      }]);
    }
  };

  useEffect(() => {
    // Auto-run diagnostics on mount
    runDiagnostics();
  }, []);

  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#1a1a1a', 
      color: '#fff', 
      fontFamily: 'monospace',
      maxHeight: '80vh',
      overflow: 'auto'
    }}>
      <h2>🔧 Electron API Diagnostics</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={runDiagnostics} 
          disabled={isRunning}
          style={{
            padding: '8px 16px',
            marginRight: '10px',
            backgroundColor: '#0078d4',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isRunning ? 'not-allowed' : 'pointer'
          }}
        >
          {isRunning ? '⏳ Running...' : '🔄 Run Diagnostics'}
        </button>
        
        <button 
          onClick={testFileSelection}
          style={{
            padding: '8px 16px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          📂 Test File Selection
        </button>
      </div>

      <div>
        {results.map((result, index) => (
          <div 
            key={index} 
            style={{ 
              marginBottom: '15px', 
              padding: '10px', 
              backgroundColor: result.status === 'success' ? '#0f4f3c' : '#4f1f1f',
              border: `1px solid ${result.status === 'success' ? '#10b981' : '#ef4444'}`,
              borderRadius: '4px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
              <span style={{ marginRight: '8px' }}>
                {result.status === 'success' ? '✅' : '❌'}
              </span>
              <strong>{result.name}</strong>
            </div>
            
            {result.result !== undefined && (
              <div style={{ 
                backgroundColor: '#2a2a2a', 
                padding: '8px', 
                borderRadius: '3px',
                fontSize: '12px',
                wordBreak: 'break-all'
              }}>
                <strong>Result:</strong> {JSON.stringify(result.result, null, 2)}
              </div>
            )}
            
            {result.error && (
              <div style={{ 
                backgroundColor: '#3a1a1a', 
                padding: '8px', 
                borderRadius: '3px',
                fontSize: '12px',
                color: '#ff9999'
              }}>
                <strong>Error:</strong> {result.error}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#888' }}>
        <h3>Environment Info:</h3>
        <div>User Agent: {navigator.userAgent}</div>
        <div>Location: {window.location.href}</div>
        <div>Is Electron: {typeof window.electronAPI !== 'undefined' ? 'Yes' : 'No'}</div>
      </div>
    </div>
  );
};

export default ElectronDiagnostics;