import { describe, expect, it } from "vitest"
import * as UrlBuilder from "../src/UrlBuilder.js"

describe("UrlBuilder", () => {
  describe("constructors", () => {
    it("should create a new UrlBuilder with make", () => {
      const builder = UrlBuilder.make("http://localhost:5173")
      expect(UrlBuilder.isUrlBuilder(builder)).toBe(true)
      expect(UrlBuilder.toString(builder)).toBe("http://localhost:5173")
    })

    it("should create a new UrlBuilder with setRoot", () => {
      const builder = UrlBuilder.setRoot("http://localhost:5173")
      expect(UrlBuilder.isUrlBuilder(builder)).toBe(true)
      expect(UrlBuilder.toString(builder)).toBe("http://localhost:5173")
    })

    it("should remove trailing slash from root", () => {
      const builder = UrlBuilder.make("http://localhost:5173/")
      expect(UrlBuilder.toString(builder)).toBe("http://localhost:5173")
    })

    it("should accept initial paths as array", () => {
      const builder = UrlBuilder.make("http://localhost:5173", ["api", "v1"])
      expect(UrlBuilder.toString(builder)).toBe("http://localhost:5173/api/v1")
    })

    it("should accept initial path as string", () => {
      const builder = UrlBuilder.make("http://localhost:5173", "api")
      expect(UrlBuilder.toString(builder)).toBe("http://localhost:5173/api")
    })

    it("should accept initial params as object", () => {
      const builder = UrlBuilder.make("http://localhost:5173", undefined, { page: 1, limit: 10 })
      expect(UrlBuilder.toString(builder)).toBe("http://localhost:5173?page=1&limit=10")
    })

    it("should accept initial params as URLSearchParams", () => {
      const params = new URLSearchParams()
      params.set("page", "1")
      params.set("limit", "10")
      const builder = UrlBuilder.make("http://localhost:5173", undefined, params)
      expect(UrlBuilder.toString(builder)).toBe("http://localhost:5173?page=1&limit=10")
    })

    it("should accept initial params as iterable", () => {
      const params = new Map([
        ["page", "1"],
        ["limit", "10"],
      ])
      const builder = UrlBuilder.make("http://localhost:5173", undefined, params)
      expect(UrlBuilder.toString(builder)).toBe("http://localhost:5173?page=1&limit=10")
    })
  })

  describe("path manipulation", () => {
    it("should add a single path", () => {
      const builder = UrlBuilder.make("http://localhost:5173").pipe(UrlBuilder.addPath("api"))
      expect(UrlBuilder.toString(builder)).toBe("http://localhost:5173/api")
    })

    it("should add multiple paths", () => {
      const builder = UrlBuilder.make("http://localhost:5173").pipe(
        UrlBuilder.addPaths("api", "v1", "users"),
      )
      expect(UrlBuilder.toString(builder)).toBe("http://localhost:5173/api/v1/users")
    })

    it("should chain path additions", () => {
      const builder = UrlBuilder.make("http://localhost:5173").pipe(
        UrlBuilder.addPath("api"),
        UrlBuilder.addPath("v1"),
        UrlBuilder.addPath("users"),
      )
      expect(UrlBuilder.toString(builder)).toBe("http://localhost:5173/api/v1/users")
    })

    it("should handle empty paths array", () => {
      const builder = UrlBuilder.make("http://localhost:5173").pipe(UrlBuilder.addPaths())
      expect(UrlBuilder.toString(builder)).toBe("http://localhost:5173")
    })
  })

  describe("parameter manipulation", () => {
    it("should set a single parameter", () => {
      const builder = UrlBuilder.make("http://localhost:5173").pipe(UrlBuilder.setParam("page", 1))
      expect(UrlBuilder.toString(builder)).toBe("http://localhost:5173?page=1")
    })

    it("should replace existing parameter value", () => {
      const builder = UrlBuilder.make("http://localhost:5173").pipe(
        UrlBuilder.setParam("page", 1),
        UrlBuilder.setParam("page", 2),
      )
      expect(UrlBuilder.toString(builder)).toBe("http://localhost:5173?page=2")
    })

    it("should remove parameter when value is null", () => {
      const builder = UrlBuilder.make("http://localhost:5173").pipe(
        UrlBuilder.setParam("page", 1),
        UrlBuilder.setParam("page", null),
      )
      expect(UrlBuilder.toString(builder)).toBe("http://localhost:5173")
    })

    it("should remove parameter when value is undefined", () => {
      const builder = UrlBuilder.make("http://localhost:5173").pipe(
        UrlBuilder.setParam("page", 1),
        UrlBuilder.setParam("page", undefined),
      )
      expect(UrlBuilder.toString(builder)).toBe("http://localhost:5173")
    })

    it("should append parameter value", () => {
      const builder = UrlBuilder.make("http://localhost:5173").pipe(
        UrlBuilder.appendParam("tag", "typescript"),
        UrlBuilder.appendParam("tag", "effect"),
      )
      expect(UrlBuilder.toString(builder)).toBe("http://localhost:5173?tag=typescript&tag=effect")
    })

    it("should ignore append when value is null", () => {
      const builder = UrlBuilder.make("http://localhost:5173").pipe(
        UrlBuilder.appendParam("tag", "typescript"),
        UrlBuilder.appendParam("tag", null),
      )
      expect(UrlBuilder.toString(builder)).toBe("http://localhost:5173?tag=typescript")
    })

    it("should set multiple parameters", () => {
      const builder = UrlBuilder.make("http://localhost:5173").pipe(
        UrlBuilder.setParams({
          page: 1,
          limit: 10,
          sort: "desc",
        }),
      )
      expect(UrlBuilder.toString(builder)).toBe("http://localhost:5173?page=1&limit=10&sort=desc")
    })

    it("should replace all existing parameters when setting multiple", () => {
      const builder = UrlBuilder.make("http://localhost:5173").pipe(
        UrlBuilder.setParam("existing", "value"),
        UrlBuilder.setParams({
          page: 1,
          limit: 10,
        }),
      )
      expect(UrlBuilder.toString(builder)).toBe("http://localhost:5173?page=1&limit=10")
    })

    it("should handle array values in parameters", () => {
      const builder = UrlBuilder.make("http://localhost:5173").pipe(
        UrlBuilder.setParams({
          tags: ["typescript", "effect"],
        }),
      )
      expect(UrlBuilder.toString(builder)).toBe("http://localhost:5173?tags=typescript&tags=effect")
    })

    it("should combine paths and parameters", () => {
      const builder = UrlBuilder.make("http://localhost:5173").pipe(
        UrlBuilder.addPath("api"),
        UrlBuilder.addPath("users"),
        UrlBuilder.setParam("page", 1),
        UrlBuilder.setParam("limit", 10),
      )
      expect(UrlBuilder.toString(builder)).toBe("http://localhost:5173/api/users?page=1&limit=10")
    })
  })

  describe("URL conversion", () => {
    it("should convert to URL object", () => {
      const builder = UrlBuilder.make("http://localhost:5173").pipe(
        UrlBuilder.addPath("api"),
        UrlBuilder.setParam("version", "1"),
      )
      const url = UrlBuilder.toURL(builder)
      expect(url).toBeInstanceOf(URL)
      expect(url.href).toBe("http://localhost:5173/api?version=1")
      expect(url.pathname).toBe("/api")
      expect(url.searchParams.get("version")).toBe("1")
    })

    it("should preserve all parameters in URL object", () => {
      const builder = UrlBuilder.make("http://localhost:5173").pipe(
        UrlBuilder.setParams({
          page: 1,
          limit: 10,
          sort: "desc",
        }),
      )
      const url = UrlBuilder.toURL(builder)
      expect(url.searchParams.get("page")).toBe("1")
      expect(url.searchParams.get("limit")).toBe("10")
      expect(url.searchParams.get("sort")).toBe("desc")
    })

    it("should handle multiple values for same parameter in URL object", () => {
      const builder = UrlBuilder.make("http://localhost:5173").pipe(
        UrlBuilder.appendParam("tag", "typescript"),
        UrlBuilder.appendParam("tag", "effect"),
      )
      const url = UrlBuilder.toURL(builder)
      expect(Array.from(url.searchParams.getAll("tag"))).toEqual(["typescript", "effect"])
    })
  })

  describe("pipe method", () => {
    it("should support method chaining with pipe", () => {
      const builder = UrlBuilder.make("http://localhost:5173").pipe(
        UrlBuilder.addPath("api"),
        UrlBuilder.addPaths("v1", "users"),
      )
      expect(UrlBuilder.toString(builder)).toBe("http://localhost:5173/api/v1/users")
    })

    it("should support native toString() method", () => {
      const builder = UrlBuilder.make("http://localhost:5173").pipe(
        UrlBuilder.addPath("api"),
        UrlBuilder.addPaths("v1", "users"),
      )
      expect(builder.toString()).toBe("http://localhost:5173/api/v1/users")
      expect(String(builder)).toBe("http://localhost:5173/api/v1/users")
      expect(`${builder}`).toBe("http://localhost:5173/api/v1/users")
    })
  })

  describe("type guards", () => {
    it("should identify valid UrlBuilder instances", () => {
      const builder = UrlBuilder.make("http://localhost:5173")
      expect(UrlBuilder.isUrlBuilder(builder)).toBe(true)
    })

    it("should reject non-UrlBuilder values", () => {
      expect(UrlBuilder.isUrlBuilder(null)).toBe(false)
      expect(UrlBuilder.isUrlBuilder(undefined)).toBe(false)
      expect(UrlBuilder.isUrlBuilder({})).toBe(false)
      expect(UrlBuilder.isUrlBuilder({ root: "http://localhost:5173" })).toBe(false)
    })
  })

  describe("edge cases", () => {
    it("should handle root URLs with multiple trailing slashes", () => {
      const builder = UrlBuilder.make("http://localhost:5173///").pipe(UrlBuilder.addPath("api"))
      expect(UrlBuilder.toString(builder)).toBe("http://localhost:5173/api")
    })

    it("should handle empty string paths", () => {
      const builder = UrlBuilder.make("http://localhost:5173").pipe(UrlBuilder.addPath(""))
      expect(UrlBuilder.toString(builder)).toBe("http://localhost:5173/")
    })

    it("should handle special characters in parameters", () => {
      const builder = UrlBuilder.make("http://localhost:5173").pipe(
        UrlBuilder.setParam("q", "hello world"),
        UrlBuilder.setParam("filter", "status=active"),
      )
      expect(UrlBuilder.toString(builder)).toBe(
        "http://localhost:5173?q=hello+world&filter=status%3Dactive",
      )
    })

    it("should handle empty parameters", () => {
      const builder = UrlBuilder.make("http://localhost:5173").pipe(
        UrlBuilder.setParam("empty", ""),
      )
      expect(UrlBuilder.toString(builder)).toBe("http://localhost:5173?empty=")
    })

    it("should handle boolean parameters", () => {
      const builder = UrlBuilder.make("http://localhost:5173").pipe(
        UrlBuilder.setParam("active", true),
        UrlBuilder.setParam("deleted", false),
      )
      expect(UrlBuilder.toString(builder)).toBe("http://localhost:5173?active=true&deleted=false")
    })

    it("should handle numeric parameters", () => {
      const builder = UrlBuilder.make("http://localhost:5173").pipe(
        UrlBuilder.setParam("int", 42),
        UrlBuilder.setParam("float", 3.14),
      )
      expect(UrlBuilder.toString(builder)).toBe("http://localhost:5173?int=42&float=3.14")
    })
  })
})
