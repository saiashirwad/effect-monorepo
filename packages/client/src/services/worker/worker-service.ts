import { BrowserWorker } from "@effect/platform-browser";
import { RpcClient } from "@effect/rpc";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { WorkerRpc } from "./worker-contract";
import MyWorker from "./worker.ts?worker";

const RpcProtocol = RpcClient.layerProtocolWorker({ size: 1, concurrency: 1 }).pipe(
  Layer.provide(BrowserWorker.layerPlatform(() => new MyWorker())),
  Layer.orDie,
);

export class WorkerService extends Effect.Service<WorkerService>()("@org/Worker", {
  dependencies: [RpcProtocol],
  scoped: Effect.gen(function* () {
    return {
      client: yield* RpcClient.make(WorkerRpc),
    };
  }),
}) {}
