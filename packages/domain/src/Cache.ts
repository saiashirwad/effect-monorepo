/* eslint-disable @typescript-eslint/consistent-type-definitions */
import type * as Duration from "effect/Duration";
import type * as Effect from "effect/Effect";
import type * as Option from "effect/Option";
import type * as Scope from "effect/Scope";
import type * as Types from "effect/Types";
import * as internal from "./internal/cache.js";

/**
 * A `Cache` is a key-value store with a specified capacity and time to live for entries.
 * When the cache is at capacity, the least recently accessed entries will be removed.
 * Entries older than the specified time to live will be automatically removed when accessed.
 *
 * The cache is safe for concurrent access.
 *
 * @example
 * ```typescript
 * import * as Cache from "./Cache"
 * import * as Effect from "effect/Effect"
 * import * as Option from "effect/Option"
 *
 * // Create a cache with capacity of 100 and TTL of 1 hour
 * const program = Effect.gen(function* (_) {
 *   const cache = yield* _(Cache.make({
 *     capacity: 100,
 *     timeToLive: "1 hour"
 *   }))
 *
 *   // Set a value
 *   yield* _(cache.set("key", "value"))
 *
 *   // Get a value (returns Option)
 *   const value = yield* _(cache.get("key"))
 *   // value: Option<string>
 *
 *   // Check if key exists
 *   const exists = yield* _(cache.contains("key"))
 *   // exists: boolean
 *
 *   // Invalidate a key
 *   yield* _(cache.invalidate("key"))
 *
 *   // Get cache size
 *   const size = yield* _(cache.size)
 *   // size: number
 * })
 * ```
 *
 * @since 1.0.0
 * @category models
 */
export interface Cache<in out Key, in out Value> extends Cache.Variance<Key, Value> {
  /**
   * Retrieves the value associated with the specified key if it exists.
   * Otherwise returns Option.none.
   */
  readonly get: (key: Key) => Effect.Effect<Option.Option<Value>>;

  /**
   * Associates the specified value with the specified key in the cache.
   */
  readonly set: (key: Key, value: Value) => Effect.Effect<void>;

  /**
   * Returns whether a value associated with the specified key exists in the cache.
   */
  readonly contains: (key: Key) => Effect.Effect<boolean>;

  /**
   * Invalidates the value associated with the specified key.
   */
  readonly invalidate: (key: Key) => Effect.Effect<void>;

  /**
   * Invalidates all values in the cache.
   */
  readonly invalidateAll: Effect.Effect<void>;

  /**
   * Returns the approximate number of values in the cache.
   */
  readonly size: Effect.Effect<number>;

  /**
   * Returns an approximation of the keys in the cache.
   */
  readonly keys: Effect.Effect<Array<Key>>;

  /**
   * Returns an approximation of the values in the cache.
   */
  readonly values: Effect.Effect<Array<Value>>;

  /**
   * Returns an approximation of the entries in the cache.
   */
  readonly entries: Effect.Effect<Array<[Key, Value]>>;
}

/**
 * @since 1.0.0
 */
export declare namespace Cache {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Variance<in out Key, in out Value> {
    readonly [internal.CacheTypeId]: {
      readonly _Key: Types.Invariant<Key>;
      readonly _Value: Types.Invariant<Value>;
    };
  }
}

/**
 * @since 1.0.0
 * @category models
 */
export interface CacheStats {
  readonly hits: number;
  readonly misses: number;
  readonly size: number;
}

/**
 * @since 1.0.0
 * @category models
 */
export interface EntryStats {
  readonly loadedMillis: number;
}

/**
 * Creates a new cache with the specified capacity and time to live.
 *
 * @example
 * ```typescript
 * import * as Cache from "./Cache"
 * import * as Effect from "effect/Effect"
 *
 * const cache = Cache.make({
 *   capacity: 100,
 *   timeToLive: "1 hour"
 * })
 * ```
 *
 * @since 1.0.0
 * @category constructors
 */
export const make = <Key = never, Value = never>(options: {
  readonly capacity: number;
  readonly timeToLive: Duration.DurationInput;
}): Effect.Effect<Cache<Key, Value>, never, Scope.Scope> => internal.make(options);
