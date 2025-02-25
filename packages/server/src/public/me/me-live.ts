import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder";
import * as Policy from "@org/domain/Policy";
import * as Effect from "effect/Effect";
import { Api } from "../../api.js";

export const MeLive = HttpApiBuilder.group(
  Api,
  "me",
  // eslint-disable-next-line require-yield
  Effect.fn(function* (handlers) {
    return handlers.handle("get", () =>
      Effect.gen(function* () {
        const currentUser = yield* Policy.CurrentUser;
        return {
          id: currentUser.userId,
          name: "John Doe",
        };
      }),
    );
  }),
);
