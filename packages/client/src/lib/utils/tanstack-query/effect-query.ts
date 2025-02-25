import { type LiveRuntimeContext } from "@/layers/live-layer"
import { useRuntime } from "@/layers/runtime/use-runtime"
import {
  type QueryFunction,
  type QueryFunctionContext,
  skipToken,
  useMutation,
  type UseMutationOptions,
  type UseMutationResult,
  useQuery,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query"
import * as Cause from "effect/Cause"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as React from "react"

/**
 * @internal
 */
const useRunner = () => {
  const runtime = useRuntime()
  return React.useCallback(
    <A, E, R extends LiveRuntimeContext>(span: string) =>
      (effect: Effect.Effect<A, E, R>): Promise<A> =>
        effect.pipe(
          Effect.withSpan(span),
          Effect.tapErrorCause(Effect.logError),
          runtime.runPromiseExit,
          async (promise) => {
            const result = await promise
            return Exit.match(result, {
              onSuccess: (value) => Promise.resolve(value),
              onFailure: (cause) => {
                const original = Cause.squash(cause)
                throw original
              },
            })
          },
        ),
    [runtime.runPromiseExit],
  )
}

export type QueryVariables = Record<string, unknown>
export type QueryKey = readonly [string, QueryVariables?]
type EffectfulError = { _tag: string }

type EffectfulMutationOptions<
  TData,
  TError extends EffectfulError,
  TVariables,
  R extends LiveRuntimeContext,
> = Omit<
  UseMutationOptions<TData, Error, TVariables>,
  "mutationFn" | "onSuccess" | "onError" | "onSettled" | "onMutate" | "retry" | "retryDelay"
> & {
  mutationKey: QueryKey
  mutationFn: (variables: TVariables) => Effect.Effect<TData, TError, R>
}

export function useEffectMutation<
  TData,
  TError extends EffectfulError,
  TVariables,
  R extends LiveRuntimeContext,
>(
  options: EffectfulMutationOptions<TData, TError, TVariables, R>,
): UseMutationResult<TData, unknown, TVariables> {
  const effectRunner = useRunner()
  const [spanName] = options.mutationKey

  const mutationFn = React.useCallback(
    (variables: TVariables) => {
      const effect = options.mutationFn(variables)
      return effect.pipe(effectRunner(spanName))
    },
    [effectRunner, spanName, options],
  )

  return useMutation<TData, Error, TVariables>({
    ...options,
    mutationFn,
  })
}

type EffectfulQueryFunction<
  TData,
  TError,
  R extends LiveRuntimeContext,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = never,
> = (context: QueryFunctionContext<TQueryKey, TPageParam>) => Effect.Effect<TData, TError, R>

type EffectfulQueryOptions<
  TData,
  TError,
  R extends LiveRuntimeContext,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = never,
> = Omit<
  UseQueryOptions<TData, Error, TData, TQueryKey>,
  "queryKey" | "queryFn" | "retry" | "retryDelay" | "staleTime" | "gcTime"
> & {
  queryKey: TQueryKey
  queryFn: EffectfulQueryFunction<TData, TError, R, TQueryKey, TPageParam> | typeof skipToken
  staleTime?: Duration.DurationInput
  gcTime?: Duration.DurationInput
}

export function useEffectQuery<
  TData,
  TError extends EffectfulError,
  R extends LiveRuntimeContext,
  TQueryKey extends QueryKey = QueryKey,
>({
  gcTime,
  staleTime,
  ...options
}: EffectfulQueryOptions<TData, TError, R, TQueryKey>): UseQueryResult<TData, unknown> {
  const effectRunner = useRunner()
  const [spanName] = options.queryKey

  const queryFn: QueryFunction<TData, TQueryKey> = React.useCallback(
    (context: QueryFunctionContext<TQueryKey>) => {
      const effect = (options.queryFn as EffectfulQueryFunction<TData, TError, R, TQueryKey>)(
        context,
      )
      return effect.pipe(effectRunner(spanName))
    },
    [effectRunner, spanName, options],
  )

  const queryOptions: UseQueryOptions<TData, Error, TData, TQueryKey> = {
    ...options,
    queryFn: options.queryFn === skipToken ? skipToken : queryFn,
    ...(staleTime !== undefined && { staleTime: Duration.toMillis(staleTime) }),
    ...(gcTime !== undefined && { gcTime: Duration.toMillis(gcTime) }),
  }

  return useQuery(queryOptions)
}
