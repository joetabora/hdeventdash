import { NextResponse } from "next/server";
import { AI_TEMPLATE_IDS } from "@/lib/ai/prompt-templates/ids";
import { getPromptTemplate } from "@/lib/ai/prompt-templates/registry";
import { parseWithSchema } from "@/lib/validation/request-json";
import { aiCompleteTextSafe } from "@/lib/ai/chat-service";
import { aiClientFailureResponse } from "@/lib/ai/http-errors";

const PLAYBOOK_MARKETING_TEMPLATE_IDS = new Set<string>([
  AI_TEMPLATE_IDS.PLAYBOOK_MARKETING_ASSISTANT,
  AI_TEMPLATE_IDS.PLAYBOOK_COPY_DEVELOPMENT_PACK,
]);

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
      response: NextResponse.json(
        { error: "Unknown template.", code: "AI_UNKNOWN" },
        { status: 400 }
      ),
    };
  }

  const parsedVars = parseWithSchema(tpl.varsSchema, params.variables);
  if (!parsedVars.ok) return { ok: false, response: parsedVars.response };

  const rendered = tpl.render(parsedVars.data);
  const temperature =
    params.temperature ?? rendered.temperature ?? undefined;
  const numPredict = rendered.numPredict ?? undefined;

  const out = await aiCompleteTextSafe({
    system: rendered.system,
    user: rendered.user,
    model: params.model,
    temperature,
    numPredict,
    ...(PLAYBOOK_MARKETING_TEMPLATE_IDS.has(params.templateId)
      ? {
          policyMode: "marketing" as const,
          ...(rendered.topP != null ? { topP: rendered.topP } : {}),
          ...(rendered.repeatPenalty != null
            ? { repeatPenalty: rendered.repeatPenalty }
            : {}),
        }
      : {}),
  });

  if (!out.ok) {
    return { ok: false, response: aiClientFailureResponse(out) };
  }

  return {
    ok: true,
    text: out.data.text,
    model: out.data.model,
    templateId: tpl.id,
    templateVersion: tpl.version,
  };
}
