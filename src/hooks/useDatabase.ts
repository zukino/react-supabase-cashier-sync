import { useQuery } from "@tanstack/react-query";
import { localDB } from "../services/localDB";

export const useDatabaseConnection = () => {
  return useQuery({
    queryKey: ["database-connection"],
    queryFn: () => localDB.checkDatabaseConnection(),
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchInterval: 1000 * 60 * 5, // Check every 5 minutes
    staleTime: 0, // Always consider stale to check connection
  });
};