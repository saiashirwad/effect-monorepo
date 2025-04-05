import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { Api } from "../../api.js";
import { TodosRepository } from "./todos-repository.js";

export const TodosLive = HttpApiBuilder.group(
  Api,
  "todos",
  Effect.fnUntraced(function* (handlers) {
    const repository = yield* TodosRepository;

    return handlers
      .handle("get", () => repository.findAll())
      .handle("create", (request) => repository.create(request.payload))
      .handle("update", (request) => repository.update(request.payload))
      .handle("delete", (request) => repository.del(request.payload));
  }),
).pipe(Layer.provide(TodosRepository.Default));
