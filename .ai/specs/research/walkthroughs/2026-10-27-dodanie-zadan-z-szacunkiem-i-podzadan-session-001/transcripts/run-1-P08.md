# Transcript — run 1, P08 (moved-in owner, leftover jobs, evenings after work — low-salience seat)

`[SYNTHETIC]` · Stance: validate · Subject: `.ai/prototypes/discovery/task-list-v1/revision-001/index.html` · Flow: dodanie zadań z szacunkiem i podzadań · Fresh-context subagent; persona block given with tags and sources stripped (see `../personas.md`, P08). Passages are from MO (`2026-10-15-interview_owner_of_the_house.md`).

## Interview

### Q1. The last time you sat down to work out what the jobs are and roughly what they cost
- Passages: MO "Czasami mniej więcej szacuję… zapominam i tak w kółko powtarzam…"; MO "chcesz zrobić wszystko na raz… nie zabierasz się za nic"
- Fast: "I go through it in my head, come up with rough numbers, and a week later I'm doing it all over again."
- Feeling: weary irritation, moderate — having done the same sum before
- Considered: goes through the house in his head, guesses each job "mniej więcej", doesn't write it down or loses it, starts from zero; wants everything at once and starts nothing. "It's a loop more than a procedure."

### Q2. What it cost, what was tried before
- Passages: MO "zaczynamy jedno a okazuje się że jest za drogie… nie mamy materiałów… narzędzi"
- Fast: "Mostly evenings wasted going round in circles, and a few times a job we started that we then had to put aside."
- Feeling: frustration, moderate
- Considered: jobs started and stalled, surprise purchases of materials and tools; amount or hours — **no basis**. Tried Excel, notes, paper; found no app.

### Q3. Who else was involved, who decided
- Passages: MO "wszystko praktycznie robiliśmy sami"; MO "żona by nie miała jak tam gotować"
- Fast: "Us, me and my wife."
- Feeling: mild pride with tiredness
- Considered: "My wife's needs set the priorities. The kitchen had to work early" — beyond that **no basis**. No contractors.
- Interviewer note: "kitchen had to work early / wife's needs set the priorities" extrapolates the cooking passage (which is about cleaning up the same evening); not used for findings.

### Q4. What would have to be true for the problem to be gone
- Passages: MO "proste i szybkie narzędzie intuicyjne, a nie skomplikowane wpisywanie miliona informacji"
- Fast: "I write it down once, it stays, and I can see at a glance what's left and roughly what it costs."
- Feeling: mild hope
- Considered: type a job and a rough number in a few seconds, move things around, see the total. "If it asks me for a lot of fields, I'm out."

### Q5. What you did not care about
- Passages: MO "kilka… rzeczy, które nie przeszkadzają w życiu codziennym"
- Fast: "It's not urgent. Nothing here is stopping us living in the house."
- Feeling: calm indifference, mild
- Considered: no deadlines, reminders, project management; no exact costs, "a rough range is enough".

### Q6 (A02). The last time you put a money figure next to a job
- Passages: MO "szacuję… zapominam"
- Fast: "Probably the last time I went through the list in my head. Then it was gone again."
- Feeling: mild embarrassment
- Considered: the number is his own rough guess; forgotten, re-estimated; when and what — **no basis**.

### Q7 (A03). What happened to the last written list
- Passages: MO "nie poprzesuwam tego wygodnie… walają nam się różne kartki"
- Fast: "It turned into a mess and I stopped looking at it."
- Feeling: annoyance, moderate
- Considered: the written list did not change what they did next; lost or ignored, back to guessing.

### Yes/no (acquiescence)
- YN1 wrote jobs down: **yes** ("sort of", Excel/notes/paper) — MO passage
- YN2 money figure next to a job: **yes in his head; written — no basis** (counted as no basis)
- YN3 asked a professional for a quote: **no** — MO "robiliśmy sami"
- YN4 used a renovation app: **no** — MO "nie znalazłem nic"

### Decision simulations
- DS1 (evening, ~30 s, "listwy przypodłogowe w salonie", optional Min/Max): types the title; one rough number in each box only if it comes at once, **otherwise skips the boxes**. Variant free Saturday: **partly flips** — fills both after a quick look at prices.
- DS2 (split "malowanie kuchni", parts don't add up): **does not split**; one rough min–max on the job; "keeping part-figures in my head and retyping a total is exactly the double work I'm trying to get away from." Variant parts add up: **flips** for a big job if each part is quick to type.
- Story vs pressured choice: Q4's "type a job and a rough number in a few seconds" holds only when the number comes at once.

### Topics raised
Re-estimating and forgetting; not knowing where to start / everything at once; jobs stalled by cost, materials, tools; doing it themselves with spouse; Excel not rearrangeable, notes chaotic, paper lost; simple and few fields; rough range is enough; low urgency; evenings, low energy; no app found; totals should add up on their own.

## Walk (prototype, agent-browser session `synth-r1-p08`, 1280×900, start: "Start with an empty list")

### Step 1 — empty list (📸 `../screenshots/run-1-P08-step-01.png`)
- Noticed: Title box with cursor and "Add"; "Future expenses: No estimates yet"; "No tasks yet."
- Expects: type a title, Add; looking for where the rough price goes — "maybe Details, maybe after adding"
- Reaction: "Okay, this looks simple, just one box." Mild relief.
- Friction: "Details" is plain text, not a button — unsure it is clickable; no visible place for the price; "Future expenses" feels formal ("do wydania")
- Missing: a visible place for the rough cost
- Action: typed "Listwy przypodłogowe w salonie", Add

### Step 2 — task added, no estimate (📸 `../screenshots/run-1-P08-step-02.png`)
- Noticed: the job with grey "No estimate"; Add subtask / Edit / Delete; "1 task without an estimate…"
- Got: added at once, box cleared, nothing extra asked — "but I wasn't offered any place for the price while adding it"
- Reaction: mild satisfaction mixed with mild impatience
- Friction: has to hunt for the price; "No estimate" is not clickable; guesses Edit; "In the evening I won't bother doing that for each one."
- Missing: min–max when adding, or by clicking "No estimate"
- Interviewer note: says "'Details' in the form never showed any price boxes" — he never opened it (misread, not an observation)
- Action: click Edit

### Step 3 — edit form (📸 `../screenshots/run-1-P08-step-03.png`)
- Noticed: the form is "suddenly big"; Min/Max with zł; the Places row and Save
- Got: Edit was right, price boxes there, in place
- Reaction: "Oh, that's a lot of boxes for a skirting board." Wariness mild→moderate; then mild relief at "(optional)"
- Friction: eye skips past description to the price; "Markers" a strange word; won't tick Living room because it's in the title; Edit for every job "will get tiring in the evening"
- Missing: a quick min–max without the whole form, ideally while adding
- Action: Min 300, Max 600, Save (amounts are placeholders)

### Step 4 — estimate saved (📸 `../screenshots/run-1-P08-step-04.png`)
- Noticed: "300–600 zł" at the top and on the job; empty Title
- Got: yes — "That's the thing I keep recalculating in my head, and now it's written down."
- Reaction: moderate satisfaction
- Friction: add → Edit → price → Save is more clicks than he'd like per job
- Missing: price while adding; "Maybe 'Details' does that, but it doesn't look clickable"
- Action: typed "Malowanie kuchni", Add

### Step 5 — second task (📸 `../screenshots/run-1-P08-step-05.png`)
- Noticed: the job with "No estimate"; new Move up/Move down; "1 task without an estimate" back
- Got: Move up/down "a nice surprise, because rearranging is what Excel couldn't do"; one step at a time slow on a longer list
- Reaction: mild contentment, mild hope
- Friction: Edit round trip again; will not split the kitchen ("parts wouldn't add up on their own"); two Edit buttons to tell apart
- Missing: price box when adding; dragging on a long list
- Interviewer note: "parts wouldn't add up" came from the DS2 pressure wording, not from a screen; at step 6 he corrected himself unprompted after a neutral reminder that he knows only what screens showed. Not counted as a walk observation.
- Action: Edit on "Malowanie kuchni"

### Step 6 — edit form again (📸 `../screenshots/run-1-P08-step-06.png`)
- Noticed: same form; Min/Max; "Kitchen" in Places
- Got: same form, "quicker the second time"
- Reaction: calm routine, mild; the size of the form "still nags me a little"
- Friction: extra sections in the way; self-correction on subtasks (see above)
- Missing: price box when adding; doesn't know how subtask prices behave
- Action: Min 800, Max 1500, Save

### Step 7 — total of two jobs (📸 `../screenshots/run-1-P08-step-07.png`)
- Noticed: total 1 100–2 100 zł; both ranges; the missing-estimate line gone
- Got: checked the sum himself — correct
- Reaction: moderate satisfaction — "the sum I always forget is just sitting there"
- Missing: whether the list is still there next time ("That's the whole point"); price box when adding
- Action: **stop** — got what he came for; not splitting the kitchen tonight ("I don't need that detail and I don't have the energy"); would add the rest another evening "if I could trust they'd still be there"
- Not tried: Add subtask. Not shown: subtask prices, persistence.

## Interviewer notes
- Grounding: Q3 "kitchen had to work early" extrapolates a passage (flagged). Step 2 claim about "Details" was an assumption, flagged. Step 5 reason for not splitting leaked from DS2; self-corrected.
- Stopped at step 7 of his own accord; the low-salience seat ended after two jobs.
