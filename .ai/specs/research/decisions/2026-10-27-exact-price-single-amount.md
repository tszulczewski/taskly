# An exact price is typed once (one amount is a range with min = max)

- Date, owner: 2026-10-27, product owner ("zgadzam się" to the agent's proposal).
- Context: in the test of prototype revision 002, the future owner typed the same number into Min and Max whenever the exact price was known (`interviews/2026-10-27-prototype-test-person-1-via-owner.md`). The owner also gave the demo amounts as single figures (screen map L20, 2026-10-26). The roll-up decision (`2026-10-27-subtask-estimate-rollup.md`) increases the number of small purchases with a known price.
- Decision:
  1. **Input.** The estimate has two fields: "Amount" and "up to (optional)". One filled field is an exact price, stored as min = max. Both filled is a range. Only the second field filled is also an exact price, with no error.
  2. **Display.** When min = max, one amount is shown ("500 zł") everywhere: on the task and subtask rows, in a task's subtask sum and in future expenses. A range is shown as before ("400–600 zł").
  3. **Storage.** No change. Min and max are both stored, with min ≤ max; R07 (a min–max range typed by the user; restated as R16 on 2026-10-27) holds, because an exact price is a range with min = max.
- Supersedes: L03 in the screen map, i.e. the rule "Enter both amounts or neither" and acceptance criterion AC6 of issue #15 (owner, 2026-10-26). A-P11 (the range is always shown as min–max) in the prototype revisions.
- Rejected: an "exact / range" switch (an extra click on every amount); one text field parsing "400-600" (it clashes with Polish number formatting such as "1 500,50").
- Affects (when written into the specs): `formatPlnRange` in `packages/core/src/money.ts` and `EstimateRange` in `packages/ui`; the labels and validation in spec E01; issue #15 AC6.
- Evidence: `[INTERVIEW]` `interviews/2026-10-27-prototype-test-person-1-via-owner.md` (second-hand, relayed by the owner).
- Open: none.
- Status: decided by the owner on 2026-10-27; written into the product brief on 2026-10-27 as D24 and R18; specs and the design system not yet updated.
