import * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint"
import * as HttpApiGroup from "@effect/platform/HttpApiGroup"
import * as Schema from "effect/Schema"
import { UserId } from "../EntityIds.js"
import { UserAuthMiddleware } from "../Policy.js"

export class Me extends Schema.Class<Me>("Me")({
  id: UserId,
  name: Schema.String,
}) {}

export class MeGroup extends HttpApiGroup.make("me")
  .middleware(UserAuthMiddleware)
  .add(HttpApiEndpoint.get("get", "/").addSuccess(Me))
  .prefix("/me") {}
