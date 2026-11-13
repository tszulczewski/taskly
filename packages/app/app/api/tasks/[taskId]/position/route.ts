import { taskViewSchema } from "@taskly/core";
import { moveTask } from "@taskly/core/server";
import { getDb } from "@taskly/db";
import { apiHandler, readJson, requireUser } from "../../../../../lib/api";

/** Moves a task, or a subtask within its task, between its new neighbours (spec E02, #17). */
export const PUT = apiHandler(
  async (req, ctx: RouteContext<"/api/tasks/[taskId]/position">) => {
    const { taskId } = await ctx.params;
    const user = await requireUser(req);
    return moveTask(getDb(), user.id, taskId, await readJson(req));
  },
  { response: taskViewSchema },
);
