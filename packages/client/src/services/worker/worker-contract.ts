import * as Rpc from "@effect/rpc/Rpc";
import * as RpcGroup from "@effect/rpc/RpcGroup";
import * as Schema from "effect/Schema";

export class FilterError extends Schema.TaggedError<FilterError>()("FilterError", {
  message: Schema.String,
}) {}

export class WorkerRpc extends RpcGroup.make(
  Rpc.make("FilterData", {
    success: Schema.Array(Schema.Number),
    error: FilterError,
    payload: {
      data: Schema.Array(Schema.Number),
      threshold: Schema.Number,
    },
  }),
  Rpc.make("Test", {
    success: Schema.Void,
    error: Schema.Never,
    payload: {},
  }),
) {}
