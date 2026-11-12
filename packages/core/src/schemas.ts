import { z } from "zod";
import { MAX_ESTIMATE_GROSZE } from "./money";
import { placeViewSchema } from "./place-rules";

export const roleSchema = z.enum(["owner", "editor", "viewer"]);
export type Role = z.infer<typeof roleSchema>;

/** Integer grosze (1/100 PLN). Uncapped: sums and totals may exceed the cap on typed amounts. */
export const groszeSchema = z.number().int().nonnegative();

/** Field messages for typed amounts (spec E01, UI/UX and Edge Cases). */
export const estimateMessages = {
  amount: "Enter an amount like 1 500,50",
  upToBelowAmount: "“Up to” must not be less than the amount.",
  overCap: "Enter at most 10 000 000 zł",
  /** "Add estimate" with both fields empty: there it saves a figure, so one is needed (#47). */
  required: "Enter an amount.",
} as const;

/** One amount the owner typed: integer grosze, 0 … MAX_ESTIMATE_GROSZE. */
export const estimateGroszeSchema = z
  .number()
  .int(estimateMessages.amount)
  .min(0, estimateMessages.amount)
  .max(MAX_ESTIMATE_GROSZE, estimateMessages.overCap);

/** A typed estimate (input). An exact price is min = max. */
export const estimateSchema = z
  .object({ minGrosze: estimateGroszeSchema, maxGrosze: estimateGroszeSchema })
  .refine((e) => e.minGrosze <= e.maxGrosze, {
    message: estimateMessages.upToBelowAmount,
    path: ["maxGrosze"],
  });
export type Estimate = z.infer<typeof estimateSchema>;

/** An estimate the server sends (output): a sum of subtasks may exceed the input cap. */
export const estimateViewSchema = z
  .object({ minGrosze: groszeSchema, maxGrosze: groszeSchema })
  .refine((e) => e.minGrosze <= e.maxGrosze, { message: "min must be <= max" });

export const createListInput = z.object({ name: z.string().trim().min(1).max(100) });

/** The name `ensureDefaultList` gives a user's default list; also the `/` heading when it failed. */
export const DEFAULT_LIST_NAME = "My renovation";

const TITLE_MAX = 200;
const DESCRIPTION_MAX = 2000;

/**
 * The editable task fields, with no defaults: `updateTaskInput` is built from this, because Zod 4's
 * `.partial()` keeps defaults and a PATCH of `{ title }` would otherwise wipe the other fields.
 */
export const taskFields = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Enter a title.")
    .max(TITLE_MAX, `Enter at most ${TITLE_MAX} characters.`),
  description: z
    .string()
    .trim()
    .max(DESCRIPTION_MAX, "Enter at most 2 000 characters.")
    .transform((text) => (text === "" ? null : text))
    .nullable(),
  estimate: estimateSchema.nullable(),
  /** Two independent markers (D07): a PATCH of one never writes the other (#18 AC3). */
  important: z.boolean(),
  urgent: z.boolean(),
});

/**
 * The list comes from the route param, never from the body. `parentId` makes it a subtask. New
 * tasks start unmarked: the markers are not taken here.
 */
export const createTaskInput = z.object({
  title: taskFields.shape.title,
  description: taskFields.shape.description.default(null),
  estimate: taskFields.shape.estimate.default(null),
  parentId: z.uuid().nullable().default(null),
});
export type CreateTaskInput = z.infer<typeof createTaskInput>;

/** Only the keys present are written. A key sent as `undefined` does not count as a change. */
export const updateTaskInput = taskFields
  .partial()
  .refine((fields) => Object.values(fields).some((value) => value !== undefined), {
    message: "Change at least one field.",
  });
export type UpdateTaskInput = z.infer<typeof updateTaskInput>;

/** `PUT /api/tasks/[taskId]/completion`: the state to set, so a retry is harmless. */
export const completionInput = z.strictObject({ completed: z.boolean() });
export type CompletionInput = z.infer<typeof completionInput>;

/** The 409 for a subtask added under a completed task (spec E03, Q3); the app recognizes it. */
export const TASK_COMPLETED_MESSAGE = "Task is completed";

// Response shapes: no defaults (a missing field fails), and unknown fields are accepted (stripped)
// so an older client keeps working against a newer server.
export const subtaskViewSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1).max(TITLE_MAX),
  description: z.string().max(DESCRIPTION_MAX).nullable(),
  estimate: estimateViewSchema.nullable(),
  completed: z.boolean(),
  /** The row's own markers; a task's and its subtasks' are independent (D21). */
  important: z.boolean(),
  urgent: z.boolean(),
  /**
   * The row's own places (D21), in the places' order; a place of the list's owner (Q3). Readers
   * of the list see them through the task, whoever owns them.
   */
  places: z.array(placeViewSchema),
  /**
   * The stored fractional key: opaque to the client, only compared bytewise (JS `<` on these
   * ASCII keys equals `COLLATE "C"`), never sent back.
   */
  position: z.string(),
});
export type SubtaskView = z.infer<typeof subtaskViewSchema>;

/** A top-level task. `estimate` is the effective one, from `rollUpEstimate`. */
export const taskViewSchema = subtaskViewSchema.extend({
  unestimatedSubtasks: z.number().int().nonnegative(),
  subtasks: z.array(subtaskViewSchema),
});
export type TaskView = z.infer<typeof taskViewSchema>;

export const taskListResponseSchema = z.array(taskViewSchema);
/** The parent's `TaskView` after a subtask was deleted; null for a top-level task. */
export const deleteTaskResponseSchema = taskViewSchema.nullable();

/** Something open that still needs a price (D27): a task, or a subtask named with its task. */
export const unestimatedItemSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1).max(TITLE_MAX),
  /** Set for a subtask: the title of its task. */
  taskTitle: z.string().min(1).max(TITLE_MAX).optional(),
});
export type UnestimatedItem = z.infer<typeof unestimatedItemSchema>;

/**
 * `GET /api/lists/[listId]/future-expenses` (spec E03): `total` is null when nothing counts;
 * `unestimated` is what it leaves out for lack of an estimate, in display order.
 */
export const futureExpensesResponseSchema = z.object({
  total: estimateViewSchema.nullable(),
  unestimated: z.array(unestimatedItemSchema),
});
export type FutureExpenses = z.infer<typeof futureExpensesResponseSchema>;

const emailField = z.email("Enter a valid email address.");

/** The password policy for a new password; matches Better Auth's `minPasswordLength`/`maxPasswordLength`. */
const newPasswordField = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(128, "Use at most 128 characters.");

/** Shared by the sign-up form and the server sign-up hook. Messages are shown under the fields. */
export const signUpInput = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(100, "Use at most 100 characters."),
  email: emailField,
  password: newPasswordField,
});
export type SignUpInput = z.infer<typeof signUpInput>;

/** Offline password reset. Emails are stored lowercased, as Better Auth does at sign-up. */
export const setPasswordInput = z.object({
  email: z.string().toLowerCase(),
  newPassword: newPasswordField,
});

/** No length rule at sign-in, so the form does not reveal the password policy. */
export const signInInput = z.object({
  email: emailField,
  password: z.string().min(1, "Enter your password."),
});
export type SignInInput = z.infer<typeof signInInput>;

/** Shape Claude must return for a cost estimate; validated before use. */
export const aiEstimateResponse = estimateSchema;
