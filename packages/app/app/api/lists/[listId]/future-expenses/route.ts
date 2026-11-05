import { futureExpensesResponseSchema } from "@taskly/core";
import { futureExpensesService } from "@taskly/core/server";
import { getDb } from "@taskly/db";
import { apiHandler, requireUser } from "../../../../../lib/api";

type Ctx = RouteContext<"/api/lists/[listId]/future-expenses">;

export const GET = apiHandler(
  async (req, ctx: Ctx) => {
    const { listId } = await ctx.params;
    const user = await requireUser(req);
    return futureExpensesService(getDb(), user.id, listId);
  },
  { response: futureExpensesResponseSchema },
);
