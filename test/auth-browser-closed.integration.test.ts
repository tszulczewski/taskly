import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createBrowser, type RunningApp, startApp } from "./helpers";

const CLOSED = "Sign-up is closed. Ask the owner of this Taskly.";

// Sign-up closed (the default). No auth request is submitted, so no rate-limit budget is spent.
describe("auth in the browser (sign-up closed)", () => {
  let app: RunningApp;
  const browser = createBrowser("taskly-auth-browser-closed");

  beforeAll(async () => {
    app = await startApp(process.env.DATABASE_URL as string, { port: 3204 });
  });

  beforeEach(() => {
    browser.open("about:blank");
    browser.clearCookies();
  });

  afterAll(async () => {
    try {
      browser.close();
    } catch {
      // browser was never opened
    }
    await app?.stop();
  });

  it("shows the closed message and a way to sign in on /sign-up, without a form", async () => {
    browser.open(`${app.url}/sign-up`);
    await browser.waitForText(CLOSED);
    expect(browser.count("form")).toBe(0);
    expect(browser.count("input")).toBe(0);
    await browser.waitForHydrated('[data-slot="sign-up-closed"] a');

    browser.clickRole("link", "Sign in");
    await browser.waitForPath("/sign-in");
    await browser.waitForHydrated('input[autocomplete="email"]');
  });

  it("offers no 'Create an account' link on /sign-in", async () => {
    browser.open(`${app.url}/sign-in`);
    // The link is decided in the dynamic part, which streams in with the form.
    await browser.waitForHydrated('input[autocomplete="email"]');
    expect(browser.count('a[href="/sign-up"]')).toBe(0);
    expect(browser.evaluate<boolean>(`document.body.innerText.includes("Create an account")`)).toBe(
      false,
    );
  });
});
