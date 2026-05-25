# AI Infrastructure Overview

## Server

Primary server:

- Hostname: optimus
- Ubuntu 24.04
- Docker-based infrastructure
- Self-hosted GitHub Actions runner configured

## AI Stack

### Ollama (direct integration)

Running locally — the Event Dashboard talks to Ollama **directly** via its REST API. There is no Open WebUI, OpenAI compatibility layer, or intermediary proxy in the app.

Container:

- ollama

Port:

- 11434

Accessible internally via:

- [http://ollama:11434](http://ollama:11434) (Docker Compose service name)
- [http://127.0.0.1:11434](http://127.0.0.1:11434) (same host)
- [http://192.168.1.79:11434](http://192.168.1.79:11434) (LAN)

Default model:

- `qwen3:8b` (tuned for local RTX 2060 6GB class hardware)

Primary use:

- Local LLM inference
- Social media generation
- Marketing copy
- Event content generation
- Assistant/chat features

## Event Dashboard Goals

The event dashboard integrates directly with Ollama for:

- social media generation
- Facebook event descriptions
- ad copy
- SEO content
- vendor outreach emails
- sponsor outreach
- event schedule generation
- hashtag generation
- title optimization

## Preferred Architecture

The dashboard:

1. Sends prompts to a backend API route (`POST /api/ai/complete` or event-scoped variant)
2. Backend calls Ollama **`POST /api/generate`** on the server (never from the browser)
3. Prompt templates live in `src/lib/ai/prompt-templates/` (central registry + catalog)
4. Configuration is centralized in `src/config/ai.ts` + `.env.local`
5. Health checks via **`GET /api/ai/health`**

## Docker Environment

Current deployment method:

- Docker build
- Self-hosted GitHub Actions runner
- [deploy.sh](http://deploy.sh) automation

## Important Notes

- Prefer self-hosted/local AI over external APIs
- Keep infrastructure Docker-compatible
- Environment variables should use `.env.local`
- Maintain production-safe architecture
- Only one concurrent Ollama inference is queued server-side (protects modest CPUs/GPUs)

## Cloudflare Tunnel / long-lived AI requests

Tune tunnel **ingress** timeouts (e.g. `noResponseTimeoutSeconds`, `proxyType: http`) and any reverse proxy **`proxy_read_timeout`** so they are **greater than `AI_REQUEST_TIMEOUT_MS`**. Defaults around ~60–100 s routinely kill slow Ollama calls even when Docker and DNS are healthy.

## App integration (Event Dashboard)

The Next.js app talks to **Ollama only on the server**. The browser calls dashboard API routes; it never opens `OLLAMA_BASE_URL` directly.

### Environment variables

See [.env.local.example](.env.local.example). Typical local values:

| Variable | Example |
|----------|---------|
| `AI_ENABLED` | `true` |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` |
| `OLLAMA_DEFAULT_MODEL` | `qwen3:8b` |
| `OLLAMA_ALLOWED_MODELS` | Optional comma list; if omitted, only the default model is accepted |
| `OLLAMA_HOST_ALLOWLIST` | Optional comma list of allowed URL hostnames for `OLLAMA_BASE_URL` |
| `AI_REQUEST_TIMEOUT_MS` | Server-side deadline per `/api/generate` fetch (minimum **90 000** enforced) |
| `AI_OLLAMA_RETRIES` | Extra attempts on transient failures (default `1` = retry once, max `5`) |
| `AI_MAX_TOKENS` | Ollama `num_predict` cap (default `2048`) |
| `AI_DEFAULT_TEMPERATURE` | Default sampling temperature when a template does not override |
| `AI_MAX_PROMPT_CHARS` / `AI_MAX_COMPLETION_CHARS` | Guardrails for payload size |

### HTTP API

- **`POST /api/ai/complete`** — JSON body: `{ templateId, variables?, model?, temperature? }`. Caller supplies all template variables (validated per template).
- **`POST /api/events/[eventId]/ai/complete`** — Same body; the server merges **trusted event fields** into `variables` so clients cannot spoof another event’s context.
- **`GET /api/ai/models`** — Returns `{ enabled, models, installed, defaultModel? }` from Ollama `/api/tags`.
- **`GET /api/ai/health`** — Pings Ollama, verifies model availability, returns `{ ok, reachable, modelInstalled, resolvedModel, … }`.

All routes require a logged-in user with an active organization (except health still requires session).

### Prompt templates

Templates live under `src/lib/ai/prompt-templates/` (IDs in `ids.ts`, catalog in `catalog.ts`). Adding a template means registering it in `registry.ts` with a Zod variable schema and optional JSON response parsing on the client.

### Service layer

- **`src/config/ai.ts`** — defaults (model, timeout, tokens, retries)
- **`src/lib/ai/ollama-client.ts`** — direct Ollama REST (`/api/generate`, `/api/tags`)
- **`src/lib/ai/providers/ollama.ts`** — `AiProvider` adapter
- **`src/lib/ai/chat-service.ts`** — server entry used by API routes

### Frontend

- **`useAiCompletion`** (`src/hooks/use-ai-completion.ts`) — POST helper with loading/error/retry/cancel.
- **`AiGenerationStatus`** — shared loading, error, retry, and cancel UI.
- Event playbook **AI Assistant** uses `/api/events/.../ai/complete` via `src/lib/ai-generate.ts`.

### Switching models later

1. Pull the model in Ollama: `ollama pull <model-tag>`
2. Set `OLLAMA_DEFAULT_MODEL=<model-tag>` in `.env.local`
3. Optionally set `OLLAMA_ALLOWED_MODELS` to permit multiple tags
4. Restart the Next.js server
5. Verify with `GET /api/ai/health`

If the preferred model is missing, the server falls back through `OLLAMA_MODEL_FALLBACK_CHAIN` in `src/config/ai.ts`.
