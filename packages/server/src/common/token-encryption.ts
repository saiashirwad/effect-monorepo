import * as Effect from "effect/Effect"
import { flow } from "effect/Function"
import * as Layer from "effect/Layer"
import * as ParseResult from "effect/ParseResult"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as crypto from "node:crypto"

export const make = (encryptionKey: Redacted.Redacted, algorithm: crypto.CipherGCMTypes) => {
  const keyLength = algorithm.startsWith("aes-128") ? 16 : 32
  const normalizedKey = crypto
    .createHash("sha256")
    .update(Redacted.value(encryptionKey))
    .digest()
    .subarray(0, keyLength)

  return {
    encryptToken: (token: Redacted.Redacted) =>
      Effect.sync(() => {
        const iv = crypto.randomBytes(16)
        const cipher = crypto.createCipheriv(algorithm, normalizedKey, iv)

        const encrypted = Buffer.concat([
          cipher.update(Redacted.value(token), "utf8"),
          cipher.final(),
        ])

        const authTag = cipher.getAuthTag()

        return {
          encryptedData: Buffer.concat([encrypted, authTag]).toString("base64"),
          iv: iv.toString("base64"),
        }
      }).pipe(Effect.withSpan("TokenEncryption.encryptToken")),

    decryptToken: (encryptedData: string, iv: string) =>
      Effect.sync(() => {
        const decipher = crypto.createDecipheriv(
          algorithm,
          normalizedKey,
          Buffer.from(iv, "base64"),
        )

        const encryptedBuffer = Buffer.from(encryptedData, "base64")
        const authTag = encryptedBuffer.subarray(-16)
        const data = encryptedBuffer.subarray(0, -16)

        decipher.setAuthTag(authTag)

        return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8")
      }).pipe(Effect.withSpan("TokenEncryption.decryptToken")),
  }
}

export const EncryptedTokenSchema = Schema.TemplateLiteral(
  Schema.String.pipe(Schema.brand("encryptedData")),
  Schema.Literal("|"),
  Schema.String.pipe(Schema.brand("iv")),
).pipe(
  Schema.transform(
    Schema.Struct({
      encryptedData: Schema.String,
      iv: Schema.String,
    }),
    {
      strict: false,
      decode: (value) => {
        const [encryptedData, iv] = value.split("|")
        return { encryptedData, iv }
      },
      encode: ({ encryptedData, iv }) => `${encryptedData}|${iv}`,
    },
  ),
)

export const makeSchema = <A, I, R>(opts: {
  schema: Schema.Schema<A, I, R>
  encryptionKey: Redacted.Redacted
  algorithm: crypto.CipherGCMTypes
}) => {
  const encryption = make(opts.encryptionKey, opts.algorithm)

  const JsonSchema = Schema.Redacted(Schema.parseJson(opts.schema))

  return Schema.transformOrFail(EncryptedTokenSchema, JsonSchema, {
    strict: true,
    decode: ({ encryptedData, iv }, _, ast) =>
      encryption
        .decryptToken(encryptedData, iv)
        .pipe(
          Effect.catchAll(() =>
            Effect.fail(
              new ParseResult.Type(ast, { encryptedData, iv }, "Failed to decrypt token"),
            ),
          ),
        ),
    encode: (jsonString) =>
      Effect.map(encryption.encryptToken(Redacted.make(jsonString)), ({ encryptedData, iv }) => ({
        encryptedData,
        iv,
      })),
  })
}

export class TokenEncryption extends Effect.Tag("TokenEncryption")<
  TokenEncryption,
  ReturnType<typeof make>
>() {}

export const layer = flow(make, Layer.succeed(TokenEncryption))
