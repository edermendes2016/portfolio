# chat-api: "Ask about me" chat backend

A small Cloudflare Worker that answers recruiters' questions about Eder on the portfolio's About section. It calls Claude Haiku 5.5 with two sources only:

- `src/profile.md`: the résumé and profile. Edit this file to change what the AI knows.
- Eder's public GitHub repositories, loaded from the GitHub API and cached for 6 hours. A repository with the topic `no-portfolio` is left out.

If something is not in those sources, the AI says so instead of guessing.

The site is static (GitHub Pages), so the Anthropic API key can't live in the page. It stays here as a Worker secret.

## Protection against abuse

- Only the origins in `ALLOWED_ORIGINS` (`wrangler.toml`) can call it.
- Rate limits: 6 questions per minute per IP, 40 per minute for the whole site (`[[ratelimits]]` in `wrangler.toml`).
- Each request is capped: questions up to 500 characters, the last 10 messages of the conversation, answers up to 1,500 tokens.
- Set a monthly spend limit on the Anthropic Console as the final safety net (see step 1).

## Setup (once)

1. **Anthropic API key.** Create an account at https://console.anthropic.com, add credits under Billing, and set a low monthly limit under Limits (for example US$5). Create a key under API Keys.
2. **Cloudflare account.** Create a free account at https://dash.cloudflare.com.
3. **Deploy**, from this folder:

   ```bash
   cd chat-api
   npm install
   npx wrangler login
   npx wrangler secret put ANTHROPIC_API_KEY   # paste the key when asked
   npx wrangler deploy
   ```

   Wrangler prints the Worker URL, like `https://portfolio-chat-api.<your-subdomain>.workers.dev`.
4. **Turn the chat on.** In `index.html`, set `data-endpoint` on `<div id="ask">` to that URL plus `/chat`, then push:

   ```html
   <div id="ask" class="card ask" data-endpoint="https://portfolio-chat-api.<your-subdomain>.workers.dev/chat" hidden>
   ```

   While `data-endpoint` is empty, the chat stays hidden.

Optional: `npx wrangler secret put GITHUB_TOKEN` with a read-only token raises GitHub's rate limit. Not needed for normal traffic, because the list is cached.

## Update the profile

Edit `src/profile.md`, then run `npx wrangler deploy`. Text inside `<!-- -->` comments is ignored, so use comments for notes.

## Run locally

```bash
echo "ANTHROPIC_API_KEY=sk-ant-..." > .dev.vars   # never commit this file
npx wrangler dev
```

Then serve the site with `python -m http.server 8000` from the repository root and point `data-endpoint` at `http://localhost:8787/chat`.

`npm test` checks the request validation and the prompt, without calling any API.
