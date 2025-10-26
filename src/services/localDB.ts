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
const isTauriAvailable = typeof window !== 'undefined' && window.__TAURI__;

// Mock data for web development
const mockData = {
  transactions: [],
  products: [],
  customers: [],
};

class LocalDBService {
  // Helper method to safely invoke Tauri commands
  private async safeInvoke<T>(command: string, args?: any): Promise<T> {
    if (!isTauriAvailable) {
      console.warn(`Tauri not available, mocking ${command} call`);
      // Return mock data for development
      switch (command) {
        case 'get_transactions':
          return mockData.transactions as T;
        case 'get_products':
          return mockData.products as T;
        case 'get_customers':
          return mockData.customers as T;
        case 'get_database_stats':
          return {
            totalTransactions: 0,
            totalProducts: 0,
            totalCustomers: 0,
            totalStockValue: 0,
          } as T;
        default:
          return {} as T;
      }
    }

    return invoke<T>(command, args);
  }

  // Transaction operations
  async createTransaction(transaction: CreateTransactionRequest): Promise<string> {
    if (!isTauriAvailable) {
      const id = `mock-transaction-${Date.now()}`;
      const mockTransaction = {
        id,
        ...transaction,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockData.transactions.push(mockTransaction as any);
      console.log('Mock: Created transaction', mockTransaction);
      return id;
    }

    try {
      const transactionData = {
        ...transaction,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const id = await invoke<string>("create_transaction", {
        transaction: transactionData,
      });

      return id;
    } catch (error) {
      console.error("Failed to create transaction:", error);
      throw new Error(`Failed to create transaction: ${error}`);
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
    try {
      const productData = {
        ...product,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const id = await invoke<string>("create_product", {
        product: productData,
      });

      return id;
    } catch (error) {
      console.error("Failed to create product:", error);
      throw new Error(`Failed to create product: ${error}`);
    }
  }

  async getProducts(params?: GetProductsParams): Promise<Product[]> {
    const products = await this.safeInvoke<Product[]>("get_products", {
      limit: params?.limit,
      offset: params?.offset,
    });

    // If search parameter is provided, filter the results
    if (params?.search) {
      const searchTerm = params.search.toLowerCase();
      return products.filter(
        (product) =>
          product.name.toLowerCase().includes(searchTerm) ||
          product.description?.toLowerCase().includes(searchTerm) ||
          product.barcode?.toLowerCase().includes(searchTerm) ||
          product.category?.toLowerCase().includes(searchTerm)
      );
    }

    return products;
  }

  async getProduct(id: string): Promise<Product | null> {
    try {
      const products = await this.getProducts();
      return products.find((p) => p.id === id) || null;
    } catch (error) {
      console.error("Failed to get product:", error);
      throw new Error(`Failed to get product: ${error}`);
    }
  }

  async getProductByBarcode(barcode: string): Promise<Product | null> {
    try {
      const products = await this.getProducts();
      return products.find((p) => p.barcode === barcode) || null;
    } catch (error) {
      console.error("Failed to get product by barcode:", error);
      throw new Error(`Failed to get product by barcode: ${error}`);
    }
  }

  async updateProduct(
    id: string,
    updates: Partial<Omit<Product, "id" | "created_at" | "updated_at" | "synced_at">>
  ): Promise<void> {
    try {
      // Get existing product
      const existingProduct = await this.getProduct(id);
      if (!existingProduct) {
        throw new Error(`Product with ID ${id} not found`);
      }

      const updatedProduct: Product = {
        ...existingProduct,
        ...updates,
        id,
        updated_at: new Date().toISOString(),
      };

      await invoke<string>("create_product", {
        product: updatedProduct,
      });
    } catch (error) {
      console.error("Failed to update product:", error);
      throw new Error(`Failed to update product: ${error}`);
    }
  }

  // Customer operations
  async createCustomer(customer: CreateCustomerRequest): Promise<string> {
    try {
      const customerData = {
        ...customer,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const id = await invoke<string>("create_customer", {
        customer: customerData,
      });

      return id;
    } catch (error) {
      console.error("Failed to create customer:", error);
      throw new Error(`Failed to create customer: ${error}`);
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
    try {
      await invoke<void>("update_inventory", params);
    } catch (error) {
      console.error("Failed to update inventory:", error);
      throw new Error(`Failed to update inventory: ${error}`);
    }
  }

  async decreaseStock(productId: string, quantity: number): Promise<void> {
    if (quantity <= 0) {
      throw new Error("Quantity must be positive");
    }

    await this.updateInventory({
      product_id: productId,
      quantity_change: -quantity,
    });
  }

  async increaseStock(productId: string, quantity: number): Promise<void> {
    if (quantity <= 0) {
      throw new Error("Quantity must be positive");
    }

    await this.updateInventory({
      product_id: productId,
      quantity_change: quantity,
    });
  }

  // Utility methods
  async checkDatabaseConnection(): Promise<boolean> {
    try {
      await this.getProducts({ limit: 1 });
      return true;
    } catch (error) {
      console.error("Database connection check failed:", error);
      return false;
    }
  }

  async getDatabaseStats(): Promise<{
    totalTransactions: number;
    totalProducts: number;
    totalCustomers: number;
    totalStockValue: number;
  }> {
    try {
      const [transactions, products, customers] = await Promise.all([
        this.getTransactions(),
        this.getProducts(),
        this.getCustomers(),
      ]);

      const totalStockValue = products.reduce(
        (sum, product) => sum + product.price * product.stock,
        0
      );

      return {
        totalTransactions: transactions.length,
        totalProducts: products.length,
        totalCustomers: customers.length,
        totalStockValue,
      };
    } catch (error) {
      console.error("Failed to get database stats:", error);
      throw new Error(`Failed to get database stats: ${error}`);
    }
  }
}

// Export singleton instance
export const localDB = new LocalDBService();
export default localDB;