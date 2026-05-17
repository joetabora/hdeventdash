/**
 * Parse JSON from model output that may include markdown fences or leading prose.
 */
export function parseJsonFromModelText(raw: string): unknown {
  const text = raw.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)```/im.exec(text);
  const candidate = (fenced?.[1] ?? text).trim();

  try {
    return JSON.parse(candidate);
  } catch {
    /* fall through */
  }

  const sliceFrom = (startChar: "{" | "[") => {
    const start = candidate.indexOf(startChar);
    if (start < 0) return null;
    const open = startChar === "{" ? "{" : "[";
    const close = startChar === "{" ? "}" : "]";
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < candidate.length; i++) {
      const ch = candidate[i];
      if (inString) {
        if (escape) {
          escape = false;
        } else if (ch === "\\") {
          escape = true;
        } else if (ch === '"') {
          inString = false;
        }
        continue;
      }
      if (ch === '"') {
        inString = true;
        continue;
      }
      if (ch === open) depth++;
      if (ch === close) {
        depth--;
        if (depth === 0) {
          return candidate.slice(start, i + 1);
        }
      }
    }
    return null;
  };

  const objSlice = sliceFrom("{") ?? sliceFrom("[");
  if (!objSlice) {
    throw new SyntaxError("Could not locate JSON object or array in model output.");
  }
  return JSON.parse(objSlice);
}
