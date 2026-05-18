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

/** Message from `{ error: string }`, `{ message: string }`, or a generic fallback. */
export function apiMessageFromBody(
  data: unknown,
  status: number,
  nonJsonSnippet?: string
): string {
  if (data !== null && typeof data === "object") {
    const o = data as { error?: unknown; message?: unknown };
    if (typeof o.error === "string") {
      const msg = o.error.trim();
      if (msg) return msg;
    }
    if (typeof o.message === "string") {
      const msg = o.message.trim();
      if (msg) return msg;
    }
  }
  const hint = sanitizeResponseSnippet(nonJsonSnippet);
  if (hint) {
    return `Request failed (${status}): ${hint}`;
  }
  if ([502, 503, 504].includes(status)) {
    return `Request failed (${status}). The gateway or reverse proxy returned an error (often unreachable upstream or timeout). Confirm the deployment is healthy and retry.`;
  }
  return `Request failed (${status})`;
}

/** Strip markup and collapse whitespace for short user-facing excerpts. */
function sanitizeResponseSnippet(raw: string | undefined, maxLen = 200): string {
  if (raw === undefined || !raw.trim()) return "";
  const t = raw
    .slice(0, 1200)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return "";
  return t.length > maxLen ? `${t.slice(0, maxLen)}…` : t;
}

const PARSE_FAILED = Symbol("apiFetchJsonParseFailed");

async function readJsonBodyFromResponse(
  res: Response
): Promise<{ data: unknown | typeof PARSE_FAILED; rawText: string }> {
  const rawText = await res.text();
  if (!rawText.trim()) return { data: undefined, rawText };
  try {
    return { data: JSON.parse(rawText) as unknown, rawText };
  } catch {
    return { data: PARSE_FAILED, rawText };
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

  const { data, rawText } = await readJsonBodyFromResponse(res);

  if (data === PARSE_FAILED) {
    throw new ApiError(
      res.ok
        ? "Invalid JSON in response"
        : apiMessageFromBody(undefined, res.status, rawText),
      res.status,
      undefined
    );
  }

  if (!res.ok) {
    throw new ApiError(
      apiMessageFromBody(data, res.status, rawText),
      res.status,
      data
    );
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

  const parsed = await readJsonBodyFromResponse(res);

  if (!res.ok) {
    return null;
  }

  if (parsed.data === PARSE_FAILED) {
    throw new ApiError("Invalid JSON in response", res.status, undefined);
  }

  return parsed.data as T;
}
