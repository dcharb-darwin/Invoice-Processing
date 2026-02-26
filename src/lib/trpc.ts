import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import { QueryClient } from "@tanstack/react-query";
import superjson from "superjson";
import type { AppRouter } from "../../server/router.js";

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
    links: [
        httpBatchLink({
            url: "/api/trpc",
            transformer: superjson,
        }),
    ],
});

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5000,
            refetchOnWindowFocus: false,
        },
    },
});
