import React, { Component, ErrorInfo, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  RefreshCw,
  Database,
  Wifi,
  WifiOff,
  Bug
} from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      retryCount: 0,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to console
    console.error("Error Boundary caught an error:", error, errorInfo);

    // Log to external service if available
    this.logErrorToService(error, errorInfo);
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // In a real application, you would send this to your error reporting service
    // For now, we'll just store it in localStorage for debugging
    try {
      const errorLog = {
        timestamp: new Date().toISOString(),
        error: {
          message: error.message,
          stack: error.stack,
        },
        componentStack: errorInfo.componentStack,
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      const existingLogs = JSON.parse(localStorage.getItem("errorLogs") || "[]");
      existingLogs.push(errorLog);

      // Keep only the last 50 errors
      if (existingLogs.length > 50) {
        existingLogs.splice(0, existingLogs.length - 50);
      }

      localStorage.setItem("errorLogs", JSON.stringify(existingLogs));
    } catch (e) {
      console.error("Failed to log error:", e);
    }
  };

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1,
      }));
    }
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    });
  };

  private getErrorType = (error: Error): "database" | "network" | "sync" | "unknown" => {
    const message = error.message.toLowerCase();

    if (message.includes("database") || message.includes("sqlite") || message.includes("rusqlite")) {
      return "database";
    }

    if (message.includes("network") || message.includes("fetch") || message.includes("supabase")) {
      return "network";
    }

    if (message.includes("sync") || message.includes("synchronization")) {
      return "sync";
    }

    return "unknown";
  };

  private getErrorIcon = (type: string) => {
    switch (type) {
      case "database":
        return <Database className="h-5 w-5" />;
      case "network":
        return <WifiOff className="h-5 w-5" />;
      case "sync":
        return <RefreshCw className="h-5 w-5" />;
      default:
        return <Bug className="h-5 w-5" />;
    }
  };

  private getErrorColor = (type: string) => {
    switch (type) {
      case "database":
        return "text-blue-600";
      case "network":
        return "text-orange-600";
      case "sync":
        return "text-purple-600";
      default:
        return "text-red-600";
    }
  };

  private getErrorSuggestion = (type: string): string => {
    switch (type) {
      case "database":
        return "Try restarting the application or check if the database file is accessible.";
      case "network":
        return "Check your internet connection and try again.";
      case "sync":
        return "Try manually syncing or check if the cloud service is available.";
      default:
        return "Try refreshing the page or restarting the application.";
    }
  };

  render() {
    if (this.state.hasError) {
      // If custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorType = this.state.error ? this.getErrorType(this.state.error) : "unknown";
      const errorColor = this.getErrorColor(errorType);
      const errorIcon = this.getErrorIcon(errorType);
      const suggestion = this.getErrorSuggestion(errorType);

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full">
            <CardHeader className="text-center">
              <div className={`mx-auto mb-4 ${errorColor}`}>
                {errorIcon}
              </div>
              <CardTitle className="text-2xl text-destructive">
                Oops! Something went wrong
              </CardTitle>
              <p className="text-muted-foreground">
                The application encountered an unexpected error
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Error Type Badge */}
              <div className="flex justify-center">
                <Badge variant="outline" className="capitalize">
                  {errorType} Error
                </Badge>
              </div>

              {/* Error Description */}
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error Details</AlertTitle>
                <AlertDescription className="mt-2">
                  <div className="font-mono text-sm bg-muted p-3 rounded">
                    {this.state.error?.message}
                  </div>
                </AlertDescription>
              </Alert>

              {/* Suggestion */}
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>What to try</AlertTitle>
                <AlertDescription>
                  {suggestion}
                </AlertDescription>
              </Alert>

              {/* Technical Details (only in development) */}
              {process.env.NODE_ENV === "development" && this.state.errorInfo && (
                <details className="border rounded-lg p-4">
                  <summary className="cursor-pointer font-medium mb-2">
                    Technical Details (Development Mode)
                  </summary>
                  <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                    {this.state.error?.stack}
                    {"\n\nComponent Stack:\n"}
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 justify-center">
                {this.state.retryCount < this.maxRetries && (
                  <Button onClick={this.handleRetry}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again ({this.maxRetries - this.state.retryCount} attempts left)
                  </Button>
                )}

                <Button variant="outline" onClick={this.handleReset}>
                  Reset Application
                </Button>

                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  Reload Page
                </Button>
              </div>

              {/* Retry Count Warning */}
              {this.state.retryCount >= this.maxRetries && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Maximum retries reached</AlertTitle>
                  <AlertDescription>
                    You've reached the maximum number of retry attempts. Please reload the page or contact support if the issue persists.
                  </AlertDescription>
                </Alert>
              )}

              {/* Offline Mode Notice */}
              {!navigator.onLine && (
                <Alert>
                  <WifiOff className="h-4 w-4" />
                  <AlertTitle>You're offline</AlertTitle>
                  <AlertDescription>
                    Check your internet connection. Some features may not work properly while offline.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for error handling outside of React components
export const useErrorHandler = () => {
  return (error: Error, errorInfo?: string) => {
    console.error("Caught error:", error, errorInfo);

    // Store error for debugging
    try {
      const errorLog = {
        timestamp: new Date().toISOString(),
        error: {
          message: error.message,
          stack: error.stack,
        },
        additionalInfo: errorInfo,
        source: "useErrorHandler",
      };

      const existingLogs = JSON.parse(localStorage.getItem("errorLogs") || "[]");
      existingLogs.push(errorLog);

      if (existingLogs.length > 50) {
        existingLogs.splice(0, existingLogs.length - 50);
      }

      localStorage.setItem("errorLogs", JSON.stringify(existingLogs));
    } catch (e) {
      console.error("Failed to log error:", e);
    }
  };
};