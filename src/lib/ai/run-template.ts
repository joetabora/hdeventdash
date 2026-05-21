import { NextResponse } from "next/server";
import { getPromptTemplate } from "@/lib/ai/prompt-templates/registry";
import { parseWithSchema } from "@/lib/validation/request-json";
import { aiCompleteText } from "@/lib/ai/chat-service";

export async function runAiPromptTemplate(params: {
  templateId: string;
  variables: Record<string, unknown>;
  model?: string | null;
  temperature?: number | null;
}): Promise<
  | {
      ok: true;
      text: string;
      model: string;
      templateId: string;
      templateVersion: string;
    }
  | { ok: false; response: NextResponse }
> {
  const tpl = getPromptTemplate(params.templateId);
  if (!tpl) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unknown template." }, { status: 400 }),
    };
  }

  const parsedVars = parseWithSchema(tpl.varsSchema, params.variables);
  if (!parsedVars.ok) return { ok: false, response: parsedVars.response };

  const rendered = tpl.render(parsedVars.data);
  const temperature =
    params.temperature ?? rendered.temperature ?? undefined;
  const out = await aiCompleteText({
    system: rendered.system,
    user: rendered.user,
    model: params.model,
    temperature,
  });
  return {
    ok: true,
    text: out.text,
    model: out.model,
    templateId: tpl.id,
    templateVersion: tpl.version,
  };
}
