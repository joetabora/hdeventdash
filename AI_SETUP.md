# AI Infrastructure Overview

## Server

Primary server:

- Hostname: optimus
- Ubuntu 24.04
- Docker-based infrastructure
- Self-hosted GitHub Actions runner configured

## AI Stack

### Ollama (direct integration)

The Event Dashboard talks to Ollama **directly** via its REST API (`POST /api/generate`, `GET /api/tags`). There is no Open WebUI, OpenAI compatibility layer, or intermediary proxy in the app.

Default port: **11434**

Configure the URL with **`OLLAMA_BASE_URL`** — never hardcode a hostname in application code.

Examples (set in `.env.local` or deployment env):

| Environment | `OLLAMA_BASE_URL` |
|-------------|-------------------|
| Next.js and Ollama on the same machine | `http://127.0.0.1:11434` |
| Next.js in Docker, Ollama on Mac host | `http://host.docker.internal:11434` |
| Next.js in Docker, Ollama on LAN host | `http://192.168.1.79:11434` |

Default model: **`qwen3:8b`** (falls back automatically if unavailable — see `OLLAMA_MODEL_FALLBACK_CHAIN` in `src/config/ai.ts`). Pull with `ollama pull qwen3:8b`. For heavier quality at the cost of speed/VRAM use `OLLAMA_DEFAULT_MODEL=qwen2.5:14b-instruct`.

## Architecture

1. Browser → `POST /api/ai/complete` (or event-scoped variant)
2. Next.js server → **`src/lib/ai/client.ts`** (sole Ollama fetch layer)
3. Ollama at `OLLAMA_BASE_URL`

On first server load, the resolved URL is logged:

```text
[ai] OLLAMA_BASE_URL=http://127.0.0.1:11434 AI_ENABLED=true OLLAMA_DEFAULT_MODEL=qwen3:8b AI_PROXY_SAFE_TIMEOUT_MS=75000
```

## Environment variables

See [.env.local.example](.env.local.example).

| Variable | Purpose |
|----------|---------|
| `AI_ENABLED` | Master switch |
| `OLLAMA_BASE_URL` | Ollama base URL (defaults to `http://127.0.0.1:11434` if unset) |
| `OLLAMA_DEFAULT_MODEL` | Default model tag |
| `OLLAMA_ALLOWED_MODELS` | Optional allowlist |
| `OLLAMA_HOST_ALLOWLIST` | Optional hostname allowlist for hardening |
| `AI_REQUEST_TIMEOUT_MS` | Per-request timeout (min 90s) |
| `AI_PROXY_SAFE_TIMEOUT_MS` | Cap each Ollama generate call (default 75s) so JSON returns before CDN/tunnel idle timeouts; set `0` to disable |
| `AI_OLLAMA_RETRIES` | Extra retries (default 1 = retry once) |
| `AI_MAX_TOKENS` | Default Ollama `num_predict` cap (marketing templates use lower values) |

## HTTP API

- `POST /api/ai/complete` — template-based completion
- `POST /api/events/[eventId]/ai/complete` — same, with trusted event context
- `GET /api/ai/models` — allowed + installed models
- `GET /api/ai/health` — reachability + model check

All AI routes use **`runtime = nodejs`**. Failures return structured JSON `{ error, code }` — routes do not crash on unreachable Ollama.

## Service layer

| Module | Role |
|--------|------|
| `src/config/ai.ts` | Static defaults (fallback URL, model chain, limits) |
| `src/lib/ai/env.ts` | Reads `process.env`, resolves `OLLAMA_BASE_URL`, startup log |
| `src/lib/ai/client.ts` | **Only** module that `fetch()`es Ollama |
| `src/lib/ai/chat-service.ts` | Prompt assembly + safe completion wrapper |
| `src/lib/ai/prompt-templates/` | Template registry + catalog |

## Switching models

1. `ollama pull <model-tag>`
2. Set `OLLAMA_DEFAULT_MODEL=<model-tag>`
3. Restart Next.js
4. `GET /api/ai/health`

If the preferred model is missing, the client falls back through `OLLAMA_MODEL_FALLBACK_CHAIN` in `src/config/ai.ts`.

## Cloudflare Tunnel / long-lived AI requests

Cloudflare Tunnel (and many reverse proxies) return **HTML 502** when the origin is silent longer than their idle timeout (~90s). The browser then shows a generic “Bad gateway” message instead of the app’s JSON error.

**App-side mitigations (defaults in code):**

- `AI_PROXY_SAFE_TIMEOUT_MS=75000` — cap each Ollama `/api/generate` call so the app responds with JSON before the tunnel gives up
- Marketing templates tune `num_predict` per platform (Facebook Event drafts use a larger budget than very short modes)

**Host-side (required for very slow hardware, 14B models, or long copy):**

Tune tunnel ingress so idle timeout exceeds inference time, e.g. in `config.yml`:

```yaml
ingress:
  - hostname: your-app.example.com
    service: http://localhost:3000
    originRequest:
      noResponseTimeoutSeconds: 120
```

Using larger models (14B+) increases latency. If generations time out behind Cloudflare, increase `noResponseTimeoutSeconds` toward **180** or use a faster model (e.g. `OLLAMA_DEFAULT_MODEL=qwen2.5:7b-instruct`).

Also confirm **`OLLAMA_BASE_URL`** from inside the Docker container (not from the host shell). Loopback `127.0.0.1` inside a container does not reach Ollama on the host — use `host.docker.internal` or the LAN IP (see table above).
