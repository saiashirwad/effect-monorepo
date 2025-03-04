import * as HttpApiMiddleware from "@effect/platform/HttpApiMiddleware";
import { type NonEmptyReadonlyArray } from "effect/Array";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as CustomHttpApiError from "./CustomHttpApiError.js";
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
    failure: CustomHttpApiError.Unauthorized,
    provides: CurrentUser,
  },
) {}

// ==========================================
// ACL Guards
// ==========================================

/**
 * Protects an effect by checking if the current user has the required permission.
 * If the user doesn't have the permission, fails with Forbidden error.
 */
export const withPermission = (requiredPermission: Permission) => {
  return <A, E, R>(
    self: Effect.Effect<A, E, R>,
  ): Effect.Effect<A, E | CustomHttpApiError.Forbidden, R | CurrentUser> =>
    Effect.zipRight(
      CurrentUser.pipe(
        Effect.flatMap((user) =>
          user.permissions.has(requiredPermission)
            ? Effect.void
            : new CustomHttpApiError.Forbidden(),
        ),
      ),
      self,
    );
};

/**
 * Protects an effect by checking if the current user has any of the required permissions.
 * If the user doesn't have any of the permissions, fails with Forbidden error.
 */
export const withPermissionAny = (requiredPermissions: NonEmptyReadonlyArray<Permission>) => {
  return <A, E, R>(
    self: Effect.Effect<A, E, R>,
  ): Effect.Effect<A, E | CustomHttpApiError.Forbidden, R | CurrentUser> =>
    Effect.zipRight(
      CurrentUser.pipe(
        Effect.flatMap((user) =>
          requiredPermissions.some((permission) => user.permissions.has(permission))
            ? Effect.void
            : new CustomHttpApiError.Forbidden(),
        ),
      ),
      self,
    );
};

/**
 * Protects an effect by checking if the current user has all the required permissions.
 * If the user doesn't have all permissions, fails with Forbidden error.
 */
export const withPermissionAll = (requiredPermissions: NonEmptyReadonlyArray<Permission>) => {
  return <A, E, R>(
    self: Effect.Effect<A, E, R>,
  ): Effect.Effect<A, E | CustomHttpApiError.Forbidden, R | CurrentUser> =>
    Effect.zipRight(
      CurrentUser.pipe(
        Effect.flatMap((user) =>
          requiredPermissions.every((permission) => user.permissions.has(permission))
            ? Effect.void
            : new CustomHttpApiError.Forbidden(),
        ),
      ),
      self,
    );
};

// ==========================================
// ABAC Policy Implementation
// ==========================================

/**
 * Represents an access policy that can be evaluated against the current user.
 * A policy is a function that returns Effect.void if access is granted,
 * or fails with a CustomHttpApiError.Forbidden if access is denied.
 */
type Policy<E, R> = Effect.Effect<void, CustomHttpApiError.Forbidden | E, CurrentUser | R>;

/**
 * Creates a policy from a predicate function that evaluates the current user.
 */
export const policy = <E, R>(
  predicate: (user: CurrentUser["Type"]) => Effect.Effect<boolean, E, R>,
): Policy<E, R> =>
  CurrentUser.pipe(
    Effect.flatMap((user) =>
      Effect.flatMap(predicate(user), (result) =>
        result ? Effect.void : Effect.fail(new CustomHttpApiError.Forbidden()),
      ),
    ),
  );

/**
 * Applies a predicate as a pre-check to an effect.
 * If the predicate returns false, the effect will fail with Forbidden.
 */
export const withPolicy =
  <E, R>(predicate: (user: CurrentUser["Type"]) => Effect.Effect<boolean, E, R>) =>
  <A, E2, R2>(self: Effect.Effect<A, E2, R2>) =>
    Effect.zipRight(policy(predicate), self);

/**
 * Combines multiple policies with AND semantics - all must pass.
 */
export const withPolicyAll =
  <A, E, R>(policies: NonEmptyReadonlyArray<Policy<E, R>>) =>
  (self: Effect.Effect<A, E, R>) =>
    Effect.zipRight(
      Effect.all(policies, {
        concurrency: 1,
        discard: true,
      }),
      self,
    );

/**
 * Combines multiple policies with OR semantics - at least one must pass.
 */
export const withPolicyAny =
  <A, E, R>(policies: NonEmptyReadonlyArray<Policy<E, R>>) =>
  (self: Effect.Effect<A, E, R>) =>
    Effect.zipRight(Effect.firstSuccessOf(policies), self);
