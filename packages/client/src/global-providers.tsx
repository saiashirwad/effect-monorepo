import { QueryClientProvider, QueryClient as TanstackQueryClient } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { RouterProvider, createRouter } from "@tanstack/react-router"
import * as Duration from "effect/Duration"
import * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"
import * as ManagedRuntime from "effect/ManagedRuntime"
import React from "react"
import { ThemeProvider } from "./components/providers/theme-provider"
import "./index.css"
import { ApiClient } from "./layers/api-client"
import { NetworkMonitor } from "./layers/common/network-monitor"
import { QueryClient } from "./layers/common/query-client"
import { type LiveManagedRuntime } from "./layers/live-layer"
import { RuntimeProvider } from "./layers/runtime/runtime-provider"
import { routeTree } from "./routeTree.gen"

const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Register {
    router: typeof router
  }
}

const InnerProviders: React.FC = () => {
  const queryClient = React.useMemo(
    () =>
      new TanstackQueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            retryDelay: 0,
            staleTime: Duration.toMillis("5 minutes"),
          },
          mutations: {
            retry: false,
            retryDelay: 0,
          },
        },
      }),
    [],
  )

  const runtime: LiveManagedRuntime = React.useMemo(
    () =>
      ManagedRuntime.make(
        Layer.mergeAll(
          NetworkMonitor.Default,
          ApiClient.Default,
          QueryClient.make(queryClient),
        ).pipe(Layer.provide(Logger.pretty)),
      ),
    [queryClient],
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ReactQueryDevtools initialIsOpen={false} />

      <RuntimeProvider runtime={runtime}>
        <RouterProvider router={router} />
      </RuntimeProvider>
    </QueryClientProvider>
  )
}

export const GlobalProviders: React.FC = () => {
  return (
    <ThemeProvider>
      <InnerProviders />
    </ThemeProvider>
  )
}
