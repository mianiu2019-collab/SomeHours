import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("has the required Next.js App Router entry files", async () => {
  await Promise.all([
    access(new URL("app/layout.tsx", root)),
    access(new URL("app/page.tsx", root)),
    access(new URL("app/globals.css", root)),
    access(new URL("public/favicon.svg", root)),
  ]);
});

test("exposes standard Vercel-compatible Next.js scripts", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("package.json", root), "utf8"),
  );

  assert.equal(packageJson.scripts.dev, "next dev");
  assert.equal(packageJson.scripts.build, "next build");
  assert.equal(packageJson.scripts.start, "next start");
  assert.equal(packageJson.dependencies.next, "16.2.6");
});

test("keeps the focus timer product entry intact", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");

  assert.match(page, /minimal-focus-timer:sessions/);
  assert.match(page, /minimal-focus-timer:active-start/);
  assert.match(page, /&gt; start focus/);
  assert.match(page, /&gt; stop/);
  assert.match(page, /className="hour-track"/);
  assert.match(page, /function DayView/);
  assert.match(page, /function Overview/);
  assert.match(page, /OVERVIEW_SCALE_SECONDS/);
  assert.match(page, />overview</);
});
