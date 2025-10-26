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

  useEffect(() => {
    // Subscribe to sync state changes
    const unsubscribe = syncService.subscribe(setSyncState);

    // Start auto sync only if Supabase is configured
    try {
      syncService.start();
    } catch (error) {
      console.warn("Failed to start sync service:", error);
    }

    // Cleanup on unmount
    return () => {
      unsubscribe();
      syncService.stop();
    };
  }, []); // Empty dependency array - run once on mount

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