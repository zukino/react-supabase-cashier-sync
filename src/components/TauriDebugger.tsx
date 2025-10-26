import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';

export function TauriDebugger() {
  const [logs, setLogs] = useState<string[]>([]);
  const [testResult, setTestResult] = useState<string>('');

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const checkEnvironment = () => {
    addLog('=== Checking Tauri Environment ===');

    const envInfo = {
      hasWindow: typeof window !== 'undefined',
      __TAURI__: !!(window as any).__TAURI__,
      __TAURI_INTERNALS__: !!(window as any).__TAURI_INTERNALS__,
      __TAURI_METADATA__: !!(window as any).__TAURI_METADATA__,
      protocol: window.location?.protocol,
      href: window.location?.href,
      userAgent: navigator.userAgent,
    };

    addLog(`Window exists: ${envInfo.hasWindow}`);
    addLog(`__TAURI__: ${envInfo.__TAURI__}`);
    addLog(`__TAURI_INTERNALS__: ${envInfo.__TAURI_INTERNALS__}`);
    addLog(`__TAURI_METADATA__: ${envInfo.__TAURI_METADATA__}`);
    addLog(`Protocol: ${envInfo.protocol}`);
    addLog(`Href: ${envInfo.href}`);

    const isTauri = envInfo.__TAURI__ || envInfo.__TAURI_INTERNALS__ || envInfo.__TAURI_METADATA__ ||
                   envInfo.protocol === 'tauri:' || !envInfo.href?.startsWith('http');

    addLog(`=== IS TAURI: ${isTauri} ===`);
    return isTauri;
  };

  const testInvokeFunction = async () => {
    addLog('=== Testing Invoke Function ===');

    try {
      // Check if we can import invoke
      addLog('Attempting to import @tauri-apps/api/core...');
      const module = await import('@tauri-apps/api/core');
      const invoke = module.invoke;

      addLog('✅ Import successful');
      addLog('Testing ping command...');

      const result = await invoke('ping');
      addLog(`✅ Ping result: ${result}`);

      setTestResult('SUCCESS: Invoke function works!');
      addLog('=== INVOKE TEST PASSED ===');

    } catch (error) {
      addLog(`❌ Error: ${error}`);
      setTestResult(`FAILED: ${error}`);
      addLog('=== INVOKE TEST FAILED ===');
    }
  };

  const testDatabaseCommands = async () => {
    addLog('=== Testing Database Commands ===');

    try {
      const module = await import('@tauri-apps/api/core');
      const invoke = module.invoke;

      addLog('Testing database stats...');
      const stats = await invoke('get_database_stats');
      addLog(`✅ Database stats: ${JSON.stringify(stats)}`);

      setTestResult('SUCCESS: Database commands work!');
      addLog('=== DATABASE TEST PASSED ===');

    } catch (error) {
      addLog(`❌ Error: ${error}`);
      setTestResult(`FAILED: ${error}`);
      addLog('=== DATABASE TEST FAILED ===');
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🐛 Tauri Environment Debugger
          <Badge variant={testResult.includes('SUCCESS') ? 'default' : testResult.includes('FAILED') ? 'destructive' : 'secondary'}>
            {testResult ? (testResult.includes('SUCCESS') ? 'Working' : 'Failed') : 'Not Tested'}
          </Badge>
        </CardTitle>
        <CardDescription>
          Test if Tauri API is properly detected and working in your environment
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Button onClick={checkEnvironment} variant="outline">
            🔍 Check Environment
          </Button>
          <Button onClick={testInvokeFunction} variant="outline">
            ⚡ Test Invoke
          </Button>
          <Button onClick={testDatabaseCommands} variant="outline">
            💾 Test Database
          </Button>
          <Button onClick={() => setLogs([])} variant="outline">
            🗑️ Clear Logs
          </Button>
        </div>

        {testResult && (
          <div className={`p-3 rounded-lg ${testResult.includes('SUCCESS') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            <strong>Result:</strong> {testResult}
          </div>
        )}

        <div>
          <h4 className="font-medium mb-2">Debug Logs:</h4>
          <Textarea
            value={logs.join('\n')}
            readOnly
            className="h-64 font-mono text-sm"
            placeholder="Click the buttons above to start debugging..."
          />
        </div>
      </CardContent>
    </Card>
  );
}