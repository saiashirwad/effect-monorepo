import { Button, Card, Skeleton } from "@/components/ui";
import { useEffectMutation } from "@/lib/tanstack-query";
import { TodosQueries } from "@/services/data-access/todos-queries";
import { WorkerService } from "@/services/worker/worker-service";
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import { toast } from "sonner";
import { AddTodo } from "./add-todo";
import { TodoItem } from "./todo-item";

export const IndexPage = () => {
  const todosQuery = TodosQueries.useTodosQuery();

  const workerMutation = useEffectMutation({
    mutationKey: ["worker"],
    mutationFn: Effect.fnUntraced(function* () {
      const { client } = yield* WorkerService;

      const largeData = Array.makeBy(1_000_000, (i) => i);
      const filterThreshold = 99_990;

      const result = yield* client.FilterData({
        data: largeData,
        threshold: filterThreshold,
      });

      return result;
    }),
    toastifyErrors: {
      FilterError: () => "Error filtering data",
    },
  });

  return (
    <Card className="mx-auto w-full max-w-lg shadow-md">
      <Card.Header className="pb-2">
        <Card.Title className="text-center text-2xl font-semibold">My Tasks</Card.Title>
      </Card.Header>

      <Card.Content className="space-y-4">
        <AddTodo />

        <div className="mt-2 w-full space-y-2">
          {todosQuery.isLoading ? (
            Array.makeBy(3, (i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)
          ) : todosQuery.data?.length === 0 ? (
            <div className="bg-muted/50 rounded-lg py-8 text-center">
              <p className="text-muted-foreground text-sm">No tasks yet. Add one above!</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {todosQuery.data?.map((todo) => <TodoItem key={todo.id} todo={todo} />)}
            </ul>
          )}
        </div>
      </Card.Content>

      <Card.Footer>
        <Button
          onClick={() => {
            workerMutation.mutate(void 0, {
              onSuccess: (data) => {
                toast.success(`Filtered ${data.length} items`);
              },
            });
          }}
        >
          Filter Data
        </Button>
      </Card.Footer>
    </Card>
  );
};
