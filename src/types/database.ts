import { z } from "zod";

// Base schema with timestamps
const baseSchema = z.object({
  id: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  synced_at: z.string().datetime().optional(),
});

// Transaction item schema
export const TransactionItemSchema = z.object({
  id: z.string().optional(),
  transaction_id: z.string().optional(),
  product_id: z.string(),
  quantity: z.number().int().positive(),
  unit_price: z.number().nonnegative(),
  total_price: z.number().nonnegative(),
});

// Transaction schema
export const TransactionSchema = baseSchema.extend({
  customer_id: z.string().optional(),
  items: z.array(TransactionItemSchema),
  total_amount: z.number().nonnegative(),
  payment_method: z.enum(["cash", "card", "transfer", "ewallet"]),
});

// Product schema
export const ProductSchema = baseSchema.extend({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  barcode: z.string().optional(),
  price: z.number().nonnegative(),
  stock: z.number().int().nonnegative(),
  category: z.string().optional(),
});

// Customer schema
export const CustomerSchema = baseSchema.extend({
  name: z.string().min(1, "Customer name is required"),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

// Export types
export type TransactionItem = z.infer<typeof TransactionItemSchema>;
export type Transaction = z.infer<typeof TransactionSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type Customer = z.infer<typeof CustomerSchema>;

// API request/response types
export type CreateTransactionRequest = Omit<Transaction, "id">;
export type CreateProductRequest = Omit<Product, "id">;
export type CreateCustomerRequest = Omit<Customer, "id">;

export type GetTransactionsParams = {
  limit?: number;
  offset?: number;
};

export type GetProductsParams = {
  limit?: number;
  offset?: number;
  search?: string;
};

export type GetCustomersParams = {
  limit?: number;
  offset?: number;
  search?: string;
};

export type UpdateInventoryParams = {
  product_id: string;
  quantity_change: number;
};