import { deletePlaceResponseSchema, placeViewSchema } from "@taskly/core";
import { deletePlace, updatePlace } from "@taskly/core/server";
import { getDb } from "@taskly/db";
import { apiHandler, readJson, requireUser } from "../../../../lib/api";

type Ctx = RouteContext<"/api/places/[placeId]">;

export const PATCH = apiHandler(
  async (req, ctx: Ctx) => {
    const { placeId } = await ctx.params;
    const user = await requireUser(req);
    return updatePlace(getDb(), user.id, placeId, await readJson(req));
  },
  { response: placeViewSchema },
);

export const DELETE = apiHandler(
  async (req, ctx: Ctx) => {
    const { placeId } = await ctx.params;
    const user = await requireUser(req);
    return deletePlace(getDb(), user.id, placeId);
  },
  { response: deletePlaceResponseSchema },
);
