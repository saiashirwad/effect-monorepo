import * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint";
import * as HttpApiGroup from "@effect/platform/HttpApiGroup";
import * as Schema from "effect/Schema";
import { UserAuthMiddleware } from "../Policy.js";

export class TestEvent extends Schema.TaggedClass<TestEvent>("TestEvent")("TestEvent", {
  message: Schema.String,
}) {}

export const Events = Schema.Union(TestEvent);
export type Events = typeof Events.Type;

export class Group extends HttpApiGroup.make("sse")
  .middleware(UserAuthMiddleware)
  .add(HttpApiEndpoint.get("sse", "/").addSuccess(Schema.Unknown))
  .add(HttpApiEndpoint.post("notify", "/notify").addSuccess(Schema.Void))
  .prefix("/sse") {}
