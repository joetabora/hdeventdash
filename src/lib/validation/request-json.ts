import { NextResponse } from "next/server";
import { z } from "zod";

export function validationErrorResponse(error: z.ZodError): NextResponse {
  const issue = error.issues[0];
  const message = issue
    ? issue.path.length > 0
      ? `${issue.path.join(".")}: ${issue.message}`
      : issue.message
    : "Invalid input";
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function readJsonBody(
  request: Request
): Promise<
  { ok: true; body: unknown } | { ok: false; response: NextResponse }
> {
  try {
    const body = await request.json();
    return { ok: true, body };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid JSON" }, { status: 400 }),
    };
  }
}

export function parseWithSchema<T>(
  schema: z.ZodType<T>,
  body: unknown
):
  | { ok: true; data: T }
  | { ok: false; response: NextResponse } {
  const r = schema.safeParse(body);
  if (!r.success) {
    return { ok: false, response: validationErrorResponse(r.error) };
  }
  return { ok: true, data: r.data };
}

export function parseUuidParam(
  value: string | undefined,
  label: string
):
  | { ok: true; id: string }
  | { ok: false; response: NextResponse } {
  if (!value?.trim()) {
    return {
      ok: false,
      response: NextResponse.json({ error: `Missing ${label}.` }, { status: 400 }),
    };
  }
  const r = z.uuid().safeParse(value.trim());
  if (!r.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `Invalid ${label}.` },
        { status: 400 }
      ),
    };
  }
  return { ok: true, id: r.data };
}
