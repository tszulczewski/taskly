# Cache Components keep a left page's state: busy UI came back after sign-in

- **Date:** 2026-10-29
- **Context:** Task 3.8 in `track.md`. After sign up → sign out → sign in in one tab, the owner saw the header's "Sign out" button spinning forever. A reload cleared it.

## Root cause

`cacheComponents: true` keeps up to 3 visited routes mounted but hidden in React `<Activity>` (`node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md`). `router.replace` and `router.refresh` re-render the kept instance with new props, but its `useState` stays. UI that stays busy "until the page changes" therefore came back busy: `AppHeader` with `pending`, and `useForm` with status `"done"`.

Evidence from agent-browser on the production build:
- The hidden header after sign-out, and the visible one after sign-in, both had `aria-busy="true"`.
- The hidden `/sign-in` and `/sign-up` forms stayed busy, with the password still in their inputs.

The existing browser tests missed it because every test started from a fresh `browser.open`.

## Fix

- A `useLayoutEffect` cleanup resets the state when Activity hides the component.
- `useForm` resets only when `status === "done"`, so unsent drafts are kept.
- `AppHeader` resets `pending` and `failed`.
- Unit tests rerender with `<Activity mode="hidden">` and then `"visible"` in jsdom.
- The browser regression test chains sign-up, sign-out and sign-in in one tab with no reload.

## How to avoid

- For any new transient state (spinners, success or error messages, open menus or dialogs), decide explicitly what happens on hide and show.
- Key user-scoped drafts by user id (`<X key={userId}>`), so one user's draft never shows to another.
- Browser tests of a flow must chain its steps in one tab, not only start from a fresh `browser.open`.
- Hidden Activity DOM stays queryable: assert on the visible element, or count the elements.

## Tooling

- agent-browser `set headers '{"X-Forwarded-For":"198.51.100.x"}'` (helper `setForwardedFor`) gives a browser test its own rate-limit bucket; reset it with `set headers '{}'`.
- In the agent sandbox, set a short `AGENT_BROWSER_SOCKET_DIR` (e.g. `/tmp/claude-1000/ab`). The default directory isn't writable, and the socket path must be at most 103 bytes.
