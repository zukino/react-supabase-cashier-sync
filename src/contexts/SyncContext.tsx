import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { syncService, SyncState } from "../services/syncService";

interface SyncContextType {
  syncState: SyncState;
  syncNow: () => Promise<any>;
  startAutoSync: () => void;
  stopAutoSync: () => void;
  isRunning: boolean;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

interface SyncProviderProps {
  children: ReactNode;
}

export const SyncProvider: React.FC<SyncProviderProps> = ({ children }) => {
  const [syncState, setSyncState] = useState<SyncState>(syncService.getState());
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Subscribe to sync state changes
    const unsubscribe = syncService.subscribe(setSyncState);

    // Start auto sync when component mounts
    if (!isInitialized) {
      syncService.start();
      setIsInitialized(true);
    }

    // Cleanup on unmount
    return () => {
      unsubscribe();
      syncService.stop();
    };
  }, [isInitialized]);

  const contextValue: SyncContextType = {
    syncState,
    syncNow: syncService.syncNow.bind(syncService),
    startAutoSync: syncService.start.bind(syncService),
    stopAutoSync: syncService.stop.bind(syncService),
    isRunning: syncService.isRunning(),
  };

  return (
    <SyncContext.Provider value={contextValue}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSyncContext = () => {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error("useSyncContext must be used within a SyncProvider");
  }
  return context;
};