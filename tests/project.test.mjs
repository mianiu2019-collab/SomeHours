import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("has the required Next.js App Router entry files", async () => {
  await Promise.all([
    access(new URL("app/layout.tsx", root)),
    access(new URL("app/page.tsx", root)),
    access(new URL("app/globals.css", root)),
    access(new URL("app/manifest.ts", root)),
    access(new URL("public/some-hours-icon-192.png", root)),
    access(new URL("public/some-hours-icon-512.png", root)),
    access(new URL("public/some-hours-apple-touch-icon.png", root)),
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

test("overview derives a continuous full history from FocusSession data", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");

  assert.doesNotMatch(page, /OVERVIEW_DAYS/);
  assert.match(page, /sessionStarts\.length === 0/);
  assert.match(page, /for \(let day = todayStart; day >= firstDay; day = localDate\(day, -1\)\)/);
});

test("mobile layout uses the dynamic viewport without hatch edge borders", async () => {
  const css = await readFile(new URL("app/globals.css", root), "utf8");
  const focusSegment = css.match(/\.focus-segment\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  const overviewSegment = css.match(/\.day-trace-fill\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";

  assert.match(css, /height:\s*100dvh/);
  assert.match(css, /height:\s*100%/);
  assert.doesNotMatch(focusSegment, /border-(?:left|right)/);
  assert.doesNotMatch(overviewSegment, /border-(?:left|right)/);
});

test("day views keep only their title and focused total sticky", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const css = await readFile(new URL("app/globals.css", root), "utf8");

  assert.match(page, /className="day-sticky-header"/);
  assert.match(page, /isToday \? "today" : formatDayLabel\(day, true\)/);
  assert.match(css, /\.day-sticky-header\s*\{[\s\S]*?position:\s*sticky/);
  assert.match(css, /\.day-sticky-header\s*\{[\s\S]*?top:\s*0/);
  assert.match(css, /margin-top:\s*calc\(-54px - var\(--safe-top\)\)/);
  assert.match(css, /background:\s*var\(--surface\)/);
  assert.doesNotMatch(css, /\.day-sticky-header\s*\{[\s\S]*?position:\s*fixed/);
});

test("uses Some Hours metadata and install icons", async () => {
  const layout = await readFile(new URL("app/layout.tsx", root), "utf8");
  const manifest = await readFile(new URL("app/manifest.ts", root), "utf8");

  assert.doesNotMatch(layout, /静时/);
  assert.match(layout, /title:\s*"Some Hours"/);
  assert.match(layout, /applicationName:\s*"Some Hours"/);
  assert.match(layout, /appleWebApp:[\s\S]*?title:\s*"Some Hours"/);
  assert.match(manifest, /name:\s*"Some Hours"/);
  assert.match(manifest, /short_name:\s*"Some Hours"/);
  assert.match(manifest, /some-hours-icon-192\.png/);
  assert.match(manifest, /some-hours-icon-512\.png/);
});
