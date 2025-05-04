import { BrowserWorkerRunner } from "@effect/platform-browser";
import * as BrowserRuntime from "@effect/platform-browser/BrowserRuntime";
import { RpcSerialization, RpcServer } from "@effect/rpc";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { FilterError, WorkerRpc } from "./worker-contract";

const Live = WorkerRpc.toLayer(
  Effect.gen(function* () {
    yield* Effect.logInfo("Worker started");

    return {
      FilterData: (req) =>
        Effect.gen(function* () {
          yield* Effect.logInfo(
            `Worker received request to filter ${req.data.length} items with threshold ${req.threshold}`,
          );

          yield* Effect.sleep("3 seconds");

          if (req.threshold < 0) {
            yield* Effect.logError("Worker received invalid threshold");
            return yield* new FilterError({ message: "Threshold cannot be negative" });
          }

          const filtered = req.data.filter((n) => n > req.threshold);
          yield* Effect.logInfo(`Worker finished filtering. Returning ${filtered.length} items.`);
          return filtered;
        }),
      Test: () =>
        Effect.logInfo("Worker received test request").pipe(
          Effect.zipRight(Effect.sleep("5 seconds")),
          Effect.zipRight(Effect.logInfo("Worker finished test request")),
          Effect.asVoid,
        ),
    };
  }),
);

const RpcWorkerServer = RpcServer.layer(WorkerRpc).pipe(
  Layer.provide(Live),
  Layer.provide(RpcServer.layerProtocolWorkerRunner),
  Layer.provide(RpcSerialization.layerJson),
  Layer.provide(BrowserWorkerRunner.layer),
);

BrowserRuntime.runMain(
  BrowserWorkerRunner.launch(RpcWorkerServer).pipe(
    Effect.tapErrorCause((error) => Effect.logError("[Worker]", error)),
  ),
);
