import { toast } from "sonner";

export type NotificationType = "success" | "error" | "warning" | "info";

export interface NotificationOptions {
  duration?: number;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "top-center" | "bottom-center";
  dismissible?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

class NotificationService {
  // Success notifications
  showSuccess(message: string, options?: NotificationOptions) {
    return toast.success(message, {
      duration: options?.duration || 4000,
      position: options?.position || "bottom-right",
      dismissible: options?.dismissible !== false,
      action: options?.action,
    });
  }

  // Error notifications
  showError(message: string, options?: NotificationOptions) {
    return toast.error(message, {
      duration: options?.duration || 6000,
      position: options?.position || "bottom-right",
      dismissible: options?.dismissible !== false,
      action: options?.action,
    });
  }

  // Warning notifications
  showWarning(message: string, options?: NotificationOptions) {
    return toast.warning(message, {
      duration: options?.duration || 5000,
      position: options?.position || "bottom-right",
      dismissible: options?.dismissible !== false,
      action: options?.action,
    });
  }

  // Info notifications
  showInfo(message: string, options?: NotificationOptions) {
    return toast.info(message, {
      duration: options?.duration || 4000,
      position: options?.position || "bottom-right",
      dismissible: options?.dismissible !== false,
      action: options?.action,
    });
  }

  // Loading notifications
  showLoading(message: string) {
    return toast.loading(message, {
      position: "bottom-right",
    });
  }

  // Dismiss specific toast
  dismiss(toastId: string | number) {
    toast.dismiss(toastId);
  }

  // Dismiss all toasts
  dismissAll() {
    toast.dismiss();
  }

  // Database operation notifications
  showDatabaseError(operation: string, error?: any) {
    const message = `Failed to ${operation}`;
    const details = error?.message || "Unknown error occurred";

    return this.showError(`${message}: ${details}`, {
      duration: 8000,
      action: {
        label: "Retry",
        onClick: () => {
          // This would typically trigger a retry of the failed operation
          console.log("Retry operation:", operation);
        },
      },
    });
  }

  showDatabaseSuccess(operation: string) {
    return this.showSuccess(`${operation} completed successfully`);
  }

  // Sync notifications
  showSyncStarted() {
    return this.showInfo("Starting synchronization...");
  }

  showSyncSuccess(result: { syncedTransactions: number; syncedProducts: number; syncedCustomers: number }) {
    const totalItems = result.syncedTransactions + result.syncedProducts + result.syncedCustomers;
    const message = `Synced ${totalItems} item${totalItems !== 1 ? 's' : ''} successfully`;

    return this.showSuccess(message, {
      duration: 3000,
    });
  }

  showSyncError(error?: any) {
    const message = "Synchronization failed";
    const details = error?.message || "Please check your connection and try again";

    return this.showError(`${message}: ${details}`, {
      duration: 6000,
      action: {
        label: "Retry",
        onClick: () => {
          // This would trigger a manual sync retry
          console.log("Retry sync");
        },
      },
    });
  }

  showSyncOffline() {
    return this.showWarning("Offline mode - changes will sync when connection is restored", {
      duration: 5000,
    });
  }

  showConnectionRestored() {
    return this.showSuccess("Connection restored - syncing queued changes");
  }

  showConnectionLost() {
    return this.showError("Connection lost - working offline", {
      duration: 4000,
    });
  }

  // Transaction notifications
  showTransactionSuccess() {
    return this.showSuccess("Transaction completed successfully");
  }

  showTransactionError(error?: any) {
    const message = "Failed to process transaction";
    const details = error?.message || "Please try again";

    return this.showError(`${message}: ${details}`, {
      duration: 6000,
    });
  }

  // Inventory notifications
  showInventoryUpdate(productName: string, quantity: number, action: "increase" | "decrease") {
    const actionText = action === "increase" ? "added to" : "removed from";
    const message = `${quantity} ${productName} ${actionText} inventory`;

    return this.showSuccess(message);
  }

  showLowStockAlert(productName: string, currentStock: number) {
    return this.showWarning(
      `Low stock alert: ${productName} (${currentStock} remaining)`,
      {
        duration: 8000,
        action: {
          label: "Restock",
          onClick: () => {
            // Navigate to inventory management
            console.log("Navigate to inventory for:", productName);
          },
        },
      }
    );
  }

  showOutOfStockAlert(productName: string) {
    return this.showError(
      `Out of stock: ${productName}`,
      {
        duration: 10000,
        action: {
          label: "Update Stock",
          onClick: () => {
            // Navigate to inventory management
            console.log("Navigate to inventory for:", productName);
          },
        },
      }
    );
  }

  // Customer notifications
  showCustomerCreated(customerName: string) {
    return this.showSuccess(`Customer "${customerName}" created successfully`);
  }

  showCustomerUpdate(customerName: string) {
    return this.showSuccess(`Customer "${customerName}" updated successfully`);
  }

  showCustomerError(operation: string, error?: any) {
    const message = `Failed to ${operation} customer`;
    const details = error?.message || "Please try again";

    return this.showError(`${message}: ${details}`);
  }

  // Product notifications
  showProductCreated(productName: string) {
    return this.showSuccess(`Product "${productName}" added successfully`);
  }

  showProductUpdated(productName: string) {
    return this.showSuccess(`Product "${productName}" updated successfully`);
  }

  showProductError(operation: string, error?: any) {
    const message = `Failed to ${operation} product`;
    const details = error?.message || "Please try again";

    return this.showError(`${message}: ${details}`);
  }

  // Barcode scanner notifications
  showBarcodeNotFound(barcode: string) {
    return this.showError(`Product not found for barcode: ${barcode}`, {
      duration: 4000,
    });
  }

  showBarcodeScanned(productName: string) {
    return this.showSuccess(`Added: ${productName}`, {
      duration: 2000,
    });
  }

  // Feature notifications
  showFeatureNotAvailable(feature: string) {
    return this.showInfo(`${feature} feature is not available in offline mode`);
  }

  showDataConflictWarning(entity: string) {
    return this.showWarning(
      `Data conflict detected for ${entity}. Local changes will be preserved.`,
      {
        duration: 6000,
      }
    );
  }

  // Export/Import notifications
  showExportSuccess(filename: string) {
    return this.showSuccess(`Data exported to ${filename}`);
  }

  showExportError(error?: any) {
    const message = "Failed to export data";
    const details = error?.message || "Please try again";

    return this.showError(`${message}: ${details}`);
  }

  showImportSuccess(recordCount: number) {
    return this.showSuccess(`Successfully imported ${recordCount} record${recordCount !== 1 ? 's' : ''}`);
  }

  showImportError(error?: any) {
    const message = "Failed to import data";
    const details = error?.message || "Please check the file format and try again";

    return this.showError(`${message}: ${details}`);
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;