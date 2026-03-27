import { NextResponse } from "next/server";
import { getOrgManagerContext } from "@/lib/admin/require-org-manager";
import { assertEventInOrganization } from "@/lib/api/event-in-org";
import { uploadDocument } from "@/lib/events";
import { documentTagSchema } from "@/lib/validation/event-mutation-schemas";
import { validateEventUploadFile } from "@/lib/validation/upload-file";
import { parseUuidParam } from "@/lib/validation/request-json";

export async function POST(
  request: Request,
  context: { params: Promise<{ eventId: string }> }
) {
  const ctx = await getOrgManagerContext();
  if (!ctx.ok) return ctx.response;

  const { eventId: rawEventId } = await context.params;
  const idCheck = parseUuidParam(rawEventId, "event id");
  if (!idCheck.ok) return idCheck.response;

  const inOrg = await assertEventInOrganization(ctx.supabase, idCheck.id);
  if (!inOrg.ok) return inOrg.response;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = form.get("file");
  const tagRaw = form.get("tag");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }

  const tagParsed = documentTagSchema.safeParse(
    typeof tagRaw === "string" ? tagRaw : ""
  );
  if (!tagParsed.success) {
    return NextResponse.json({ error: "Invalid document tag." }, { status: 400 });
  }

  try {
    validateEventUploadFile(file);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid file.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    const row = await uploadDocument(
      ctx.supabase,
      idCheck.id,
      file,
      tagParsed.data,
      ctx.user.email ?? "unknown"
    );
    return NextResponse.json(row);
  } catch (e) {
    console.error("POST /api/events/[eventId]/documents:", e);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
