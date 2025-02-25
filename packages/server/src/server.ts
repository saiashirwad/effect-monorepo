import * as NodeSdk from "@effect/opentelemetry/NodeSdk"
import { BunHttpServer, BunRuntime } from "@effect/platform-bun"
import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder"
import * as HttpMiddleware from "@effect/platform/HttpMiddleware"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base"
import * as dotenv from "dotenv"
import * as Cause from "effect/Cause"
import * as ConfigError from "effect/ConfigError"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schedule from "effect/Schedule"
import { createServer } from "node:http"
import { Database } from "../../database/src/Database.js"
import { Api } from "./api.js"
import { DatabaseLive } from "./common/database.js"
import { EnvVars } from "./common/env-vars.js"
import { MeLive } from "./public/me/me-live.js"
import { UserAuthMiddlewareLive } from "./public/middlewares/auth-middleware-live.js"

dotenv.config({
  path: "../../.env",
})

const ApiLive = HttpApiBuilder.api(Api).pipe(
  Layer.provide([MeLive]),
  Layer.provide([UserAuthMiddlewareLive]),
)

const NodeSdkLive = Layer.unwrapEffect(
  EnvVars.OTLP_URL.pipe(
    Effect.map((url) =>
      NodeSdk.layer(() => ({
        resource: {
          serviceName: "effect-monorepo-server",
        },
        spanProcessor: new BatchSpanProcessor(
          new OTLPTraceExporter({
            url: url.toString(),
          }),
        ),
      })),
    ),
  ),
)

const CorsLive = Layer.unwrapEffect(
  EnvVars.pipe(
    Effect.map((envVars) => {
      return HttpApiBuilder.middlewareCors({
        allowedOrigins: [envVars.ENV === "dev" ? "*" : envVars.APP_URL],
        allowedMethods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        allowedHeaders: ["Content-Type", "Authorization", "B3", "traceparent"],
        credentials: true,
      })
    }),
  ),
)

const HttpLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
  Layer.provide(CorsLive),
  Layer.provide(ApiLive),
  Layer.merge(Layer.effectDiscard(Database.pipe(Effect.tap((db) => db.setupConnectionListeners)))),
  Layer.provide(DatabaseLive),
  Layer.provide(NodeSdkLive),
  Layer.provide(EnvVars.Default),
  Layer.provide(BunHttpServer.layer(createServer)),
)

Layer.launch(HttpLive).pipe(
  Effect.tapErrorCause(Effect.logError),
  Effect.catchAllCause((cause) =>
    Effect.fail(new Cause.UnknownException(cause)).pipe(
      Effect.unless(() => ConfigError.isConfigError(Cause.squash(cause))),
    ),
  ),
  Effect.retry({
    schedule: Schedule.jittered(Schedule.spaced("2 seconds")).pipe(
      Schedule.tapOutput(() => Effect.logWarning(`[Server crashed]: Recreating server...`)),
    ),
  }),
  BunRuntime.runMain({}),
)
