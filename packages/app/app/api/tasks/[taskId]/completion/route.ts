import { taskViewSchema } from "@taskly/core";
import { setTaskCompleted } from "@taskly/core/server";
import { getDb } from "@taskly/db";
import { apiHandler, readJson, requireUser } from "../../../../../lib/api";

export const PUT = apiHandler(
  async (req, ctx: RouteContext<"/api/tasks/[taskId]/completion">) => {
    const { taskId } = await ctx.params;
    const user = await requireUser(req);
    return setTaskCompleted(getDb(), user.id, taskId, await readJson(req));
  },
  { response: taskViewSchema },
);
