/* eslint-disable eqeqeq */
/* eslint-disable @typescript-eslint/consistent-type-definitions */
import { type Coercible } from "@effect/platform/UrlParams"
import { type NonEmptyArray, type NonEmptyReadonlyArray } from "effect/Array"
import { type Inspectable, NodeInspectSymbol } from "effect/Inspectable"
import type { Pipeable } from "effect/Pipeable"
import { pipeArguments } from "effect/Pipeable"

type Writeable<T extends { [x: string | symbol]: any }, K extends string | symbol> = {
  [P in K]: T[P]
}

/**
 * @since 1.0.0
 * @category symbols
 */
const TypeId = Symbol.for("UrlBuilder")

/**
 * @since 1.0.0
 * @category symbols
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface UrlBuilder extends Inspectable, Pipeable {
  readonly [TypeId]: TypeId
  readonly root: string
  readonly paths: ReadonlyArray<string>
  readonly params: URLSearchParams
}

const fromInput = (
  input:
    | URLSearchParams
    | Record<string, Coercible | ReadonlyArray<Coercible>>
    | Iterable<readonly [string, Coercible]>,
): URLSearchParams => {
  if (input instanceof URLSearchParams) {
    return input
  }

  const params = new URLSearchParams()

  if (Symbol.iterator in input) {
    for (const [key, value] of input) {
      if (value != null) {
        params.append(key, String(value))
      }
    }
  } else {
    for (const [key, value] of Object.entries(input)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item != null) {
            params.append(key, String(item))
          }
        }
      } else if (value != null) {
        params.append(key, String(value))
      }
    }
  }

  return params
}

const UrlBuilderProto: Omit<UrlBuilder, "root" | "paths" | "params"> = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  },
  toString(this: UrlBuilder) {
    return toString(this)
  },
  toJSON(this: UrlBuilder) {
    return {
      _id: "UrlBuilder",
      root: this.root,
      paths: this.paths,
      params: this.params,
    }
  },
  [NodeInspectSymbol]() {
    return this.toJSON()
  },
}

/**
 * Creates a new `UrlBuilder` instance with the specified root URL and optional initial paths and params.
 * The root URL will have any trailing slashes removed automatically.
 *
 * **Syntax**
 *
 * ```ts
 * const builder = UrlBuilder.make(rootUrl, paths?, params?)
 * ```
 *
 * **Details**
 *
 * `make` is the primary constructor for creating `UrlBuilder` instances. It ensures URLs are
 * properly formatted by removing trailing slashes from the root URL. The paths parameter can
 * be either a single string path or an array of path segments.
 *
 * @example
 * ```ts
 * import * as UrlBuilder from "@org/domain/UrlBuilder"
 *
 * // Basic usage
 * const builder = UrlBuilder.make("http://localhost:5173")
 * UrlBuilder.toString(builder) // "http://localhost:5173"
 *
 * // With trailing slash (automatically removed)
 * const builder2 = UrlBuilder.make("http://localhost:5173/")
 * UrlBuilder.toString(builder2) // "http://localhost:5173"
 *
 * // With a single path string
 * const builder3 = UrlBuilder.make("http://localhost:5173", "api")
 * UrlBuilder.toString(builder3) // "http://localhost:5173/api"
 *
 * // With an array of paths
 * const builder4 = UrlBuilder.make("http://localhost:5173", ["api", "v1"])
 * UrlBuilder.toString(builder4) // "http://localhost:5173/api/v1"
 *
 * // With initial params
 * const builder5 = UrlBuilder.make("http://localhost:5173", [], { page: 1, limit: 10 })
 * UrlBuilder.toString(builder5) // "http://localhost:5173?page=1&limit=10"
 * ```
 *
 * @since 1.0.0
 * @category constructors
 */
export const make = (
  root: string,
  paths?: string | NonEmptyReadonlyArray<string>,
  params:
    | URLSearchParams
    | Record<string, Coercible | ReadonlyArray<Coercible>>
    | Iterable<readonly [string, Coercible]> = new URLSearchParams(),
): UrlBuilder => {
  const builder: Writeable<typeof UrlBuilderProto, keyof UrlBuilder> =
    Object.create(UrlBuilderProto)
  builder.root = root.replace(/\/+$/, "")
  builder.paths = paths === undefined ? [] : typeof paths === "string" ? [paths] : paths
  builder.params = fromInput(params)
  return builder as UrlBuilder
}

/**
 * Creates a new `UrlBuilder` instance with the specified root URL.
 * This is a convenience wrapper around `make` for when you only need to set the root.
 *
 * **Syntax**
 *
 * ```ts
 * const builder = UrlBuilder.setRoot(rootUrl)
 * ```
 *
 * @example
 * ```ts
 * import * as UrlBuilder from "@org/domain/UrlBuilder"
 *
 * const builder = UrlBuilder.setRoot("http://localhost:5173").pipe(
 *   UrlBuilder.addPath("api")
 * )
 * UrlBuilder.toString(builder) // "http://localhost:5173/api"
 * ```
 *
 * @since 1.0.0
 * @category constructors
 */
export const setRoot = (root: string): UrlBuilder => make(root)

/**
 * Adds a single path segment to the URL.
 *
 * **Syntax**
 *
 * ```ts
 * const newBuilder = pipe(builder, UrlBuilder.addPath(path))
 * // or
 * const newBuilder = builder.pipe(UrlBuilder.addPath(path))
 * ```
 *
 * **Details**
 *
 * `addPath` appends a single path segment to the existing URL path. It automatically
 * handles slash separators, so you don't need to worry about them.
 *
 * @example
 * ```ts
 * import * as UrlBuilder from "@org/domain/UrlBuilder"
 *
 * const builder = UrlBuilder.make("http://localhost:5173").pipe(
 *   UrlBuilder.addPath("api"),
 *   UrlBuilder.addPath("v1")
 * )
 * UrlBuilder.toString(builder) // "http://localhost:5173/api/v1"
 * ```
 *
 * @since 1.0.0
 * @category combinators
 */
export const addPath =
  (path: string) =>
  (self: UrlBuilder): UrlBuilder => {
    const newPaths = [...self.paths, path] as unknown as NonEmptyReadonlyArray<string>
    return make(self.root, newPaths.length === 0 ? undefined : newPaths)
  }

/**
 * Adds multiple path segments to the URL in a single operation.
 *
 * **Syntax**
 *
 * ```ts
 * const newBuilder = pipe(builder, UrlBuilder.addPaths(...paths))
 * // or
 * const newBuilder = builder.pipe(UrlBuilder.addPaths(...paths))
 * ```
 *
 * **Details**
 *
 * `addPaths` is a variadic function that accepts any number of path segments and appends
 * them all to the existing URL path. It's more efficient than calling `addPath` multiple
 * times when you need to add several segments at once.
 *
 * @example
 * ```ts
 * import * as UrlBuilder from "@org/domain/UrlBuilder"
 *
 * const builder = UrlBuilder.make("http://localhost:5173").pipe(
 *   UrlBuilder.addPaths("api", "v1", "users")
 * )
 * UrlBuilder.toString(builder) // "http://localhost:5173/api/v1/users"
 *
 * // Can also be used with no paths
 * const builder2 = UrlBuilder.make("http://localhost:5173").pipe(
 *   UrlBuilder.addPaths()
 * )
 * UrlBuilder.toString(builder2) // "http://localhost:5173"
 * ```
 *
 * @since 1.0.0
 * @category combinators
 */
export const addPaths =
  (...paths: Array<string>) =>
  (self: UrlBuilder): UrlBuilder => {
    const newPaths = [...self.paths, ...paths] as unknown as NonEmptyReadonlyArray<string>
    return make(self.root, newPaths.length === 0 ? undefined : newPaths)
  }

/**
 * Type guard to check if a value is a `UrlBuilder` instance.
 *
 * **Syntax**
 *
 * ```ts
 * if (UrlBuilder.isUrlBuilder(value)) {
 *   // value is a UrlBuilder
 * }
 * ```
 *
 * @example
 * ```ts
 * import * as UrlBuilder from "@org/domain/UrlBuilder"
 *
 * const builder = UrlBuilder.make("http://localhost:5173")
 * UrlBuilder.isUrlBuilder(builder) // true
 *
 * UrlBuilder.isUrlBuilder({}) // false
 * UrlBuilder.isUrlBuilder(null) // false
 * UrlBuilder.isUrlBuilder({ root: "http://localhost:5173" }) // false
 * ```
 *
 * @since 1.0.0
 * @category guards
 */
export const isUrlBuilder = (u: unknown): u is UrlBuilder =>
  typeof u === "object" && u !== null && TypeId in u

/**
 * Sets a single URL parameter, replacing any existing values for the same key.
 * If the value is null or undefined, the parameter will be removed.
 *
 * **Syntax**
 *
 * ```ts
 * const newBuilder = pipe(builder, UrlBuilder.setParam(key, value))
 * // or
 * const newBuilder = builder.pipe(UrlBuilder.setParam(key, value))
 * ```
 *
 * @example
 * ```ts
 * import * as UrlBuilder from "@org/domain/UrlBuilder"
 *
 * const builder = UrlBuilder.make("http://localhost:5173").pipe(
 *   UrlBuilder.setParam("page", 1),
 *   UrlBuilder.setParam("limit", 10)
 * )
 * UrlBuilder.toString(builder) // "http://localhost:5173?page=1&limit=10"
 *
 * // Remove a parameter by setting it to null
 * const builder2 = builder.pipe(UrlBuilder.setParam("page", null))
 * UrlBuilder.toString(builder2) // "http://localhost:5173?limit=10"
 * ```
 *
 * @since 1.0.0
 * @category combinators
 */
export const setParam =
  (key: string, value: Coercible) =>
  (self: UrlBuilder): UrlBuilder => {
    const newParams = new URLSearchParams(self.params)
    if (value == null) {
      newParams.delete(key)
    } else {
      newParams.set(key, String(value))
    }
    return make(
      self.root,
      self.paths.length === 0 ? undefined : (self.paths as NonEmptyArray<string>),
      newParams,
    )
  }

/**
 * Appends a URL parameter value, preserving any existing values for the same key.
 * If the value is null or undefined, the builder remains unchanged.
 *
 * **Syntax**
 *
 * ```ts
 * const newBuilder = pipe(builder, UrlBuilder.appendParam(key, value))
 * // or
 * const newBuilder = builder.pipe(UrlBuilder.appendParam(key, value))
 * ```
 *
 * @example
 * ```ts
 * import * as UrlBuilder from "@org/domain/UrlBuilder"
 *
 * const builder = UrlBuilder.make("http://localhost:5173").pipe(
 *   UrlBuilder.appendParam("tag", "typescript"),
 *   UrlBuilder.appendParam("tag", "effect")
 * )
 * UrlBuilder.toString(builder) // "http://localhost:5173?tag=typescript&tag=effect"
 * ```
 *
 * @since 1.0.0
 * @category combinators
 */
export const appendParam =
  (key: string, value: Coercible) =>
  (self: UrlBuilder): UrlBuilder => {
    if (value == null) return self
    const newParams = new URLSearchParams(self.params)
    newParams.append(key, String(value))
    return make(
      self.root,
      self.paths.length === 0 ? undefined : (self.paths as NonEmptyArray<string>),
      newParams,
    )
  }

/**
 * Sets multiple URL parameters at once, replacing all existing parameters.
 *
 * **Syntax**
 *
 * ```ts
 * const newBuilder = pipe(builder, UrlBuilder.setParams(params))
 * // or
 * const newBuilder = builder.pipe(UrlBuilder.setParams(params))
 * ```
 *
 * @example
 * ```ts
 * import * as UrlBuilder from "@org/domain/UrlBuilder"
 *
 * const builder = UrlBuilder.make("http://localhost:5173").pipe(
 *   UrlBuilder.setParams({
 *     page: 1,
 *     limit: 10,
 *     sort: "desc"
 *   })
 * )
 * UrlBuilder.toString(builder) // "http://localhost:5173?page=1&limit=10&sort=desc"
 *
 * // Using an iterable
 * const params = new Map([["page", "1"], ["limit", "10"]])
 * const builder2 = builder.pipe(UrlBuilder.setParams(params))
 * UrlBuilder.toString(builder2) // "http://localhost:5173?page=1&limit=10"
 * ```
 *
 * @since 1.0.0
 * @category combinators
 */
export const setParams =
  (input: Parameters<typeof fromInput>[0]) =>
  (self: UrlBuilder): UrlBuilder => {
    const newParams = fromInput(input)
    return make(
      self.root,
      self.paths.length === 0 ? undefined : (self.paths as NonEmptyArray<string>),
      newParams,
    )
  }

/**
 * Converts a `UrlBuilder` instance to its string representation.
 * This is an alias for `build`.
 *
 * **Syntax**
 *
 * ```ts
 * const url = UrlBuilder.toString(builder)
 * ```
 *
 * @example
 * ```ts
 * import * as UrlBuilder from "@org/domain/UrlBuilder"
 *
 * const builder = UrlBuilder.make("http://localhost:5173").pipe(
 *   UrlBuilder.addPath("api")
 * )
 * UrlBuilder.toString(builder) // "http://localhost:5173/api"
 * ```
 *
 * @since 1.0.0
 * @category getters
 */
export const toString = (self: UrlBuilder): string => {
  const path = self.paths.length === 0 ? self.root : `${self.root}/${self.paths.join("/")}`
  const query = self.params.toString()
  return query === "" ? path : `${path}?${query}`
}

/**
 * Converts a `UrlBuilder` instance to a `URL` object.
 *
 * **Syntax**
 *
 * ```ts
 * const url = UrlBuilder.toURL(builder)
 * ```
 *
 * @example
 * ```ts
 * import * as UrlBuilder from "@org/domain/UrlBuilder"
 *
 * const builder = UrlBuilder.make("http://localhost:5173").pipe(
 *   UrlBuilder.addPath("api"),
 *   UrlBuilder.setParam("version", "1")
 * )
 * const url = UrlBuilder.toURL(builder)
 * url.pathname // "/api"
 * url.searchParams.get("version") // "1"
 * ```
 *
 * @since 1.0.0
 * @category getters
 */
export const toURL = (self: UrlBuilder): URL => new URL(toString(self))
