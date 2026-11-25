// agent-browser init script (see `createBrowser` in helpers.ts): runs before the page's own
// scripts in every document of the session and keeps each Content-Security-Policy violation in
// sessionStorage, which survives same-tab navigations. `cspViolations()` reads and clears it.
window.__tasklyCspRecorder = true;
addEventListener("securitypolicyviolation", (event) => {
  const key = "taskly-csp-violations";
  const seen = JSON.parse(sessionStorage.getItem(key) || "[]");
  seen.push(
    `${event.effectiveDirective} blocked ${event.blockedURI || "inline"} on ${location.pathname}`,
  );
  sessionStorage.setItem(key, JSON.stringify(seen));
});
