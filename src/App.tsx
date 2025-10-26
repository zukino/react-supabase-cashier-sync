import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SyncProvider } from "./contexts/SyncContext";
import { ErrorBoundary } from "./components/cashier/ErrorBoundary";
import { Dashboard, PointOfSale, Inventory, Customers } from "./pages";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import { Separator } from "./components/ui/separator";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Wifi,
  WifiOff,
  CheckCircle,
  Clock,
  AlertCircle
} from "lucide-react";
import { syncService } from "./services/syncService";

const queryClient = new QueryClient();

type Page = "dashboard" | "pos" | "inventory" | "customers";

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [syncState, setSyncState] = useState(syncService.getState());

  // Subscribe to sync state changes (SyncProvider handles starting/stopping)
  React.useEffect(() => {
    const unsubscribe = syncService.subscribe(setSyncState);

    return () => {
      unsubscribe();
    };
  }, []);

  const getSyncStatusIcon = () => {
    switch (syncState.status) {
      case "syncing":
        return <Clock className="h-4 w-4 animate-spin" />;
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

  const getSyncStatusText = () => {
    switch (syncState.status) {
      case "syncing":
        return "Syncing...";
      case "success":
        return "Synced";
      case "error":
        return "Error";
      case "offline":
        return "Offline";
      default:
        return syncState.isOnline ? "Online" : "Offline";
    }
  };

  const navigation = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "pos", label: "Point of Sale", icon: ShoppingCart },
    { id: "inventory", label: "Inventory", icon: Package },
    { id: "customers", label: "Customers", icon: Users },
  ];

  const renderCurrentPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard />;
      case "pos":
        return <PointOfSale />;
      case "inventory":
        return <Inventory />;
      case "customers":
        return <Customers />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <SyncProvider>
        <ErrorBoundary>
          <div className="flex h-screen bg-background">
          {/* Sidebar */}
          <div className="w-64 border-r bg-card">
            <div className="p-6">
              <h1 className="text-2xl font-bold">Cashier System</h1>
              <p className="text-sm text-muted-foreground mt-1">
                POS with Offline Support
              </p>
            </div>

            <Separator />

            <nav className="p-4 space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.id}
                    variant={currentPage === item.id ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setCurrentPage(item.id as Page)}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </Button>
                );
              })}
            </nav>

            <Separator />

            {/* Sync Status */}
            <div className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Sync Status</span>
                  <Badge variant="outline" className="flex items-center gap-1">
                    {getSyncStatusIcon()}
                    <span className="text-xs">{getSyncStatusText()}</span>
                  </Badge>
                </div>

                {syncState.lastSyncAt && (
                  <div className="text-xs text-muted-foreground">
                    Last: {syncState.lastSyncAt.toLocaleTimeString()}
                  </div>
                )}

                {syncState.nextSyncAt && (
                  <div className="text-xs text-muted-foreground">
                    Next: {syncState.nextSyncAt.toLocaleTimeString()}
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => syncService.syncNow()}
                  disabled={syncState.status === "syncing" || !syncState.isOnline}
                >
                  {syncState.status === "syncing" ? "Syncing..." : "Sync Now"}
                </Button>
              </div>
            </div>

            <div className="absolute bottom-4 left-4 right-4">
              <div className="text-xs text-muted-foreground space-y-1">
                <div>• Database: Local + Cloud</div>
                <div>• Auto-sync: 5 minutes</div>
                <div>• Strategy: Local wins</div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="border-b bg-card px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold capitalize">
                    {currentPage === "pos" ? "Point of Sale" : currentPage}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {currentPage === "dashboard" && "System overview and statistics"}
                    {currentPage === "pos" && "Process sales transactions"}
                    {currentPage === "inventory" && "Manage products and stock"}
                    {currentPage === "customers" && "Customer database management"}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <Badge variant={syncState.status === "error" ? "destructive" : "secondary"}>
                    {syncState.isOnline ? "Online Mode" : "Offline Mode"}
                  </Badge>
                </div>
              </div>
            </header>

            {/* Page Content */}
            <main className="flex-1 overflow-auto">
              {renderCurrentPage()}
            </main>
          </div>
          </div>
        </ErrorBoundary>
      </SyncProvider>
    </QueryClientProvider>
  );
}
