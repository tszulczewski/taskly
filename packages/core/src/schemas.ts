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

const emailField = z.email("Enter a valid email address.");

/** Shared by the sign-up form and the server sign-up hook. Messages are shown under the fields. */
export const signUpInput = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(100, "Use at most 100 characters."),
  email: emailField,
  password: z
    .string()
    .min(10, "Use at least 10 characters.")
    .max(128, "Use at most 128 characters."),
});
export type SignUpInput = z.infer<typeof signUpInput>;

/** No length rule at sign-in, so the form does not reveal the password policy. */
export const signInInput = z.object({
  email: emailField,
  password: z.string().min(1, "Enter your password."),
});
export type SignInInput = z.infer<typeof signInInput>;

/** Shape Claude must return for a cost estimate; validated before use. */
export const aiEstimateResponse = estimateSchema;
