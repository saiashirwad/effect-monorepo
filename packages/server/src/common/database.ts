import { Database } from "@org/database";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { EnvVars } from "./env-vars.js";

export const DatabaseLive = Layer.unwrapEffect(
  EnvVars.pipe(
    Effect.map((envVars) =>
      Database.layer({
        url: envVars.DATABASE_URL,
        ssl: envVars.ENV === "prod",
      }),
    ),
  ),
).pipe(Layer.provide(EnvVars.Default));
