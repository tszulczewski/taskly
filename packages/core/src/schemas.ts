import { z } from "zod";

export const roleSchema = z.enum(["owner", "editor", "viewer"]);
export type Role = z.infer<typeof roleSchema>;

/** Integer grosze (1/100 PLN). */
export const groszeSchema = z.number().int().nonnegative();

export const estimateSchema = z
  .object({ minGrosze: groszeSchema, maxGrosze: groszeSchema })
  .refine((e) => e.minGrosze <= e.maxGrosze, { message: "min must be <= max" });
export type Estimate = z.infer<typeof estimateSchema>;

export const createListInput = z.object({ name: z.string().trim().min(1).max(100) });

export const createTaskInput = z.object({
  listId: z.uuid(),
  parentId: z.uuid().nullable().default(null),
  title: z.string().trim().min(1).max(200),
});

/** Shape Claude must return for a cost estimate; validated before use. */
export const aiEstimateResponse = estimateSchema;
