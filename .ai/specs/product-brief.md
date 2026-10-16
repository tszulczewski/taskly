# Taskly — product brief

- Date: 2026-10-15, refreshed 2026-10-16
- Mode: own; Owner: product owner (the person building Taskly); Pass: full
- Evidence basis: the owner's own account (currently renovating); one friend's account relayed by the owner; two further interview notes (a future owner and a moved-in owner), attributed notes with leading interviewer questions in them; a dated competitor scan; the team's written beliefs; and a synthetic panel whose findings are hypotheses only. Four people are behind the interview-tagged lines: the owner, the friend, the future owner and the moved-in owner, confirmed different from one another by the owner; the interview tag records attribution only, and who conducted the two Polish interviews is not stated. On 2026-10-16 the owner narrowed version 1 to a simple prototype for themselves (Follow-up 16). Most consequential untested belief: A01, that seeing task costs and the future-expenses total changes how the owner orders tasks.
- Coverage: 69 claims — 63 sourced (interview 56, data 0, document 2, product 3, benchmark 2), 0 synthetic, 6 assumed; 2 entries on the collection plan. Of the 56 interview lines, 45 are the owner first-hand, 3 are relayed by the owner about a friend and 8 come from the two newer attributed notes
- Synthetic hypotheses outside Coverage: 9
- Definition of Ready signed by: the owner (product owner) on 2026-10-15, who confirmed D01–D12 and R02–R05 as active on 2026-10-15 (D08, D12 and R02–R05 are superseded for version 1 on 2026-10-16) (`decisions/2026-10-15-confirmation-d01-d09.md`, `decisions/2026-10-15-confirmation-r02-r03-d11.md`); the version 1 reduction of 2026-10-16 (D13–D21, R06–R11; `decisions/2026-10-16-v1-scope-reduction.md`), wording including R08 and the Later list confirmed by the owner; ready for: a small experiment on the owner's own renovation (single user); not ready for implementation planning for others
- Sources: `.ai/specs/research/interviews/2026-10-15-owner-renovating.md`, `.ai/specs/research/interviews/2026-10-15-friend-new-homeowner-via-owner.md`, `.ai/specs/research/2026-10-15-interview_future_owner_of_the_house.md`, `.ai/specs/research/2026-10-15-interview_owner_of_the_house.md`, `.ai/specs/research/SOURCES.md`, `.ai/specs/research/walkthroughs/2026-10-15-open-exploration-session-001/report.md`, `.ai/specs/research/decisions/D05-effort-deferred.md`, `.ai/specs/research/decisions/2026-10-16-v1-scope-reduction.md`, GitHub PRs #7 and #10 and issue #6 (checked 2026-10-16), `.ai/specs/research/2026-10-15_peopels_problem_and_needs.md`, `.ai/specs/research/2026-10-15_product_goals.md`, `.ai/specs/research/2026-10-15_taskly_benchmark.md`, `AGENTS.md`, `.ai/specs/2026-10-14-authorization-layer.md`

## Decision summary

The decision is which part to build first, and on 2026-10-16 the owner narrowed it again: version 1 is a simple prototype for the owner alone. A task has a description and an estimated cost range typed by the user, and may have subtasks that carry their own estimates for the owner to keep in mind (they change nothing in the task). It also has important and urgent markers, assignment to several spaces, reordering, and completion. The only summary is future expenses, the sum of the main tasks' estimate ranges, without completed tasks (D01, D02, D04, D06, D07, D09, D13–D21; R06–R11). Real cost, payments, incurred expenses, expenses of completed tasks, effort, job order links, AI estimates, the shopping list and sharing move to version 2 (D05, D10, D11, D17, D18). A task without an estimate is left out of that total (R10).
The owner's account: they have many low-impact tasks (curtain rods, a decorative wall, pantry wall finish), forget some when choosing what to do next, and lose each task's cost in quick thinking (see Problems). Forgotten small purchases are a secondary problem (Later).
Monetization is not a goal (D03). Relayed by the owner: friends reportedly have the same problem and want to test (number unknown); the friend's account mentions no cost (A03). Testing by friends is placed after the first version because of D02.
Main uncertainty: whether seeing task costs and the future-expenses total actually changes the owner's ordering (A01), and whether typing one range per task by hand, while keeping subtask costs in mind, is acceptable effort (A02).
Next: the owner uses the first part on their own task list and reviews which functions help or don't (Kill criteria); the owner decided research with other renovators happens now (Collection plan, no date set). A04, the ranking of the two problems, is still the owner's opinion; each problem has one recent episode; the grass case lists real losses without amounts.

## Vision

A person running a home renovation with many tasks should be able to choose the next one by what it costs and how much work it is, without losing minor tasks; this is the owner's intended direction, not a demonstrated benefit. `[INTERVIEW]` interviews/2026-10-15-owner-renovating.md

## Target group and stakeholders

- Customer (pays): none (inferred from the owner saying monetization is not important). `[INTERVIEW]` interviews/2026-10-15-owner-renovating.md
- User (uses): the owner, mid-renovation in the countryside, for the first version. `[INTERVIEW]` interviews/2026-10-15-owner-renovating.md
- A friend, a new homeowner with work inside and outside the house, plans work with his wife and wants one place on his phone to see what to do and what each task entails. Relayed by the owner, not interviewed. `[INTERVIEW]` interviews/2026-10-15-friend-new-homeowner-via-owner.md
- A future owner, a first-time buyer of a developer-state flat who works full time operating construction machinery, a different person from the friend above. Attributed note, interviewer questions partly leading. `[INTERVIEW]` 2026-10-15-interview_future_owner_of_the_house.md
- A moved-in owner with finishing jobs left, working full time in an office, a friend of a friend of the interviewer. Attributed note, interviewer questions partly leading. `[INTERVIEW]` 2026-10-15-interview_owner_of_the_house.md
- Whether other friends beyond these share the problem is not known. `[ASSUMPTION]` owner's statement
- Decider for scope decisions: the owner (product owner).

## Problems, with evidence

- The owner has many tasks that do not affect their quality of life much (e.g. curtain rods, decorative wall, pantry wall finish) and forgets many of them when deciding what to do next. `[INTERVIEW]` interviews/2026-10-15-owner-renovating.md
- The owner says they "always" struggle with the task they should do now "based on my budget right now or my needs". `[INTERVIEW]` interviews/2026-10-15-owner-renovating.md
- Recently the owner chose to plant the perimeter strip; its cost left too little money for the next important and urgent task, sowing grass, so only part of the area was sown and the rest waits for money. The owner reports real losses: another bag of seed (a smaller bag is not sold), repeated soil preparation, repeating the same steps for the separate area, and daily watering of the new part that the rest of the lawn does not need (the sprinklers cannot be set for it). The owner doubts the later sowing will establish before winter (a doubt, not an outcome). Amounts were not calculated. `[INTERVIEW]` interviews/2026-10-15-owner-renovating.md
- The owner chooses by comparing a task's cost with the money available now and expected soon, and adjusts the renovation plan to that present and near-future budget. `[INTERVIEW]` interviews/2026-10-15-owner-renovating.md
- The owner "always" thinks about a task's price when choosing, but the cost of the many possible tasks is lost in quick thinking and choosing. `[INTERVIEW]` interviews/2026-10-15-owner-renovating.md
- The owner says they forget small purchases such as a door lock or glue because they belong to no big task, and forgot grass fertilizer today, for the second time; they buy small things whenever out and track them in memory or phone notes. They say the shopping list is not the biggest problem. `[INTERVIEW]` interviews/2026-10-15-owner-renovating.md
- The friend, per the owner, switched between tasks, abandoned a big one and forgot others, over and over; cost and time lost were not described. `[INTERVIEW]` interviews/2026-10-15-friend-new-homeowner-via-owner.md
- The future owner does not know where to start, what it costs or how long it takes, does not want to overpay, wants a plan of what first and what later so money does not run out for the next job, and says his Excel attempt became chaos and the apps he knows are too elaborate. `[INTERVIEW]` 2026-10-15-interview_future_owner_of_the_house.md
- The moved-in owner has no plan because they do not know costs, starts a job and finds it too expensive or lacks materials or tools, repeats estimates and lists, finds Excel, notes and paper unhelpful, and found no simple app with the functions wanted. `[INTERVIEW]` 2026-10-15-interview_owner_of_the_house.md
- The future owner says he does not know cost or how long it will take; the moved-in owner says he does not know cost or the amount of work (his "how long" is agreement to the interviewer's wording). Neither mentions payments, rooms, or markers. `[INTERVIEW]` 2026-10-15-interview_future_owner_of_the_house.md, 2026-10-15-interview_owner_of_the_house.md
- Interviewer wording shapes both notes: in the future-owner note the interviewer's summary of a simple app, including work time, is agreed to with "Tak, dokładnie" (the interviewee had also said such an app would help); in the moved-in note "Tak, dokładnie" agrees to the interviewer's "you don't know cost and time", while "no app found" is the interviewee's own; the interviewer also introduced order and blocking (future owner). `[INTERVIEW]` 2026-10-15-interview_future_owner_of_the_house.md, 2026-10-15-interview_owner_of_the_house.md
- The moved-in owner finishes step by step from what remains of the monthly pay, postponing jobs that need more money. `[INTERVIEW]` 2026-10-15-interview_owner_of_the_house.md
- Number of tasks, how often the choice goes wrong, and money lost were not described. The owner can supply them if needed (Q02).
- The team's notes claim people are overwhelmed by tasks, forget some, and struggle to pick the next one. They cite no user source and do not corroborate the owner. `[ASSUMPTION]` 2026-10-15_peopels_problem_and_needs.md

## Product and how it stands out

- What it is, as the project instructions describe the full product (version 1 is the narrower Scope above): a web app of task lists with subtasks, an AI estimate range and real cost in PLN, a shared shopping list with quick add, and a spent versus upcoming summary. `[PRODUCT]` AGENTS.md
- An authorization spec exists in the repository; its own status field still reads draft. `[PRODUCT]` .ai/specs/2026-10-14-authorization-layer.md
- The spec's design PR #7 and implementation PR #10 are merged and issue #6 is closed; the owner/editor/viewer roles it implements are not part of version 1 (D02, N02). `[DOCUMENT]` GitHub PRs #7, #10 and issue #6, checked 2026-10-16
- Competitor scan: plan, shopping and budget together already exist on the market. `[BENCHMARK]` 2026-10-15_taskly_benchmark.md, checked 2026-10-15
- The scan did not confirm per-task AI estimate with linked materials and actual cost; absence in a source does not mean absence in the market. `[BENCHMARK]` 2026-10-15_taskly_benchmark.md, checked 2026-10-15

| reference | what it does well | where it falls short for our users | checked on | link |
|---|---|---|---|---|
| Remontowy Planer | schedule, budget, shopping, rooms | not examined against the owner's problems | 2026-10-15 | https://remontowyplaner.pl/ |

The other references in the benchmark note were not compared with the owner's problems; a fuller table is deferred.

## Goals and success criteria

- Business goal: none; the owner prioritises functionality for themselves (D03).
- User outcome: the owner can look at the task list, read each task's description, see the estimated cost range of each task and the total future expenses, mark tasks completed, and order or reorder tasks. Chosen by the owner.
- Primary metric, baseline, threshold, date: none set; the owner will judge by whether it helps order and finish tasks (Kill criteria).
- What must not get worse: unknown; not discussed.

## Scope

- **Now (version 1, single user):** a task list. A task has a description and an estimated cost as a min–max range typed by the user (R07, D14); it may have subtasks, each a small task with its own estimate, which changes nothing in the task or any summary (R06, D15); tasks can be ordered and reordered; each task carries "important" and "urgent" markers (D07) and can be assigned to several rooms or spaces at once (D09); the owner can mark a task completed, which completes its subtasks (R09, D20); one summary, future expenses, is the sum of the main tasks' estimate ranges without completed tasks (R08, D19) (D01, D02, D13).
- **Later (version 2):** real cost and payments, with the model still to be refined (D17); the incurred-expenses figure and the expenses of completed tasks, a single value that is not a range (D18); marking which job must come before which (D10, Q12); an effort level and assessment of the amount of work (D05); AI estimates of cost for subtasks and tasks (D04, D11); a phone-friendly quick shopping list; sharing and testing by friends.
- **Not doing:** see Non-goals.

## Domain glossary

| Term | Meaning | Owned by | Visible to |
|---|---|---|---|
| Main task | A task that is not a subtask | owner | owner |
| Task | A piece of renovation work with a description and an estimated cost range | owner | owner |
| Subtask | A small task inside a task, with its own description, markers, spaces and estimated cost (e.g. priming, decorative plaster, impregnation, TV mount); its estimate is informational (R06) | owner | owner |
| Space | A room or area of the house or garden; a task can be assigned to several at once | owner | owner |
| Future expenses | The sum of the minimums and the sum of the maximums of the estimates of main tasks that are not completed (R08); replaces "future spend" | owner | owner |
| Incurred expenses | Version 2 name, replaces "spent"; no figure in version 1 (D17, D18) | owner | owner |
| Expenses of completed tasks | Version 2 name for a separate category; a single value, not a range; no figure in version 1 (D18) | owner | owner |
| Completed task | A task the owner has marked completed; its subtasks become completed (R09); it leaves future expenses (R08). Replaces "finished task" | owner | owner |
| Estimated cost | Money in PLN typed by the user as a min–max range, on a task or on a subtask (R01, R07); never computed from subtasks in version 1. AI estimates come later (D11) | owner | owner |
| Real cost | Version 2; not in version 1 (D17) | owner | owner |

## Key flows

- Current state: the owner keeps small purchases in memory or phone notes; how tasks are tracked today was not described (Q02). `[INTERVIEW]` interviews/2026-10-15-owner-renovating.md
- Per the owner, the friend relies on memory and his wife; at work he uses an application for registering work and vehicles. `[INTERVIEW]` interviews/2026-10-15-friend-new-homeowner-via-owner.md
- The future owner tried to plan in Excel and it became chaos; the moved-in owner uses Excel, notes and paper. `[INTERVIEW]` 2026-10-15-interview_future_owner_of_the_house.md
- Future state: the owner looks at the task list, reads a task's description, sees its estimate range and the future-expenses total, opens its subtasks, marks tasks completed, and orders or reorders; screen details not discussed and not invented.

## Business rules

| Id | Rule | Applies to | Source | Status | Review by | Required path to change | Owner | Supersedes |
|---|---|---|---|---|---|---|---|---|
| R01 | Money is PLN only, stored as integers in grosze; estimates are a min–max range | all money | `[PRODUCT]` AGENTS.md | active | unknown | owner approves a superseding row | owner | none |
| R02 | A task with subtasks takes its cost from them; a task without subtasks has its own cost | tasks | `[INTERVIEW]` interviews/2026-10-15-owner-renovating.md | superseded | after first use | owner approves a superseding row | owner | none |
| R03 | A payment is recorded with a money amount and a date (no quantity of items), against a subtask or against the whole task. If the task has its own payment, its subtasks' payments do not count; otherwise the task's spend is the sum of its subtasks' payments | spend summaries | `[INTERVIEW]` interviews/2026-10-15-owner-renovating.md | superseded | after first use | owner approves a superseding row | owner | none |
| R04 | A task or subtask has an estimated cost as a min–max range, typed by the user in the first version, and a real cost that is the sum of its recorded payments; the estimate stays visible after the real cost exists. R02's "cost" is the estimated cost. Spent is the sum of real costs; future spend is defined in R05 | tasks, summaries | `[INTERVIEW]` interviews/2026-10-15-owner-renovating.md | superseded | after first use | owner approves a superseding row | owner | none |
| R05 | Future spend of a task is its estimated range minus its real cost so far, never below 0 (the agent's reading of rule B for a range); a task the owner has marked finished counts as 0; a task with no payments and not finished counts its full range. Total future spend is the sum over tasks | summaries | `[INTERVIEW]` interviews/2026-10-15-owner-renovating.md | superseded | after first use | owner approves a superseding row | owner | R04 (its future-spend sentence) |
| R06 | A subtask has its own estimated cost range typed by the user; it changes nothing in its task's estimate or in any summary; the user keeps subtask costs in mind when typing the task's estimate | tasks, subtasks | `[INTERVIEW]` interviews/2026-10-15-owner-renovating.md (Follow-up 16) | active | after first use | owner approves a superseding row | owner | R02; R04 (its subtask-estimate half) |
| R07 | A task has an estimated cost as a min–max range typed by the user; version 1 has no real cost, payment or incurred figure | tasks, summaries | `[INTERVIEW]` interviews/2026-10-15-owner-renovating.md (Follow-up 16) | active | after first use | owner approves a superseding row | owner | R03; R04 (its real-cost half); R05 |
| R08 | Future expenses is a min–max range: the sum of the minimums and the sum of the maximums of the estimates of main tasks that are not completed; subtask estimates are not counted (the sum of minimums and of maximums is the agent's reading of "also min–max"); a task with no estimate is left out (Q16) | summaries | `[INTERVIEW]` interviews/2026-10-15-owner-renovating.md (Follow-up 16) | active | after first use | owner approves a superseding row | owner | R05 |
| R09 | Marking a main task completed marks all its subtasks completed; completed tasks leave future expenses (R08) | tasks, summaries | `[INTERVIEW]` interviews/2026-10-15-owner-renovating.md (Follow-up 16) | active | after first use | owner approves a superseding row | owner | D12 |
| R10 | A task without an estimate is left out of future expenses (the owner's answer to Q16) | summaries | `[INTERVIEW]` interviews/2026-10-15-owner-renovating.md (Follow-up 17) | active | after first use | owner approves a superseding row | owner | none |
| R11 | A subtask can be completed alone; completing all subtasks does not complete the task. A completed task can be reopened by the user, and a completed subtask can be reopened by the user; a reopened task returns to future expenses. Reopening a task does not reopen its subtasks (the agent's reading of "by user") | tasks, subtasks, summaries | `[INTERVIEW]` interviews/2026-10-15-owner-renovating.md (Follow-up 17) | active | after first use | owner approves a superseding row | owner | none |

## Non-goals

| Id | We are not building | Why | Owner | Status | Review by | Required path to change | Source | Supersedes |
|---|---|---|---|---|---|---|---|---|
| N01 | Monetization (pricing, payments) | owner says it is not important | owner | proposal | when the audience grows | owner approves a superseding row | `[INTERVIEW]` interviews/2026-10-15-owner-renovating.md | none |
| N04 | Storing the owner's available or expected money | owner: "Dont store money to spand, just show task cost" | owner | proposal | after first use | owner approves a superseding row | `[INTERVIEW]` interviews/2026-10-15-owner-renovating.md | none |
| N02 | Sharing and invitations in the first version | first version is for the owner alone | owner | proposal | when friends are added | owner approves a superseding row | `[INTERVIEW]` interviews/2026-10-15-owner-renovating.md | none |
| N03 | The benchmark's wider MVP as the starting scope | the owner starts with their own biggest problem; the benchmark is a competitor scan whose proposed MVP is the team's belief, not demand evidence | owner | proposal | after first use | owner approves a superseding row | `[DOCUMENT]` 2026-10-15_taskly_benchmark.md | none |

## Decisions

| Id | Date | Decision | Why | Owner | Status | Review by | Required path to change | Source | Supersedes |
|---|---|---|---|---|---|---|---|---|---|
| D01 | 2026-10-15 | Build first a task list with subtasks and reordering, with cost per subtask entered by the user; the quick shopping list comes later | Owner stated: "Shoping list is not the bigest problem", and described the many low-impact tasks as the main problem. That this part is built first is the agent's reading, for the owner to confirm. Alternative considered: shopping list first | owner | active | after first use | owner approves a superseding row | `[INTERVIEW]` interviews/2026-10-15-owner-renovating.md | none |
| D02 | 2026-10-15 | First version is for the owner alone | owner's statement | owner | active | when friends are added | owner approves a superseding row | `[INTERVIEW]` interviews/2026-10-15-owner-renovating.md | none |
| D03 | 2026-10-15 | Functionality for the owner over monetization | owner's statement | owner | active | when the audience grows | owner approves a superseding row | `[INTERVIEW]` interviews/2026-10-15-owner-renovating.md | none |
| D04 | 2026-10-15 | Costs are filled in by the user first (for a subtask, or for a task without subtasks); AI estimates for subtasks and tasks come in a future version | owner's statement | owner | active | after first use | owner approves a superseding row | `[INTERVIEW]` interviews/2026-10-15-owner-renovating.md | none |
| D05 | 2026-10-15 | Effort and assessment of the amount of work are a next-version feature; the owner can drop effort from the first version | Owner's statements, restated with the two newer notes in view; the agent's recommendation was accepted: first version is for the owner alone and cost is the essential part. Alternative considered: bring a simple effort level back | owner | active | when someone other than the owner tests the app, or if the owner finds that ordering tasks needs it | owner approves a superseding row | `[INTERVIEW]` interviews/2026-10-15-owner-renovating.md; decisions/D05-effort-deferred.md | none |
| D06 | 2026-10-15 | The app shows task costs; it does not store the owner's money to spend | Owner stated: "Dont store money to spand, just show task cost"; the owner still compares costs with their available and expected money themselves | owner | active | after first use | owner approves a superseding row | `[INTERVIEW]` interviews/2026-10-15-owner-renovating.md | none |
| D07 | 2026-10-15 | A task carries two separate markers, "important" and "urgent" | owner's statement: "something can be important to me but not urgent"; it matches the grass-sowing case | owner | active | after first use | owner approves a superseding row | `[INTERVIEW]` interviews/2026-10-15-owner-renovating.md | none |
| D08 | 2026-10-15 | The first part summarizes spends and future spend; a cost counts as spent when the owner records a payment | owner's statements | owner | superseded | after first use | owner approves a superseding row | `[INTERVIEW]` interviews/2026-10-15-owner-renovating.md | none |
| D09 | 2026-10-15 | A task can be assigned to several rooms or spaces at once | owner's statement; example: curtain rod installation in the bathroom, living room and dining room | owner | active | after first use | owner approves a superseding row | `[INTERVIEW]` interviews/2026-10-15-owner-renovating.md | none |
| D10 | 2026-10-15 | Marking which job must come before which is listed in Later, not in the first version | Owner stated it in the refresh session; both newer notes ask about order, partly in the interviewer's wording, and a synthetic panel raised it (H4) | owner | active | after first use | owner approves a superseding row | `[INTERVIEW]` interviews/2026-10-15-owner-renovating.md; decisions/2026-10-15-confirmation-d01-d09.md | none |
| D11 | 2026-10-15 | Estimated cost is typed by the user in the first version; AI-calculated estimates are a later version and are not part of the first | owner's statements: "estimate can be input by user right now, for the future can be calculated by AI"; AI estimates are not part of the first version. Refines D04 without changing it | owner | active | after first use | owner approves a superseding row | `[INTERVIEW]` interviews/2026-10-15-owner-renovating.md; decisions/2026-10-15-confirmation-r02-r03-d11.md | none |
| D12 | 2026-10-15 | The owner can mark a task as finished | owner's statement, with rule B for future spend: "rule b and add that task is marked as finish by user" | owner | superseded | after first use | owner approves a superseding row | `[INTERVIEW]` interviews/2026-10-15-owner-renovating.md; decisions/2026-10-15-confirmation-r02-r03-d11.md | none |
| D13 | 2026-10-16 | Version 1 is a simple prototype for the owner; the features listed under Later move to version 2 | owner's statement that some features move to version 2 and the first prototype should be simple and for the owner; which features move (the Later list) is the agent's mapping, to be confirmed | owner | active | after first use | owner approves a superseding row | `[INTERVIEW]` interviews/2026-10-15-owner-renovating.md (Follow-up 16); decisions/2026-10-16-v1-scope-reduction.md | none |
| D14 | 2026-10-16 | A task has a description | owner's statement | owner | active | after first use | owner approves a superseding row | `[INTERVIEW]` interviews/2026-10-15-owner-renovating.md (Follow-up 16); decisions/2026-10-16-v1-scope-reduction.md | none |
| D15 | 2026-10-16 | A task may have subtasks; a subtask is a small task inside a task and has its own estimated cost, which changes nothing in the main task; the user keeps subtask costs in mind when typing the main task's estimate | owner's statement; reverses R02 and replaces D01's cost-per-subtask clause | owner | active | after first use | owner approves a superseding row | `[INTERVIEW]` interviews/2026-10-15-owner-renovating.md (Follow-up 16); decisions/2026-10-16-v1-scope-reduction.md | R02; D01 (its cost-per-subtask clause) |
| D16 | 2026-10-16 | The estimate is typed by the user as a min–max range, not counted from subtasks and not AI-estimated | owner's statements; the range follows Q14 | owner | active | after first use | owner approves a superseding row | `[INTERVIEW]` interviews/2026-10-15-owner-renovating.md (Follow-up 16); decisions/2026-10-16-v1-scope-reduction.md | D04 (its subtask-only clause) |
| D17 | 2026-10-16 | Inputting real cost and payments is removed from version 1; the real-cost model is to be refined for version 2 | owner's statement that real cost input is removed from version 1 and the real-cost model needs refining | owner | active | when the real-cost model is specified | owner approves a superseding row | `[INTERVIEW]` interviews/2026-10-15-owner-renovating.md (Follow-up 16); decisions/2026-10-16-v1-scope-reduction.md | D08 |
| D18 | 2026-10-16 | Naming: "future expenses", "incurred expenses" and a separate category "expenses of completed tasks" replace "spent" and "future spend"; only future expenses exists in version 1. Expenses of completed tasks is a single value, not a range, so a completed task's estimate cannot be counted into it | owner: "spent and spend are misleading"; the single-value rule is the owner's answer of the same day | owner | active | when the real-cost model is specified | owner approves a superseding row | `[INTERVIEW]` interviews/2026-10-15-owner-renovating.md (Follow-up 16); decisions/2026-10-16-v1-scope-reduction.md | none |
| D19 | 2026-10-16 | The only summary in version 1 is future expenses, a min–max range over main tasks (R08) | owner's statements; the way the range is summed (R08) is the agent's reading | owner | active | after first use | owner approves a superseding row | `[INTERVIEW]` interviews/2026-10-15-owner-renovating.md (Follow-up 16); decisions/2026-10-16-v1-scope-reduction.md | D08 (its summary part) |
| D20 | 2026-10-16 | The owner can mark a task completed; this completes its subtasks and removes the task from future expenses (R09) | owner's statements; the owner first said completion changes only status, then said in the same session that a completed task must drop out of future expenses; the later answer is used | owner | active | after first use | owner approves a superseding row | `[INTERVIEW]` interviews/2026-10-15-owner-renovating.md (Follow-up 16); decisions/2026-10-16-v1-scope-reduction.md | D12 |
| D21 | 2026-10-16 | A subtask also has a description, markers (important, urgent) and spaces | owner's answer to Q17 | owner | active | after first use | owner approves a superseding row | `[INTERVIEW]` interviews/2026-10-15-owner-renovating.md (Follow-up 17); decisions/2026-10-16-v1-scope-reduction.md | none |

## Riskiest assumptions

| Id | Assumption | Importance | Evidence today | If false | Smallest test | Owner | By when | Result |
|---|---|---|---|---|---|---|---|---|
| A01 | Seeing the estimated cost per task and the future-expenses total (not only having a list) will change how the owner orders tasks and help finish them `[ASSUMPTION]` owner's expectation | high | the owner's stated expectation; no use yet | the list may still help remembering, but cost and the budget view add nothing; drop them or change direction | use it on the owner's own tasks; note which functions are used and whether ordering or finishing changes (the owner's stated review) | owner | unknown | untested |
| A04 | The owner's task-choosing problem hurts more than forgotten purchases `[ASSUMPTION]` owner's ranking, stated | high | the owner's stated priority; one recent episode for each problem; the grass case lists real losses (seed, soil preparation, repeated steps, watering) with no amounts, the fertilizer case none | the shopping list becomes the first part (D01 changes) | owner compares the amounts lost in the two episodes and any other cases | owner | unknown | untested |
| A02 | The owner can type one min–max range per task by hand at acceptable effort, keeping subtask costs in mind without a roll-up, and without AI `[ASSUMPTION]` owner chose manual entry first (D04) | high | none; nobody has tested the effort. The benchmark lists manual data entry as a recurring risk of mature tools, and the goals note names accurate AI estimates as the main challenge |  the list stays empty or untrusted; AI estimates would move earlier | enter ranges for the owner's real tasks and subtasks and see how long it takes and whether the owner trusts them (Q02) | owner | unknown | untested |
| A03 | People beyond the owner also have the problem, and a list of tasks with costs helps them `[ASSUMPTION]` owner's statement | medium | one relayed account of a friend; two further attributed notes (future owner, moved-in owner) describe not knowing costs, time or order, and a wish for a simple tool; none mentions payments, rooms or markers; leading interviewer questions weaken the app-need lines | scope stays personal; no effect on the first version | ask the friend(s) directly about their last renovation week and watch them use the first version (Q04) | owner | unknown | untested |

## Kill criteria

If the app does not help the owner order and finish tasks, the owner will look at it and find which function makes them stop using it or does not help, then decide. The owner says cost is the essential part and effort can be dropped. This is the owner's stated review process; no stop number was set. `[INTERVIEW]` interviews/2026-10-15-owner-renovating.md

## Hypotheses to test

From one synthetic panel (adversary stance, 2 runs × 3 personas, open exploration, built from the two newer notes only; saturation not reached, parity skipped, two of six personas are assumption personas, and H1's "fifteen jobs" is an interviewer-set pressure); hypotheses, not evidence. Source: `walkthroughs/2026-10-15-open-exploration-session-001/report.md`. The two real notes behind it are the same two voices twice, and the panel was built partly from a mistaken line (below). Each has a real check.

- H1: Nothing useful appears until a lot has been typed in, so the persona stops (all six personas, both runs). `[SYNTHETIC]` Check: observe a first sitting with real renovators' own job lists. Touches A02, D04.
- H2: People may not trust, or may leave gaps in, numbers they type themselves (four personas, both runs). `[SYNTHETIC]` Check: ask how the last cost figure was reached and whether it was later corrected. Touches A02.
- H3: People fear one more list that is abandoned like the others, and would not move an old list in (four personas, both runs). `[SYNTHETIC]` Check: ask what happened to their last list; observe migration. Touches A01.
- H4: Order and blocking matters more than a plain list (four personas, both runs). `[SYNTHETIC]` Check: ask how they chose the order last time; test manual reordering (Q12).
- H5: Time or amount of work per job is wanted (four personas, both runs); one note's own words support the time half and the other's the work half (see Problems). `[SYNTHETIC]` Check: ask which of cost, time and work they check first.
- H6: Money available month by month decides what is done (two personas, both runs). `[SYNTHETIC]` Check: ask where they keep the month's available money today. Touches D06.
- H7: Unplanned tools and materials add cost after a job starts (two personas, both runs). `[SYNTHETIC]` Check: ask about the last unplanned purchase.
- H8: Future owners want a view of the necessary minimum for a loan decision (two personas, both runs). `[SYNTHETIC]` Check: ask future owners how they decide about a loan.
- H9: Two-tap capture like the work app matters (two personas, both runs). `[SYNTHETIC]` Check: observe the time of a first entry.

Correction to the panel: its persona lines said "an acquaintance" advised designing the kitchen early; in the future-owner note that advice is the interviewer's, and the interviewee says he would have had to redo the walls, and thanks the interviewer. H4 still stands on the moved-in owner's question whether a job is worth doing before or after another, but that episode is not the panel's.

## Open questions

| Id | Question | Blocking | Who can answer | Status |
|---|---|---|---|---|
| Q01 | Closed for now: effort is deferred (D05); the levels are decided when it is specified | no | owner | closed |
| Q02 | How many tasks are on the owner's list today and how are they tracked now? | no | owner | open |
| Q03 | Resolved 2026-10-15: costs are user-entered first (D04), effort is deferred (D05) | no | owner | closed |
| Q04 | Does the friend need cost per task, or only a shared list, and would he and his wife both use it (the two newer notes do not answer this)? | no for the owner's own use; yes for any work for friends | friends | open |
| Q05 | Resolved 2026-10-15: the owner compares cost with money available now and expected soon (D06) | no | owner | closed |
| Q08 | Resolved 2026-10-15: show task costs only, do not store money to spend (D06) | no | owner | closed |
| Q09 | Resolved 2026-10-15: a cost is spent when a payment is recorded (D08); important and urgent are separate markers (D07) (superseded for version 1 by D17, D19) | no | owner | closed |
| Q10 | Resolved 2026-10-15: a payment has a date and is attached to a subtask or a task (R03) (superseded for version 1 by D17) | no | owner | closed |
| Q11 | Resolved 2026-10-15: a payment holds a money amount and a date; a quantity of items is not needed (R03) (superseded for version 1 by D17) | no | owner | closed |
| Q12 | Is manual reordering enough to decide the order of jobs, or is a mark for which job blocks which needed? | no; Later (D10) | owner | open |
| Q13 | Resolved 2026-10-15: rule B, future spend is the estimate minus the real cost so far, and a task the owner marks finished counts as 0 (R05, D12) (superseded for version 1 by D17, D19) | no | owner | closed |
| Q15 | Resolved 2026-10-16: marking a main task completed completes its subtasks (R09); a subtask can be completed alone and completing all subtasks does not complete the task (R11) | no | owner | closed |
| Q14 | Resolved 2026-10-15: a typed estimate is a min–max range (R01, now R07) | no | owner | closed |
| Q06 | Resolved 2026-10-15: the perimeter-strip planting used money needed for the urgent grass sowing (see Problems) | no | owner | closed |
| Q07 | Resolved 2026-10-15: effort can be dropped for now; cost is the essential part (D05) | no | owner | closed |
| Q16 | Resolved 2026-10-16: a task without an estimate is left out of future expenses (R10) | no | owner | closed |
| Q17 | Resolved 2026-10-16: a subtask also has a description, markers and spaces (D21) | no | owner | closed |
| Q18 | Resolved 2026-10-16: a completed task or subtask can be reopened by the user; reopening a task does not reopen its subtasks, which is the agent's reading (R11) | no | owner | closed |

## Definition of Ready addendum (own)

Problems have support from the owner's first-hand account, which also fixes the target user as the owner, and from three other people's accounts (a relayed friend and two attributed notes) two of them attributed notes that describe not knowing costs, time or order, with leading interviewer questions in both; the relayed friend describes switching and forgetting tasks, with no cost. None of those accounts addresses rooms, markers or typing costs by hand (A02). The Now scope, reduced on 2026-10-16, is a single-user experiment on the owner's own renovation; D01–D07, D09–D11 are active, confirmed by the owner on 2026-10-15; D13–D21 and R06–R11 were confirmed by the owner on 2026-10-16; R01 is a product rule from AGENTS.md. Q15–Q18 are settled (2026-10-16). Not ready for work aimed at others, including shared use with a partner, until Q04 is answered or the owner decides otherwise.

## Collection plan

### Does the friend need cost per task, and would he and his wife both use the app?

- What decision or work needs it: whether friends' needs go into scope (A03)
- Who can answer it: the friend, directly, and the owner for what is known
- How: short direct interview using the interview note template; watch him use the first version later
- Owner and by when: owner; date unknown
- Template: `.ai/specs/research/templates/interview-note.md`

### (Owner decided this happens now) Can renovators from both segments enter their real jobs and costs, and does it change how they order them?

- What decision or work needs it: whether typing costs by hand is acceptable (A02) and whether the list changes ordering (A01, H1–H3)
- Who can answer it: a future owner and a moved-in owner, in person
- How: watch a first sitting with their own job list on the first version or a clickable prototype, then ask what happened to their last list
- Owner and by when: owner; date unknown
- Template: `.ai/specs/research/templates/interview-note.md`
