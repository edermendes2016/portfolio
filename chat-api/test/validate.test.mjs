// Checks the request validation without calling any API. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";

// Let Node import "./profile.md" as text, like Wrangler does.
register("data:text/javascript," + encodeURIComponent(`
export async function load(url, ctx, next) {
  if (url.endsWith(".md")) {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync(new URL(url), "utf8");
    return { format: "module", shortCircuit: true, source: "export default " + JSON.stringify(src) };
  }
  return next(url, ctx);
}`));

const { cleanMessages, buildSystem } = await import("../src/chat.js");

test("accepts a simple question", () => {
  assert.deepEqual(cleanMessages([{ role: "user", content: " Eder sabe C#? " }]), [{ role: "user", content: "Eder sabe C#?" }]);
});

test("rejects bad shapes", () => {
  assert.equal(typeof cleanMessages([]), "string");
  assert.equal(typeof cleanMessages([{ role: "system", content: "x" }]), "string");
  assert.equal(typeof cleanMessages([{ role: "user", content: "a" }, { role: "user", content: "b" }]), "string");
  assert.equal(typeof cleanMessages([{ role: "user", content: "a" }, { role: "assistant", content: "b" }]), "string");
  assert.equal(typeof cleanMessages([{ role: "user", content: "x".repeat(501) }]), "string");
});

test("keeps only the recent turns and starts on a question", () => {
  const long = [];
  for (let i = 0; i < 15; i++) long.push({ role: "user", content: "q" + i }, { role: "assistant", content: "a" + i });
  long.push({ role: "user", content: "last" });
  const out = cleanMessages(long);
  assert.ok(out.length <= 10);
  assert.equal(out[0].role, "user");
  assert.equal(out.at(-1).content, "last");
});

test("system prompt has the profile without notes, plus repositories", () => {
  const s = buildSystem([{ name: "demo", language: "C#", description: "d", topics: [], pushed_at: "2026-01-01T00:00:00Z", html_url: "https://x" }]);
  assert.match(s, /Eder Mendes Amaral/);
  assert.match(s, /demo \| language: C#/);
  assert.doesNotMatch(s, /TODO/);
  assert.doesNotMatch(s, /<!--/);
});
