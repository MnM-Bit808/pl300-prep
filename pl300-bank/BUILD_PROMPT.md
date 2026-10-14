# Build prompt: PL-300 study web app

Read this whole file before writing any code. Then do **Step 1 only** and wait for my go-ahead.

---

## 0. Assumptions to confirm (edit these before starting)

| Decision | Current assumption |
|---|---|
| App name | **PL-300 Prep** (working title) |
| Audience | Me first; may go public later, so build as if it could be public |
| Progress storage | Same approach as Paath. If Paath uses browser storage only, add export/import of progress as a JSON file |
| "Workings" | Notes per question and per topic, a mistakes log, flags, and a "report a problem" button (see section 4.7) |
| Hosting | Same host and deployment process as Paath |

---

## 1. Context

- I'm preparing for the Microsoft PL-300 (Power BI Data Analyst) exam.
- I already built and run **Paath**, a Duolingo-style quiz web app for SSC CGL general knowledge. It is live.
- This is a **separate app** for PL-300 only: its own codebase, deployment and data. Reuse Paath's proven patterns (quiz engine, streaks, styling approach) by copying code, not by linking the two apps.
- All content comes from the `pl300-bank/` folder next to this file. **Read `SCHEMA.md` before anything else.**

## 2. Content provided

```
pl300-bank/
├── SCHEMA.md                    Question format (authoritative)
├── questions/all_questions.json 440 questions + 4 case studies (load this)
├── questions/index.json         Batch manifest
├── questions/batchNN_*.json     Same questions split by topic
└── images/<domain>/*.svg        92 question exhibits + 2 case-study exhibits
```

- Domains: `prepare` (132), `model` (120), `visualize` (106), `manage` (57), `case` (25).
- Types: `single` (366), `dropdown` (32), `yesno` (27), `order` (11), `multi` (4).
- Question IDs (`PRE-001`, `MOD-040`, `CASE-012`…) are permanent. **Store all progress against IDs.**
- Treat the JSON as read-only content. Never edit question text inside the app. Corrections happen in the bank and get re-imported.

## 3. Product goals

1. Learn every PL-300 skill through short, Duolingo-style lessons.
2. Practise weak areas until they stick (mistakes review, spaced repetition).
3. Rehearse the real exam (timed, mixed formats, case study, scaled score).
4. Keep my own workings (notes, flags) next to the questions.
5. Show honestly how ready I am, per domain.

## 4. Features (version 1)

### 4.1 Question renderer (most important: get this right first)
- Supports all five types exactly as `SCHEMA.md` describes: single, multi (exactly `selectCount` picks), yesno (one toggle per statement), order (pick and arrange; **items are stored in correct order, so always shuffle**), dropdown (one select per part).
- Shuffle options for single and multi on every attempt; check answers by `id`, never by position.
- Shows `image` between the stem and the answers, scaled to width, with tap or click to enlarge and pinch-zoom on phones. Use `image.alt` as alt text.
- Renders backtick code (DAX, M) in a monospace font; long code wraps or scrolls horizontally without breaking the layout.
- After submitting: correct/incorrect state, the correct answer, `explanation`, and `takeaway` highlighted as the key rule.
- Scoring for practice and exams: single and order = all or nothing; multi, yesno and dropdown = partial credit per part.

### 4.2 Case studies
- Questions with `caseId` show the matching case's tabs (Overview, Data, Requirements, Exhibit) in a panel beside the question on desktop, or behind a toggle on mobile.
- The user can switch tabs at any time while answering.

### 4.3 Learn path
- Units = domains, in exam order: Prepare → Model → Visualize → Manage → Case studies.
- Lessons = `topic`/`subtopic` groups, about 8–10 questions each, easiest `difficulty` first.
- Unlock, XP and streak mechanics: reuse Paath's.

### 4.4 Practice and review
- Practise by domain, topic or subtopic, with an optional difficulty filter.
- **Mistakes review:** every wrong answer goes into a queue.
- **Spaced repetition:** Leitner boxes or a simple SM-2 style schedule per question ID; "due today" count on the home screen.
- Flashcard mode built from `takeaway` lines (question stem on the front, takeaway on the back).

### 4.5 Mock exam mode
- 50 questions, 100-minute countdown, auto-submit at zero.
- Domain mix follows exam weights: Prepare 25–30%, Model 25–30%, Visualize 25–30%, Manage 15–20%, plus one case study (5–7 questions) as a final section.
- No feedback until the end. Mark for review, a question map, and a review screen.
- The case-study section locks the earlier section once started (as in the real exam).
- Results: score out of 1,000 (700 = pass), per-domain percentages, every question with its explanation, and a filter for "not fully correct".
- Save mock history to show improvement over time.

### 4.6 Progress dashboard
- Per-domain mastery (accuracy weighted towards recent attempts), questions seen versus total, weakest subtopics.
- A readiness indicator based on the last three mock exams and domain mastery. Label it as an estimate.

### 4.7 My workings
- Notes on any question and on any topic (plain text or markdown), searchable.
- Flag questions to revisit.
- **Report a problem** on any question (wrong answer, unclear wording, image issue). Store reports locally and allow export as JSON, so I can bring them back for fixing.
- Export and import all progress, notes and reports as one JSON file.

### 4.8 Settings
- Light and dark themes, font size, reset progress (with confirmation), sound on or off if Paath has sound.

## 5. Non-functional requirements
- Mobile-first, fully usable on a phone; also comfortable on a laptop.
- Accessible: keyboard navigation, visible focus, alt text, sufficient contrast, and never colour alone to signal right or wrong.
- Fast: load question text first and lazy-load images.
- Robust: if a stored question ID no longer exists in the bank, skip it quietly. Validate the bank on load and log problems (missing images, unknown types).
- No Microsoft logos or branding; the name "PL-300" may be used descriptively.
- Content is original. Don't add questions from exam-dump sites or paid courses.

## 6. Build order (stop for my approval after each step)
1. **Inspect Paath.** Summarise its stack, how it stores progress, its quiz engine and what can be reused. Compare its question format with `SCHEMA.md` and list what's missing (images, the four extra types, case studies, code formatting). Propose the architecture and data storage for this app. **No code yet.**
2. Scaffold the new project, the bank loader and the validator. Show the counts per domain and type, and confirm all 94 images resolve.
3. Question renderer for all five types, plus images, code and explanations (section 4.1). Give me a test page that cycles through one question of each type.
4. Case-study panel (4.2).
5. Learn path, XP and streaks (4.3).
6. Practice, mistakes review, spaced repetition and flashcards (4.4).
7. Mock exam mode (4.5).
8. Progress dashboard (4.6).
9. My workings and export/import (4.7), then settings (4.8).
10. Polish, accessibility pass, and deploy.

## 7. Acceptance checks for version 1
- All 440 questions load; every image displays; no console errors.
- Each question type renders, scores correctly, and shuffles where required.
- Case questions show the right tabs and exhibit.
- A full mock exam runs, times out correctly, locks the case section and produces per-domain results.
- Progress, notes and reports survive a reload and round-trip through export and import.
- Usable on a 375-pixel-wide phone screen.

## 8. Later (version 2 ideas, don't build yet)
- Interactive concept simulators (for example Append vs Merge, join kinds, filter context and context transition, star vs snowflake).
- Concept pages per subtopic with my notes alongside.
- New question batches added through the same folder structure.
