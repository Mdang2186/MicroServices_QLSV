"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import AuthInitializer from "@/components/auth/AuthInitializer";

export default function Providers({ children }: { children: any }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000, // 1 minute
            },
        },
    }));

    return (
        <QueryClientProvider client={queryClient}>
            <AuthInitializer />
            {children}
        </QueryClientProvider>
    );
}
