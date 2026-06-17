import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";

/**
 * Next 16 renamed the `middleware` file convention to `proxy` (and with a
 * `src/` directory it must live in `src/`). The old root-level middleware.ts
 * was silently ignored, so the session gate below never ran.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Page routes only — API handlers enforce their own auth. Skipping /api/
    // avoids middleware interfering with multipart uploads (documents/media).
    "/((?!_next|favicon.ico|api/).*)",
  ],
};
