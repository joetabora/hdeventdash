# AI Infrastructure Overview

## Server

Primary server:

- Hostname: optimus
- Ubuntu 24.04
- Docker-based infrastructure
- Self-hosted GitHub Actions runner configured

## AI Stack

### Ollama

Running locally in Docker.

Container:

- ollama

Port:

- 11434

Accessible internally via:

- [http://ollama:11434](http://ollama:11434)
- [http://192.168.1.79:11434](http://192.168.1.79:11434)

Primary use:

- Local LLM inference
- Social media generation
- Marketing copy
- Event content generation
- Assistant/chat features

## Open WebUI

Container:

- openwebui

Purpose:

- Internal AI testing UI
- Prompt experimentation
- Model management

Port:

- 3000

## Event Dashboard Goals

The event dashboard should integrate directly with Ollama for:

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

The dashboard should:

1. Send prompts to a backend API route
2. Backend API route communicates with Ollama
3. Frontend never talks directly to Ollama
4. AI settings should be centralized
5. Future support for multiple models

## Desired Features

Potential future AI features:

- prompt templates
- tone presets
- marketing campaign generation
- image prompt generation
- event ROI analysis
- AI assistant/chatbot
- automatic post scheduling
- workflow automation
- AI recommendations based on previous events

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

## App integration (Event Dashboard)

The Next.js app talks to **Ollama only on the server**. The browser calls dashboard API routes; it never opens `OLLAMA_BASE_URL` directly.

### Environment variables

See [.env.local.example](.env.local.example). Typical Docker Compose values:

| Variable | Example |
|----------|---------|
| `AI_ENABLED` | `true` |
| `OLLAMA_BASE_URL` | `http://ollama:11434` (service DNS on the Compose network) |
| `OLLAMA_DEFAULT_MODEL` | Tag pulled in Ollama (e.g. `llama3.2`) |
| `OLLAMA_ALLOWED_MODELS` | Optional comma list; if omitted, only the default model is accepted |
| `OLLAMA_HOST_ALLOWLIST` | Optional comma list of allowed URL hostnames for `OLLAMA_BASE_URL` |
| `AI_REQUEST_TIMEOUT_MS` | Server-side HTTP timeout toward Ollama (default `120000`) |
| `AI_MAX_PROMPT_CHARS` / `AI_MAX_COMPLETION_CHARS` | Guardrails for payload size |

### HTTP API

- **`POST /api/ai/complete`** — JSON body: `{ templateId, variables?, model? }`. Caller supplies all template variables (validated per template).
- **`POST /api/events/[eventId]/ai/complete`** — Same body; the server merges **trusted event fields** into `variables` so clients cannot spoof another event’s context.
- **`GET /api/ai/models`** — Returns `{ enabled, models, defaultModel? }` for UI pickers when AI is enabled.

All routes require a logged-in user with an active organization.

### Prompt templates

Templates live under `src/lib/ai/prompt-templates/` (IDs in `prompt-templates/ids.ts`). Adding a template means registering it in `registry.ts` with a Zod variable schema and optional JSON response parsing on the client.

### Frontend

- **`useAiCompletion`** (`src/hooks/use-ai-completion.ts`) — POST helper with loading/error state and `AbortController` cancellation.
- Event playbook **AI Assistant** uses `/api/events/.../ai/complete` via `src/lib/ai-generate.ts`.
