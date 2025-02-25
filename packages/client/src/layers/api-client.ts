import { envVars } from "@/lib/env-vars"
import * as FetchHttpClient from "@effect/platform/FetchHttpClient"
import * as HttpApiClient from "@effect/platform/HttpApiClient"
import * as HttpClient from "@effect/platform/HttpClient"
import { DomainApi } from "@org/domain/DomainApi"
import * as Effect from "effect/Effect"

export class ApiClient extends Effect.Service<ApiClient>()("ApiClient", {
  accessors: true,
  dependencies: [FetchHttpClient.layer],
  effect: HttpApiClient.make(DomainApi, {
    baseUrl: envVars.API_URL.toString(),
    transformClient: (client) => client.pipe(HttpClient.retryTransient({ times: 3 })),
  }),
}) {}
