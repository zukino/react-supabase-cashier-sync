import { invoke } from "@tauri-apps/api/core";
import {
  Transaction,
  Product,
  Customer,
  TransactionItem,
  CreateTransactionRequest,
  CreateProductRequest,
  CreateCustomerRequest,
  GetTransactionsParams,
  GetProductsParams,
  GetCustomersParams,
  UpdateInventoryParams,
} from "../types/database";

// Check if Tauri is available (web vs desktop environment)
const isTauriAvailable = typeof window !== 'undefined' && (
  (window as any).__TAURI__ !== undefined ||
  (window as any).__TAURI_INTERNALS__ !== undefined ||
  (window as any).__TAURI_METADATA__ !== undefined ||
  window.location.protocol === 'tauri:' ||
  !window.location.href.startsWith('http')
);

// Debug: Log Tauri availability detection
if (typeof window !== 'undefined') {
  console.log('🔍 Tauri Detection Debug:', {
    __TAURI__: !!(window as any).__TAURI__,
    __TAURI_INTERNALS__: !!(window as any).__TAURI_INTERNALS__,
    __TAURI_METADATA__: !!(window as any).__TAURI_METADATA__,
    protocol: window.location.protocol,
    href: window.location.href,
    isTauriAvailable
  });
}

// Mock data for web development
const mockData = {
  transactions: [
    {
      id: "mock-transaction-1",
      customer_id: "mock-customer-1",
      items: [
        {
          id: "mock-item-1",
          transaction_id: "mock-transaction-1",
          product_id: "mock-product-1",
          quantity: 2,
          unit_price: 25000,
          total_price: 50000,
        }
      ],
      total_amount: 50000,
      payment_method: "cash",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      synced_at: null,
    }
  ],
  products: [
    {
      id: "mock-product-1",
      name: "Kopi Arabica",
      description: "Kopi premium arabica dari dataran tinggi",
      barcode: "888888888",
      price: 25000,
      stock: 50,
      category: "Minuman",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      synced_at: null,
    },
    {
      id: "mock-product-2",
      name: "Teh Hijau",
      description: "Teh hijau berkualitas tinggi",
      barcode: "777777777",
      price: 15000,
      stock: 100,
      category: "Minuman",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      synced_at: null,
    },
    {
      id: "mock-product-3",
      name: "Roti Bakar",
      description: "Roti bakar dengan topping selai",
      barcode: "666666666",
      price: 12000,
      stock: 30,
      category: "Makanan",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      synced_at: null,
    },
    {
      id: "mock-product-4",
      name: "Nasi Goreng",
      description: "Nasi goreng spesial dengan telur",
      barcode: "555555555",
      price: 20000,
      stock: 25,
      category: "Makanan",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      synced_at: null,
    },
    {
      id: "mock-product-5",
      name: "Air Mineral",
      description: "Air mineral 600ml",
      barcode: "444444444",
      price: 5000,
      stock: 200,
      category: "Minuman",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      synced_at: null,
    }
  ],
  customers: [
    {
      id: "mock-customer-1",
      name: "John Doe",
      email: "john@example.com",
      phone: "08123456789",
      address: "Jakarta, Indonesia",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      synced_at: null,
    },
    {
      id: "mock-customer-2",
      name: "Jane Smith",
      email: "jane@example.com",
      phone: "08234567890",
      address: "Bandung, Indonesia",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      synced_at: null,
    },
    {
      id: "mock-customer-3",
      name: "Walk-in Customer",
      email: null,
      phone: null,
      address: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      synced_at: null,
    }
  ],
};

class LocalDBService {
  // Helper method to check Tauri availability at runtime
  private async checkTauriRuntime(): Promise<boolean> {
    try {
      // Try to invoke a simple command to test Tauri
      await invoke<string>("ping");
      return true;
    } catch (error) {
      console.log('Tauri runtime check failed:', error);
      return false;
    }
  }

  // Helper method to safely invoke Tauri commands
  private async safeInvoke<T>(command: string, args?: any): Promise<T> {
    const timestamp = new Date().toISOString();

    // Import the addLog function dynamically to avoid circular dependencies
    const { addLog } = await import('../components/ActivityLogger');

    // Check if running in development mode (web) vs production (desktop)
    if (!isTauriAvailable) {
      addLog('info', `Web Mode - ${command}`, `Using mock data for "${command}"`, args);
      return this.getMockData<T>(command);
    }

    // Double-check Tauri runtime availability
    const isRuntimeAvailable = await this.checkTauriRuntime();
    if (!isRuntimeAvailable) {
      addLog('warning', `Tauri Runtime Unavailable - ${command}`, `Tauri detected but runtime unavailable, using mock data`);
      return this.getMockData<T>(command);
    }

    try {
      const startTime = performance.now();
      const result = await invoke<T>(command, args);
      const endTime = performance.now();
      const duration = endTime - startTime;

      addLog('success', `Tauri Command - ${command}`,
        `✅ Success (${duration.toFixed(2)}ms)`,
        `Result:`, result
      );
      return result;
    } catch (error) {
      addLog('error', `Tauri Command Failed - ${command}`,
        `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
        `Args:`, args
      );

      // Fallback to mock data if Tauri command fails
      try {
        const mockResult = this.getMockData<T>(command);
        addLog('warning', `Fallback Used - ${command}`, `Using mock data as fallback`);
        return mockResult;
      } catch (mockError) {
        addLog('error', `Fallback Failed - ${command}`, `Mock data also failed: ${mockError}`);
        throw error; // Throw the original error if mock data also fails
      }
    }
  }

  // Helper method to get mock data for development
  private getMockData<T>(command: string): T {
    try {
      switch (command) {
        case "get_transactions":
          return mockData.transactions as T;
        case "get_products":
          return mockData.products as T;
        case "get_customers":
          return mockData.customers as T;
        case "get_database_stats":
          const stats = {
            totalTransactions: mockData.transactions.length,
            totalProducts: mockData.products.length,
            totalCustomers: mockData.customers.length,
            totalStockValue: mockData.products.reduce((sum, product) => sum + (product.stock * product.price), 0)
          };
          return stats as T;
        default:
          console.warn(`Mock data not available for command: ${command}, returning empty object`);
          return {} as T;
      }
    } catch (error) {
      console.error(`Error generating mock data for command ${command}:`, error);
      return {} as T;
    }
  }

  
  // Transaction operations
  async createTransaction(transaction: CreateTransactionRequest): Promise<string> {
    const timestamp = new Date().toISOString();
    console.log(`\n💰 [${timestamp}] CREATE TRANSACTION REQUEST`);
    console.log(`📝 Transaction data:`, transaction);

    if (!isTauriAvailable) {
      // Return mock ID for web development
      const mockId = `mock-transaction-${Date.now()}`;
      console.log(`🌐 Web Mode: Creating mock transaction with ID: ${mockId}`);
      return mockId;
    }

    try {
      const transactionData = {
        ...transaction,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log(`🚀 Creating transaction with data:`, transactionData);
      const id = await invoke<string>("create_transaction", {
        transaction: transactionData,
      });

      console.log(`✅ [${timestamp}] TRANSACTION CREATED SUCCESSFULLY with ID: ${id}`);
      return id;
    } catch (error) {
      console.error(`❌ [${timestamp}] FAILED TO CREATE TRANSACTION:`, error);
      // Fallback to mock ID
      const mockId = `fallback-transaction-${Date.now()}`;
      console.warn(`⚠️ Falling back to mock transaction with ID: ${mockId}`);
      return mockId;
    }
  }

  async getTransactions(params?: GetTransactionsParams): Promise<Transaction[]> {
    return this.safeInvoke<Transaction[]>("get_transactions", {
      limit: params?.limit,
      offset: params?.offset,
    });
  }

  async getTransaction(id: string): Promise<Transaction | null> {
    try {
      const transactions = await this.getTransactions();
      return transactions.find((t) => t.id === id) || null;
    } catch (error) {
      console.error("Failed to get transaction:", error);
      throw new Error(`Failed to get transaction: ${error}`);
    }
  }

  // Product operations
  async createProduct(product: CreateProductRequest): Promise<string> {
    const { addLog } = await import('../components/ActivityLogger');

    addLog('info', 'Create Product', 'Request received', product);

    if (!isTauriAvailable) {
      // Return mock ID for web development
      const mockId = `mock-product-${Date.now()}`;
      addLog('info', 'Create Product', `Web Mode - Mock product created with ID: ${mockId}`);
      return mockId;
    }

    try {
      const productData = {
        ...product,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const id = await this.safeInvoke<String>("create_product", {
        product: productData,
      }) as string;

      addLog('success', 'Create Product', `Product created successfully with ID: ${id}`);
      return id;
    } catch (error) {
      addLog('error', 'Create Product Failed', `Failed to create product: ${error}`);
      // Fallback to mock ID
      const mockId = `fallback-product-${Date.now()}`;
      addLog('warning', 'Create Product Fallback', `Using mock product with ID: ${mockId}`);
      return mockId;
    }
  }

  async getProducts(params?: GetProductsParams): Promise<Product[]> {
    const timestamp = new Date().toISOString();
    console.log(`\n📦 [${timestamp}] GET PRODUCTS REQUEST`);
    console.log(`📝 Params:`, params);

    const products = await this.safeInvoke<Product[]>("get_products", {
      limit: params?.limit,
      offset: params?.offset,
    });

    console.log(`📊 Retrieved ${products.length} products`);

    // If search parameter is provided, filter the results
    if (params?.search) {
      const searchTerm = params.search.toLowerCase();
      console.log(`🔍 Filtering products by search term: "${searchTerm}"`);
      const filteredProducts = products.filter(
        (product) =>
          product.name.toLowerCase().includes(searchTerm) ||
          product.description?.toLowerCase().includes(searchTerm) ||
          product.barcode?.toLowerCase().includes(searchTerm) ||
          product.category?.toLowerCase().includes(searchTerm)
      );
      console.log(`📊 Filtered to ${filteredProducts.length} products`);
      return filteredProducts;
    }

    return products;
  }

  async getProduct(id: string): Promise<Product | null> {
    const timestamp = new Date().toISOString();
    console.log(`\n🔍 [${timestamp}] GET PRODUCT BY ID REQUEST`);
    console.log(`🆔 Product ID: ${id}`);

    try {
      const products = await this.getProducts();
      const product = products.find((p) => p.id === id) || null;

      if (product) {
        console.log(`✅ [${timestamp}] PRODUCT FOUND:`, product);
      } else {
        console.log(`❌ [${timestamp}] PRODUCT NOT FOUND with ID: ${id}`);
      }

      return product;
    } catch (error) {
      console.error(`❌ [${timestamp}] FAILED TO GET PRODUCT:`, error);
      throw new Error(`Failed to get product: ${error}`);
    }
  }

  async getProductByBarcode(barcode: string): Promise<Product | null> {
    const timestamp = new Date().toISOString();
    console.log(`\n🔍 [${timestamp}] GET PRODUCT BY BARCODE REQUEST`);
    console.log(`📟 Barcode: ${barcode}`);

    try {
      const products = await this.getProducts();
      const product = products.find((p) => p.barcode === barcode) || null;

      if (product) {
        console.log(`✅ [${timestamp}] PRODUCT FOUND BY BARCODE:`, product);
      } else {
        console.log(`❌ [${timestamp}] PRODUCT NOT FOUND with barcode: ${barcode}`);
      }

      return product;
    } catch (error) {
      console.error(`❌ [${timestamp}] FAILED TO GET PRODUCT BY BARCODE:`, error);
      throw new Error(`Failed to get product by barcode: ${error}`);
    }
  }

  async updateProduct(
    id: string,
    updates: Partial<Omit<Product, "id" | "created_at" | "updated_at" | "synced_at">>
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    console.log(`\n📦 [${timestamp}] UPDATE PRODUCT REQUEST`);
    console.log(`🆔 Product ID: ${id}`);
    console.log(`🔄 Updates:`, updates);

    try {
      // Get existing product
      console.log(`🔍 Fetching existing product with ID: ${id}`);
      const existingProduct = await this.getProduct(id);
      if (!existingProduct) {
        console.error(`❌ Product with ID ${id} not found`);
        throw new Error(`Product with ID ${id} not found`);
      }

      console.log(`📋 Existing product:`, existingProduct);

      const updatedProduct: Product = {
        ...existingProduct,
        ...updates,
        id,
        updated_at: new Date().toISOString(),
      };

      console.log(`🚀 Updating product with data:`, updatedProduct);
      await this.safeInvoke<string>("create_product", {
        product: updatedProduct,
      });
      console.log(`✅ [${timestamp}] PRODUCT UPDATED SUCCESSFULLY`);
    } catch (error) {
      console.error(`❌ [${timestamp}] FAILED TO UPDATE PRODUCT:`, error);
      throw new Error(`Failed to update product: ${error}`);
    }
  }

  // Customer operations
  async createCustomer(customer: CreateCustomerRequest): Promise<string> {
    const timestamp = new Date().toISOString();
    console.log(`\n👤 [${timestamp}] CREATE CUSTOMER REQUEST`);
    console.log(`📝 Customer data:`, customer);

    if (!isTauriAvailable) {
      // Return mock ID for web development
      const mockId = `mock-customer-${Date.now()}`;
      console.log(`🌐 Web Mode: Creating mock customer with ID: ${mockId}`);
      return mockId;
    }

    try {
      const customerData = {
        ...customer,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log(`🚀 Creating customer with data:`, customerData);
      const id = await this.safeInvoke<String>("create_customer", {
        customer: customerData,
      }) as string;

      console.log(`✅ [${timestamp}] CUSTOMER CREATED SUCCESSFULLY with ID: ${id}`);
      return id;
    } catch (error) {
      console.error(`❌ [${timestamp}] FAILED TO CREATE CUSTOMER:`, error);
      // Fallback to mock ID
      const mockId = `fallback-customer-${Date.now()}`;
      console.warn(`⚠️ Falling back to mock customer with ID: ${mockId}`);
      return mockId;
    }
  }

  async getCustomers(params?: GetCustomersParams): Promise<Customer[]> {
    const customers = await this.safeInvoke<Customer[]>("get_customers", {
      limit: params?.limit,
      offset: params?.offset,
    });

    // If search parameter is provided, filter the results
    if (params?.search) {
      const searchTerm = params.search.toLowerCase();
      return customers.filter(
        (customer) =>
          customer.name.toLowerCase().includes(searchTerm) ||
          customer.email?.toLowerCase().includes(searchTerm) ||
          customer.phone?.toLowerCase().includes(searchTerm) ||
          customer.address?.toLowerCase().includes(searchTerm)
      );
    }

    return customers;
  }

  async getCustomer(id: string): Promise<Customer | null> {
    try {
      const customers = await this.getCustomers();
      return customers.find((c) => c.id === id) || null;
    } catch (error) {
      console.error("Failed to get customer:", error);
      throw new Error(`Failed to get customer: ${error}`);
    }
  }

  async updateCustomer(
    id: string,
    updates: Partial<Omit<Customer, "id" | "created_at" | "updated_at" | "synced_at">>
  ): Promise<void> {
    try {
      // Get existing customer
      const existingCustomer = await this.getCustomer(id);
      if (!existingCustomer) {
        throw new Error(`Customer with ID ${id} not found`);
      }

      const updatedCustomer: Customer = {
        ...existingCustomer,
        ...updates,
        id,
        updated_at: new Date().toISOString(),
      };

      await invoke<string>("create_customer", {
        customer: updatedCustomer,
      });
    } catch (error) {
      console.error("Failed to update customer:", error);
      throw new Error(`Failed to update customer: ${error}`);
    }
  }

  // Inventory operations
  async updateInventory(params: UpdateInventoryParams): Promise<void> {
    const { addLog } = await import('../components/ActivityLogger');

    addLog('info', 'Update Inventory',
      `Product ID: ${params.product_id}, Quantity Change: ${params.quantity_change}`
    );

    if (!isTauriAvailable) {
      addLog('info', 'Update Inventory', 'Web Mode - Skipping inventory update (mock mode)');
      return;
    }

    try {
      await this.safeInvoke<void>("update_inventory", params);
      addLog('success', 'Update Inventory', 'Inventory updated successfully');
    } catch (error) {
      addLog('error', 'Update Inventory Failed', `Failed to update inventory: ${error}`);
      throw new Error(`Failed to update inventory: ${error}`);
    }
  }

  async decreaseStock(productId: string, quantity: number): Promise<void> {
    const { addLog } = await import('../components/ActivityLogger');

    addLog('info', 'Decrease Stock', `Product ID: ${productId}, Quantity: ${quantity}`);

    if (quantity <= 0) {
      addLog('error', 'Decrease Stock Error', `Invalid quantity: ${quantity}. Must be positive.`);
      throw new Error("Quantity must be positive");
    }

    try {
      await this.updateInventory({
        product_id: productId,
        quantity_change: -quantity,
      });
      addLog('success', 'Decrease Stock', 'Stock decreased successfully');
    } catch (error) {
      addLog('error', 'Decrease Stock Failed', `Failed to decrease stock: ${error}`);
      throw error;
    }
  }

  async increaseStock(productId: string, quantity: number): Promise<void> {
    const { addLog } = await import('../components/ActivityLogger');

    addLog('info', 'Increase Stock', `Product ID: ${productId}, Quantity: ${quantity}`);

    if (quantity <= 0) {
      addLog('error', 'Increase Stock Error', `Invalid quantity: ${quantity}. Must be positive.`);
      throw new Error("Quantity must be positive");
    }

    try {
      await this.updateInventory({
        product_id: productId,
        quantity_change: quantity,
      });
      addLog('success', 'Increase Stock', 'Stock increased successfully');
    } catch (error) {
      addLog('error', 'Increase Stock Failed', `Failed to increase stock: ${error}`);
      throw error;
    }
  }

  // Test method to verify Tauri is working
  async testTauriPing(): Promise<boolean> {
    if (!isTauriAvailable) {
      console.warn("Running in web mode - Tauri ping not available");
      return false;
    }

    console.log("🏓 Testing Tauri ping...");
    try {
      const result = await this.safeInvoke<string>("ping");
      console.log("✅ Tauri ping successful:", result);
      return result === "pong";
    } catch (error) {
      console.error("❌ Tauri ping failed:", error);
      return false;
    }
  }

  // Utility methods
  async checkDatabaseConnection(): Promise<boolean> {
    if (!isTauriAvailable) {
      console.warn("Running in web mode - database connection not available");
      return false;
    }

    console.log("🔍 Testing database connection...");
    try {
      const result = await this.safeInvoke<boolean>("test_database_connection");
      console.log("✅ Database connection test result:", result);
      return result;
    } catch (error) {
      console.error("❌ Database connection check failed:", error);
      return false;
    }
  }

  async getDatabaseStats(): Promise<{
    totalTransactions: number;
    totalProducts: number;
    totalCustomers: number;
    totalStockValue: number;
  }> {
    return this.safeInvoke<{
      totalTransactions: number;
      totalProducts: number;
      totalCustomers: number;
      totalStockValue: number;
    }>("get_database_stats");
  }
}

// Export singleton instance
export const localDB = new LocalDBService();
export default localDB;