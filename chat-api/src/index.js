// "Ask about Eder": a small Cloudflare Worker that answers recruiters' questions
// about Eder, using only his profile (profile.md) and his public GitHub repositories.
// The Anthropic API key lives here as a secret, never in the static site.
import Anthropic from "@anthropic-ai/sdk";
import { MODEL, MAX_OUTPUT_TOKENS, buildSystem, cleanMessages, loadRepos } from "./chat.js";

function allowedOrigin(request, env) {
  const origin = request.headers.get("Origin") || "";
  const list = String(env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  return list.includes(origin) ? origin : null;
}

function json(body, status, origin, extra = {}) {
  const headers = { "Content-Type": "application/json; charset=utf-8", Vary: "Origin", ...extra };
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
    headers["Access-Control-Max-Age"] = "86400";
  }
  return new Response(body == null ? null : JSON.stringify(body), { status, headers });
}

async function overLimit(env, ip) {
  // Rate limiting bindings from wrangler.toml. If one is missing, that check is skipped.
  if (env.PER_IP_LIMIT) {
    const { success } = await env.PER_IP_LIMIT.limit({ key: ip });
    if (!success) return true;
  }
  if (env.GLOBAL_LIMIT) {
    const { success } = await env.GLOBAL_LIMIT.limit({ key: "all" });
    if (!success) return true;
  }
  return false;
}

export default {
  async fetch(request, env, ctx) {
    const origin = allowedOrigin(request, env);
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return json(null, origin ? 204 : 403, origin);
    if (url.pathname !== "/chat" || request.method !== "POST") return json({ error: "not_found" }, 404, origin);
    if (!origin) return json({ error: "origin_not_allowed" }, 403, null);
    if (!env.ANTHROPIC_API_KEY) return json({ error: "not_configured" }, 503, origin);

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (await overLimit(env, ip)) return json({ error: "rate_limited" }, 429, origin, { "Retry-After": "60" });

    if (Number(request.headers.get("Content-Length") || 0) > 32_000) return json({ error: "too_large" }, 413, origin);
    let body;
    try { body = await request.json(); } catch { return json({ error: "bad_json" }, 400, origin); }
    const messages = cleanMessages(body && body.messages);
    if (typeof messages === "string") return json({ error: "bad_request", detail: messages }, 400, origin);

    const repos = await loadRepos(env, ctx);
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 1, timeout: 30_000 });

    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        output_config: { effort: "low" },
        system: [{ type: "text", text: buildSystem(repos), cache_control: { type: "ephemeral" } }],
        messages,
      });
      if (response.stop_reason === "refusal") return json({ error: "refused" }, 200, origin);
      const answer = response.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim();
      if (!answer) return json({ error: "empty" }, 502, origin);
      return json({ answer }, 200, origin);
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError) return json({ error: "busy" }, 503, origin, { "Retry-After": "30" });
      if (err instanceof Anthropic.APIError) {
        console.error("anthropic_error", err.status, err.message);
        return json({ error: "upstream" }, 502, origin);
      }
      console.error("chat_error", err && err.message);
      return json({ error: "server" }, 500, origin);
    }
  },
};
