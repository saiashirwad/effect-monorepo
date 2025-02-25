/* eslint-disable @typescript-eslint/consistent-type-definitions */
import type * as Clock from "effect/Clock"
import * as Data from "effect/Data"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as Hash from "effect/Hash"
import * as MutableHashMap from "effect/MutableHashMap"
import * as MutableQueue from "effect/MutableQueue"
import * as MutableRef from "effect/MutableRef"
import * as Option from "effect/Option"
import { hasProperty } from "effect/Predicate"
import * as Schedule from "effect/Schedule"
import type * as Scope from "effect/Scope"

/**
 * @since 1.0.0
 * @category symbols
 */
export const CacheTypeId = Symbol.for("@app/Cache")
export type CacheTypeId = typeof CacheTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export const MapKeyTypeId = Symbol.for("@app/Cache/MapKey")
export type MapKeyTypeId = typeof MapKeyTypeId

/**
 * @since 1.0.0
 * @category models
 */
export type Cache<in out Key, in out Value> = {
  readonly [CacheTypeId]: {
    readonly _Key: (_: Key) => Key
    readonly _Value: (_: Value) => Value
  }
  readonly get: (key: Key) => Effect.Effect<Option.Option<Value>>
  readonly set: (key: Key, value: Value) => Effect.Effect<void>
  readonly contains: (key: Key) => Effect.Effect<boolean>
  readonly invalidate: (key: Key) => Effect.Effect<void>
  readonly invalidateAll: Effect.Effect<void>
  readonly size: Effect.Effect<number>
  readonly keys: Effect.Effect<Array<Key>>
  readonly values: Effect.Effect<Array<Value>>
  readonly entries: Effect.Effect<Array<[Key, Value]>>
  readonly evictExpired: () => Effect.Effect<void>
}

/**
 * @since 1.0.0
 * @category models
 */
export type CacheStats = {
  readonly hits: number
  readonly misses: number
  readonly size: number
}

/**
 * @since 1.0.0
 * @category models
 */
export type EntryStats = {
  readonly loadedMillis: number
}

/**
 * @since 1.0.0
 * @category models
 */
export interface MapKey<out K> extends Equal.Equal {
  readonly [MapKeyTypeId]: MapKeyTypeId
  readonly current: K
  previous: MapKey<K> | undefined
  next: MapKey<K> | undefined
}

/**
 * @since 1.0.0
 * @category models
 */
export type MapValue<Key, Value> = Complete<Key, Value>

/**
 * @since 1.0.0
 * @category models
 */
export type Complete<out Key, out Value> = {
  readonly _tag: "Complete"
  readonly key: MapKey<Key>
  readonly value: Value
  readonly entryStats: EntryStats
  readonly timeToLiveMillis: number
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const complete = <Key, Value>(
  key: MapKey<Key>,
  value: Value,
  entryStats: EntryStats,
  timeToLiveMillis: number,
): MapValue<Key, Value> =>
  Data.struct({
    _tag: "Complete" as const,
    key,
    value,
    entryStats,
    timeToLiveMillis,
  })

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeMapKey = <K>(current: K): MapKey<K> => new MapKeyImpl(current)

/**
 * @since 1.0.0
 * @category refinements
 */
export const isMapKey = (u: unknown): u is MapKey<unknown> => hasProperty(u, MapKeyTypeId)

class MapKeyImpl<out K> implements MapKey<K> {
  public readonly [MapKeyTypeId]: MapKeyTypeId = MapKeyTypeId
  public previous: MapKey<K> | undefined = undefined
  public next: MapKey<K> | undefined = undefined
  constructor(public readonly current: K) {}
  public [Hash.symbol](): number {
    return Hash.combine(Hash.hash(this.current))(
      Hash.combine(Hash.hash(this.previous))(Hash.hash(this.next)),
    )
  }
  public [Equal.symbol](that: unknown): boolean {
    return (
      this === that ||
      (isMapKey(that) &&
        Equal.equals(this.current, that.current) &&
        Equal.equals(this.previous, that.previous) &&
        Equal.equals(this.next, that.next))
    )
  }
}

/**
 * @since 1.0.0
 * @category models
 */
export type KeySet<in out K> = {
  head: MapKey<K> | undefined
  tail: MapKey<K> | undefined
  /**
   * Adds the specified key to the set.
   */
  add(key: MapKey<K>): void
  /**
   * Removes the lowest priority key from the set.
   */
  remove(): MapKey<K> | undefined
}

class KeySetImpl<in out K> implements KeySet<K> {
  public head: MapKey<K> | undefined = undefined
  public tail: MapKey<K> | undefined = undefined
  public add(key: MapKey<K>): void {
    if (key !== this.tail) {
      if (this.tail === undefined) {
        this.head = key
        this.tail = key
      } else {
        const previous = key.previous
        const next = key.next
        if (next !== undefined) {
          key.next = undefined
          if (previous !== undefined) {
            previous.next = next
            next.previous = previous
          } else {
            this.head = next
            this.head.previous = undefined
          }
        }
        this.tail.next = key
        key.previous = this.tail
        this.tail = key
      }
    }
  }
  public remove(): MapKey<K> | undefined {
    const key = this.head
    if (key !== undefined) {
      const next = key.next
      if (next !== undefined) {
        key.next = undefined
        this.head = next
        this.head.previous = undefined
      } else {
        this.head = undefined
        this.tail = undefined
      }
    }
    return key
  }
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeKeySet = <K>(): KeySet<K> => new KeySetImpl<K>()

/**
 * @since 1.0.0
 * @category models
 */
export type CacheState<in out Key, in out Value> = {
  map: MutableHashMap.MutableHashMap<Key, MapValue<Key, Value>>
  keys: KeySet<Key>
  accesses: MutableQueue.MutableQueue<MapKey<Key>>
  updating: MutableRef.MutableRef<boolean>
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeCacheState = <Key, Value>(
  map: MutableHashMap.MutableHashMap<Key, MapValue<Key, Value>>,
  keys: KeySet<Key>,
  accesses: MutableQueue.MutableQueue<MapKey<Key>>,
  updating: MutableRef.MutableRef<boolean>,
): CacheState<Key, Value> => ({
  map,
  keys,
  accesses,
  updating,
})

/**
 * @since 1.0.0
 * @category constructors
 */
export const initialCacheState = <Key, Value>(): CacheState<Key, Value> =>
  makeCacheState(
    MutableHashMap.empty(),
    makeKeySet(),
    MutableQueue.unbounded(),
    MutableRef.make(false),
  )

class CacheImpl<in out Key, in out Value> implements Cache<Key, Value> {
  public readonly [CacheTypeId] = {
    _Key: (_: Key) => _,
    _Value: (_: Value) => _,
  }

  public readonly cacheState: CacheState<Key, Value>

  constructor(
    public readonly capacity: number,
    public readonly timeToLive: Duration.Duration,
  ) {
    this.cacheState = initialCacheState()
  }

  public get(key: Key): Effect.Effect<Option.Option<Value>> {
    return Effect.clockWith((clock) =>
      Effect.sync(() => {
        const value = Option.getOrUndefined(MutableHashMap.get(this.cacheState.map, key))
        if (value === undefined) {
          return Option.none()
        }
        this.trackAccess(value.key)
        if (this.hasExpired(clock, value.timeToLiveMillis)) {
          MutableHashMap.remove(this.cacheState.map, key)
          return Option.none()
        }
        return Option.some(value.value)
      }),
    )
  }

  public set(key: Key, value: Value): Effect.Effect<void> {
    return Effect.clockWith((clock) =>
      Effect.sync(() => {
        const now = clock.unsafeCurrentTimeMillis()
        const k = key
        const mapValue = complete(
          makeMapKey(k),
          value,
          { loadedMillis: now },
          now + Duration.toMillis(this.timeToLive),
        )
        MutableHashMap.set(this.cacheState.map, k, mapValue)
        this.trackAccess(mapValue.key)
      }),
    )
  }

  public contains(key: Key): Effect.Effect<boolean> {
    return Effect.sync(() => MutableHashMap.has(this.cacheState.map, key))
  }

  public invalidate(key: Key): Effect.Effect<void> {
    return Effect.sync(() => {
      MutableHashMap.remove(this.cacheState.map, key)
    })
  }

  get invalidateAll(): Effect.Effect<void> {
    return Effect.sync(() => {
      this.cacheState.map = MutableHashMap.empty()
    })
  }

  get size(): Effect.Effect<number> {
    return Effect.sync(() => MutableHashMap.size(this.cacheState.map))
  }

  get values(): Effect.Effect<Array<Value>> {
    return Effect.sync(() => {
      const values: Array<Value> = []
      for (const entry of this.cacheState.map) {
        values.push(entry[1].value)
      }
      return values
    })
  }

  get entries(): Effect.Effect<Array<[Key, Value]>> {
    return Effect.sync(() => {
      const values: Array<[Key, Value]> = []
      for (const entry of this.cacheState.map) {
        values.push([entry[0], entry[1].value])
      }
      return values
    })
  }

  get keys(): Effect.Effect<Array<Key>> {
    return Effect.sync(() => {
      const keys: Array<Key> = []
      for (const entry of this.cacheState.map) {
        keys.push(entry[0])
      }
      return keys
    })
  }

  public evictExpired(): Effect.Effect<void> {
    return Effect.clockWith((clock) =>
      Effect.sync(() => {
        for (const [key, value] of this.cacheState.map) {
          if (this.hasExpired(clock, value.timeToLiveMillis)) {
            MutableHashMap.remove(this.cacheState.map, key)
          }
        }
      }),
    )
  }

  private trackAccess(key: MapKey<Key>): void {
    MutableQueue.offer(this.cacheState.accesses, key)
    if (MutableRef.compareAndSet(this.cacheState.updating, false, true)) {
      let loop = true
      while (loop) {
        const key = MutableQueue.poll(this.cacheState.accesses, MutableQueue.EmptyMutableQueue)
        if (key === MutableQueue.EmptyMutableQueue) {
          loop = false
        } else {
          this.cacheState.keys.add(key)
        }
      }
      let size = MutableHashMap.size(this.cacheState.map)
      loop = size > this.capacity
      while (loop) {
        const key = this.cacheState.keys.remove()
        if (key !== undefined) {
          if (MutableHashMap.has(this.cacheState.map, key.current)) {
            MutableHashMap.remove(this.cacheState.map, key.current)
            size = size - 1
            loop = size > this.capacity
          }
        } else {
          loop = false
        }
      }
      MutableRef.set(this.cacheState.updating, false)
    }
  }

  private hasExpired(clock: Clock.Clock, timeToLiveMillis: number): boolean {
    return clock.unsafeCurrentTimeMillis() > timeToLiveMillis
  }
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <Key, Value>(options: {
  readonly capacity: number
  readonly timeToLive: Duration.DurationInput
}): Effect.Effect<Cache<Key, Value>, never, Scope.Scope> => {
  const timeToLive = Duration.decode(options.timeToLive)
  const cache = new CacheImpl(options.capacity, timeToLive) as Cache<Key, Value>

  const periodicEviction = Effect.repeat(cache.evictExpired(), Schedule.fixed(timeToLive))

  return Effect.forkScoped(periodicEviction).pipe(Effect.zipRight(Effect.succeed(cache)))
}
