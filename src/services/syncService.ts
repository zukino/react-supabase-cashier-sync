import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Transaction, Product, Customer } from "../types/database";
import { notificationService } from "./notificationService";

// Check if Tauri is available (web vs desktop environment)
const isTauriAvailable = typeof window !== 'undefined' && (
  (window as any).__TAURI__ !== undefined ||
  (window as any).__TAURI_INTERNALS__ !== undefined ||
  (window as any).__TAURI_METADATA__ !== undefined ||
  window.location.protocol === 'tauri:' ||
  !window.location.href.startsWith('http')
);

console.log('🔍 SyncService Tauri Detection:', {
  isTauriAvailable,
  __TAURI__: !!(window as any).__TAURI__,
  __TAURI_INTERNALS__: !!(window as any).__TAURI_INTERNALS__,
  __TAURI_METADATA__: !!(window as any).__TAURI_METADATA__,
  protocol: window.location?.protocol,
  href: window.location?.href,
  userAgent: navigator.userAgent
});

// Dynamic import for invoke function (only available in Tauri)
let invoke: any = null;

// Helper function to get invoke function
async function getInvoke() {
  if (!isTauriAvailable) {
    throw new Error('Tauri is not available');
  }

  if (!invoke) {
    try {
      const module = await import("@tauri-apps/api/core");
      invoke = module.invoke;
    } catch (error) {
      console.error('Failed to import invoke function:', error);
      throw new Error('Failed to import Tauri invoke function');
    }
  }

  return invoke;
}

// Sync status types
export type SyncStatus = "idle" | "syncing" | "success" | "error" | "offline";

export interface SyncState {
  status: SyncStatus;
  lastSyncAt: Date | null;
  error: string | null;
  nextSyncAt: Date | null;
  isOnline: boolean;
}

export interface SyncResult {
  success: boolean;
  syncedTransactions: number;
  syncedProducts: number;
  syncedCustomers: number;
  error?: string;
}

// Get Supabase configuration from environment
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log("🔧 Supabase Configuration Check:");
console.log("  URL:", supabaseUrl ? "✅ Configured" : "❌ Missing");
console.log("  Anon Key:", supabaseAnonKey ? "✅ Configured" : "❌ Missing");

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("❌ Supabase configuration not found. Sync functionality will be disabled.");
} else {
  console.log("✅ Supabase configuration loaded successfully");
}

class SyncService {
  private supabase: SupabaseClient | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private syncState: SyncState = {
    status: "idle",
    lastSyncAt: null,
    error: null,
    nextSyncAt: null,
    isOnline: navigator.onLine,
  };
  private stateListeners: ((state: SyncState) => void)[] = [];
  private readonly SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_BASE = 1000; // 1 second

  constructor() {
    // Initialize Supabase client if configuration is available
    if (supabaseUrl && supabaseAnonKey) {
      this.supabase = createClient(supabaseUrl, supabaseAnonKey);
    }

    // Listen for online/offline events
    window.addEventListener("online", this.handleOnlineStatusChange.bind(this));
    window.addEventListener("offline", this.handleOnlineStatusChange.bind(this));
  }

  // Get current sync state
  getState(): SyncState {
    return { ...this.syncState };
  }

  // Subscribe to sync state changes
  subscribe(listener: (state: SyncState) => void): () => void {
    this.stateListeners.push(listener);
    listener(this.getState());

    // Return unsubscribe function
    return () => {
      const index = this.stateListeners.indexOf(listener);
      if (index > -1) {
        this.stateListeners.splice(index, 1);
      }
    };
  }

  // Update sync state and notify listeners
  private updateState(updates: Partial<SyncState>): void {
    this.syncState = { ...this.syncState, ...updates };
    this.notifyListeners();
  }

  // Notify all state listeners
  private notifyListeners(): void {
    this.stateListeners.forEach((listener) => listener(this.getState()));
  }

  // Handle online/offline status changes
  private handleOnlineStatusChange(): void {
    const isOnline = navigator.onLine;
    const wasOffline = !this.syncState.isOnline;

    this.updateState({ isOnline });

    if (isOnline && wasOffline) {
      // Connection restored
      notificationService.showConnectionRestored();

      if (this.syncState.status !== "syncing") {
        // When coming back online, trigger a sync
        this.scheduleNextSync(1000); // Sync after 1 second
      }
    } else if (!isOnline && wasOffline) {
      // Connection lost
      notificationService.showConnectionLost();
    }
  }

  // Start automatic synchronization
  start(): void {
    if (this.syncInterval) {
      console.warn("Sync service is already running");
      return;
    }

    if (!this.supabase) {
      console.warn("Supabase not configured. Sync service cannot start.");
      this.updateState({
        status: "error",
        error: "Supabase not configured",
      });
      return;
    }

    console.log("Starting sync service with 5-minute intervals");

    // Schedule first sync after 30 seconds
    this.scheduleNextSync(30000);

    // Set up recurring sync
    this.syncInterval = setInterval(() => {
      this.performSync();
    }, this.SYNC_INTERVAL);

    this.updateState({
      status: "idle",
      nextSyncAt: new Date(Date.now() + 30000),
    });
  }

  // Stop automatic synchronization
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log("Sync service stopped");
    }

    this.updateState({
      status: "idle",
      nextSyncAt: null,
    });
  }

  // Schedule next sync
  private scheduleNextSync(delay?: number): void {
    const nextSyncTime = new Date(Date.now() + (delay || this.SYNC_INTERVAL));
    this.updateState({ nextSyncAt: nextSyncTime });
  }

  // Perform manual sync
  async syncNow(): Promise<SyncResult> {
    if (!this.supabase) {
      return {
        success: false,
        syncedTransactions: 0,
        syncedProducts: 0,
        syncedCustomers: 0,
        error: "Supabase not configured",
      };
    }

    if (!navigator.onLine) {
      this.updateState({ status: "offline" });
      notificationService.showSyncOffline();
      return {
        success: false,
        syncedTransactions: 0,
        syncedProducts: 0,
        syncedCustomers: 0,
        error: "Device is offline",
      };
    }

    notificationService.showSyncStarted();
    this.updateState({ status: "syncing" });

    try {
      const result = await this.performSyncWithRetry();

      this.updateState({
        status: "success",
        lastSyncAt: new Date(),
        error: null,
      });

      notificationService.showSyncSuccess(result);
      this.scheduleNextSync();
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      this.updateState({
        status: "error",
        error: errorMessage,
      });

      notificationService.showSyncError(error);
      this.scheduleNextSync();

      return {
        success: false,
        syncedTransactions: 0,
        syncedProducts: 0,
        syncedCustomers: 0,
        error: errorMessage,
      };
    }
  }

  // Perform sync with retry logic
  private async performSyncWithRetry(attempts = 0): Promise<SyncResult> {
    try {
      return await this.performSync();
    } catch (error) {
      if (attempts < this.MAX_RETRY_ATTEMPTS) {
        const delay = this.RETRY_DELAY_BASE * Math.pow(2, attempts);
        console.warn(`Sync failed, retrying in ${delay}ms (attempt ${attempts + 1}/${this.MAX_RETRY_ATTEMPTS})`);

        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.performSyncWithRetry(attempts + 1);
      }

      throw error;
    }
  }

  // Perform the actual synchronization
  private async performSync(): Promise<SyncResult> {
    console.log("🔄 Starting sync process...");

    if (!this.supabase) {
      console.error("❌ Supabase not configured");
      throw new Error("Supabase not configured");
    }

    const lastSyncTime = this.syncState.lastSyncAt;
    const results = {
      syncedTransactions: 0,
      syncedProducts: 0,
      syncedCustomers: 0,
    };

    try {
      // Get last sync timestamp from local storage or use a very old date
      const lastSyncTimestamp = lastSyncTime ? lastSyncTime.toISOString() : "1970-01-01T00:00:00.000Z";
      console.log("📅 Last sync timestamp:", lastSyncTimestamp);

      // Test Supabase connection
      console.log("🔗 Testing Supabase connection...");
      const { error } = await this.supabase.from('products').select('count').limit(1);
      if (error) {
        console.error("❌ Supabase connection test failed:", error);
        throw new Error(`Supabase connection failed: ${error.message}`);
      }
      console.log("✅ Supabase connection test successful");

      // Sync transactions
      console.log("💰 Syncing transactions...");
      const transactionsResult = await this.syncTransactions(lastSyncTimestamp);
      results.syncedTransactions = transactionsResult.syncedCount;
      console.log(`✅ Transactions synced: ${transactionsResult.syncedCount}`);

      // Sync products
      console.log("📦 Syncing products...");
      const productsResult = await this.syncProducts(lastSyncTimestamp);
      results.syncedProducts = productsResult.syncedCount;
      console.log(`✅ Products synced: ${productsResult.syncedCount}`);

      // Sync customers
      console.log("👥 Syncing customers...");
      const customersResult = await this.syncCustomers(lastSyncTimestamp);
      results.syncedCustomers = customersResult.syncedCount;
      console.log(`✅ Customers synced: ${customersResult.syncedCount}`);

      // Update last sync time in local storage
      localStorage.setItem("lastSyncTime", new Date().toISOString());

      console.log("✅ Sync process completed successfully");
      return {
        success: true,
        ...results,
      };
    } catch (error) {
      console.error("❌ Sync failed:", error);
      throw error;
    }
  }

  // Sync transactions to Supabase (local wins strategy)
  private async syncTransactions(lastSyncTimestamp: string): Promise<{ syncedCount: number }> {
    if (!this.supabase) throw new Error("Supabase not configured");

    try {
      console.log("💰 Fetching transactions since:", lastSyncTimestamp);

      // Get transactions updated since last sync
      const transactions = await this.invokeDbCommand<Transaction[]>("get_transactions_since", {
        timestamp: lastSyncTimestamp,
      });

      console.log(`📊 Found ${transactions.length} transactions to sync`);
      let syncedCount = 0;

      for (const transaction of transactions) {
        try {
          // Prepare transaction data for Supabase
          const supabaseTransaction = {
            id: transaction.id,
            customer_id: transaction.customer_id,
            total_amount: transaction.total_amount,
            payment_method: transaction.payment_method,
            created_at: transaction.created_at,
            updated_at: transaction.updated_at,
            synced_at: new Date().toISOString(),
          };

          // Upsert to Supabase (local wins)
          const { error } = await this.supabase
            .from("transactions")
            .upsert(supabaseTransaction, { onConflict: "id" });

          if (error) {
            console.error("Failed to sync transaction:", transaction.id, error);
            continue;
          }

          // Sync transaction items
          await this.syncTransactionItems(transaction.id!, transaction.items);

          // Update local synced_at timestamp
          await this.invokeDbCommand("mark_transaction_synced", {
            id: transaction.id,
            syncedAt: new Date().toISOString(),
          });

          syncedCount++;
        } catch (error) {
          console.error("Failed to sync transaction:", transaction.id, error);
        }
      }

      return { syncedCount };
    } catch (error) {
      console.error("Failed to sync transactions:", error);
      throw error;
    }
  }

  // Sync transaction items
  private async syncTransactionItems(transactionId: string, items: any[]): Promise<void> {
    if (!this.supabase) throw new Error("Supabase not configured");

    for (const item of items) {
      try {
        const supabaseItem = {
          id: item.id,
          transaction_id: transactionId,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        };

        const { error } = await this.supabase
          .from("transaction_items")
          .upsert(supabaseItem, { onConflict: "id" });

        if (error) {
          console.error("Failed to sync transaction item:", item.id, error);
        }
      } catch (error) {
        console.error("Failed to sync transaction item:", item.id, error);
      }
    }
  }

  // Sync products to Supabase (local wins strategy)
  private async syncProducts(lastSyncTimestamp: string): Promise<{ syncedCount: number }> {
    if (!this.supabase) throw new Error("Supabase not configured");

    try {
      const products = await this.invokeDbCommand<Product[]>("get_products_since", {
        timestamp: lastSyncTimestamp,
      });

      let syncedCount = 0;

      for (const product of products) {
        try {
          const supabaseProduct = {
            id: product.id,
            name: product.name,
            description: product.description,
            barcode: product.barcode,
            price: product.price,
            stock: product.stock,
            category: product.category,
            created_at: product.created_at,
            updated_at: product.updated_at,
            synced_at: new Date().toISOString(),
          };

          const { error } = await this.supabase
            .from("products")
            .upsert(supabaseProduct, { onConflict: "id" });

          if (error) {
            console.error("Failed to sync product:", product.id, error);
            continue;
          }

          // Update local synced_at timestamp
          await this.invokeDbCommand("mark_product_synced", {
            id: product.id,
            syncedAt: new Date().toISOString(),
          });

          syncedCount++;
        } catch (error) {
          console.error("Failed to sync product:", product.id, error);
        }
      }

      return { syncedCount };
    } catch (error) {
      console.error("Failed to sync products:", error);
      throw error;
    }
  }

  // Sync customers to Supabase (local wins strategy)
  private async syncCustomers(lastSyncTimestamp: string): Promise<{ syncedCount: number }> {
    if (!this.supabase) throw new Error("Supabase not configured");

    try {
      const customers = await this.invokeDbCommand<Customer[]>("get_customers_since", {
        timestamp: lastSyncTimestamp,
      });

      let syncedCount = 0;

      for (const customer of customers) {
        try {
          const supabaseCustomer = {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
            created_at: customer.created_at,
            updated_at: customer.updated_at,
            synced_at: new Date().toISOString(),
          };

          const { error } = await this.supabase
            .from("customers")
            .upsert(supabaseCustomer, { onConflict: "id" });

          if (error) {
            console.error("Failed to sync customer:", customer.id, error);
            continue;
          }

          // Update local synced_at timestamp
          await this.invokeDbCommand("mark_customer_synced", {
            id: customer.id,
            syncedAt: new Date().toISOString(),
          });

          syncedCount++;
        } catch (error) {
          console.error("Failed to sync customer:", customer.id, error);
        }
      }

      return { syncedCount };
    } catch (error) {
      console.error("Failed to sync customers:", error);
      throw error;
    }
  }

  // Helper method to invoke database commands
  private async invokeDbCommand<T>(command: string, args?: any): Promise<T> {
    try {
      console.log(`🔧 Invoking Tauri command: ${command}`, args);

      const invokeFunction = await getInvoke();
      const result = await (invokeFunction as any)(command, args || {});

      console.log(`✅ Tauri command ${command} success`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to invoke database command: ${command}`, error);
      throw error;
    }
  }

  // Check if service is running
  isRunning(): boolean {
    return this.syncInterval !== null;
  }

  // Get sync statistics
  getSyncStats(): {
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    lastSuccessfulSync: Date | null;
  } {
    // This would typically be stored in localStorage or a database
    const stats = localStorage.getItem("syncStats");
    if (stats) {
      const parsed = JSON.parse(stats);
      return {
        ...parsed,
        lastSuccessfulSync: parsed.lastSuccessfulSync ? new Date(parsed.lastSuccessfulSync) : null,
      };
    }

    return {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      lastSuccessfulSync: null,
    };
  }
}

// Export singleton instance
export const syncService = new SyncService();
export default syncService;