import { describe, it } from "@effect/vitest";
import { deepStrictEqual } from "assert";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import * as TokenCipher from "./token-cipher.js";

const TEST_KEY = Redacted.make("test-key-32-chars-exactly-12345678");
const TestCipher = TokenCipher.layer(TEST_KEY, "aes-256-gcm");

describe("TokenCipher", () => {
  describe("encrypt", () => {
    it.effect("should encrypt a token and return base64 encoded data and IV", () =>
      Effect.gen(function* () {
        const tokenCipher = yield* TokenCipher.TokenCipher;
        const token = Redacted.make("my-secret-token");

        const result = yield* tokenCipher.encrypt(token);

        deepStrictEqual(typeof result.encryptedData, "string");
        deepStrictEqual(typeof result.iv, "string");

        deepStrictEqual(
          Buffer.from(result.encryptedData, "base64").toString("base64"),
          result.encryptedData,
        );
        deepStrictEqual(Buffer.from(result.iv, "base64").toString("base64"), result.iv);
      }).pipe(Effect.provide(TestCipher)),
    );

    it.effect("should produce different ciphertexts for the same plaintext due to random IV", () =>
      Effect.gen(function* () {
        const tokenCipher = yield* TokenCipher.TokenCipher;
        const token = Redacted.make("my-secret-token");

        const result1 = yield* tokenCipher.encrypt(token);
        const result2 = yield* tokenCipher.encrypt(token);

        deepStrictEqual(result1.encryptedData !== result2.encryptedData, true);
        deepStrictEqual(result1.iv !== result2.iv, true);
      }).pipe(Effect.provide(TestCipher)),
    );

    it.effect("should handle empty strings", () =>
      Effect.gen(function* () {
        const tokenCipher = yield* TokenCipher.TokenCipher;
        const token = Redacted.make("");

        const result = yield* tokenCipher.encrypt(token);

        deepStrictEqual(typeof result.encryptedData, "string");
        deepStrictEqual(typeof result.iv, "string");
      }).pipe(Effect.provide(TestCipher)),
    );

    it.effect("should handle long strings", () =>
      Effect.gen(function* () {
        const tokenCipher = yield* TokenCipher.TokenCipher;
        const longString = "a".repeat(1000);
        const token = Redacted.make(longString);

        const result = yield* tokenCipher.encrypt(token);

        deepStrictEqual(typeof result.encryptedData, "string");
        deepStrictEqual(typeof result.iv, "string");
      }).pipe(Effect.provide(TestCipher)),
    );
  });

  describe("decryptToken", () => {
    it.effect("should correctly decrypt an encrypted token", () =>
      Effect.gen(function* () {
        const tokenCipher = yield* TokenCipher.TokenCipher;
        const originalToken = Redacted.make("my-secret-token");

        const encrypted = yield* tokenCipher.encrypt(originalToken);
        const decrypted = yield* tokenCipher.decrypt(encrypted.encryptedData, encrypted.iv);

        deepStrictEqual(decrypted, Redacted.value(originalToken));
      }).pipe(Effect.provide(TestCipher)),
    );

    it.effect("should correctly handle empty strings", () =>
      Effect.gen(function* () {
        const tokenCipher = yield* TokenCipher.TokenCipher;
        const originalToken = Redacted.make("");

        const encrypted = yield* tokenCipher.encrypt(originalToken);
        const decrypted = yield* tokenCipher.decrypt(encrypted.encryptedData, encrypted.iv);

        deepStrictEqual(decrypted, "");
      }).pipe(Effect.provide(TestCipher)),
    );

    it.effect("should correctly handle long strings", () =>
      Effect.gen(function* () {
        const tokenCipher = yield* TokenCipher.TokenCipher;
        const longString = "a".repeat(1000);
        const originalToken = Redacted.make(longString);

        const encrypted = yield* tokenCipher.encrypt(originalToken);
        const decrypted = yield* tokenCipher.decrypt(encrypted.encryptedData, encrypted.iv);

        deepStrictEqual(decrypted, longString);
      }).pipe(Effect.provide(TestCipher)),
    );

    it.effect("should fail with invalid IV", () =>
      Effect.gen(function* () {
        const tokenCipher = yield* TokenCipher.TokenCipher;
        const originalToken = Redacted.make("my-secret-token");
        const encrypted = yield* tokenCipher.encrypt(originalToken);

        const invalidIv = Buffer.from("invalid-iv-here").toString("base64");

        const result = yield* tokenCipher
          .decrypt(encrypted.encryptedData, invalidIv)
          .pipe(Effect.exit);

        deepStrictEqual(Exit.isFailure(result), true);
      }).pipe(Effect.provide(TestCipher)),
    );

    it.effect("should fail with invalid encrypted data", () =>
      Effect.gen(function* () {
        const tokenCipher = yield* TokenCipher.TokenCipher;
        const originalToken = Redacted.make("my-secret-token");
        const encrypted = yield* tokenCipher.encrypt(originalToken);

        const invalidData = Buffer.from("invalid-data").toString("base64");

        const result = yield* tokenCipher.decrypt(invalidData, encrypted.iv).pipe(Effect.exit);

        deepStrictEqual(Exit.isFailure(result), true);
      }).pipe(Effect.provide(TestCipher)),
    );

    it.effect("should fail with mismatched IV and encrypted data", () =>
      Effect.gen(function* () {
        const tokenCipher = yield* TokenCipher.TokenCipher;
        const token1 = Redacted.make("first-token");
        const token2 = Redacted.make("second-token");

        const encrypted1 = yield* tokenCipher.encrypt(token1);
        const encrypted2 = yield* tokenCipher.encrypt(token2);

        const result = yield* tokenCipher
          .decrypt(encrypted1.encryptedData, encrypted2.iv)
          .pipe(Effect.exit);

        deepStrictEqual(Exit.isFailure(result), true);
      }).pipe(Effect.provide(TestCipher)),
    );
  });

  describe("encryption properties", () => {
    it.effect("should produce different ciphertexts for different plaintexts", () =>
      Effect.gen(function* () {
        const tokenCipher = yield* TokenCipher.TokenCipher;
        const token1 = Redacted.make("first-token");
        const token2 = Redacted.make("second-token");

        const encrypted1 = yield* tokenCipher.encrypt(token1);
        const encrypted2 = yield* tokenCipher.encrypt(token2);

        deepStrictEqual(encrypted1.encryptedData !== encrypted2.encryptedData, true);
      }).pipe(Effect.provide(TestCipher)),
    );

    it.effect("should maintain data integrity through encryption and decryption cycles", () =>
      Effect.gen(function* () {
        const tokenCipher = yield* TokenCipher.TokenCipher;
        const testCases = [
          "simple token",
          "",
          "a".repeat(1000),
          "special chars: !@#$%^&*()",
          "unicode: 你好世界",
          "numbers: 12345",
          "mixed: abc123!@#",
        ].map(Redacted.make);

        for (const token of testCases) {
          const encrypted = yield* tokenCipher.encrypt(token);
          const decrypted = yield* tokenCipher.decrypt(encrypted.encryptedData, encrypted.iv);

          deepStrictEqual(decrypted, Redacted.value(token));
        }
      }).pipe(Effect.provide(TestCipher)),
    );
  });

  describe("makeEncryptedTokenSchema", () => {
    it.effect("should correctly encode and decode data through the schema", () =>
      Effect.gen(function* () {
        const TestData = Schema.Struct({
          id: Schema.Number,
          name: Schema.String,
        });

        const schema = TokenCipher.makeSchema({
          schema: TestData,
          encryptionKey: TEST_KEY,
          algorithm: "aes-256-gcm",
        });
        const testData = { id: 123, name: "test" };

        const encoded = yield* Schema.encode(schema)(Redacted.make(testData));

        deepStrictEqual(typeof encoded, "string");
        deepStrictEqual(encoded.includes("|"), true);

        const decoded = Redacted.value(yield* Schema.decode(schema)(encoded));

        deepStrictEqual(decoded, testData);
      }),
    );

    it.effect("should handle complex data structures", () =>
      Effect.gen(function* () {
        const ComplexData = Schema.Struct({
          nested: Schema.Struct({
            array: Schema.Array(Schema.Number),
            optional: Schema.optional(Schema.String),
          }),
          date: Schema.String,
        });

        const schema = TokenCipher.makeSchema({
          schema: ComplexData,
          encryptionKey: TEST_KEY,
          algorithm: "aes-256-gcm",
        });
        const testData = {
          nested: {
            array: [1, 2, 3],
            optional: "test",
          },
          date: "2024-03-20",
        };

        const encoded = yield* Schema.encode(schema)(Redacted.make(testData));
        deepStrictEqual(typeof encoded, "string");
        deepStrictEqual(encoded.includes("|"), true);

        const decoded = Redacted.value(yield* Schema.decode(schema)(encoded));

        deepStrictEqual(decoded, testData);
      }),
    );

    it.effect("should fail when decrypting with invalid data", () =>
      Effect.gen(function* () {
        const TestData = Schema.Struct({
          id: Schema.Number,
        });

        const schema = TokenCipher.makeSchema({
          schema: TestData,
          encryptionKey: TEST_KEY,
          algorithm: "aes-256-gcm",
        });

        const result = yield* Schema.decode(schema)(
          "invalid-data|invalid-iv" as typeof TokenCipher.EncryptedTokenSchema.Encoded,
        ).pipe(Effect.exit);

        deepStrictEqual(Exit.isFailure(result), true);
      }),
    );

    it.effect("should fail when decoding invalid JSON after decryption", () =>
      Effect.gen(function* () {
        const TestData = Schema.Struct({
          id: Schema.Number,
        });

        const differentKey = Redacted.make("different-key-32-chars-exactly-123");
        const schema1 = TokenCipher.makeSchema({
          schema: TestData,
          encryptionKey: TEST_KEY,
          algorithm: "aes-256-gcm",
        });
        const schema2 = TokenCipher.makeSchema({
          schema: TestData,
          encryptionKey: differentKey,
          algorithm: "aes-256-gcm",
        });
        const encoded = yield* Schema.encode(schema1)(Redacted.make({ id: 123 }));
        deepStrictEqual(typeof encoded, "string");
        deepStrictEqual(encoded.includes("|"), true);

        const result = yield* Schema.decode(schema2)(encoded).pipe(Effect.exit);

        deepStrictEqual(Exit.isFailure(result), true);
      }),
    );

    it.effect("should handle empty objects", () =>
      Effect.gen(function* () {
        const EmptyStruct = Schema.Struct({});
        const schema = TokenCipher.makeSchema({
          schema: EmptyStruct,
          encryptionKey: TEST_KEY,
          algorithm: "aes-256-gcm",
        });
        const testData = {};

        const encoded = yield* Schema.encode(schema)(Redacted.make(testData));
        deepStrictEqual(typeof encoded, "string");
        deepStrictEqual(encoded.includes("|"), true);

        const decoded = Redacted.value(yield* Schema.decode(schema)(encoded));

        deepStrictEqual(decoded, testData);
      }),
    );

    it.effect("should use the specified encryption algorithm", () =>
      Effect.gen(function* () {
        const TestData = Schema.Struct({
          id: Schema.Number,
        });

        const schema = TokenCipher.makeSchema({
          schema: TestData,
          encryptionKey: TEST_KEY,
          algorithm: "aes-128-gcm",
        });

        const testData = { id: 123 };
        const encoded = yield* Schema.encode(schema)(Redacted.make(testData));
        deepStrictEqual(typeof encoded, "string");
        deepStrictEqual(encoded.includes("|"), true);

        const decoded = Redacted.value(yield* Schema.decode(schema)(encoded));

        deepStrictEqual(decoded, testData);
      }),
    );
  });
});
