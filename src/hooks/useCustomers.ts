import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { localDB } from "../services/localDB";
import { Customer, CreateCustomerRequest, GetCustomersParams } from "../types/database";

export const useCustomers = (params?: GetCustomersParams) => {
  return useQuery({
    queryKey: ["customers", params],
    queryFn: () => localDB.getCustomers(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useCustomer = (id: string) => {
  return useQuery({
    queryKey: ["customer", id],
    queryFn: () => localDB.getCustomer(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (customer: CreateCustomerRequest) =>
      localDB.createCustomer(customer),
    onSuccess: (newCustomerId) => {
      // Invalidate customers query to refetch
      queryClient.invalidateQueries({ queryKey: ["customers"] });

      // Optionally pre-populate the new customer in cache
      queryClient.prefetchQuery({
        queryKey: ["customer", newCustomerId],
        queryFn: () => localDB.getCustomer(newCustomerId),
      });
    },
    onError: (error) => {
      console.error("Failed to create customer:", error);
    },
  });
};

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CreateCustomerRequest> }) =>
      localDB.updateCustomer(id, updates),
    onSuccess: (_, { id }) => {
      // Invalidate both the customer list and the specific customer
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
    },
    onError: (error) => {
      console.error("Failed to update customer:", error);
    },
  });
};