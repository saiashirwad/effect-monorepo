import { describe, it } from "@effect/vitest";
import { deepStrictEqual } from "assert";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import { UserId } from "../src/EntityIds.js";
import * as Policy from "../src/Policy.js";

const mockUser = (perms: Array<Policy.Permission>): Policy.CurrentUser["Type"] =>
  ({
    sessionId: "test-session",
    userId: UserId.make("test-user"),
    permissions: new Set(perms),
  }) as const;

const provideCurrentUser = (perms: Array<Policy.Permission>) =>
  Effect.provide(Layer.succeed(Policy.CurrentUser, mockUser(perms)));

describe("permission", () => {
  it.effect("allows access when user has required permission", () =>
    Effect.gen(function* () {
      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPolicy(Policy.permission("__test:read")),
        Effect.exit,
      );

      deepStrictEqual(result, Exit.succeed("allowed"));
    }).pipe(provideCurrentUser(["__test:read"])),
  );

  it.effect("denies access when user doesn't have required permission", () =>
    Effect.gen(function* () {
      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPolicy(Policy.permission("__test:read")),
        Effect.exit,
      );

      deepStrictEqual(Exit.isFailure(result), true);
    }).pipe(provideCurrentUser(["__test:delete"])),
  );

  it.effect("prevents mutation effects from executing when permissions are insufficient", () =>
    Effect.gen(function* () {
      let mutableValue = 0;

      const result = yield* Effect.sync(() => {
        mutableValue = 5;
        return "mutated";
      }).pipe(Policy.withPolicy(Policy.permission("__test:read")), Effect.exit);

      deepStrictEqual(Exit.isFailure(result), true);
      deepStrictEqual(mutableValue, 0, "Mutation should not have occurred");
    }).pipe(provideCurrentUser([])),
  );

  it.effect(
    "prevents sequential mutation effects from executing when permissions are insufficient",
    () =>
      Effect.gen(function* () {
        let mutableValue = 0;

        const result = yield* Effect.sync(() => {
          mutableValue += 5;
          return "first mutation";
        }).pipe(
          Effect.tap(() =>
            Effect.sync(() => {
              mutableValue += 5;
              return "second mutation";
            }),
          ),
          Policy.withPolicy(Policy.permission("__test:read")),
          Effect.exit,
        );

        deepStrictEqual(Exit.isFailure(result), true);
        deepStrictEqual(mutableValue, 0, "Neither mutation should have occurred");
      }).pipe(provideCurrentUser([])),
  );
});

describe("Policy.any with permissions", () => {
  it.effect("allows access when user has at least one of the required permissions", () =>
    Effect.gen(function* () {
      const permissionPolicies = [
        Policy.permission("__test:read"),
        Policy.permission("__test:delete"),
      ] as const;

      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPolicy(Policy.any(permissionPolicies)),
        Effect.exit,
      );

      deepStrictEqual(result, Exit.succeed("allowed"));
    }).pipe(provideCurrentUser(["__test:read"])),
  );

  it.effect("allows access when user has all required permissions", () =>
    Effect.gen(function* () {
      const permissionPolicies = [
        Policy.permission("__test:read"),
        Policy.permission("__test:delete"),
      ] as const;

      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPolicy(Policy.any(permissionPolicies)),
        Effect.exit,
      );

      deepStrictEqual(result, Exit.succeed("allowed"));
    }).pipe(provideCurrentUser(["__test:read", "__test:delete"])),
  );

  it.effect("denies access when user has none of the required permissions", () =>
    Effect.gen(function* () {
      const permissionPolicies = [
        Policy.permission("__test:read"),
        Policy.permission("__test:delete"),
      ] as const;

      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPolicy(Policy.any(permissionPolicies)),
        Effect.exit,
      );

      deepStrictEqual(Exit.isFailure(result), true);
    }).pipe(provideCurrentUser([])),
  );

  it.effect(
    "prevents mutation effects from executing when no required permissions are present",
    () =>
      Effect.gen(function* () {
        let mutableValue = 0;

        const permissionPolicies = [
          Policy.permission("__test:read"),
          Policy.permission("__test:delete"),
        ] as const;

        const result = yield* Effect.sync(() => {
          mutableValue = 5;
          return "mutated";
        }).pipe(Policy.withPolicy(Policy.any(permissionPolicies)), Effect.exit);

        deepStrictEqual(Exit.isFailure(result), true);
        deepStrictEqual(mutableValue, 0, "Mutation should not have occurred");
      }).pipe(provideCurrentUser([])),
  );

  it.effect(
    "prevents sequential mutation effects from executing when no required permissions are present",
    () =>
      Effect.gen(function* () {
        let mutableValue = 0;

        const permissionPolicies = [
          Policy.permission("__test:read"),
          Policy.permission("__test:delete"),
        ] as const;

        const result = yield* Effect.sync(() => {
          mutableValue += 5;
          return "first mutation";
        }).pipe(
          Effect.tap(() =>
            Effect.sync(() => {
              mutableValue += 5;
              return "second mutation";
            }),
          ),
          Policy.withPolicy(Policy.any(permissionPolicies)),
          Effect.exit,
        );

        deepStrictEqual(Exit.isFailure(result), true);
        deepStrictEqual(mutableValue, 0, "Neither mutation should have occurred");
      }).pipe(provideCurrentUser([])),
  );
});

describe("Policy.all with permissions", () => {
  it.effect("allows access when user has all required permissions", () =>
    Effect.gen(function* () {
      const permissionPolicies = [
        Policy.permission("__test:read"),
        Policy.permission("__test:delete"),
      ] as const;

      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPolicy(Policy.all(permissionPolicies)),
        Effect.exit,
      );

      deepStrictEqual(result, Exit.succeed("allowed"));
    }).pipe(provideCurrentUser(["__test:read", "__test:delete"])),
  );

  it.effect("denies access when user has only some of the required permissions", () =>
    Effect.gen(function* () {
      const permissionPolicies = [
        Policy.permission("__test:read"),
        Policy.permission("__test:delete"),
      ] as const;

      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPolicy(Policy.all(permissionPolicies)),
        Effect.exit,
      );

      deepStrictEqual(Exit.isFailure(result), true);
    }).pipe(provideCurrentUser(["__test:read"])),
  );

  it.effect(
    "prevents mutation effects from executing when not all required permissions are present",
    () =>
      Effect.gen(function* () {
        let mutableValue = 0;

        const permissionPolicies = [
          Policy.permission("__test:read"),
          Policy.permission("__test:delete"),
        ] as const;

        const result = yield* Effect.sync(() => {
          mutableValue = 5;
          return "mutated";
        }).pipe(Policy.withPolicy(Policy.all(permissionPolicies)), Effect.exit);

        deepStrictEqual(Exit.isFailure(result), true);
        deepStrictEqual(mutableValue, 0, "Mutation should not have occurred");
      }).pipe(provideCurrentUser(["__test:read"])),
  );

  it.effect(
    "prevents sequential mutation effects from executing when not all required permissions are present",
    () =>
      Effect.gen(function* () {
        let mutableValue = 0;

        const permissionPolicies = [
          Policy.permission("__test:read"),
          Policy.permission("__test:delete"),
        ] as const;

        const result = yield* Effect.sync(() => {
          mutableValue += 5;
          return "first mutation";
        }).pipe(
          Effect.tap(() =>
            Effect.sync(() => {
              mutableValue += 5;
              return "second mutation";
            }),
          ),
          Policy.withPolicy(Policy.all(permissionPolicies)),
          Effect.exit,
        );

        deepStrictEqual(Exit.isFailure(result), true);
        deepStrictEqual(mutableValue, 0, "Neither mutation should have occurred");
      }).pipe(provideCurrentUser(["__test:read"])),
  );

  it.effect("denies access when user has none of the required permissions", () =>
    Effect.gen(function* () {
      const permissionPolicies = [
        Policy.permission("__test:read"),
        Policy.permission("__test:delete"),
      ] as const;

      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPolicy(Policy.all(permissionPolicies)),
        Effect.exit,
      );

      deepStrictEqual(Exit.isFailure(result), true);
    }).pipe(provideCurrentUser([])),
  );

  it.effect("works with a single permission requirement", () =>
    Effect.gen(function* () {
      const permissionPolicies = [Policy.permission("__test:read")] as const;

      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPolicy(Policy.all(permissionPolicies)),
        Effect.exit,
      );

      deepStrictEqual(result, Exit.succeed("allowed"));
    }).pipe(provideCurrentUser(["__test:read"])),
  );
});

describe("policy", () => {
  it.effect("returns void when predicate returns true", () =>
    Effect.gen(function* () {
      const result = yield* Policy.policy(() => Effect.succeed(true)).pipe(Effect.exit);

      deepStrictEqual(result, Exit.succeed(undefined));
    }).pipe(provideCurrentUser([])),
  );

  it.effect("fails with Forbidden when predicate returns false", () =>
    Effect.gen(function* () {
      const result = yield* Policy.policy(() => Effect.succeed(false)).pipe(Effect.exit);

      deepStrictEqual(Exit.isFailure(result), true);
    }).pipe(provideCurrentUser([])),
  );
});

describe("withPolicy", () => {
  it.effect("allows access when policy predicate returns true", () =>
    Effect.gen(function* () {
      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPolicy(Policy.policy(() => Effect.succeed(true))),
        Effect.exit,
      );

      deepStrictEqual(result, Exit.succeed("allowed"));
    }).pipe(provideCurrentUser([])),
  );

  it.effect("denies access when policy predicate returns false", () =>
    Effect.gen(function* () {
      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPolicy(Policy.policy(() => Effect.succeed(false))),
        Effect.exit,
      );

      deepStrictEqual(Exit.isFailure(result), true);
    }).pipe(provideCurrentUser([])),
  );

  it.effect("can access user data in policy predicate", () =>
    Effect.gen(function* () {
      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPolicy(Policy.policy((user) => Effect.succeed(user.userId === "test-user"))),
        Effect.exit,
      );

      deepStrictEqual(result, Exit.succeed("allowed"));
    }).pipe(provideCurrentUser([])),
  );

  it.effect("prevents mutation effects from executing when policy denies access", () =>
    Effect.gen(function* () {
      let mutableValue = 0;

      const result = yield* Effect.sync(() => {
        mutableValue = 5;
        return "mutated";
      }).pipe(Policy.withPolicy(Policy.policy(() => Effect.succeed(false))), Effect.exit);

      deepStrictEqual(Exit.isFailure(result), true);
      deepStrictEqual(mutableValue, 0, "Mutation should not have occurred");
    }).pipe(provideCurrentUser([])),
  );
});

describe("Policy.all", () => {
  it.effect("allows access when all policies pass", () =>
    Effect.gen(function* () {
      const policies = [
        Policy.policy(() => Effect.succeed(true)),
        Policy.policy(() => Effect.succeed(true)),
      ] as const;

      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPolicy(Policy.all(policies)),
        Effect.exit,
      );

      deepStrictEqual(result, Exit.succeed("allowed"));
    }).pipe(provideCurrentUser([])),
  );

  it.effect("denies access when any policy fails", () =>
    Effect.gen(function* () {
      const policies = [
        Policy.policy(() => Effect.succeed(true)),
        Policy.policy(() => Effect.succeed(false)),
      ] as const;

      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPolicy(Policy.all(policies)),
        Effect.exit,
      );

      deepStrictEqual(Exit.isFailure(result), true);
    }).pipe(provideCurrentUser([])),
  );

  it.effect("short-circuits on first failing policy", () =>
    Effect.gen(function* () {
      let secondPolicyExecuted = false;

      const policies = [
        Policy.policy(() => Effect.succeed(false)),
        Policy.policy(() =>
          Effect.sync(() => {
            secondPolicyExecuted = true;
            return true;
          }),
        ),
      ] as const;

      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPolicy(Policy.all(policies)),
        Effect.exit,
      );

      deepStrictEqual(Exit.isFailure(result), true);
      deepStrictEqual(secondPolicyExecuted, false, "Second policy should not have executed");
    }).pipe(provideCurrentUser([])),
  );
});

describe("Policy.any", () => {
  it.effect("allows access when any policy passes", () =>
    Effect.gen(function* () {
      const policies = [
        Policy.policy(() => Effect.succeed(false)),
        Policy.policy(() => Effect.succeed(true)),
      ] as const;

      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPolicy(Policy.any(policies)),
        Effect.exit,
      );

      deepStrictEqual(result, Exit.succeed("allowed"));
    }).pipe(provideCurrentUser([])),
  );

  it.effect("denies access when all policies fail", () =>
    Effect.gen(function* () {
      const policies = [
        Policy.policy(() => Effect.succeed(false)),
        Policy.policy(() => Effect.succeed(false)),
      ] as const;

      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPolicy(Policy.any(policies)),
        Effect.exit,
      );

      deepStrictEqual(Exit.isFailure(result), true);
    }).pipe(provideCurrentUser([])),
  );

  it.effect("short-circuits on first passing policy", () =>
    Effect.gen(function* () {
      let secondPolicyExecuted = false;

      const policies = [
        Policy.policy(() => Effect.succeed(true)),
        Policy.policy(() =>
          Effect.sync(() => {
            secondPolicyExecuted = true;
            return false;
          }),
        ),
      ] as const;

      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPolicy(Policy.any(policies)),
        Effect.exit,
      );

      deepStrictEqual(result, Exit.succeed("allowed"));
      deepStrictEqual(secondPolicyExecuted, false, "Second policy should not have executed");
    }).pipe(provideCurrentUser([])),
  );

  it.effect("combines with permission checks for complex authorization logic", () =>
    Effect.gen(function* () {
      const hasPermissionPolicy = Policy.policy((user) =>
        Effect.succeed(user.permissions.has("__test:read")),
      );

      const customPolicy = Policy.policy(() => Effect.succeed(true));

      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPolicy(Policy.any([hasPermissionPolicy, customPolicy] as const)),
        Effect.exit,
      );

      deepStrictEqual(result, Exit.succeed("allowed"));
    }).pipe(provideCurrentUser([])),
  );
});

describe("Nested policies", () => {
  it.effect("allows complex policy composition with nested any/all combinators", () =>
    Effect.gen(function* () {
      const hasReadPermission = Policy.permission("__test:read");
      const hasDeletePermission = Policy.permission("__test:delete");
      const hasManagePermission = Policy.permission("__test:manage");
      const customPolicy = Policy.policy(() => Effect.succeed(true));

      // AND (all must pass)
      const composedAllPolicy = Policy.all([hasReadPermission, hasManagePermission] as const);

      // OR (any can pass)
      const composedAnyPolicy = Policy.any([hasDeletePermission, customPolicy] as const);

      // nested policy: (hasRead AND hasManage) OR (hasDelete OR customPolicy)
      const nestedPolicy = Policy.any([composedAllPolicy, composedAnyPolicy] as const);

      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPolicy(nestedPolicy),
        Effect.exit,
      );

      deepStrictEqual(result, Exit.succeed("allowed"));
    }).pipe(provideCurrentUser([])),
  );

  it.effect("evaluates nested policies correctly when permissions determine the outcome", () =>
    Effect.gen(function* () {
      const hasReadPermission = Policy.permission("__test:read");
      const hasDeletePermission = Policy.permission("__test:delete");
      const hasManagePermission = Policy.permission("__test:manage");
      const alwaysFalsePolicy = Policy.policy(() => Effect.succeed(false));

      // AND (all must pass)
      const composedAllPolicy = Policy.all([hasReadPermission, hasManagePermission] as const);

      // OR (any can pass)
      const composedAnyPolicy = Policy.any([hasDeletePermission, alwaysFalsePolicy] as const);

      // nested policy: (hasRead AND hasManage) OR (hasDelete OR alwaysFalse)
      const nestedPolicy = Policy.any([composedAllPolicy, composedAnyPolicy] as const);

      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPolicy(nestedPolicy),
        Effect.exit,
      );

      // Should fail because:
      // - User doesn't have read+manage permissions (composedAllPolicy fails)
      // - User doesn't have delete permission and alwaysFalsePolicy fails (composedAnyPolicy fails)
      deepStrictEqual(Exit.isFailure(result), true);
    }).pipe(provideCurrentUser([])),
  );

  it.effect("short-circuits evaluation in nested policies", () =>
    Effect.gen(function* () {
      let secondPolicyExecuted = false;
      let thirdPolicyExecuted = false;

      // always passes
      const alwaysTruePolicy = Policy.policy(() => Effect.succeed(true));

      // tracks execution
      const trackingPolicy1 = Policy.policy(() =>
        Effect.sync(() => {
          secondPolicyExecuted = true;
          return false;
        }),
      );

      const trackingPolicy2 = Policy.policy(() =>
        Effect.sync(() => {
          thirdPolicyExecuted = true;
          return false;
        }),
      );

      // nested policy: (alwaysTrue) OR ((tracking1) AND (tracking2))
      const nestedPolicy = Policy.any([
        alwaysTruePolicy,
        Policy.all([trackingPolicy1, trackingPolicy2] as const),
      ] as const);

      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPolicy(nestedPolicy),
        Effect.exit,
      );

      // should succeed because alwaysTruePolicy passes
      deepStrictEqual(result, Exit.succeed("allowed"));

      // the tracking policies should not have executed because of short-circuiting
      deepStrictEqual(secondPolicyExecuted, false, "Second policy should not have executed");
      deepStrictEqual(thirdPolicyExecuted, false, "Third policy should not have executed");
    }).pipe(provideCurrentUser([])),
  );

  it.effect("demonstrates real-world authorization scenario with nested policies", () =>
    Effect.gen(function* () {
      const canReadUsers = Policy.permission("__test:read");
      const canManageUsers = Policy.permission("__test:manage");

      // custom policy that could check something else
      // For example, checking if the user is trying to modify their own profile
      const isOwnProfile = Policy.policy((user) => Effect.succeed(user.userId === "test-user"));

      // Authorization rule: User can access if they either:
      // 1. Have both read and manage permissions, OR
      // 2. Are accessing their own profile
      const accessPolicy = Policy.any([
        Policy.all([canReadUsers, canManageUsers] as const),
        isOwnProfile,
      ] as const);

      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPolicy(accessPolicy),
        Effect.exit,
      );

      // should succeed because isOwnProfile passes (user.userId === "test-user")
      deepStrictEqual(result, Exit.succeed("allowed"));
    }).pipe(provideCurrentUser([])),
  );
});
