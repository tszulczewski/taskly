import { describe, expect, it } from "vitest";
import { z } from "zod";
import { MAX_ESTIMATE_GROSZE } from "./money";
import {
  aiEstimateResponse,
  createTaskInput,
  deleteTaskResponseSchema,
  estimateGroszeSchema,
  estimateSchema,
  estimateViewSchema,
  groszeSchema,
  setPasswordInput,
  signInInput,
  signUpInput,
  subtaskViewSchema,
  taskFields,
  taskListResponseSchema,
  taskViewSchema,
  updateTaskInput,
} from "./schemas";

const valid = { name: "Ann", email: "ann@example.com", password: "a".repeat(10) };

function errors(result: z.ZodSafeParseResult<unknown>) {
  return result.success ? {} : z.flattenError(result.error).fieldErrors;
}

describe("signUpInput", () => {
  it.each([10, 128])("accepts a %i-character password", (n) => {
    expect(signUpInput.safeParse({ ...valid, password: "a".repeat(n) }).success).toBe(true);
  });

  it("rejects a 9-character password", () => {
    const result = signUpInput.safeParse({ ...valid, password: "a".repeat(9) });
    expect(errors(result)).toEqual({ password: ["Use at least 10 characters."] });
  });

  it("rejects a 129-character password", () => {
    const result = signUpInput.safeParse({ ...valid, password: "a".repeat(129) });
    expect(errors(result)).toEqual({ password: ["Use at most 128 characters."] });
  });

  it.each([1, 100])("accepts a %i-character name", (n) => {
    expect(signUpInput.parse({ ...valid, name: "n".repeat(n) }).name).toBe("n".repeat(n));
  });

  it("trims the name, and counts its length after trimming", () => {
    expect(signUpInput.parse({ ...valid, name: `  ${"n".repeat(100)}  ` }).name).toBe(
      "n".repeat(100),
    );
  });

  it.each(["", "   "])("rejects the empty name %j", (name) => {
    expect(errors(signUpInput.safeParse({ ...valid, name }))).toEqual({
      name: ["Enter your name."],
    });
  });

  it("rejects a 101-character name", () => {
    expect(errors(signUpInput.safeParse({ ...valid, name: "n".repeat(101) }))).toEqual({
      name: ["Use at most 100 characters."],
    });
  });

  it("rejects an invalid email", () => {
    expect(errors(signUpInput.safeParse({ ...valid, email: "ann@" }))).toEqual({
      email: ["Enter a valid email address."],
    });
  });
});

describe("signInInput", () => {
  it("accepts any non-empty password, without the sign-up length policy", () => {
    for (const password of ["a", "a".repeat(129)]) {
      expect(signInInput.safeParse({ email: "ann@example.com", password }).success).toBe(true);
    }
  });

  it("rejects an empty password and an invalid email", () => {
    expect(errors(signInInput.safeParse({ email: "ann", password: "" }))).toEqual({
      email: ["Enter a valid email address."],
      password: ["Enter your password."],
    });
  });
});

describe("setPasswordInput", () => {
  it("lowercases the email and applies the sign-up password policy", () => {
    expect(
      setPasswordInput.parse({ email: "Ann@Example.COM", newPassword: "a".repeat(10) }),
    ).toEqual({ email: "ann@example.com", newPassword: "a".repeat(10) });
    expect(setPasswordInput.safeParse({ email: "a", newPassword: "a".repeat(128) }).success).toBe(
      true,
    );
    expect(
      errors(setPasswordInput.safeParse({ email: "ann@example.com", newPassword: "a".repeat(9) })),
    ).toEqual({ newPassword: ["Use at least 10 characters."] });
    expect(
      errors(
        setPasswordInput.safeParse({ email: "ann@example.com", newPassword: "a".repeat(129) }),
      ),
    ).toEqual({ newPassword: ["Use at most 128 characters."] });
  });
});

const issues = (result: z.ZodSafeParseResult<unknown>) =>
  result.success ? [] : result.error.issues.map((issue) => [issue.path.join("."), issue.message]);

describe("groszeSchema and estimateGroszeSchema", () => {
  it("caps typed amounts at MAX_ESTIMATE_GROSZE and leaves groszeSchema uncapped", () => {
    expect(estimateGroszeSchema.parse(0)).toBe(0);
    expect(estimateGroszeSchema.parse(MAX_ESTIMATE_GROSZE)).toBe(MAX_ESTIMATE_GROSZE);
    expect(issues(estimateGroszeSchema.safeParse(MAX_ESTIMATE_GROSZE + 1))).toEqual([
      ["", "Enter at most 10 000 000 zł"],
    ]);
    expect(groszeSchema.parse(MAX_ESTIMATE_GROSZE + 1)).toBe(MAX_ESTIMATE_GROSZE + 1);
    expect(groszeSchema.parse(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);
  });

  it.each([-1, 1.5])("rejects %d grosze with the amount message", (value) => {
    expect(issues(estimateGroszeSchema.safeParse(value))).toEqual([
      ["", "Enter an amount like 1 500,50"],
    ]);
    expect(groszeSchema.safeParse(value).success).toBe(false);
  });
});

describe("estimateSchema", () => {
  it("accepts an exact price, a range and 0–max", () => {
    for (const estimate of [
      { minGrosze: 500, maxGrosze: 500 },
      { minGrosze: 500, maxGrosze: 900 },
      { minGrosze: 0, maxGrosze: MAX_ESTIMATE_GROSZE },
    ]) {
      expect(estimateSchema.parse(estimate)).toEqual(estimate);
    }
  });

  it("reports min above max on maxGrosze", () => {
    expect(issues(estimateSchema.safeParse({ minGrosze: 900, maxGrosze: 500 }))).toEqual([
      ["maxGrosze", "“Up to” must not be less than the amount."],
    ]);
  });

  it("reports an amount over the cap on its own field", () => {
    expect(
      issues(estimateSchema.safeParse({ minGrosze: 1, maxGrosze: MAX_ESTIMATE_GROSZE + 1 })),
    ).toEqual([["maxGrosze", "Enter at most 10 000 000 zł"]]);
  });

  it("rejects a missing bound", () => {
    expect(estimateSchema.safeParse({ minGrosze: 1 }).success).toBe(false);
  });

  it("is also the AI response shape", () => {
    expect(aiEstimateResponse).toBe(estimateSchema);
    expect(aiEstimateResponse.parse({ minGrosze: 100, maxGrosze: 200 })).toEqual({
      minGrosze: 100,
      maxGrosze: 200,
    });
    expect(aiEstimateResponse.safeParse({ minGrosze: 200, maxGrosze: 100 }).success).toBe(false);
  });
});

describe("taskFields", () => {
  it("has no defaults", () => {
    expect(taskFields.safeParse({}).success).toBe(false);
    expect(taskFields.safeParse({ title: "x" }).success).toBe(false);
  });
});

describe("createTaskInput", () => {
  it("defaults description, estimate and parentId to null", () => {
    expect(createTaskInput.parse({ title: "Paint" })).toStrictEqual({
      title: "Paint",
      description: null,
      estimate: null,
      parentId: null,
    });
  });

  it("trims, turns a blank description into null, and keeps an estimate", () => {
    expect(
      createTaskInput.parse({
        title: "  Paint ",
        description: "   ",
        estimate: { minGrosze: 100, maxGrosze: 100 },
      }),
    ).toEqual({
      title: "Paint",
      description: null,
      estimate: { minGrosze: 100, maxGrosze: 100 },
      parentId: null,
    });
    expect(createTaskInput.parse({ title: "Paint", description: " Two coats " }).description).toBe(
      "Two coats",
    );
  });

  it("keeps a parentId, which makes the task a subtask", () => {
    const parentId = "3f1c1e7e-8f5a-4c55-9a59-0f3cc5b4a2d1";
    expect(createTaskInput.parse({ title: "Paint", parentId }).parentId).toBe(parentId);
    expect(createTaskInput.parse({ title: "Paint", parentId: null }).parentId).toBeNull();
  });

  it("drops fields it does not own, such as listId and position", () => {
    const listId = "3f1c1e7e-8f5a-4c55-9a59-0f3cc5b4a2d1";
    expect(createTaskInput.parse({ title: "Paint", listId, position: "a0" })).toStrictEqual({
      title: "Paint",
      description: null,
      estimate: null,
      parentId: null,
    });
  });

  it.each([1, 200])("accepts a %i-character title, counted after trimming", (n) => {
    expect(createTaskInput.parse({ title: ` ${"t".repeat(n)} ` }).title).toBe("t".repeat(n));
  });

  it.each([
    [{ title: "" }, [["title", "Enter a title."]]],
    [{ title: "   " }, [["title", "Enter a title."]]],
    [{ title: "t".repeat(201) }, [["title", "Enter at most 200 characters."]]],
    [
      { title: "x", description: "d".repeat(2001) },
      [["description", "Enter at most 2 000 characters."]],
    ],
    [
      { title: "x", estimate: { minGrosze: 2, maxGrosze: 1 } },
      [["estimate.maxGrosze", "“Up to” must not be less than the amount."]],
    ],
    [{ title: "x", parentId: "not-a-uuid" }, [["parentId", "Invalid UUID"]]],
    [
      { title: "x", parentId: 7 },
      [["parentId", "Invalid input: expected string, received number"]],
    ],
  ])("rejects %j", (input, expected) => {
    expect(issues(createTaskInput.safeParse(input))).toEqual(expected);
  });

  it("accepts a 2000-character description, counted after trimming", () => {
    const description = "d".repeat(2000);
    expect(
      createTaskInput.parse({ title: "x", description: ` ${description}\n` }).description,
    ).toBe(description);
  });
});

describe("updateTaskInput", () => {
  it("parses { title } to exactly { title }, so a PATCH keeps the other fields", () => {
    expect(updateTaskInput.parse({ title: "x" })).toStrictEqual({ title: "x" });
  });

  it("keeps an explicit null, which clears the field", () => {
    expect(updateTaskInput.parse({ estimate: null })).toStrictEqual({ estimate: null });
    expect(updateTaskInput.parse({ description: "" })).toStrictEqual({ description: null });
  });

  it.each([{}, { description: undefined }, { parentId: "3f1c1e7e-8f5a-4c55-9a59-0f3cc5b4a2d1" }])(
    "rejects %j as changing nothing",
    (input) => {
      expect(issues(updateTaskInput.safeParse(input))).toEqual([
        ["", "Change at least one field."],
      ]);
    },
  );

  it("validates the fields it gets", () => {
    expect(issues(updateTaskInput.safeParse({ title: " " }))).toEqual([
      ["title", "Enter a title."],
    ]);
    expect(issues(updateTaskInput.safeParse({ estimate: { minGrosze: 5, maxGrosze: 1 } }))).toEqual(
      [["estimate.maxGrosze", "“Up to” must not be less than the amount."]],
    );
  });
});

const uuid = (n: number) => `00000000-0000-4000-8000-${n.toString().padStart(12, "0")}`;
const subtask = (n: number, estimate: { minGrosze: number; maxGrosze: number } | null = null) => ({
  id: uuid(n),
  title: `Subtask ${n}`,
  description: null,
  estimate,
});
const task = {
  id: uuid(1),
  title: "Paint the ceiling",
  description: "Two coats",
  estimate: { minGrosze: 80000, maxGrosze: 90000 },
  unestimatedSubtasks: 1,
  subtasks: [subtask(2, { minGrosze: 30000, maxGrosze: 40000 }), subtask(3)],
};

describe("estimateViewSchema", () => {
  it("accepts a sum above the input cap and rejects min above max", () => {
    const sum = { minGrosze: 3 * MAX_ESTIMATE_GROSZE, maxGrosze: 3 * MAX_ESTIMATE_GROSZE };
    expect(estimateViewSchema.parse(sum)).toEqual(sum);
    expect(estimateViewSchema.safeParse({ minGrosze: 2, maxGrosze: 1 }).success).toBe(false);
  });
});

describe("response schemas", () => {
  it("accept a task with subtasks, a task without, a subtask and a list", () => {
    const plain = { ...task, id: uuid(9), estimate: null, unestimatedSubtasks: 0, subtasks: [] };
    expect(taskViewSchema.parse(task)).toEqual(task);
    expect(taskViewSchema.parse(plain)).toEqual(plain);
    expect(subtaskViewSchema.parse(subtask(4))).toEqual(subtask(4));
    expect(taskListResponseSchema.parse([task, plain])).toEqual([task, plain]);
    expect(taskListResponseSchema.parse([])).toEqual([]);
  });

  it("accept a summed estimate above the input cap", () => {
    const big = { minGrosze: MAX_ESTIMATE_GROSZE + 1, maxGrosze: 2 * MAX_ESTIMATE_GROSZE };
    expect(taskViewSchema.parse({ ...task, estimate: big }).estimate).toEqual(big);
  });

  it("delete returns the parent or null", () => {
    expect(deleteTaskResponseSchema.parse(null)).toBeNull();
    expect(deleteTaskResponseSchema.parse(task)).toEqual(task);
    expect(deleteTaskResponseSchema.safeParse(undefined).success).toBe(false);
  });

  it("accept additive unknown fields, on the task and on its subtasks", () => {
    const newer = {
      ...task,
      status: "todo",
      subtasks: [{ ...subtask(2), important: true }],
    };
    const parsed = taskViewSchema.parse(newer);
    expect(parsed.title).toBe(task.title);
    expect(parsed.subtasks).toHaveLength(1);
  });

  it.each(["id", "title", "description", "estimate", "unestimatedSubtasks", "subtasks"])(
    "reject a task without %s",
    (field) => {
      const { [field as keyof typeof task]: _, ...rest } = task;
      expect(issues(taskViewSchema.safeParse(rest)).map(([path]) => path)).toEqual([field]);
    },
  );

  it.each(["id", "title", "description", "estimate"])("reject a subtask without %s", (field) => {
    const { [field as keyof ReturnType<typeof subtask>]: _, ...rest } = subtask(2);
    expect(
      issues(taskViewSchema.safeParse({ ...task, subtasks: [rest] })).map(([path]) => path),
    ).toEqual([`subtasks.0.${field}`]);
  });

  it.each([
    ["an invalid range", { estimate: { minGrosze: 2, maxGrosze: 1 } }, "estimate"],
    ["a negative amount", { estimate: { minGrosze: -1, maxGrosze: 1 } }, "estimate.minGrosze"],
    ["a fractional amount", { estimate: { minGrosze: 1, maxGrosze: 1.5 } }, "estimate.maxGrosze"],
    ["a string amount", { estimate: { minGrosze: "1", maxGrosze: 2 } }, "estimate.minGrosze"],
    ["a negative count", { unestimatedSubtasks: -1 }, "unestimatedSubtasks"],
    ["a fractional count", { unestimatedSubtasks: 0.5 }, "unestimatedSubtasks"],
    ["a malformed id", { id: "42" }, "id"],
    ["an empty title", { title: "" }, "title"],
    ["a title over 200 characters", { title: "t".repeat(201) }, "title"],
    ["a description over 2000 characters", { description: "d".repeat(2001) }, "description"],
    ["subtasks that are not an array", { subtasks: null }, "subtasks"],
    [
      "a subtask with an invalid range",
      { subtasks: [subtask(2, { minGrosze: 5, maxGrosze: 1 })] },
      "subtasks.0.estimate",
    ],
  ])("reject %s", (_name, change, path) => {
    expect(issues(taskViewSchema.safeParse({ ...task, ...change })).map(([p]) => p)).toEqual([
      path,
    ]);
  });

  it("reject a list holding one malformed task", () => {
    expect(
      taskListResponseSchema.safeParse([task, { ...task, unestimatedSubtasks: undefined }]).success,
    ).toBe(false);
  });
});
