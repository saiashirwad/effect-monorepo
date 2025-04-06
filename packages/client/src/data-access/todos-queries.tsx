import { type TodosContract } from "@org/domain/api/Contracts";
import { type TodoId } from "@org/domain/EntityIds";
import * as Effect from "effect/Effect";
import { ApiClient } from "../layers/api-client";
import { QueryData, useEffectMutation, useEffectQuery } from "../lib/tanstack-query";

export namespace TodosQueries {
  const todosKey = QueryData.makeQueryKey("todos");
  const todosHelpers = QueryData.makeHelpers<Array<TodosContract.Todo>>(todosKey);

  export const useTodosQuery = () => {
    return useEffectQuery({
      queryKey: todosKey(),
      queryFn: () => ApiClient.use((client) => client.todos.get()),
    });
  };

  export const useCreateTodoMutation = () => {
    return useEffectMutation({
      mutationKey: ["TodosQueries.createTodo"],
      mutationFn: (todo: TodosContract.CreateTodoPayload) =>
        ApiClient.use((client) => client.todos.create({ payload: todo })).pipe(
          Effect.tap((createdTodo) =>
            todosHelpers.setData((draft) => {
              draft.unshift(createdTodo);
            }),
          ),
        ),
      toastifySuccess: () => "Todo created!",
    });
  };

  export const useUpdateTodoMutation = () => {
    return useEffectMutation({
      mutationKey: ["TodosQueries.updateTodo"],
      mutationFn: (todo: TodosContract.Todo) =>
        ApiClient.use((client) => client.todos.update({ payload: todo })).pipe(
          Effect.tap((updatedTodo) =>
            todosHelpers.setData((draft) => {
              const index = draft.findIndex((t) => t.id === updatedTodo.id);
              if (index !== -1) {
                draft[index] = updatedTodo;
              }
            }),
          ),
        ),
      toastifySuccess: () => "Todo updated!",
    });
  };

  export const useDeleteTodoMutation = () => {
    return useEffectMutation({
      mutationKey: ["TodosQueries.deleteTodo"],
      mutationFn: (id: TodoId) =>
        ApiClient.use((client) => client.todos.delete({ payload: id })).pipe(
          Effect.tap(() =>
            todosHelpers.setData((draft) => {
              const index = draft.findIndex((t) => t.id === id);
              if (index !== -1) {
                draft.splice(index, 1);
              }
            }),
          ),
        ),
      toastifySuccess: () => "Todo deleted!",
    });
  };
}
