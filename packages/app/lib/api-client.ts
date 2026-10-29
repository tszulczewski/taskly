import {
  type ApiFailure,
  type ApiResponse,
  CSRF_HEADER,
  CSRF_HEADER_VALUE,
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

function isEnvelope(value: unknown): value is ApiResponse<unknown> {
  return typeof value === "object" && value !== null && "ok" in value;
}

/** The only place allowed to call `fetch('/api/…')`. Returns `data` or throws ApiError. */
export async function apiCall<T>(
  path: string,
  init: Omit<RequestInit, "body"> & { body?: unknown } = {},
): Promise<T> {
  const { body, headers, ...rest } = init;
  const res = await fetch(path, {
    ...rest,
    headers: {
      [CSRF_HEADER]: CSRF_HEADER_VALUE,
      ...(body !== undefined && { "content-type": "application/json" }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await readJsonSafe(res);
  if (isEnvelope(json) && json.ok) return json.data as T;
  if (isEnvelope(json) && !json.ok) {
    throw new ApiError(res.status, json.error.code, json.error.message, json.error.fieldErrors);
  }
  throw new ApiError(res.status, "bad_response", "Unexpected server response");
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
