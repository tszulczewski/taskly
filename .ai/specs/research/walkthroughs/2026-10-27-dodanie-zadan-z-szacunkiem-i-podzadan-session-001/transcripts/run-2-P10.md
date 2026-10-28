# Transcript — run 2, P10 (moved-in owner finishing from what is left of the monthly pay — low-salience seat)

`[SYNTHETIC]` · Stance: validate · Subject: `.ai/prototypes/discovery/task-list-v1/revision-001/index.html` · Flow: dodanie zadań z szacunkiem i podzadań · Fresh-context subagent; persona block given with tags and sources stripped (see `../personas.md`, P10). Passages are from MO (`2026-10-15-interview_owner_of_the_house.md`).
Order changed from run 1: past-tense questions → walk → decision simulations.

## Interview

### Q1. The last time you sat down to work out what the jobs are and roughly what they cost
- Passages: MO "nie mamy planu, bo nie wiemy ile to będzie kosztować… za drogie i trzeba odłożyć"
- Fast: "Honestly, there wasn't really a 'sitting down'."
- Feeling: mild resignation
- Considered: they pick something, start, find it za drogie, odłożyć; "I can't describe a session where I added everything up, because I don't think we've had one."

### Q2. What it cost, what was tried before
- Passages: MO materials/tools passage
- Fast: "Every job ends up costing more than the job itself."
- Feeling: moderate irritation
- Considered: the cost is the surprise — missing materiały and narzędzia; amount — **no basis**; Excel, notes, paper didn't help.

### Q3. Who else was involved, who decided
- Passages: MO kitchen cleanup passage (pets, wife cooks)
- Fast: "My wife, and the animals in their own way."
- Feeling: mild to moderate, half amused, half tired
- Considered: "the house decides a lot" — dirty kitchen work must be finished and cleaned the same evening; how decisions split — **no basis**.

### Q4. What would have to be true for the problem to be gone
- Passages: MO "co zrobić najpierw, a co później, jaki nakład pracy… przed czy po innym zadaniu"
- Fast: "I'd know what to do first and what later."
- Feeling: mild hope
- Considered: nakład pracy and rough cost per job including materials and tools; which jobs depend on others; "this one now, that one when there's more money left from the wypłata".

### Q5. What you did not care about
- Passages: MO "nie przeszkadzają w życiu codziennym"
- Fast: "Urgency. None of this is urgent."
- Feeling: mild indifference
- Considered: no deadlines, schedules, reminders; no exact figures; "I won't type in a milion informacji."

### Q6 (A02). The last time you put a money figure next to a job
- Passages: MO monthly-leftover passage
- Fast: "I don't really put figures next to jobs. The money is just whatever is left at the end of the month."
- Feeling: mild discomfort
- Considered: the figure in his head is "what's left this month", not a cost per job; specific time — **no basis**.

### Q7 (A03). What happened to the last written list
- Passages: MO Excel/notes/paper passage
- Fast: "Excel isn't flexible, notes are even worse, and paper is useless these days. Nothing stuck."
- Feeling: moderate frustration
- Considered: "I can't say a list ever changed what we did next"; details — **no basis**.
- Interviewer note: "paper is just not how anyone does things anymore" generalises the passage's "do kitu w tych czasach"; harmless, not used for findings.

### Yes/no (acquiescence)
- YN1 wrote jobs down: **yes**
- YN2 money figure next to a job: **no basis**
- YN3 asked a professional for a quote: **no basis**
- YN4 used a renovation app: **no**

### Topics raised (interview)
No plan because costs are unknown; za drogie, odłożone; missing materials and tools cost extra; paying from monthly leftover; saving for bigger jobs; same-evening cleanup in a lived-in house; order and before/after; nakład pracy; not urgent; no milion informacji; Excel rigid, notes chaotic, paper useless.

## Walk (prototype, agent-browser session `synth-r2-p10`, 1280×900, start: "Start with an empty list")

### Step 1 — empty list (📸 `../screenshots/run-2-P10-step-01.png`)
- Noticed: empty Title box with cursor; "Future expenses — No estimates yet"; "No tasks yet."
- Expects: type a name, Add; hopes to add a rough cost afterwards (stated as expectation)
- Reaction: "Okay, simple enough. Just one box, not a milion informacji." Mild relief, half-interested
- Friction: can't tell whether "Details" is something to click or a label; "Future expenses" a bit formal
- Missing: a place for cost, materials or tools, or before/after
- Action: typed "Malowanie kuchni", Add

### Step 2 — task added (📸 `../screenshots/run-2-P10-step-02.png`)
- Noticed: the job with checkbox and "No estimate"; Add subtask/Edit/Delete; "1 task without an estimate…"
- Got: quick, nothing extra
- Reaction: mild satisfaction, then mild uncertainty about where the cost goes
- Friction: "No estimate" doesn't say whether he types the amount or the app works it out; the sentence says it isn't counted "but not how to fix that"; guesses Edit; wonders if materials go in "Add subtask"
- Missing: cost place; materials/tools; nakład pracy; same-evening cleanup; before/after
- Action: click Edit

### Step 3 — edit form (📸 `../screenshots/run-2-P10-step-03.png`)
- Noticed: Min/Max with zł; empty Description; Places with Kitchen
- Got: Edit was right, "but I had to guess my way in; nothing on the row said 'add a cost here'"
- Reaction: "Okay, Min and Max, I get that. Nobody knows the exact price anyway." Mild relief; "hmm" at how many boxes
- Friction: "starts to feel like the milion informacji"; Important/Urgent mean little ("none of this is urgent"); Places pointless when the title says kuchnia; doesn't know what Min/Max should include (materials and tools or just paint); half expected the app to suggest a range
- Missing: separate place for materials and tools (squeezes them into the description); nakład pracy; before/after
- Action: Description "farba, wałek, taśma, folia – sprawdzić co mam", Min 300, Max 600, Save (placeholders)

### Step 4 — estimate saved (📸 `../screenshots/run-2-P10-step-04.png`)
- Noticed: 300–600 zł at the top; same on the row; his materials note visible
- Got: yes; the note visible without opening anything is useful
- Reaction: "Oh, nice, that's simple." Mild to moderate satisfaction
- Friction: with one job the total says little; "Details… it's never done anything" (he never opened it)
- Missing: order, nakład pracy, same-evening cleanup; the total isn't set against this month's money ("not one I'd expect an app like this to know without me telling it")
- Action: typed "Listwy przypodłogowe w salonie", Add

### Step 5 — second task (📸 `../screenshots/run-2-P10-step-05.png`)
- Noticed: second job with "No estimate"; Move up/Move down; warning back
- Got: order kept, Move up/down "at least something for co najpierw, co później"
- Reaction: mild satisfaction
- Friction: the long Edit form again "every single time"; two Edit buttons; Move up/down "annoying with many"
- Missing: help deciding order (nakład pracy, dependency, this month's money); a dirty-job flag; materials/tools
- Action: Edit on the listwy row

### Step 6 — edit form again (📸 `../screenshots/run-2-P10-step-06.png`)
- Noticed: same long form; empty Min/Max; Description for things to buy
- Got: the right job opened
- Reaction: mild, "this again"
- Friction: form long for a quick note; skips Markers and Places; unsure whether the range should include the missing saw
- Missing: a separate spot for "narzędzia I don't have" ("half the cost risk"); nakład pracy
- Action: Description "listwy, klej, gwoździki – brak piły do narożników (kupić/pożyczyć?)", Min 400, Max 900, Save

### Step 7 — two jobs totalled (📸 `../screenshots/run-2-P10-step-07.png`)
- Noticed: 700–1 500 zł; both ranges, no warning; the saw note
- Got: total correct
- Reaction: mild to moderate satisfaction, "a little sobering, because it's more than one month's leftover"
- Friction: "The total is just a sum. It doesn't help me say 'this month the kitchen, the listwy after I save up'"; order is his own guess
- Missing: help deciding the order; the saw buried in a sentence, not counted as a cost
- Action: Add subtask on the listwy row

### Step 8 — subtask form (📸 `../screenshots/run-2-P10-step-08.png`)
- Noticed: New subtask box with cursor; Add/Cancel; "Details" as plain text
- Expects: "kupić piłę" as a separate item; hopes for its own cost but sees only a name
- Reaction: "Okay, a sub-item, but just a name?" Mild doubt
- Friction: subtask for steps of work or things to buy? "Details… maybe it opens more. I've never found out."; "Subtask" a stiff word ("do kupienia", "kroki")
- Missing: marking a tool he doesn't have, with a price that counts in the job
- Action: typed "kupić/pożyczyć piłę do narożników", Add (Details not opened)

### Step 9 — subtask added (📸 `../screenshots/run-2-P10-step-09.png`)
- Noticed: the saw item with checkbox and "No estimate"; "0/1 subtasks"; total still 700–1 500 zł
- Got: the missing saw is visible before starting
- Reaction: mild satisfaction, a little doubt whether its cost counts anywhere
- Friction: "'No estimate' on the saw makes me wonder whether I've now got two places for the same money: inside the 400–900 or separate? The screen doesn't say."
- Missing: whether the subtask's price is part of the job's cost; marking it as a purchase/tool; help with the order
- Action: **stop** — "enough for a half-interested Saturday moment"; to go further he would want to know whether the saw's cost counts and what to do first
- Walk summary: works — one box and one click to add, a min–max that fits a rough idea, the total, notes about materials visible. Stops him — the long Edit form for every cost, not knowing whether a subtask's price counts, nothing about co najpierw, co później.

## Decision simulations (asked after the walk)
- DS1 (evening after work, ~30 s, "listwy przypodłogowe w salonie", optional Min/Max): **name and Add, boxes empty** — "Typing a guess when I'm tired feels like putting in a number I'd only have to correct later." Feeling: mild tiredness. Variant free Saturday: **flips** — fills a rough range, "the total is what helps me decide whether it's za drogie this month".
- DS2 (split "malowanie kuchni", parts don't add up): **one rough min–max on the kitchen job only**; might add parts as names without prices, because szlifowanie is the dirty step to plan for an evening; "figures on the parts… could disagree with the job's figure". Variant parts add up: **partly flips** — ranges on parts where he knows the materials; worries an empty part makes the total look cheaper; on a tired evening still one figure.

## Topics raised (walk and simulations)
Cost only through the long Edit form; whether a subtask's cost counts; subtask as steps vs purchases; "Details" never found out; markers and places not useful; total not compared with this month's money; order is a guess; parts as names to plan the dirty step; empty parts make an auto-sum look low; tired evening — name only, price later.

## Interviewer notes
- Grounding: answers stay within MO passages; Q7 generalisation flagged.
- Homogeneity: he typed the same two job titles P08 used in run 1 ("Malowanie kuchni", "Listwy przypodłogowe w salonie"), although his prompt never named "listwy" before the walk. Kitchen painting is in his passages; the skirting boards are not. Same note, same model — a homogeneity signal.
- The walk ran before the decision simulations; step 9's question about the saw's cost was unprimed.
