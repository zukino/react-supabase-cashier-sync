import { useState, useEffect, useCallback } from "react";
import { syncService, SyncState, SyncResult } from "../services/syncService";

export const useSync = () => {
  const [syncState, setSyncState] = useState<SyncState>(syncService.getState());

  // Subscribe to sync state changes
  useEffect(() => {
    const unsubscribe = syncService.subscribe(setSyncState);
    return unsubscribe;
  }, []);

  // Manual sync function
  const syncNow = useCallback(async (): Promise<SyncResult> => {
    return await syncService.syncNow();
  }, []);

  // Start auto sync
  const startAutoSync = useCallback(() => {
    syncService.start();
  }, []);

  // Stop auto sync
  const stopAutoSync = useCallback(() => {
    syncService.stop();
  }, []);

  // Get sync statistics
  const getSyncStats = useCallback(() => {
    return syncService.getSyncStats();
  }, []);

  return {
    syncState,
    syncNow,
    startAutoSync,
    stopAutoSync,
    getSyncStats,
    isRunning: syncService.isRunning(),
  };
};