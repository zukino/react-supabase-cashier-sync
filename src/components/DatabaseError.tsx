import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Terminal } from "lucide-react";

interface DatabaseErrorProps {
  error: Error | string;
  onRetry?: () => void;
  className?: string;
}

export function DatabaseError({ error, onRetry, className }: DatabaseErrorProps) {
  const errorMessage = error instanceof Error ? error.message : error;

  return (
    <div className={`container mx-auto p-6 ${className}`}>
      <Alert variant="destructive" className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Database Connection Error</AlertTitle>
        <AlertDescription>
          {errorMessage}
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <div className="bg-muted rounded-lg p-4">
          <h3 className="font-medium mb-2 flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            What this means:
          </h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• The application cannot connect to the local database</li>
            <li>• This typically happens when running in a web browser</li>
            <li>• Desktop features require the Tauri environment</li>
          </ul>
        </div>

        <div className="bg-muted rounded-lg p-4">
          <h3 className="font-medium mb-2">How to fix:</h3>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Stop the current development server (Ctrl+C)</li>
            <li>Run <code className="bg-background px-1 py-0.5 rounded text-xs">npm run tauri:dev</code></li>
            <li>The desktop application will open with full database access</li>
          </ol>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium mb-2 text-blue-800">Development Mode:</h3>
          <p className="text-sm text-blue-700">
            For quick development without Tauri, the app will use mock data.
            This allows you to test the UI and functionality in any browser.
          </p>
        </div>

        {onRetry && (
          <div className="flex justify-center">
            <Button onClick={onRetry} variant="outline" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry Connection
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}