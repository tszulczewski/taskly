import { taskViewSchema } from "@taskly/core";
import { setTaskPlace } from "@taskly/core/server";
import { getDb } from "@taskly/db";
import { apiHandler, requireUser } from "../../../../../../lib/api";

type Ctx = RouteContext<"/api/tasks/[taskId]/places/[placeId]">;

/** `PUT` assigns the place to the task or subtask, `DELETE` removes it; both idempotent, no body. */
const setPlace = ({ assigned }: { assigned: boolean }) =>
  apiHandler(
    async (req, ctx: Ctx) => {
      const { taskId, placeId } = await ctx.params;
      const user = await requireUser(req);
      return setTaskPlace(getDb(), user.id, taskId, placeId, { assigned });
    },
    { response: taskViewSchema },
  );

export const PUT = setPlace({ assigned: true });
export const DELETE = setPlace({ assigned: false });
