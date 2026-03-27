/**
 * Shared JSON API client: same-origin fetch with cookies, parse body, consistent errors.
 */

const DEFAULT_CREDENTIALS: RequestCredentials = "include";

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

/** Message from `{ error: string }` or a generic fallback. */
export function apiMessageFromBody(data: unknown, status: number): string {
  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    typeof (data as { error: unknown }).error === "string"
  ) {
    const msg = (data as { error: string }).error.trim();
    if (msg) return msg;
  }
  return `Request failed (${status})`;
}

const PARSE_FAILED = Symbol("apiFetchJsonParseFailed");

async function readJsonBodyFromResponse(
  res: Response
): Promise<unknown | typeof PARSE_FAILED> {
  const text = await res.text();
  if (!text.trim()) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return PARSE_FAILED;
  }
}

/**
 * `fetch` with credentials, parse JSON, throw {@link ApiError} when `!response.ok`
 * or when a successful response body is not valid JSON (unexpected for JSON APIs).
 */
export async function apiFetchJson<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(input, {
    ...init,
    credentials: init?.credentials ?? DEFAULT_CREDENTIALS,
  });

  const data = await readJsonBodyFromResponse(res);

  if (data === PARSE_FAILED) {
    throw new ApiError(
      res.ok
        ? "Invalid JSON in response"
        : apiMessageFromBody(undefined, res.status),
      res.status,
      undefined
    );
  }

  if (!res.ok) {
    throw new ApiError(apiMessageFromBody(data, res.status), res.status, data);
  }

  return data as T;
}

/**
 * Same as {@link apiFetchJson} but returns `null` for non-OK HTTP status (no throw).
 * Still throws on network failure. Malformed JSON on OK responses throws {@link ApiError}.
 */
export async function apiFetchJsonOrNull<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T | null> {
  const res = await fetch(input, {
    ...init,
    credentials: init?.credentials ?? DEFAULT_CREDENTIALS,
  });

  const data = await readJsonBodyFromResponse(res);

  if (!res.ok) {
    return null;
  }

  if (data === PARSE_FAILED) {
    throw new ApiError("Invalid JSON in response", res.status, undefined);
  }

  return data as T;
}
