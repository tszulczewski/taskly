import { taskListResponseSchema, taskViewSchema } from "@taskly/core";
import { createTask, listTasks } from "@taskly/core/server";
import { getDb } from "@taskly/db";
import { apiHandler, readJson, requireUser } from "../../../../../lib/api";

type Ctx = RouteContext<"/api/lists/[listId]/tasks">;

export const GET = apiHandler(
  async (req, ctx: Ctx) => {
    const { listId } = await ctx.params;
    const user = await requireUser(req);
    return listTasks(getDb(), user.id, listId);
  },
  { response: taskListResponseSchema },
);

export const POST = apiHandler(
  async (req, ctx: Ctx) => {
    const { listId } = await ctx.params;
    const user = await requireUser(req);
    return createTask(getDb(), user.id, listId, await readJson(req));
  },
  { response: taskViewSchema },
);
