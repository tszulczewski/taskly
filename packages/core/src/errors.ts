export class NotFoundError extends Error {
  constructor(what = "Resource") {
    super(`${what} not found`);
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
