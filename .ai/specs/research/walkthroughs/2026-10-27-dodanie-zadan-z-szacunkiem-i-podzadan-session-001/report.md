# Walkthrough: dodanie zadań z szacunkiem i podzadań, `.ai/prototypes/discovery/task-list-v1/revision-001/index.html`, 2026-10-27

The most consequential repeated hypothesis: none of the four personas would keep subtask costs in their head and type the task's own figure, which is what R06/D15 asks of the user. Each would put one rough range on the task and leave the parts unpriced or not split at all, and each changed that choice when the parts added up by themselves. On screen, three of them could not tell where a subtask's money goes. The real check is the collection plan's first sitting: a future owner and a moved-in owner, each splitting one of their own jobs. Watch whether they type part estimates and a separate task estimate, and ask how they got the task's figure. Every finding below is `[SYNTHETIC]` and does not satisfy the Definition of Ready.

Stance: validate (chosen by the user; the brief's mode `own` would default to adversary)
Panel: 2 runs × 2 personas; run 1: P07, P08; run 2: P09, P10
Basis: `product-brief.md` Target group (segments); two attributed notes listed in `SOURCES.md` for profiles: FO `2026-10-15-interview_future_owner_of_the_house.md`, MO `2026-10-15-interview_owner_of_the_house.md` (`[INTERVIEW]`, attribution only, leading interviewer questions in both); the prototype's README and screens (`[PRODUCT]`, a simulation). The owner's note and the friend's relayed note were not used to build personas.
Panel snapshot: `personas.md` in this session (P07–P10, with source tags)
Session: `.ai/specs/research/walkthroughs/2026-10-27-dodanie-zadan-z-szacunkiem-i-podzadan-session-001/`; subject `.ai/prototypes/discovery/task-list-v1/revision-001/index.html`; flow "dodanie zadań z szacunkiem i podzadań", mapped to Key flows → Future state (add a task with an estimate, add subtasks with estimates), agreed with the user before the panel ran
Composition: assumed. No data gives segment proportions. Each run had one FO persona (topic central) and one MO persona in the low-salience seat, with that salience sourced from MO ("nie przeszkadzają w życiu codziennym", "po pracy nie chce się"). Two notes means two voices sampled twice: the panel is homogeneous by construction (see Quality and limits).
Saturation: not reached. In the window of the last three interviews (P08, P09, P10; about 50 topics), about 15 were new, roughly 3 in 10 against a threshold of 1 in 20. More runs would still add topics, but they would come from the same two notes.
Parity: skipped. There was no `--hold-out`, both FO and MO were needed to build the panel, and all four notes share one date, so none is "newest". No held-out note exists for this flow.
Elapsed: setup, reading and composition until 11:38; run 1 (interviews and walks) 11:38–11:49; run 2 11:49–11:57; consolidation and writing 11:57–12:10
Not askable of this panel: A01 (whether seeing costs changes the *owner's* ordering) and A04 (the *owner's* ranking of their two problems). Both are about the owner, who is the version-1 user (D02) and is not in this panel. A02 and A03 were asked.

## 🎯 Scope and limits

- **Medium:** the static discovery prototype, opened with agent-browser 0.39.1 (`file://`, 1280×900), one fresh browser session per persona. It started from "Start with an empty list", so each persona typed their own jobs. No sign-in. Nothing typed leaves page memory.
- **Walked:**
  - quick add (title, Add)
  - the "Details" disclosure (description, Min/Max)
  - Edit (estimate, description, markers, places)
  - Add subtask with and without an estimate
  - the future-expenses total
  - the "N tasks without an estimate" line
  - Move up/down as seen
- **Not walked:**
  - completion and reopening
  - delete
  - save and load failure states
  - the 360px width
  - reordering by click (proposed by no persona)

  These belong to the README's wider flow, not to this one.
- **Actor mismatch:** the prototype's actor is the owner alone (D02, D13). These personas come from other segments, so their friction bears on A02 for those segments and on A03. It says nothing about the owner's own version-1 use.
- **Interviewer contamination, recorded at the steps it affects:**
  - Run 1 asked the decision simulations before the walk. DS2's wording ("the parts' figures do NOT add up into the job") told P07 and P08 the subtask rule before they met the screen.
  - At step 6 the interviewer told P07 that "Details" can be clicked.
  - Run 2 moved the simulations after the walk and gave no hints. Run 2's subtask observations are therefore unprimed.
- **Language:** the screens are in English and the personas speak Polish. That they can read the labels is an `[ASSUMPTION]` in every persona, so wording findings only point at a check.

## 🔍 Barriers that repeated (worst first, ties marked)

All three barriers are tied: the gaps between their weights are not larger than their spreads.

### 1. The estimate can't be found while adding, so every price costs a second trip through Edit

[SYNTHETIC]

Weight: 4; spread: ±0; personas: P07, P08 (run 1), P09, P10 (run 2). Tied with 2 and 3.

The quick-add form shows only Title and Add. The estimate sits behind "Details", which all four read as a label rather than a control:
- P08: "plain text, not a button"
- P09: "something to click or just a word"
- P10: "I've never found out"

No persona opened it in the New task form. P07 opened it in the subtask form only after an interviewer hint (step 6).

All four added a title, saw "No estimate", guessed "Edit", and typed the range there (📸 `screenshots/run-1-P08-step-02.png`, `run-2-P10-step-03.png`). P10: "nothing on the row said 'add a cost here'". The low-salience seats say what this costs over an evening. P08: "In the evening I won't bother doing that for each one". P10: "the extra step I'd get tired of".

This touches A02 (acceptable effort to type a range per task) and A-P07 (quick add takes an estimate through Details). If it holds, ranges get typed later or never, and R10 leaves those tasks out of future expenses.

Real check: in the first sitting, give a renovator from each segment their own list of five jobs, say nothing about Details, and record whether the first estimate goes in at add time and how long each priced job takes.

### 2. The only form the personas found for the estimate reads as the "milion informacji" they refuse

[SYNTHETIC]

Weight: 4; spread: ±0; personas: P07, P08 (run 1), P09, P10 (run 2). Tied with 1 and 3.

The edit form shows Title, Description, Min/Max, Markers and seven Places (📸 `screenshots/run-1-P08-step-03.png`, `run-2-P09-step-03.png`):
- P08's fast reaction: "Oh, that's a lot of boxes for a skirting board". Mild wariness, close to moderate, then relief at "(optional)".
- P09: "close to too elaborate".
- P10: "starts to feel like the milion informacji".

All four skipped Markers and Places every time. MO's "nie… skomplikowane wpisywanie miliona informacji" and FO's "za bardzo rozbudowane" are the refusals in their material.

This touches A02 and D07/D09/D21: the markers and places the owner asked for went unused by every persona from the other segments.

Real check: the same sitting. Count which fields people fill in when they price a job, and ask afterwards which ones they would remove.

### 3. Where a subtask's money goes is unclear, and when it is noticed it feels lost

[SYNTHETIC]

Weight: 3; spread: ±1; personas: P07 (run 1, primed), P09, P10 (run 2, unprimed). Tied with 1 and 2.

- **P07** priced a subtask at 3 000–6 000 zł, then saw "Łazienka" still showing "No estimate" and an unchanged total (📸 `screenshots/run-1-P07-step-08.png`). Fast reaction: "Wait, so the plumbing doesn't count?" Disappointment, strong. He stopped the walk.
- **P09**, unprimed, after adding "nowe gniazdka": "If I price the sockets too, does it count twice, or does it replace that number?" (📸 `run-2-P09-step-06.png`).
- **P10**, unprimed, after adding the corner saw as a subtask: "two places for the same money: inside the 400–900 or separate? The screen doesn't say." (📸 `run-2-P10-step-09.png`).
- **P08** never tried subtasks. His run-1 reason leaked from DS2, and he withdrew it himself.

Nothing on screen says that a subtask's range is informational (R06). "0/1 subtasks" also read as ambiguous to P07 ("done, or with an estimate?").

This touches R06/D15 and A02. Run 1's instance was primed, so the unprimed evidence is run 2 only.

Real check: in the first sitting, ask a renovator to price one part of a job, then ask "what is the whole job going to cost now, and where does it say so?"

## 📋 Missing cases that repeated

**Tired-evening capture leaves jobs unpriced, and the list doesn't say which ones need a price**

[SYNTHETIC]

- **Decision simulation (DS1):** asked to add a job in about thirty seconds after work with optional Min/Max, all four left the boxes empty (P08 only filled them if a number came at once). All four filled a rough range when given a free weekend. Weight 4; spread ±0; P07, P08 (run 1), P09, P10 (run 2). Time is the pressure that flips the decision.
- **On screen:** the line "1 task without an estimate…" names neither the task nor how to give it one. Weight 3; spread ±1:
  - P07: "I'd rather it named which one"
  - P09: "I'd have to remember which jobs I haven't priced"
  - P10: "not how to fix that"
- **What P09 valued:** the line as a reminder ("a made-up number is worse than none").

This touches R10 (unpriced tasks left out of the total) and A02: the empty estimate looks like the common first state.

Real check: over the owner's first week of use, or the renovators' first two sittings, count tasks still without an estimate at the end of each sitting and ask how they find them again.

**No help with which job comes first**

[SYNTHETIC]

Weight: 3; spread: ±1; P07 (run 1), P09, P10 (run 2).

- **What they liked:** three personas welcomed Move up/Move down as a way to set kolejność. P07: "That's the thing I was missing".
- **What they still lacked:**
  - P07: "this has to be done before the gładzie"
  - P09 wants advice ("electrics and plumbing before gładzie")
  - P10 wants nakład pracy, a dirty-job flag, and what fits this month's money

This touches D10 and Q12 (dependencies are Later) and synthetic H4.

Real check: Q12 with real renovators. Ask how they chose the order last time, then watch whether manual reordering is enough for their own list.

**Move up/Move down one step at a time is slow on a longer list**

[SYNTHETIC]

Weight: 4; spread: ±0; P07, P08 (run 1), P09, P10 (run 2). P08 asked for dragging.

This is a known prototype simplification (A-P02). The product's stack includes drag and drop (dnd-kit), so the check is the product's reordering, not the prototype's.

Real check: watch whether people try to drag during the first sitting (A-P02's own check).

**Places don't fit a flat or a whole-flat job**

[SYNTHETIC]

Weight: 2; spread: ±0; P07 (run 1), P09 (run 2).

- P07: electrics run through every room ("do I tick all of them or none?")
- P09: the fixed set has Garden and Pantry but no bedroom or pokój

This touches A-P01 (fixed sample places) and D09.

Real check: ask a flat owner to assign their own jobs to places and record which places they need that the set lacks.

**Self-typed numbers are guesses they don't trust**

[SYNTHETIC]

Weight: 3; spread: ±1; P07 (run 1), P09, P10 (run 2).

- P07 (interview): "I don't really trust those numbers".
- P09 on the saved total: "only as good as my guessing". On the edit form: "It only stores a number I already have to know."
- P10 on the form: "I don't really know what Min and Max should be. I'm guessing."

This touches A02, D11 (AI estimates later) and synthetic H2.

Real check: ask how the last cost figure was reached and whether it was corrected later, which is H2's own check.

## ⚠️ Contradictions with the brief

**R06/D15 expects the user to keep subtask costs in mind when typing the task's estimate; no persona would**

[SYNTHETIC]

Weight: 4; spread: ±0; P07, P08 (run 1), P09, P10 (run 2). Source: DS2.

The persona was told that splitting a job into priced parts leaves the parts out of the task's figure, and that the task's figure must be typed by hand. Under that pressure:
- **P07** would split, then leave the task's total empty or untrusted: "feels like Excel again".
- **P08** would not split.
- **P09** would add the parts as names to tick off and put one figure on the job: "If the app doesn't count it, I won't do it."
- **P10** would add the parts as names (to plan the dirty step) and put one figure on the job.

When the parts add up by themselves, all four change their choice (P10 only partly; he worries that an empty part makes the total look too low).

Their material grounds this: FO "jakbym rozbił sobie to na części pierwsze mógłbym to lepiej oszacować" and MO "w kółko powtarzam szacunki". This attacks A02's "keeping subtask costs in mind without a roll-up".

Run 1's answers came before the walk and run 2's after it. The behaviour is the same in both.

Real check: the first sitting. A future owner and a moved-in owner each split one of their own jobs. Record whether they type part ranges, whether they type a task range, and how they got it.

**N04/D06 store no available money; three personas want the total set against money available or a loan**

[SYNTHETIC]

Weight: 3; spread: ±1; P07 (run 1), P09, P10 (run 2).

- P07: "nowhere to put how much money we have, so I can't see if it will run out partway through".
- P09: no way to separate the konieczne minimum (for a loan) from later jobs.
- P10: "The total is just a sum. It doesn't help me say 'this month the kitchen, the listwy after I save up'". He also said he would not expect the app to know that without being told.

The owner decided this for their own use (D06). For other segments it repeats synthetic H6 (money month by month) and adds a minimum-for-a-loan split (H8).

Real check: H6's and H8's own checks. Ask where this month's available money is kept today, and ask future owners how they decided the loan amount.

## 🔍 Outliers

**P09 (run 2)** puts the deepest objection on its own:

> The app only holds the numbers and the order I already have to know. It doesn't tell me what a job consists of, what it roughly costs, or what comes first, and without that the total is still my guess.

He opened "Add subtask" hoping for suggestions of what electrics consist of and found "just an empty box". The flow cannot answer this: user-typed estimates are the version-1 decision (D11, D16), and AI estimates are Later. For a first-time buyer who doesn't know "co się na to składa", the list may stay a list of headings, which is how his own Excel attempt ended.

**P07 (run 1)** is the only persona who quit over a product rule: he stopped the moment a priced subtask counted nowhere. His expectation was primed by DS2, so the strength of the reaction is not evidence. The unprimed confusion of P09 and P10 is.

**P08 (run 1)** stopped contented after two priced jobs. His only reservation was whether the list would still be there next time ("That's the whole point"). This is the low-salience seat behaving as the material suggests: a short session, no splitting, and coming back only if the list persists.

## 🔁 Seen once, not reported as a finding

- Whether the list is kept between sessions (P08, run 1).
- An expectation that the app suggests a price range or a job's parts (P09 and P10, run 2 only).
- Materials and tools that must be bought have no place except the description. A subtask is unclear as a work step versus a purchase (P10, run 2).
- "0/1 subtasks" ambiguous; the task checkbox's meaning is unlabelled (P07, run 1). P09 read the checkbox as "the tick from my work app" (run 2).
- In the subtask form, Add sits above the estimate fields, so someone in a hurry might click Add first (P07, run 1).
- The add-subtask form stays open after adding and lengthens the page ("on a phone… a lot of scrolling") (P09, run 2).
- An auto-summed total would look too low when a part has no price (P10, run 2, in DS2).
- Wording: "Markers", "Subtask", "Add subtask" and "Future expenses" felt foreign or formal, though different words for different personas. P07: "Add subtask"; P08: "Markers", "Future expenses"; P09: "Markers"; P10: "Subtask". It rests on the assumed English-reading line, so it is not counted.

## 🧪 To confirm with real users

| # | Hypothesis `[SYNTHETIC]` | Persona ids / runs | Settles | Who to recruit | How |
|---|---|---|---|---|---|
| 1 | The estimate is not found at add time; pricing a job takes a second trip through Edit | P07, P08 (1); P09, P10 (2) | A02, A-P07 | a future owner and a moved-in owner (collection plan, second entry) | first sitting with their own five jobs; no hints; record whether the first range goes in at add time and the time per priced job |
| 2 | The edit form reads as too much; markers and places are skipped | P07, P08 (1); P09, P10 (2) | A02, D07/D09/D21 use by others | same | count fields filled per priced job; ask which they would remove |
| 3 | A subtask's money has no visible destination; people can't say what the whole job costs after pricing a part | P07 (1, primed); P09, P10 (2) | R06/D15, A02 | same | ask them to price one part, then ask what the whole job now costs and where it says so |
| 4 | Under time pressure jobs are added unpriced, and the list doesn't show which still need a price | P07, P08 (1); P09, P10 (2) | R10, A02 | same, plus the owner's own first week | count tasks without an estimate after each sitting; ask how they find them again |
| 5 | Manual order is welcome but doesn't help decide what comes first | P07 (1); P09, P10 (2) | D10, Q12, H4 | same | ask how they chose the order last time; watch whether manual reordering is enough for their list |
| 6 | One-step Move up/down is slow on a longer list | P07, P08 (1); P09, P10 (2) | A-P02 | same | watch for attempts to drag; in the product, test drag reordering |
| 7 | Places don't fit a flat or a whole-flat job | P07 (1); P09 (2) | A-P01, D09 | a future owner of a flat | have them assign their own jobs to places; record the missing places |
| 8 | Self-typed ranges are guesses people don't trust | P07 (1); P09, P10 (2) | A02, D11, H2 | same two segments | ask how the last cost figure was reached and whether it was corrected later |
| 9 | Nobody keeps subtask costs in mind and types the task figure by hand (R06/D15); all would if parts added up | P07, P08 (1); P09, P10 (2) | R06/D15, A02 | same | in the first sitting, each splits one of their own jobs; record part ranges, task range, and how the task figure was reached |
| 10 | Other segments want the total set against available money or a loan minimum | P07 (1); P09, P10 (2) | N04/D06 for others, H6, H8 | a moved-in owner paying from monthly leftover; a future owner considering a loan | ask where this month's money is kept today; ask how they decided the loan amount |

## 📝 Interviews

Transcripts: `transcripts/run-1-P07.md`, `transcripts/run-1-P08.md`, `transcripts/run-2-P09.md`, `transcripts/run-2-P10.md`. Each holds the seven past-tense questions with their passages, the fast reaction with feeling, the considered answer, the four yes/no questions, the two decision simulations with one varied pressure each, the step-by-step walk, topics, and the interviewer's notes on grounding and contamination.

- **A03 (people beyond the owner):** asked as Q7 ("what happened to the last written list"). All four say their last list did not change what they did next. This restates their source notes ("zrobił się chaos", "walają nam się różne kartki") rather than adding to them, so it is not counted as a finding.
- **Acquiescence (four balanced yes/no questions about the past):** 10 answered across the panel, 5 yes and 5 no, a yes share of one half. 6 were no basis: YN2 "money figure next to a job" for three personas and YN3 "asked for a quote" for three. That shows how little the material says about written costs and quotes. No acquiescence was found, so no answers were excluded.
- **Grounding flags:**
  - P08 extrapolated "the kitchen had to work early" from a passage.
  - P08 claimed that "Details" showed no price boxes before he had opened it.
  - P10 generalised a passage about paper.

  None of these carries a finding.

## 📸 Evidence

All screenshots are in `screenshots/` and are named `run-{n}-P{nn}-step-{nn}.png`:
- P07: steps 01–08
- P08: steps 01–07
- P09: steps 01–08, plus `run-2-P09-step-09-final.png` (final action carried out for evidence: 13 000–25 000 zł)
- P10: steps 01–09

## Quality and limits

- **Homogeneity (flagged):** all four personas come from two notes, and each segment from one note. The flag is itself a finding about the material: the panel can't see past the two Polish interviews. More real notes per segment are the only way to widen it. Signs of one voice:
  - P07 and P09 typed the same placeholder range for electrics (8 000–15 000 zł).
  - P10 typed the same two job titles as P08, though "listwy" was not in his prompt.
  - Every persona proposed "the app should add the parts up". That one has a source in each persona's material and a forced choice behind it, so it is kept.
- **Over-positivity check:**
  - Every persona welcomed the one-box quick add and the total. That is agreement, so it is not counted as a finding.
  - Every walk recorded friction on most steps.
  - No walk praised every step.
- **Numbers:** amounts typed into the prototype are persona placeholders and appear only as screen states. No figure here is a share of users or a prediction.
- **Nothing here edits the brief, a spec or a tracker item.** `om-discover --refresh` decides what enters the brief's Hypotheses.
