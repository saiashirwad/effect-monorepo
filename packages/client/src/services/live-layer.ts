import type * as Layer from "effect/Layer";
import type * as ManagedRuntime from "effect/ManagedRuntime";
import { type ApiClient } from "./common/api-client.ts";
import { type NetworkMonitor } from "./common/network-monitor";
import { type QueryClient } from "./common/query-client";
import { type WorkerService } from "./worker/worker-service.ts";

export type LiveLayerType = Layer.Layer<ApiClient | NetworkMonitor | QueryClient | WorkerService>;
export type LiveManagedRuntime = ManagedRuntime.ManagedRuntime<
  Layer.Layer.Success<LiveLayerType>,
  never
>;
export type LiveRuntimeContext = ManagedRuntime.ManagedRuntime.Context<LiveManagedRuntime>;
