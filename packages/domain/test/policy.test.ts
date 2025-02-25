import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "assert"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import { UserId } from "../src/EntityIds.js"
import * as Policy from "../src/Policy.js"

const mockUser = (perms: Array<Policy.Permission>) =>
  ({
    sessionId: "test-session",
    userId: UserId.make("test-user"),
    permissions: new Set(perms),
  }) as const

const provideCurrentUser = (perms: Array<Policy.Permission>) =>
  Effect.provide(Layer.succeed(Policy.CurrentUser, mockUser(perms)))

describe("whenOrFail", () => {
  it.effect("executes the effect when condition is true", () =>
    Effect.gen(function* () {
      const result = yield* Policy.whenOrFail(
        Effect.succeed("success"),
        () => true,
        () => new Error("failure"),
      )
      deepStrictEqual(result, "success")
    }),
  )

  it.effect("fails with provided error when condition is false", () =>
    Effect.gen(function* () {
      const result = yield* Policy.whenOrFail(
        Effect.succeed("success"),
        () => false,
        () => new Error("failure"),
      ).pipe(Effect.exit)
      deepStrictEqual(result, Exit.fail(new Error("failure")))
    }),
  )
})

describe("whenEffectOrFail", () => {
  it.effect("executes the effect when condition effect succeeds with true", () =>
    Effect.gen(function* () {
      const result = yield* Policy.whenEffectOrFail(
        Effect.succeed("success"),
        Effect.succeed(true),
        () => new Error("failure"),
      )
      deepStrictEqual(result, "success")
    }),
  )

  it.effect("fails with provided error when condition effect succeeds with false", () =>
    Effect.gen(function* () {
      const result = yield* Policy.whenEffectOrFail(
        Effect.succeed("success"),
        Effect.succeed(false),
        () => new Error("failure"),
      ).pipe(Effect.exit)
      deepStrictEqual(result, Exit.fail(new Error("failure")))
    }),
  )

  it.effect("propagates the error when condition effect fails", () =>
    Effect.gen(function* () {
      const conditionError = new Error("condition failed")
      const result = yield* Policy.whenEffectOrFail(
        Effect.succeed("success"),
        Effect.fail(conditionError),
        () => new Error("failure"),
      ).pipe(Effect.exit)
      deepStrictEqual(result, Exit.fail(conditionError))
    }),
  )

  it.effect("prevents mutation when condition effect fails", () =>
    Effect.gen(function* () {
      let mutableValue = 0

      const result = yield* Effect.sync(() => {
        mutableValue = 5
        return "mutated"
      }).pipe(
        Policy.whenEffectOrFail(
          Effect.fail(new Error("condition failed")),
          () => new Error("failure"),
        ),
        Effect.exit,
      )

      deepStrictEqual(Exit.isFailure(result), true)
      deepStrictEqual(mutableValue, 0, "Mutation should not have occurred")
    }),
  )

  it.effect("prevents sequential mutations when condition effect fails", () =>
    Effect.gen(function* () {
      let mutableValue = 0

      const result = yield* Effect.sync(() => {
        mutableValue += 5
        return "first mutation"
      }).pipe(
        Effect.tap(() =>
          Effect.sync(() => {
            mutableValue += 5
            return "second mutation"
          }),
        ),
        Policy.whenEffectOrFail(
          Effect.fail(new Error("condition failed")),
          () => new Error("failure"),
        ),
        Effect.exit,
      )

      deepStrictEqual(Exit.isFailure(result), true)
      deepStrictEqual(mutableValue, 0, "Neither mutation should have occurred")
    }),
  )
})

describe("withPolicy", () => {
  it.effect("allows access when user has required permission", () =>
    Effect.gen(function* () {
      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPolicy("__test:read"),
        Effect.exit,
      )

      deepStrictEqual(result, Exit.succeed("allowed"))
    }).pipe(provideCurrentUser(["__test:read"])),
  )

  it.effect("denies access when user doesn't have required permission", () =>
    Effect.gen(function* () {
      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPolicy("__test:read"),
        Effect.exit,
      )

      deepStrictEqual(Exit.isFailure(result), true)
    }).pipe(provideCurrentUser(["__test:delete"])),
  )

  it.effect("prevents mutation effects from executing when permissions are insufficient", () =>
    Effect.gen(function* () {
      let mutableValue = 0

      const result = yield* Effect.sync(() => {
        mutableValue = 5
        return "mutated"
      }).pipe(Policy.withPolicy("__test:read"), Effect.exit)

      deepStrictEqual(Exit.isFailure(result), true)
      deepStrictEqual(mutableValue, 0, "Mutation should not have occurred")
    }).pipe(provideCurrentUser([])),
  )

  it.effect(
    "prevents sequential mutation effects from executing when permissions are insufficient",
    () =>
      Effect.gen(function* () {
        let mutableValue = 0

        const result = yield* Effect.sync(() => {
          mutableValue += 5
          return "first mutation"
        }).pipe(
          Effect.tap(() =>
            Effect.sync(() => {
              mutableValue += 5
              return "second mutation"
            }),
          ),
          Policy.withPolicy("__test:read"),
          Effect.exit,
        )

        deepStrictEqual(Exit.isFailure(result), true)
        deepStrictEqual(mutableValue, 0, "Neither mutation should have occurred")
      }).pipe(provideCurrentUser([])),
  )
})

describe("withPolicyAny", () => {
  it.effect("allows access when user has at least one of the required permissions", () =>
    Effect.gen(function* () {
      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPolicyAny(["__test:read", "__test:delete"]),
        Effect.exit,
      )

      deepStrictEqual(result, Exit.succeed("allowed"))
    }).pipe(provideCurrentUser(["__test:read"])),
  )

  it.effect("allows access when user has all required permissions", () =>
    Effect.gen(function* () {
      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPolicyAny(["__test:read", "__test:delete"]),
        Effect.exit,
      )

      deepStrictEqual(result, Exit.succeed("allowed"))
    }).pipe(provideCurrentUser(["__test:read", "__test:delete"])),
  )

  it.effect("denies access when user has none of the required permissions", () =>
    Effect.gen(function* () {
      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPolicyAny(["__test:read", "__test:delete"]),
        Effect.exit,
      )

      deepStrictEqual(Exit.isFailure(result), true)
    }).pipe(provideCurrentUser([])),
  )

  it.effect(
    "prevents mutation effects from executing when no required permissions are present",
    () =>
      Effect.gen(function* () {
        let mutableValue = 0

        const result = yield* Effect.sync(() => {
          mutableValue = 5
          return "mutated"
        }).pipe(Policy.withPolicyAny(["__test:read", "__test:delete"]), Effect.exit)

        deepStrictEqual(Exit.isFailure(result), true)
        deepStrictEqual(mutableValue, 0, "Mutation should not have occurred")
      }).pipe(provideCurrentUser([])),
  )

  it.effect(
    "prevents sequential mutation effects from executing when no required permissions are present",
    () =>
      Effect.gen(function* () {
        let mutableValue = 0

        const result = yield* Effect.sync(() => {
          mutableValue += 5
          return "first mutation"
        }).pipe(
          Effect.tap(() =>
            Effect.sync(() => {
              mutableValue += 5
              return "second mutation"
            }),
          ),
          Policy.withPolicyAny(["__test:read", "__test:delete"]),
          Effect.exit,
        )

        deepStrictEqual(Exit.isFailure(result), true)
        deepStrictEqual(mutableValue, 0, "Neither mutation should have occurred")
      }).pipe(provideCurrentUser([])),
  )
})

describe("withPolicyAll", () => {
  it.effect("allows access when user has all required permissions", () =>
    Effect.gen(function* () {
      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPolicyAll(["__test:read", "__test:delete"]),
        Effect.exit,
      )

      deepStrictEqual(result, Exit.succeed("allowed"))
    }).pipe(provideCurrentUser(["__test:read", "__test:delete"])),
  )

  it.effect("denies access when user has only some of the required permissions", () =>
    Effect.gen(function* () {
      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPolicyAll(["__test:read", "__test:delete"]),
        Effect.exit,
      )

      deepStrictEqual(Exit.isFailure(result), true)
    }).pipe(provideCurrentUser(["__test:read"])),
  )

  it.effect(
    "prevents mutation effects from executing when not all required permissions are present",
    () =>
      Effect.gen(function* () {
        let mutableValue = 0

        const result = yield* Effect.sync(() => {
          mutableValue = 5
          return "mutated"
        }).pipe(Policy.withPolicyAll(["__test:read", "__test:delete"]), Effect.exit)

        deepStrictEqual(Exit.isFailure(result), true)
        deepStrictEqual(mutableValue, 0, "Mutation should not have occurred")
      }).pipe(provideCurrentUser(["__test:read"])),
  )

  it.effect(
    "prevents sequential mutation effects from executing when not all required permissions are present",
    () =>
      Effect.gen(function* () {
        let mutableValue = 0

        const result = yield* Effect.sync(() => {
          mutableValue += 5
          return "first mutation"
        }).pipe(
          Effect.tap(() =>
            Effect.sync(() => {
              mutableValue += 5
              return "second mutation"
            }),
          ),
          Policy.withPolicyAll(["__test:read", "__test:delete"]),
          Effect.exit,
        )

        deepStrictEqual(Exit.isFailure(result), true)
        deepStrictEqual(mutableValue, 0, "Neither mutation should have occurred")
      }).pipe(provideCurrentUser(["__test:read"])),
  )

  it.effect("denies access when user has none of the required permissions", () =>
    Effect.gen(function* () {
      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPolicyAll(["__test:read", "__test:delete"]),
        Effect.exit,
      )

      deepStrictEqual(Exit.isFailure(result), true)
    }).pipe(provideCurrentUser([])),
  )

  it.effect("works with a single permission requirement", () =>
    Effect.gen(function* () {
      const result = yield* Effect.succeed("allowed").pipe(
        Policy.withPolicyAll(["__test:read"]),
        Effect.exit,
      )

      deepStrictEqual(result, Exit.succeed("allowed"))
    }).pipe(provideCurrentUser(["__test:read"])),
  )
})
