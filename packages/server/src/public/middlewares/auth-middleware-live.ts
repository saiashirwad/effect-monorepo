import { Unauthorized } from "@effect/platform/HttpApiError";
import * as HttpServerRequest from "@effect/platform/HttpServerRequest";
import { Permission, UserAuthMiddleware } from "@org/domain/Policy";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import { UserId } from "../../../../domain/src/EntityIds.js";

const Headers = Schema.Struct({
  authorization: Schema.NonEmptyTrimmedString.pipe(Schema.startsWith("Bearer ")),
});

const validateTokenFormat = (token: string) =>
  token.length >= 32 ? Effect.succeed(token) : Effect.fail(new Unauthorized());

const verifyToken = (token: string) =>
  Effect.succeed({
    sessionId: "sim_" + token.substring(0, 8),
    userId: "user_" + token.substring(8, 16),
    permissions: new Set([
      "__test:read",
      "__test:manage",
      "__test:delete",
    ] satisfies Array<Permission>),
  });

const make = <A, I, R>(schema: Schema.Schema<A, I, R>) =>
  Effect.sync(() => {
    return Effect.gen(function* () {
      const headers = yield* HttpServerRequest.schemaHeaders(Headers).pipe(
        Effect.mapError(() => new Unauthorized()),
      );

      const token = headers.authorization.slice(7);

      yield* validateTokenFormat(token);
      const authResponse = yield* verifyToken(token);

      return yield* Schema.decodeUnknown(schema)(authResponse).pipe(
        Effect.withSpan("decode"),
        Effect.mapError(() => new Unauthorized()),
      );
    }).pipe(Effect.withSpan("auth.middleware"));
  });

const CurrentUserSchema = Schema.Struct({
  sessionId: Schema.String,
  userId: UserId,
  permissions: Schema.Set(Permission),
});

export const UserAuthMiddlewareLive = Layer.effect(UserAuthMiddleware, make(CurrentUserSchema));
