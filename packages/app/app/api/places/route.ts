import { placeListResponseSchema, placeViewSchema } from "@taskly/core";
import { createPlace, listPlaces } from "@taskly/core/server";
import { getDb } from "@taskly/db";
import { apiHandler, readJson, requireUser } from "../../../lib/api";

/** The session user's places; the first call creates the eight predefined ones (spec E02, #19). */
export const GET = apiHandler(
  async (req) => {
    const user = await requireUser(req);
    return listPlaces(getDb(), user.id);
  },
  { response: placeListResponseSchema },
);

export const POST = apiHandler(
  async (req) => {
    const user = await requireUser(req);
    return createPlace(getDb(), user.id, await readJson(req));
  },
  { response: placeViewSchema },
);
