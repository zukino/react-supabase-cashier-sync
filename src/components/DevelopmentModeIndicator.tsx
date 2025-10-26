import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Info, Terminal, Rocket, Globe, Database, AlertTriangle } from "lucide-react";
import { localDB } from "@/services/localDB";

// Check if Tauri is available (web vs desktop environment)
const isTauriAvailable = typeof window !== 'undefined' && (
  (window as any).__TAURI__ !== undefined ||
  (window as any).__TAURI_INTERNALS__ !== undefined ||
  (window as any).__TAURI_METADATA__ !== undefined ||
  window.location.protocol === 'tauri:' ||
  !window.location.href.startsWith('http')
);

export const DevelopmentModeIndicator: React.FC = () => {
  const [dbConnectionStatus, setDbConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    if (isTauriAvailable) {
      checkConnection();
    }
  }, []);

  const checkConnection = async () => {
    setDbConnectionStatus('checking');
    setConnectionError(null);
    try {
      // First test if Tauri commands are working at all
      const tauriPing = await localDB.testTauriPing();
      if (!tauriPing) {
        setDbConnectionStatus('disconnected');
        setConnectionError('Tauri commands are not responding. The backend may have failed to start.');
        return;
      }

      // Then test database connection
      const isConnected = await localDB.checkDatabaseConnection();
      setDbConnectionStatus(isConnected ? 'connected' : 'disconnected');
    } catch (error) {
      setDbConnectionStatus('disconnected');
      setConnectionError(error instanceof Error ? error.message : String(error));
    }
  };

  if (isTauriAvailable) {
    if (dbConnectionStatus === 'checking') {
      return (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-yellow-800 flex items-center gap-2">
              <Rocket className="h-4 w-4" />
              Desktop Mode (Tauri) - Checking Database...
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <CardDescription className="text-xs text-yellow-700">
              Initializing database connection...
            </CardDescription>
          </CardContent>
        </Card>
      );
    }

    if (dbConnectionStatus === 'disconnected') {
      return (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Database Connection Failed</AlertTitle>
          <AlertDescription className="mt-2">
            <div className="space-y-3">
              <p className="text-red-700">
                Running in desktop mode but unable to connect to the database. This indicates a problem with the Tauri backend.
              </p>

              {connectionError && (
                <div className="bg-red-100 border border-red-200 rounded p-3">
                  <h4 className="font-medium text-red-800 mb-1">Error Details:</h4>
                  <code className="text-xs text-red-700">{connectionError}</code>
                </div>
              )}

              <div className="bg-muted rounded-lg p-3">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  Troubleshooting Steps:
                </h4>
                <ol className="text-sm space-y-1 list-decimal list-inside">
                  <li>Check the terminal where you ran <code>npm run tauri:dev</code> for error messages</li>
                  <li>Ensure the Rust backend compiled successfully</li>
                  <li>Try restarting the application: <code>Ctrl+C</code> then <code>npm run tauri:dev</code></li>
                  <li>Check if all dependencies are installed: <code>npm install</code></li>
                </ol>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="destructive">Database Disconnected</Badge>
                <Badge variant="outline">Using Mock Data Fallback</Badge>
              </div>

              <Button onClick={checkConnection} variant="outline" size="sm" className="mt-2">
                Retry Connection
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <Card className="mb-6 border-green-200 bg-green-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-green-800 flex items-center gap-2">
            <Database className="h-4 w-4" />
            Desktop Mode (Tauri) - Database Connected
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <CardDescription className="text-xs text-green-700">
            Running in desktop mode with full database access and native features. All systems operational.
          </CardDescription>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-green-700 border-green-300">Database Connected</Badge>
            <Badge variant="outline" className="text-green-700 border-green-300">Native Features Active</Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Alert className="mb-6">
      <Globe className="h-4 w-4" />
      <AlertTitle>Web Development Mode</AlertTitle>
      <AlertDescription className="mt-2">
        <div className="space-y-3">
          <p>
            You're currently running in web mode with mock data. To test the full application with database features:
          </p>

          <div className="bg-muted rounded-lg p-3">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              How to run Desktop Mode:
            </h4>
            <ol className="text-sm space-y-1 list-decimal list-inside">
              <li>Stop the current development server (Ctrl+C)</li>
              <li>Run <code className="bg-background px-1 py-0.5 rounded text-xs">npm run tauri:dev</code></li>
              <li>The desktop application will open with full database access</li>
            </ol>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline">Mock Data Active</Badge>
            <Badge variant="outline">No Database Access</Badge>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export const isRunningInTauri = (): boolean => isTauriAvailable;