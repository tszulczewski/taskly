"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createQueryClient } from "../lib/query-client";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // The app router's replace/refresh are the same functions for the app's lifetime, so the client
  // may keep the router it was created with.
  const router = useRouter();
  const [client] = useState(() =>
    createQueryClient((queryClient) => {
      // Same as a confirmed sign-out: no cached data of this user outlives the session.
      queryClient.clear();
      router.replace("/sign-in");
      router.refresh();
    }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
