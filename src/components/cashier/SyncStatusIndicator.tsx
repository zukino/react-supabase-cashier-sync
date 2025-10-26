import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { useSyncContext } from "@/contexts/SyncContext";
import {
  Wifi,
  WifiOff,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Database,
  Cloud
} from "lucide-react";

interface SyncStatusIndicatorProps {
  variant?: "compact" | "detailed" | "minimal";
  showButton?: boolean;
  className?: string;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  variant = "compact",
  showButton = true,
  className = ""
}) => {
  const { syncState, syncNow } = useSyncContext();

  const getStatusIcon = () => {
    switch (syncState.status) {
      case "syncing":
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "offline":
        return <WifiOff className="h-4 w-4 text-gray-500" />;
      default:
        return syncState.isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (syncState.status) {
      case "syncing":
        return "default";
      case "success":
        return "default";
      case "error":
        return "destructive";
      case "offline":
        return "secondary";
      default:
        return syncState.isOnline ? "default" : "secondary";
    }
  };

  const getStatusText = () => {
    switch (syncState.status) {
      case "syncing":
        return "Syncing...";
      case "success":
        return "Synced";
      case "error":
        return "Sync Error";
      case "offline":
        return "Offline";
      default:
        return syncState.isOnline ? "Online" : "Offline";
    }
  };

  const getDetailedStatus = () => {
    if (syncState.status === "error" && syncState.error) {
      return syncState.error;
    }

    if (syncState.status === "syncing") {
      return "Synchronizing data with cloud server...";
    }

    if (syncState.status === "success" && syncState.lastSyncAt) {
      const timeDiff = new Date().getTime() - syncState.lastSyncAt.getTime();
      const minutesAgo = Math.floor(timeDiff / (1000 * 60));

      if (minutesAgo < 1) {
        return "Just synchronized";
      } else if (minutesAgo < 5) {
        return `Synchronized ${minutesAgo} minute${minutesAgo > 1 ? 's' : ''} ago`;
      } else {
        return `Synchronized ${minutesAgo} minutes ago`;
      }
    }

    return syncState.isOnline ? "Connected to cloud" : "Working offline";
  };

  const handleSyncNow = async () => {
    try {
      await syncNow();
    } catch (error) {
      console.error("Manual sync failed:", error);
    }
  };

  if (variant === "minimal") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant={getStatusColor()} className={`cursor-pointer ${className}`}>
              {getStatusIcon()}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{getDetailedStatus()}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === "detailed") {
    return (
      <Card className={`${className}`}>
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                <span className="font-medium">{getStatusText()}</span>
              </div>
              {showButton && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSyncNow}
                  disabled={syncState.status === "syncing" || !syncState.isOnline}
                >
                  {syncState.status === "syncing" ? (
                    <>
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Sync Now
                    </>
                  )}
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Database className="h-3 w-3" />
                  <span>Local Database</span>
                </div>
                <Badge variant="outline">Ready</Badge>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Cloud className="h-3 w-3" />
                  <span>Cloud Sync</span>
                </div>
                <Badge variant={getStatusColor()}>
                  {getStatusText()}
                </Badge>
              </div>
            </div>

            {syncState.lastSyncAt && (
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Last sync: {syncState.lastSyncAt.toLocaleString()}</div>
                {syncState.nextSyncAt && (
                  <div>Next sync: {syncState.nextSyncAt.toLocaleString()}</div>
                )}
              </div>
            )}

            {syncState.error && (
              <div className="flex items-start gap-2 text-sm text-red-600 p-2 bg-red-50 rounded">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{syncState.error}</span>
              </div>
            )}

            {!syncState.isOnline && (
              <div className="flex items-start gap-2 text-sm text-yellow-600 p-2 bg-yellow-50 rounded">
                <WifiOff className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>You're currently offline. Changes will be synced when connection is restored.</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Compact variant (default)
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant={getStatusColor()} className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="text-xs">{getStatusText()}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p>{getDetailedStatus()}</p>
              {syncState.lastSyncAt && (
                <p className="text-xs">Last: {syncState.lastSyncAt.toLocaleTimeString()}</p>
              )}
              {syncState.nextSyncAt && (
                <p className="text-xs">Next: {syncState.nextSyncAt.toLocaleTimeString()}</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {showButton && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleSyncNow}
          disabled={syncState.status === "syncing" || !syncState.isOnline}
        >
          {syncState.status === "syncing" ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
        </Button>
      )}
    </div>
  );
};