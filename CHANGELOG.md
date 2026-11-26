# 0.1.0 (2026-11-26)

## Highlights

<!-- TODO: Highlights -->

## ✨ Features

- ✨ Add the Taskly component library and interactive Storybook examples. (#30) *(@tszulczewski)*
- ✨ Show rolled-up and exact estimates and provide a single-row quick-add component. (#37) *(@tszulczewski)*
- ✨ Show rolled-up estimates and exact prices in the task-list prototype. (#38) *(@tszulczewski)*
- ✨ Let users sign in, create an account and sign out (fixes #24). (#40) *(@tszulczewski)*
- ✨ Let administrators reset a user's password from the command line (fixes #25). (#41) *(@tszulczewski)*
- ✨ Let users create, edit and delete tasks and subtasks with exact or ranged PLN estimates (fixes #15, #16, #22). (#43) *(@tszulczewski)*
- ✨ Align Storybook place selection and missing-estimate components with the task and expense designs. (#48) *(@tszulczewski)*
- ✨ Let users complete and reopen tasks and subtasks, with confirmation when open subtasks remain (fixes #20). (#56) *(@tszulczewski)*
- ✨ Show a single PLN estimate range for future expenses on open tasks (fixes #21). (#58) *(@tszulczewski)*
- ✨ Show work with missing estimates and let users add estimates from the future-expenses panel (fixes #47). (#62) *(@tszulczewski)*
- ✨ Let users mark tasks and subtasks as important or urgent independently (fixes #18). (#69) *(@tszulczewski)*
- ✨ Assign tasks and subtasks to places and reorder them by drag, keyboard or menu (fixes #17, #19). (#75, #70, #72) *(@tszulczewski)*
- ✨ Let users choose or create places while adding a task or subtask (fixes #83). (#86) *(@tszulczewski)*
- ✨ Let users add places from the task row's metadata (fixes #90). (#92) *(@tszulczewski)*

## 🔒 Security

- 🔒 Enforce owner, editor and viewer permissions in the task-list service (fixes #6). (#10) *(@tszulczewski)*
- 🔒 Document trust boundaries and security controls in the system threat model. (#81) *(@tszulczewski)*
- 🔒 Keep sensitive error details out of API logs by logging only the error class and code (fixes #76). (#93) *(@tszulczewski)*
- 🔒 Apply content security and framing protections to every response (fixes #79). (#94) *(@tszulczewski)*
- 🔒 Limit sign-in attempts to five per minute per client IP (fixes #77). (#95) *(@tszulczewski)*
- 🔒 Let administrators reset passwords with only the database connection configured (fixes #80). (#97) *(@tszulczewski)*
- 🔒 Let users sign out of other devices and harden session cookie and transport checks (fixes #78). (#98) *(@tszulczewski)*
- 🔒 Restrict inline scripts with a per-request content security policy nonce (fixes #101). (#104) *(@tszulczewski)*
- 🔒 Exercise Better Auth's origin checks in integration tests (fixes #96). (#105) *(@tszulczewski)*

## 🐛 Fixes

- 🐛 Include places owned by the list owner in organized Storybook pickers. (#51) *(@tszulczewski)*
- 🐛 Wait for row animations before browser tests click controls or check collapse. (#60) *(@tszulczewski)*
- 🐛 Keep keyboard focus in the place picker after saving or deleting a place (fixes #49). (#65) *(@tszulczewski)*
- 💰 Keep the estimate conflict message visible after refreshing the task (fixes #66). (#71) *(@tszulczewski)*
- 🐳 Retry test PostgreSQL startup on a fresh port when the first port is unavailable. (#73) *(@tszulczewski)*
- 🐳 Track the test app's Node process so the launcher can release its lock (fixes #82). (#85) *(@tszulczewski)*
- 🐛 Stabilize browser tests for row menus and keyboard drag and drop (fixes #99). (#100) *(@tszulczewski)*
- 🐛 Stabilize keyboard reordering and future-expense toggle browser tests (fixes #102). (#103) *(@tszulczewski)*
- 🐛 Wait for keyboard focus to return after the place picker closes in browser tests (fixes #107). (#109) *(@tszulczewski)*

## 🛠️ Improvements

- 🛠️ Upgrade Vitest to 5.0.5 to address a security advisory. (#28) *(@tszulczewski)*
- 🛠️ Upgrade Next.js to 16.4.2 to address a security advisory. (#29) *(@tszulczewski)*
- 🛠️ Document estimate roll-up and quick-add sizing and refresh the prototype and agent skills. (#36) *(@tszulczewski)*
- 🛠️ Refresh agent skills and ignore personal Claude settings. (#59) *(@tszulczewski)*
- 🛠️ Provide scripts to launch and reuse a local integration-test environment. (#63) *(@tszulczewski)*
- 🛠️ Ignore the local test-environment lock directory. (#68) *(@tszulczewski)*
- 🛠️ Refresh npm dependencies and stabilize browser tests that race UI updates (fixes #74). (#88) *(@tszulczewski)*
- 🛠️ Upgrade GitHub Actions checkout and Node setup to v7 (fixes #87). (#89) *(@tszulczewski)*
- 🛠️ Configure Codex review workflows, refresh agent skills and add test data seeding. (#91) *(@tszulczewski)*
- 🛠️ Test forwarded request headers through NextResponse.next (fixes #106). (#108) *(@tszulczewski)*

## 🧪 Testing

- 🧪 Cover task, subtask and future-expense failure paths in integration tests. (#67) *(@tszulczewski)*

## 📝 Specs & Documentation

- 📝 Specify role checks and the task-list service. (#7) *(@tszulczewski)*
- 📝 Correct outdated application paths in the agent guide (fixes #1). (#8) *(@tszulczewski)*
- 📝 Align the pull request template with the project delivery process (fixes #2). (#9) *(@tszulczewski)*
- 📝 Document product discovery, the product brief and the backlog. (#23) *(@tszulczewski)*
- 📝 Specify tasks, subtasks and sign-in flows and record design reviews. (#26) *(@tszulczewski)*
- 📝 Record design references, tokens and ordering rules for completed tasks. (#27) *(@tszulczewski)*
- 📝 Add an agent exercise for building screens with the design system. (#31) *(@tszulczewski)*
- 📝 Run the design-system exercise against an interactive Storybook story. (#32) *(@tszulczewski)*
- 📝 Clarify component usage and apply decisions from the first design-system exercise. (#33) *(@tszulczewski)*
- 📝 Apply component and interaction decisions from the second design-system exercise. (#34) *(@tszulczewski)*
- 📝 Apply component and interaction decisions from the third design-system exercise. (#35) *(@tszulczewski)*
- 📝 Record the estimate roll-up rollout and how to reconcile stacked PRs after a squash merge. (#39) *(@tszulczewski)*
- 📝 Record sign-in implementation decisions and accessibility details. (#42) *(@tszulczewski)*
- 📝 Document which task-list updates are optimistic and record the implementation review. (#44) *(@tszulczewski)*
- 📝 Consolidate project agent instructions in AGENTS.md. (#45) *(@tszulczewski)*
- 📝 Route agent tasks to the relevant project and package guides. (#46) *(@tszulczewski)*
- 📝 Document SHA-pinned reviews from the PR author's account. (#50) *(@tszulczewski)*
- 📝 Specify how task completion affects future expenses. (#52) *(@tszulczewski)*
- 📝 Specify manual task order, importance and urgency markers, and places. (#53) *(@tszulczewski)*
- 📝 Specify how future expenses behave while completion changes are pending. (#54) *(@tszulczewski)*
- 📝 Clarify task ordering, markers and places after specification review. (#55) *(@tszulczewski)*
- 📝 Document dependencies and the implementation order for task organization and future expenses. (#57) *(@tszulczewski)*
- 📝 Document the review and QA process for high-risk changes in a single-maintainer repository. (#61) *(@tszulczewski)*
- 📝 Require integration tests to link to their QA scenarios. (#64) *(@tszulczewski)*
- 📝 Specify how users choose places while adding a task (fixes #19). (#84) *(@tszulczewski)*

## 👥 Contributors

- @tszulczewski
