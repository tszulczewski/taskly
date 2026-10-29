import { deleteTaskResponseSchema, taskViewSchema } from "@taskly/core";
import { deleteTask, updateTask } from "@taskly/core/server";
import { getDb } from "@taskly/db";
import { apiHandler, readJson, requireUser } from "../../../../lib/api";

type Ctx = RouteContext<"/api/tasks/[taskId]">;

export const PATCH = apiHandler(
  async (req, ctx: Ctx) => {
    const { taskId } = await ctx.params;
    const user = await requireUser(req);
    return updateTask(getDb(), user.id, taskId, await readJson(req));
  },
  { response: taskViewSchema },
);

export const DELETE = apiHandler(
  async (req, ctx: Ctx) => {
    const { taskId } = await ctx.params;
    const user = await requireUser(req);
    return deleteTask(getDb(), user.id, taskId);
  },
  { response: deleteTaskResponseSchema },
);
