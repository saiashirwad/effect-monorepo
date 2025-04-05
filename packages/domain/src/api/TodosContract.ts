import * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint";
import * as HttpApiGroup from "@effect/platform/HttpApiGroup";
import * as HttpApiSchema from "@effect/platform/HttpApiSchema";
import * as Schema from "effect/Schema";
import { TodoId } from "../EntityIds.js";

export class TodoNotFoundError extends Schema.TaggedError<TodoNotFoundError>("TodoNotFoundError")(
  "TodoNotFoundError",
  {
    message: Schema.String,
  },
  HttpApiSchema.annotations({
    status: 404,
  }),
) {}

export class Todo extends Schema.Class<Todo>("Todo")({
  id: TodoId,
  title: Schema.String,
  completed: Schema.Boolean,
}) {}

export class Group extends HttpApiGroup.make("todos")
  .add(HttpApiEndpoint.get("get", "/").addSuccess(Schema.Array(Todo)))
  .add(HttpApiEndpoint.post("create", "/").addSuccess(Todo).setPayload(Todo))
  .add(
    HttpApiEndpoint.put("update", "/:id")
      .addError(TodoNotFoundError)
      .addSuccess(Todo)
      .setPayload(Todo),
  )
  .add(
    HttpApiEndpoint.del("delete", "/:id")
      .addError(TodoNotFoundError)
      .addSuccess(Schema.Void)
      .setPayload(TodoId),
  )
  .prefix("/todos") {}
