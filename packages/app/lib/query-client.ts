import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { ApiError } from "./api-client";

const isUnauthorized = (error: unknown) => error instanceof ApiError && error.status === 401;

// A 4xx is the server's answer, not a hiccup: asking again gives the same answer, and a retried
// 401 would hold back the redirect to sign-in.
const isClientError = (error: unknown) =>
  error instanceof ApiError && error.status >= 400 && error.status < 500;

/**
 * The app's QueryClient. Any query or mutation that gets 401 (the session expired mid-use, spec
 * E01 Edge Cases; sign-in spec "Session expired while the tasks screen is open") calls
 * `onUnauthorized` with this client. It runs before the hook's own `onError`.
 */
export function createQueryClient(onUnauthorized: (client: QueryClient) => void): QueryClient {
  const onError = (error: unknown) => {
    if (isUnauthorized(error)) onUnauthorized(client);
  };
  const client = new QueryClient({
    queryCache: new QueryCache({ onError }),
    mutationCache: new MutationCache({ onError }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => failureCount < 1 && !isClientError(error),
      },
    },
  });
  return client;
}
