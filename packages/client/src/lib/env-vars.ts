import * as Either from "effect/Either"
import { pipe } from "effect/Function"
import { TreeFormatter } from "effect/ParseResult"
import * as Schema from "effect/Schema"

const EnvVars = Schema.Struct({
  API_URL: Schema.URL,
})

export const envVars = pipe(
  {
    API_URL: import.meta.env.VITE_PUBLIC_API_URL,
  } satisfies Record<keyof typeof EnvVars.Encoded, string>,
  Schema.decodeUnknownEither(EnvVars),
  Either.getOrElse((parseIssue) => {
    throw new Error(
      `❌ Invalid environment variables: ${TreeFormatter.formatErrorSync(parseIssue)}`,
    )
  }),
)
