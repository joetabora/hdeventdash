import { NextResponse } from "next/server";
import { getOrgManagerContext } from "@/lib/admin/require-org-manager";
import { assertCommentForEvent } from "@/lib/api/event-in-org";
import { deleteComment } from "@/lib/events";
import { parseUuidParam } from "@/lib/validation/request-json";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ eventId: string; commentId: string }> }
) {
  const ctx = await getOrgManagerContext();
  if (!ctx.ok) return ctx.response;

  const { eventId: rawEventId, commentId: rawCommentId } = await context.params;
  const eventCheck = parseUuidParam(rawEventId, "event id");
  if (!eventCheck.ok) return eventCheck.response;
  const commentCheck = parseUuidParam(rawCommentId, "comment id");
  if (!commentCheck.ok) return commentCheck.response;

  const belongs = await assertCommentForEvent(
    ctx.supabase,
    eventCheck.id,
    commentCheck.id,
    ctx.organizationId
  );
  if (!belongs.ok) return belongs.response;

  try {
    await deleteComment(ctx.supabase, commentCheck.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE comment:", e);
    return NextResponse.json({ error: "Failed to delete comment." }, { status: 500 });
  }
}
