import { describe, expect, it } from "vitest";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  NotImplementedError,
  UnauthorizedError,
} from "./errors";

describe("errors", () => {
  it("builds messages", () => {
    expect(new NotFoundError().message).toBe("Resource not found");
    expect(new NotFoundError("List").message).toBe("List not found");
    expect(new NotFoundError("List").resource).toBe("List");
    expect(new NotFoundError().resource).toBe("Resource");
    expect(new ForbiddenError().message).toBe("Forbidden");
    expect(new UnauthorizedError().message).toBe("Unauthorized");
    expect(new ConflictError().message).toBe("Conflict");
    expect(new ConflictError("Slot taken").message).toBe("Slot taken");
    expect(new NotImplementedError("x").message).toBe("x is not implemented yet");
  });
});
