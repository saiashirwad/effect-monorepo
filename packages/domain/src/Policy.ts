import * as HttpApiError from "@effect/platform/HttpApiError";
import * as HttpApiMiddleware from "@effect/platform/HttpApiMiddleware";
import { type NonEmptyReadonlyArray } from "effect/Array";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import { type LazyArg, dual } from "effect/Function";
import * as Schema from "effect/Schema";
import { type UserId } from "./EntityIds.js";
import * as internal from "./internal/policy.js";

// ==========================================
// Permissions
// ==========================================

const Permissions = internal.makePermissions({
  __test: ["read", "manage", "delete"],
} as const);

export const Permission = Schema.Literal(...Permissions).annotations({
  identifier: "Permission",
});
export type Permission = typeof Permission.Type;

// ==========================================
// Utils
// ==========================================

export const whenOrFail: {
  <A, E, R, E2>(
    condition: LazyArg<boolean>,
    orFailWith: LazyArg<E2>,
  ): (self: Effect.Effect<A, E, R>) => Effect.Effect<A, E | E2, R>;
  <A, E, R, E2>(
    self: Effect.Effect<A, E, R>,
    condition: LazyArg<boolean>,
    orFailWith: LazyArg<E2>,
  ): Effect.Effect<A, E | E2, R>;
} = dual(
  3,
  <A, E, R, E2>(
    self: Effect.Effect<A, E, R>,
    condition: LazyArg<boolean>,
    orFailWith: LazyArg<E2>,
  ): Effect.Effect<A, E | E2, R> =>
    // @ts-expect-error - TypeScript doesn't know that Effect.fail(orFailWith()) short-circuits, so it tries to unify the success channel (never | A)
    Effect.flatMap(Effect.sync(condition), (bool) => (bool ? self : Effect.fail(orFailWith()))),
);

export const whenEffectOrFail: {
  <E2, R2, E3>(
    condition: Effect.Effect<boolean, E2, R2>,
    orFailWith: LazyArg<E3>,
  ): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E | E2 | E3, R | R2>;
  <A, E, R, E2, R2, E3>(
    self: Effect.Effect<A, E, R>,
    condition: Effect.Effect<boolean, E2, R2>,
    orFailWith: LazyArg<E3>,
  ): Effect.Effect<A, E | E2 | E3, R | R2>;
} = dual(
  3,
  <A, E, R, E2, R2, E3>(
    self: Effect.Effect<A, E, R>,
    condition: Effect.Effect<boolean, E2, R2>,
    orFailWith: LazyArg<E3>,
  ): Effect.Effect<A, E | E2 | E3, R | R2> =>
    // @ts-expect-error - TypeScript doesn't know that Effect.fail(orFailWith()) short-circuits, so it tries to unify the success channel (never | A)
    Effect.flatMap(condition, (bool) => (bool ? self : Effect.fail(orFailWith()))),
);

// ==========================================
// Authentication Middleware
// ==========================================

export class CurrentUser extends Context.Tag("CurrentUser")<
  CurrentUser,
  {
    readonly sessionId: string;
    readonly userId: UserId;
    readonly permissions: Set<Permission>;
  }
>() {}

export class UserAuthMiddleware extends HttpApiMiddleware.Tag<UserAuthMiddleware>()(
  "UserAuthMiddleware",
  {
    failure: HttpApiError.Unauthorized,
    provides: CurrentUser,
  },
) {}

// ==========================================
// Policy Guards
// ==========================================

/**
 * Protects an effect by checking if the current user has the required permission.
 * If the user doesn't have the permission, fails with Forbidden error.
 */
export const withPolicy = (requiredPermission: Permission) => {
  return <A, E, R>(
    self: Effect.Effect<A, E, R>,
  ): Effect.Effect<A, E | HttpApiError.Forbidden, R | CurrentUser> =>
    Effect.flatMap(CurrentUser, (user) =>
      whenOrFail(
        self,
        () => user.permissions.has(requiredPermission),
        () => new HttpApiError.Forbidden(),
      ),
    );
};

/**
 * Protects an effect by checking if the current user has any of the required permissions.
 * If the user doesn't have any of the permissions, fails with Forbidden error.
 */
export const withPolicyAny = (requiredPermissions: NonEmptyReadonlyArray<Permission>) => {
  return <A, E, R>(
    self: Effect.Effect<A, E, R>,
  ): Effect.Effect<A, E | HttpApiError.Forbidden, R | CurrentUser> =>
    Effect.flatMap(CurrentUser, (user) =>
      whenOrFail(
        self,
        () => requiredPermissions.some((permission) => user.permissions.has(permission)),
        () => new HttpApiError.Forbidden(),
      ),
    );
};

/**
 * Protects an effect by checking if the current user has all the required permissions.
 * If the user doesn't have all permissions, fails with Forbidden error.
 */
export const withPolicyAll = (requiredPermissions: NonEmptyReadonlyArray<Permission>) => {
  return <A, E, R>(
    self: Effect.Effect<A, E, R>,
  ): Effect.Effect<A, E | HttpApiError.Forbidden, R | CurrentUser> =>
    Effect.flatMap(CurrentUser, (user) =>
      whenOrFail(
        self,
        () => requiredPermissions.every((permission) => user.permissions.has(permission)),
        () => new HttpApiError.Forbidden(),
      ),
    );
};
