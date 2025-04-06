import { type LiveRuntimeContext } from "@/layers/live-layer";
import { useRuntime } from "@/layers/runtime/use-runtime";
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
} from "@tanstack/react-query";
import * as Cause from "effect/Cause";
import * as Data from "effect/Data";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Predicate from "effect/Predicate";
import * as React from "react";
import { toast } from "sonner";

export class QueryDefect extends Data.TaggedError("QueryDefect")<{
  cause: unknown;
}> {}

const hasStringMessage = Predicate.compose(
  Predicate.isRecord,
  Predicate.compose(
    Predicate.hasProperty("message"),
    Predicate.struct({ message: Predicate.isString }),
  ),
);

type EffectfulError = { _tag: string };
type ErrorTagHandler<E extends EffectfulError> = (error: Extract<E, { _tag: string }>) => string;
type ToastifyErrorsConfig<E extends EffectfulError> = {
  [K in E["_tag"]]?: ErrorTagHandler<E>;
} & {
  orElse?: boolean | string | "extractMessage";
};

type UseRunnerOpts<A, E extends EffectfulError> = {
  toastifyDefects?: boolean | string;
  toastifyErrors?: ToastifyErrorsConfig<E>;
  toastifySuccess?: (result: A) => string;
};

const DEFAULT_ERROR_MESSAGE = "Something went wrong";
const DEFAULT_DEFECT_MESSAGE = "An unexpected error occurred";

/**
 * @internal
 */
const useRunner = <A, E extends EffectfulError, R extends LiveRuntimeContext>({
  toastifyDefects = true,
  toastifyErrors = {},
  toastifySuccess,
}: UseRunnerOpts<NoInfer<A>, NoInfer<E>> = {}): ((
  span: string,
) => (self: Effect.Effect<A, E, R>) => Promise<A>) => {
  const runtime = useRuntime();

  return React.useCallback(
    (span: string) =>
      (self: Effect.Effect<A, E, R>): Promise<A> => {
        const { orElse = true, ...tagConfigs } = toastifyErrors;

        return self
          .pipe(
            Effect.tapError((error) =>
              Effect.sync(() => {
                const errorTag = error._tag as keyof typeof tagConfigs;
                const tagHandler = tagConfigs[errorTag];

                if (tagHandler !== undefined) {
                  const message = tagHandler(error as Extract<E, { _tag: string }>);
                  toast.error(message);
                  return;
                } else if (orElse !== false) {
                  if (orElse === "extractMessage" && hasStringMessage(error)) {
                    toast.error(error.message);
                  } else if (typeof orElse === "string") {
                    toast.error(orElse);
                  } else {
                    // orElse === true, use default message
                    toast.error(DEFAULT_ERROR_MESSAGE);
                  }
                }
              }),
            ),
            Effect.tap((result) => {
              if (toastifySuccess !== undefined) {
                toast.success(toastifySuccess(result));
              }
            }),
            Effect.tapErrorCause(Effect.logError),
            Effect.withSpan(span),
            runtime.runPromiseExit,
          )
          .then(
            Exit.match({
              onSuccess: (value) => Promise.resolve(value),
              onFailure: (cause) => {
                if (Cause.isFailType(cause)) {
                  throw cause.error satisfies E;
                }

                if (toastifyDefects !== false) {
                  const defectMessage =
                    typeof toastifyDefects === "string" ? toastifyDefects : DEFAULT_DEFECT_MESSAGE;
                  toast.error(defectMessage);
                }

                throw new QueryDefect({ cause: Cause.squash(cause) });
              },
            }),
          );
      },
    [runtime.runPromiseExit, toastifyDefects, toastifyErrors, toastifySuccess],
  );
};

export type QueryVariables = Record<string, unknown>;
export type QueryKey = readonly [string, QueryVariables?];

type EffectfulMutationOptions<
  A,
  E extends EffectfulError,
  TVariables,
  R extends LiveRuntimeContext,
> = Omit<
  UseMutationOptions<A, E | QueryDefect, TVariables>,
  "mutationFn" | "onSuccess" | "onError" | "onSettled" | "onMutate" | "retry" | "retryDelay"
> & {
  mutationKey: QueryKey;
  mutationFn: (variables: TVariables) => Effect.Effect<A, E, R>;
} & UseRunnerOpts<A, E>;

export function useEffectMutation<
  A,
  E extends EffectfulError,
  TVariables,
  R extends LiveRuntimeContext,
>(
  options: EffectfulMutationOptions<A, E, TVariables, R>,
): UseMutationResult<A, E | QueryDefect, TVariables> {
  const effectRunner = useRunner<A, E, R>(options);
  const [spanName] = options.mutationKey;

  const mutationFn = React.useCallback(
    (variables: TVariables) => {
      const effect = options.mutationFn(variables);
      return effect.pipe(effectRunner(spanName));
    },
    [effectRunner, spanName, options],
  );

  return useMutation<A, E | QueryDefect, TVariables>({
    ...options,
    mutationFn,
    throwOnError: false,
  });
}

type EffectfulQueryFunction<
  A,
  E extends EffectfulError,
  R extends LiveRuntimeContext,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = never,
> = (context: QueryFunctionContext<TQueryKey, TPageParam>) => Effect.Effect<A, E, R>;

type EffectfulQueryOptions<
  A,
  E extends EffectfulError,
  R extends LiveRuntimeContext,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = never,
> = Omit<
  UseQueryOptions<A, E | QueryDefect, A, TQueryKey>,
  "queryKey" | "queryFn" | "retry" | "retryDelay" | "staleTime" | "gcTime"
> & {
  queryKey: TQueryKey;
  queryFn: EffectfulQueryFunction<A, E, R, TQueryKey, TPageParam> | typeof skipToken;
  staleTime?: Duration.DurationInput;
  gcTime?: Duration.DurationInput;
} & UseRunnerOpts<A, E>;

export function useEffectQuery<
  A,
  E extends EffectfulError,
  R extends LiveRuntimeContext,
  TQueryKey extends QueryKey = QueryKey,
>({
  gcTime,
  staleTime,
  ...options
}: EffectfulQueryOptions<A, E, R, TQueryKey>): UseQueryResult<A, E | QueryDefect> {
  const effectRunner = useRunner<A, E, R>(options);
  const [spanName] = options.queryKey;

  const queryFn: QueryFunction<A, TQueryKey> = React.useCallback(
    (context: QueryFunctionContext<TQueryKey>) => {
      const effect = (options.queryFn as EffectfulQueryFunction<A, E, R, TQueryKey>)(context);
      return effect.pipe(effectRunner(spanName));
    },
    [effectRunner, spanName, options],
  );

  return useQuery<A, E | QueryDefect, A, TQueryKey>({
    ...options,
    queryFn: options.queryFn === skipToken ? skipToken : queryFn,
    ...(staleTime !== undefined && { staleTime: Duration.toMillis(staleTime) }),
    ...(gcTime !== undefined && { gcTime: Duration.toMillis(gcTime) }),
    throwOnError: false,
  });
}

export type UseQueryResultSuccess<TData> = UseQueryResult<TData, unknown>["data"];
