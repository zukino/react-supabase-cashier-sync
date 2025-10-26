import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Activity,
  Terminal,
  Database,
  Package,
  DollarSign,
  Users,
  ChevronDown,
  ChevronUp,
  Trash2
} from "lucide-react";

interface LogEntry {
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'warning';
  operation: string;
  details: any;
  icon: React.ReactNode;
}

// Global log collector
const globalLogs: LogEntry[] = [];
let logUpdateCallbacks: (() => void)[] = [];

// Global logging function that can be imported by other components
export const addLog = (type: 'info' | 'success' | 'error' | 'warning', operation: string, ...details: any[]) => {
  const timestamp = new Date().toISOString();
  let icon = <Terminal className="h-4 w-4" />;

  // Determine operation type and icon
  if (operation.includes('Product')) {
    icon = <Package className="h-4 w-4" />;
  } else if (operation.includes('Transaction')) {
    icon = <DollarSign className="h-4 w-4" />;
  } else if (operation.includes('Customer')) {
    icon = <Users className="h-4 w-4" />;
  } else if (operation.includes('Inventory') || operation.includes('Stock')) {
    icon = <Database className="h-4 w-4" />;
  } else if (operation.includes('Database')) {
    icon = <Database className="h-4 w-4" />;
  }

  const newLog: LogEntry = {
    timestamp,
    type,
    operation,
    details,
    icon
  };

  globalLogs.unshift(newLog);
  if (globalLogs.length > 50) {
    globalLogs.splice(50);
  }

  // Notify all listeners
  logUpdateCallbacks.forEach(callback => callback());
};

export const ActivityLogger: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const maxLogs = 50;

  useEffect(() => {
    // Update logs from global state
    const updateLogs = () => {
      setLogs([...globalLogs]);
    };

    // Register for updates
    logUpdateCallbacks.push(updateLogs);
    updateLogs(); // Initial load

    return () => {
      // Cleanup
      const index = logUpdateCallbacks.indexOf(updateLogs);
      if (index > -1) {
        logUpdateCallbacks.splice(index, 1);
      }
    };
  }, []);

  const clearLogs = () => {
    globalLogs.length = 0;
    setLogs([]);
    logUpdateCallbacks.forEach(callback => callback());
  };

  const getLogColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      default: return 'text-blue-600';
    }
  };

  const getLogBgColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-50 border-green-200';
      case 'error': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-blue-50 border-blue-200';
    }
  };

  if (isMinimized) {
    return (
      <Card className="fixed bottom-4 right-4 w-80 shadow-lg border">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="text-sm font-medium">Activity Logger</span>
              <Badge variant="outline">{logs.length}</Badge>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsMinimized(false)}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 max-h-96 shadow-lg border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activity Logger
            <Badge variant="outline">{logs.length}</Badge>
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={clearLogs}>
              <Trash2 className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsMinimized(true)}>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No activity logged yet
                </p>
              ) : (
                logs.map((log, index) => (
                  <div
                    key={`${log.timestamp}-${index}`}
                    className={`p-2 rounded border text-xs ${getLogBgColor(log.type)}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`mt-0.5 ${getLogColor(log.type)}`}>
                        {log.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {log.operation}
                          </Badge>
                          <span className="text-muted-foreground text-xs">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className={`text-xs ${getLogColor(log.type)} break-words`}>
                          {log.details.map((detail: any, idx: number) => (
                            <span key={idx}>
                              {typeof detail === 'object' ? JSON.stringify(detail) : String(detail)}
                              {idx < log.details.length - 1 && ' '}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    {index < logs.length - 1 && <Separator className="mt-2" />}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  );
};