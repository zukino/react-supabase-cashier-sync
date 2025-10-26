import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { localDB } from "../services/localDB";
import { Product, CreateProductRequest, GetProductsParams } from "../types/database";

export const useProducts = (params?: GetProductsParams) => {
  return useQuery({
    queryKey: ["products", params],
    queryFn: () => localDB.getProducts(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useProduct = (id: string) => {
  return useQuery({
    queryKey: ["product", id],
    queryFn: () => localDB.getProduct(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useProductByBarcode = (barcode: string) => {
  return useQuery({
    queryKey: ["product-barcode", barcode],
    queryFn: () => localDB.getProductByBarcode(barcode),
    enabled: !!barcode,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (product: CreateProductRequest) =>
      localDB.createProduct(product),
    onSuccess: (newProductId) => {
      // Invalidate products query to refetch
      queryClient.invalidateQueries({ queryKey: ["products"] });

      // Optionally pre-populate the new product in cache
      queryClient.prefetchQuery({
        queryKey: ["product", newProductId],
        queryFn: () => localDB.getProduct(newProductId),
      });
    },
    onError: (error) => {
      console.error("Failed to create product:", error);
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CreateProductRequest> }) =>
      localDB.updateProduct(id, updates),
    onSuccess: (_, { id }) => {
      // Invalidate both the product list and the specific product
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", id] });
    },
    onError: (error) => {
      console.error("Failed to update product:", error);
    },
  });
};

export const useUpdateInventory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      localDB.decreaseStock(productId, quantity),
    onMutate: async ({ productId, quantity }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["products"] });

      // Snapshot the previous value
      const previousProducts = queryClient.getQueryData<Product[]>(["products"]);

      // Optimistically update to the new value
      queryClient.setQueryData<Product[]>(["products"], (old) => {
        if (!old) return old;
        return old.map((product) =>
          product.id === productId
            ? { ...product, stock: Math.max(0, product.stock - quantity) }
            : product
        );
      });

      return { previousProducts };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousProducts) {
        queryClient.setQueryData(["products"], context.previousProducts);
      }
      console.error("Failed to update inventory:", err);
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
};

export const useDecreaseStock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      localDB.decreaseStock(productId, quantity),
    onMutate: async ({ productId, quantity }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["products"] });

      // Snapshot the previous value
      const previousProducts = queryClient.getQueryData<Product[]>(["products"]);

      // Optimistically update to the new value
      queryClient.setQueryData<Product[]>(["products"], (old) => {
        if (!old) return old;
        return old.map((product) =>
          product.id === productId
            ? { ...product, stock: Math.max(0, product.stock - quantity) }
            : product
        );
      });

      return { previousProducts };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousProducts) {
        queryClient.setQueryData(["products"], context.previousProducts);
      }
      console.error("Failed to decrease stock:", err);
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
};

export const useIncreaseStock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      localDB.increaseStock(productId, quantity),
    onMutate: async ({ productId, quantity }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["products"] });

      // Snapshot the previous value
      const previousProducts = queryClient.getQueryData<Product[]>(["products"]);

      // Optimistically update to the new value
      queryClient.setQueryData<Product[]>(["products"], (old) => {
        if (!old) return old;
        return old.map((product) =>
          product.id === productId
            ? { ...product, stock: product.stock + quantity }
            : product
        );
      });

      return { previousProducts };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousProducts) {
        queryClient.setQueryData(["products"], context.previousProducts);
      }
      console.error("Failed to increase stock:", err);
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
};