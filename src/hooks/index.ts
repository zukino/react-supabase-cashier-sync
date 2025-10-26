// Transaction hooks
export {
  useTransactions,
  useTransaction,
  useCreateTransaction,
  useDatabaseStats,
} from "./useTransactions";

// Product hooks
export {
  useProducts,
  useProduct,
  useProductByBarcode,
  useCreateProduct,
  useUpdateProduct,
  useUpdateInventory,
  useDecreaseStock,
  useIncreaseStock,
} from "./useProducts";

// Customer hooks
export {
  useCustomers,
  useCustomer,
  useCreateCustomer,
  useUpdateCustomer,
} from "./useCustomers";

// Database hooks
export { useDatabaseConnection } from "./useDatabase";

// Sync hooks
export { useSync } from "./useSync";