import {
  type ApiFailure,
  apiResponseSchema,
  CSRF_HEADER,
  CSRF_HEADER_VALUE,
  type ResponseSchema,
  type SignInInput,
  type SignUpInput,
} from "@taskly/core";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fieldErrors?: ApiFailure["error"]["fieldErrors"],
  ) {
    super(message);
  }
}

async function readJsonSafe(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

type ApiCallInit = Omit<RequestInit, "body"> & { body?: unknown };

const badResponse = (status: number) =>
  new ApiError(status, "bad_response", "Unexpected server response");

/**
 * The only place allowed to call `fetch('/api/…')`. Returns `data` or throws ApiError. With
 * `response`, `data` must pass that schema and the parsed value is returned; a malformed envelope
 * or `data` throws `bad_response`, so it never reaches the Query cache.
 */
export function apiCall<T>(
  path: string,
  init: ApiCallInit & { response: ResponseSchema<T> },
): Promise<T>;
/** Without a schema, `data` is returned unchecked as `T`. */
export function apiCall<T = unknown>(
  path: string,
  init?: ApiCallInit & { response?: undefined },
): Promise<T>;
export async function apiCall(
  path: string,
  init: ApiCallInit & { response?: ResponseSchema<unknown> } = {},
): Promise<unknown> {
  const { body, headers, response, ...rest } = init;
  const res = await fetch(path, {
    ...rest,
    headers: {
      [CSRF_HEADER]: CSRF_HEADER_VALUE,
      ...(body !== undefined && { "content-type": "application/json" }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const envelope = apiResponseSchema.safeParse(await readJsonSafe(res));
  // A success envelope on an error status (or the reverse) is not something apiHandler sends.
  if (!envelope.success || envelope.data.ok !== res.ok) throw badResponse(res.status);
  if (!envelope.data.ok) {
    const { code, message, fieldErrors } = envelope.data.error;
    throw new ApiError(res.status, code, message, fieldErrors);
  }
  if (!response) return envelope.data.data;
  const data = response.safeParse(envelope.data.data);
  if (!data.success) throw badResponse(res.status);
  return data.data;
}

/** User-facing texts for the auth forms. Raw Better Auth messages are never shown. */
export const AUTH_MESSAGES = {
  invalidCredentials: "Email or password is incorrect.",
  accountNotCreated: "Could not create the account.",
  checkDetails: "Check your details and try again.",
  signUpClosed: "Sign-up is closed. Ask the owner of this Taskly.",
  rateLimitedNoWait: "Too many attempts. Wait a few seconds and try again.",
  signOutFailed: "Could not sign out. Try again.",
  generic: "Something went wrong. Try again.",
} as const;

// A Map, not an object literal, so codes such as "constructor" never hit a prototype key.
const AUTH_CODE_MESSAGES = new Map<string, string>([
  ["INVALID_EMAIL_OR_PASSWORD", AUTH_MESSAGES.invalidCredentials],
  ["USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL", AUTH_MESSAGES.accountNotCreated],
  ["INVALID_SIGN_UP_INPUT", AUTH_MESSAGES.checkDetails],
  ["PASSWORD_TOO_SHORT", AUTH_MESSAGES.checkDetails],
  ["PASSWORD_TOO_LONG", AUTH_MESSAGES.checkDetails],
  ["EMAIL_PASSWORD_SIGN_UP_DISABLED", AUTH_MESSAGES.signUpClosed],
]);

function rateLimitedMessage(retryAfter: string | null): string {
  const seconds = retryAfter !== null && /^\d+$/.test(retryAfter) ? Number(retryAfter) : 0;
  if (seconds <= 0) return AUTH_MESSAGES.rateLimitedNoWait;
  return `Too many attempts. Try again in ${seconds} ${seconds === 1 ? "second" : "seconds"}.`;
}

function readCode(json: unknown): string | undefined {
  if (typeof json !== "object" || json === null || !("code" in json)) return undefined;
  return typeof json.code === "string" ? json.code : undefined;
}

/**
 * How long an auth call may take, response headers and body together. Better Auth answers in well
 * under a second; 15 s still covers a slow phone connection, while a request that never finishes
 * frees the busy button for a retry in reasonable time.
 */
export const AUTH_TIMEOUT_MS = 15_000;

async function postAuth(
  path: string,
  body: SignInInput | SignUpInput | undefined,
  signal: AbortSignal,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { [CSRF_HEADER]: CSRF_HEADER_VALUE, "content-type": "application/json" },
      body: JSON.stringify(body ?? {}),
      signal,
    });
  } catch {
    throw new ApiError(0, "network_error", AUTH_MESSAGES.generic);
  }
  if (res.ok) return;
  if (res.status === 429) {
    throw new ApiError(429, "rate_limited", rateLimitedMessage(res.headers.get("x-retry-after")));
  }
  const code = readCode(await readJsonSafe(res)) ?? "bad_response";
  throw new ApiError(res.status, code, AUTH_CODE_MESSAGES.get(code) ?? AUTH_MESSAGES.generic);
}

/**
 * POSTs to a Better Auth endpoint. Resolves on success; otherwise throws an ApiError whose
 * `message` is the text to show the user. A call that does not finish within `AUTH_TIMEOUT_MS`
 * is aborted and fails with code `timeout`. Sign-in never sends `rememberMe` (spec Q8).
 */
export function authCall(path: "/api/auth/sign-in/email", body: SignInInput): Promise<void>;
export function authCall(path: "/api/auth/sign-up/email", body: SignUpInput): Promise<void>;
export function authCall(path: "/api/auth/sign-out"): Promise<void>;
export async function authCall(path: string, body?: SignInInput | SignUpInput): Promise<void> {
  const deadline = new AbortController();
  const timer = setTimeout(() => deadline.abort(), AUTH_TIMEOUT_MS);
  try {
    await postAuth(path, body, deadline.signal);
  } catch (error) {
    if (deadline.signal.aborted) throw new ApiError(0, "timeout", AUTH_MESSAGES.generic);
    throw error;
  } finally {
    clearTimeout(timer);
    // Also releases a success response's body, which is never read.
    deadline.abort();
  }
}
