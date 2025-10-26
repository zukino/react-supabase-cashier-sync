import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { localDB } from "../services/localDB";
import { Transaction, CreateTransactionRequest, GetTransactionsParams } from "../types/database";

export const useTransactions = (params?: GetTransactionsParams) => {
  return useQuery({
    queryKey: ["transactions", params],
    queryFn: () => localDB.getTransactions(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useTransaction = (id: string) => {
  return useQuery({
    queryKey: ["transaction", id],
    queryFn: () => localDB.getTransaction(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (transaction: CreateTransactionRequest) =>
      localDB.createTransaction(transaction),
    onSuccess: (newTransactionId) => {
      // Invalidate transactions query to refetch
      queryClient.invalidateQueries({ queryKey: ["transactions"] });

      // Optionally pre-populate the new transaction in cache
      queryClient.prefetchQuery({
        queryKey: ["transaction", newTransactionId],
        queryFn: () => localDB.getTransaction(newTransactionId),
      });
    },
    onError: (error) => {
      console.error("Failed to create transaction:", error);
    },
  });
};

export const useDatabaseStats = () => {
  return useQuery({
    queryKey: ["database-stats"],
    queryFn: async () => {
      try {
        return await localDB.getDatabaseStats();
      } catch (error) {
        console.error("Failed to get database stats:", error);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};