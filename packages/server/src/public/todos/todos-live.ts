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
      .handle("get", () => repository.findAll().pipe(Effect.withSpan("TodosLive.get")))
      .handle("create", (request) =>
        repository
          .create({
            completed: false,
            title: request.payload.title,
          })
          .pipe(Effect.withSpan("TodosLive.create")),
      )
      .handle("update", (request) =>
        repository.update(request.payload).pipe(Effect.withSpan("TodosLive.update")),
      )
      .handle("delete", (request) =>
        repository.del(request.payload).pipe(Effect.withSpan("TodosLive.delete")),
      );
  }),
).pipe(Layer.provide(TodosRepository.Default));
