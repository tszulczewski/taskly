export class NotFoundError extends Error {
  /** What was not found, for callers that react differently per kind (the reset command). */
  readonly resource: string;
  constructor(resource = "Resource") {
    super(`${resource} not found`);
    this.resource = resource;
  }
}
export class ForbiddenError extends Error {
  constructor() {
    super("Forbidden");
  }
}

export class NotImplementedError extends Error {
  constructor(what: string) {
    super(`${what} is not implemented yet`);
  }
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
  }
}
export class ConflictError extends Error {
  constructor(message = "Conflict") {
    super(message);
  }
}
/** A request that cannot be parsed at all (e.g. a body that is not JSON); schema failures stay `ZodError`. */
export class ValidationError extends Error {
  constructor(message = "Invalid input") {
    super(message);
  }
}
