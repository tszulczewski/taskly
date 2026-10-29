import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createBrowser, type RunningApp, startApp } from "./helpers";

const databaseUrl = () => process.env.DATABASE_URL as string;

// Smoke test of the production build. Auth behaviour has its own suites (auth-*.integration.test.ts).
describe("running app (production build + test PostgreSQL)", () => {
  let app: RunningApp;
  const browser = createBrowser("taskly-integration");

  beforeAll(async () => {
    app = await startApp(databaseUrl());
  });

  afterAll(async () => {
    try {
      browser.close();
    } catch {
      // browser was never opened
    }
    await app.stop();
  });

  it("renders the sign-in page in a real browser", () => {
    browser.open(`${app.url}/sign-in`);
    expect(browser.title()).toBe("Sign in · Taskly");
    expect(browser.url()).toBe(`${app.url}/sign-in`);
    expect(browser.snapshot()).toContain("heading");
  });

  it("mounts the auth API", async () => {
    const res = await fetch(`${app.url}/api/auth/ok`);
    expect(await res.json()).toEqual({ ok: true });
  });
});
