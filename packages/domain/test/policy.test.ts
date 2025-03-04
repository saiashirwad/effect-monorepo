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

describe("withPermission", () => {
  it.effect("allows access when user has required permission", () =>
    Effect.gen(function* () {
      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPermission("__test:read"),
        Effect.exit,
      );

      deepStrictEqual(result, Exit.succeed("allowed"));
    }).pipe(provideCurrentUser(["__test:read"])),
  );

  it.effect("denies access when user doesn't have required permission", () =>
    Effect.gen(function* () {
      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPermission("__test:read"),
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
      }).pipe(Policy.withPermission("__test:read"), Effect.exit);

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
          Policy.withPermission("__test:read"),
          Effect.exit,
        );

        deepStrictEqual(Exit.isFailure(result), true);
        deepStrictEqual(mutableValue, 0, "Neither mutation should have occurred");
      }).pipe(provideCurrentUser([])),
  );
});

describe("withPermissionAny", () => {
  it.effect("allows access when user has at least one of the required permissions", () =>
    Effect.gen(function* () {
      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPermissionAny(["__test:read", "__test:delete"]),
        Effect.exit,
      );

      deepStrictEqual(result, Exit.succeed("allowed"));
    }).pipe(provideCurrentUser(["__test:read"])),
  );

  it.effect("allows access when user has all required permissions", () =>
    Effect.gen(function* () {
      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPermissionAny(["__test:read", "__test:delete"]),
        Effect.exit,
      );

      deepStrictEqual(result, Exit.succeed("allowed"));
    }).pipe(provideCurrentUser(["__test:read", "__test:delete"])),
  );

  it.effect("denies access when user has none of the required permissions", () =>
    Effect.gen(function* () {
      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPermissionAny(["__test:read", "__test:delete"]),
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

        const result = yield* Effect.sync(() => {
          mutableValue = 5;
          return "mutated";
        }).pipe(Policy.withPermissionAny(["__test:read", "__test:delete"]), Effect.exit);

        deepStrictEqual(Exit.isFailure(result), true);
        deepStrictEqual(mutableValue, 0, "Mutation should not have occurred");
      }).pipe(provideCurrentUser([])),
  );

  it.effect(
    "prevents sequential mutation effects from executing when no required permissions are present",
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
          Policy.withPermissionAny(["__test:read", "__test:delete"]),
          Effect.exit,
        );

        deepStrictEqual(Exit.isFailure(result), true);
        deepStrictEqual(mutableValue, 0, "Neither mutation should have occurred");
      }).pipe(provideCurrentUser([])),
  );
});

describe("withPermissionAll", () => {
  it.effect("allows access when user has all required permissions", () =>
    Effect.gen(function* () {
      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPermissionAll(["__test:read", "__test:delete"]),
        Effect.exit,
      );

      deepStrictEqual(result, Exit.succeed("allowed"));
    }).pipe(provideCurrentUser(["__test:read", "__test:delete"])),
  );

  it.effect("denies access when user has only some of the required permissions", () =>
    Effect.gen(function* () {
      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPermissionAll(["__test:read", "__test:delete"]),
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

        const result = yield* Effect.sync(() => {
          mutableValue = 5;
          return "mutated";
        }).pipe(Policy.withPermissionAll(["__test:read", "__test:delete"]), Effect.exit);

        deepStrictEqual(Exit.isFailure(result), true);
        deepStrictEqual(mutableValue, 0, "Mutation should not have occurred");
      }).pipe(provideCurrentUser(["__test:read"])),
  );

  it.effect(
    "prevents sequential mutation effects from executing when not all required permissions are present",
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
          Policy.withPermissionAll(["__test:read", "__test:delete"]),
          Effect.exit,
        );

        deepStrictEqual(Exit.isFailure(result), true);
        deepStrictEqual(mutableValue, 0, "Neither mutation should have occurred");
      }).pipe(provideCurrentUser(["__test:read"])),
  );

  it.effect("denies access when user has none of the required permissions", () =>
    Effect.gen(function* () {
      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPermissionAll(["__test:read", "__test:delete"]),
        Effect.exit,
      );

      deepStrictEqual(Exit.isFailure(result), true);
    }).pipe(provideCurrentUser([])),
  );

  it.effect("works with a single permission requirement", () =>
    Effect.gen(function* () {
      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPermissionAll(["__test:read"]),
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
        Policy.withPolicy(() => Effect.succeed(true)),
        Effect.exit,
      );

      deepStrictEqual(result, Exit.succeed("allowed"));
    }).pipe(provideCurrentUser([])),
  );

  it.effect("denies access when policy predicate returns false", () =>
    Effect.gen(function* () {
      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPolicy(() => Effect.succeed(false)),
        Effect.exit,
      );

      deepStrictEqual(Exit.isFailure(result), true);
    }).pipe(provideCurrentUser([])),
  );

  it.effect("can access user data in policy predicate", () =>
    Effect.gen(function* () {
      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPolicy((user) => Effect.succeed(user.userId === "test-user")),
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
      }).pipe(
        Policy.withPolicy(() => Effect.succeed(false)),
        Effect.exit,
      );

      deepStrictEqual(Exit.isFailure(result), true);
      deepStrictEqual(mutableValue, 0, "Mutation should not have occurred");
    }).pipe(provideCurrentUser([])),
  );
});

describe("withPolicyAll", () => {
  it.effect("allows access when all policies pass", () =>
    Effect.gen(function* () {
      const policies = [
        Policy.policy(() => Effect.succeed(true)),
        Policy.policy(() => Effect.succeed(true)),
      ] as const;

      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPolicyAll(policies),
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
        Policy.withPolicyAll(policies),
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
        Policy.withPolicyAll(policies),
        Effect.exit,
      );

      deepStrictEqual(Exit.isFailure(result), true);
      deepStrictEqual(secondPolicyExecuted, false, "Second policy should not have executed");
    }).pipe(provideCurrentUser([])),
  );
});

describe("withPolicyAny", () => {
  it.effect("allows access when any policy passes", () =>
    Effect.gen(function* () {
      const policies = [
        Policy.policy(() => Effect.succeed(false)),
        Policy.policy(() => Effect.succeed(true)),
      ] as const;

      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPolicyAny(policies),
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
        Policy.withPolicyAny(policies),
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
        Policy.withPolicyAny(policies),
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

      // Combine policies with OR logic
      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPolicyAny([hasPermissionPolicy, customPolicy] as const),
        Effect.exit,
      );

      deepStrictEqual(result, Exit.succeed("allowed"));
    }).pipe(provideCurrentUser([])),
  );
});
