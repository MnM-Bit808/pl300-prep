# Architecture

## Goals that shape the design

1. **Exam-faithful interactions.** Five question formats, exhibits that stay readable on a phone, case studies beside the question, a timed exam with a locking final section.
2. **Content stays separate from code.** `pl300-bank/` is authored elsewhere and is read-only to the app. Fixes happen in the bank and are re-imported.
3. **Progress is keyed by question id**, never by position, so the bank can change without corrupting history.
4. **Works offline, installs on a phone** (PWA), deploys as static files.

## Stack

| Concern         | Choice                                                                          | Why                                                                                               |
| --------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| UI              | React 19 + TypeScript (strict)                                                  | Component model fits five renderers, case panel and simulators; types catch answer-shape mistakes |
| Build           | Vite                                                                            | Fast dev loop, static output for Cloudflare Pages                                                 |
| Bank validation | Zod schemas + pure rule checks                                                  | One validator for both the build-time CLI and the browser                                         |
| Styling         | CSS Modules over design tokens (`src/styles/global.css`)                        | Scoped styles, theming through custom properties, no runtime cost                                 |
| Tests           | Vitest + Testing Library (unit, component); Playwright (end-to-end, later step) |                                                                                                   |
| Storage         | IndexedDB for history, notes and reports; localStorage for settings             | History grows; settings must be readable synchronously before first paint                         |
| Offline         | Service worker via vite-plugin-pwa (polish step)                                | Precache shell, bank and exhibits                                                                 |
| Hosting         | Cloudflare Pages via wrangler                                                   | Same as Paath                                                                                     |

## Content pipeline

```
pl300-bank/questions/all_questions.json ──► src/bank/schema.ts   (structure, Zod)
                                         └► src/bank/validate.ts (cross-field rules)
                                                 │
                    ┌────────────────────────────┴───────────────────┐
         npm run check:bank (build gate)                 src/bank/load.ts (runtime)
         + image files exist on disk                     dynamic import, separate chunk;
         exits 1 on any error                            invalid questions skipped and logged

pl300-bank/images/**  ──► vite/bank-assets.ts ──► /bank/images/** (dev middleware, copied into dist)
```

Validation policy: a question that breaks a rule is dropped and logged as an error; everything else still loads. Unknown fields and header-count mismatches are warnings.

## Planned source layout

```
src/
  app/          shell, routing, providers
  bank/         schema, validation, loading, stats
  questions/    one renderer per type, shared answer model and scoring
  exhibits/     image thumbnail + zoom/pan viewer
  case/         case-study panel
  learn/        units, lessons, XP, streaks
  practice/     practice, mistakes, spaced repetition, flashcards
  mock/         timed exam, sections, results, history
  progress/     dashboard, mastery, readiness
  workings/     notes, flags, reports, export/import
  simulators/   interactive concept simulators
  storage/      IndexedDB access, migrations
  styles/       tokens and global styles
```

## Build order

Each step ends with a review before the next starts.

1. Inspect Paath and agree the architecture. ✅
2. Scaffold, bank loader, validator; counts and image check. ✅
3. Design system and question renderer for all five types, exhibits with zoom, code formatting, explanations; a test page cycling one question of each type. ✅
4. Case-study panel. ✅
5. Learn path, XP and streaks. ✅
6. Practice, mistakes review, spaced repetition, flashcards. ✅
7. Mock exam mode. ✅
8. Progress dashboard. ✅
9. My workings, export/import, settings.
10. Concept simulators (Append vs Merge, join kinds, filter context and context transition, star vs snowflake).
11. Offline/PWA install, accessibility pass, end-to-end tests, CI, deploy.

## Decisions log

- **React + TypeScript instead of Paath's no-build vanilla JS.** Drag-and-drop ordering, zoomable exhibits, the case panel and simulators need component state that Paath's string templates don't handle well.
- **The bank folder is the source of truth.** Images are served from it in dev and copied at build time, not duplicated into `public/`.
- **Exhibit SVGs keep their embedded provenance metadata.** It adds roughly 60% to the raw file size but only about 3 KB per file after gzip.
- **Exhibits always sit on a light surface**, even in dark mode. They are drawn for a light background; recolouring them would misrepresent the product screens they depict.

### Design system (Step 3)

- **Identity: an analyst's workbench.** Cool paper ground, indigo for anything the learner controls, and one highlighter colour reserved for the takeaway. The takeaway is drawn as a formula bar (`fx`), with one highlighter sweep when feedback opens: the app's only decorative motion.
- **One type family:** Atkinson Hyperlegible Next for text, Atkinson Hyperlegible Mono for DAX/M and the formula bar. It was designed for legibility, which matters when reading scenarios under time pressure. Fonts are self-hosted (Fontsource) so they work offline.
- **Right and wrong are never colour alone.** Every mark is an icon plus words ("Your answer, incorrect"). All measured text passes WCAG AA (4.5:1) in both themes.

### Interaction (Step 3)

- **Native controls first.** Single/multi use real radios and checkboxes inside the tiles, yes/no uses radio pairs, and drop-downs use native `<select>`. Keyboard support, form semantics and screen-reader output come from the platform, and phones get their own pickers.
- **Answers are changed through updater functions**, never finished values, so taps that land before the next render (fast double taps) each apply to the latest answer. Covered by a regression test.
- **Order questions:** tap to place, then reorder by drag (dnd-kit: pointer, touch and keyboard, with announcements that use the step text) or with move buttons. The number of steps needed is never revealed. On wide screens the two zones break out of the reading column; each step lays itself out with a container query on its zone's width.
- **Exhibit viewer:** a native modal `<dialog>` (focus trap, Esc, inert background) with hand-written Pointer Events pan/zoom: pinch, drag, wheel or trackpad, double-tap, and `+ − 0 1` and arrow keys. Exhibit sizes are read from the SVGs at build time (`virtual:exhibit-sizes`) so thumbnails reserve space and never shift the layout.
- **Shortcuts:** A–J or 1–9 pick an option, Enter checks or continues. They stand down inside text fields and selects, and while a dialog is open.

### Case studies (Step 4)

- **`CaseFrame` puts the case next to its question.** At 1040px and wider it's a sticky side panel that scrolls on its own; narrower, a sticky "Read case" bar opens a bottom sheet. The sheet is a native modal `<dialog>` that stays mounted while closed, so its tab and scroll position survive between looks.
- **One tree for both layouts.** The question sits at a stable key, so crossing the breakpoint (rotating a tablet) never remounts it or loses the answer. Covered by a test.
- **Tabs follow the WAI-ARIA tabs pattern:** one tab stop, arrow keys, Home and End, automatic activation. Each tab remembers its own scroll position. On narrow widths (a container query) the tabs share the row, sized by content, so no tab is ever hidden off the edge.
- **The open tab carries across questions in the same case** (the frame is keyed by case id), as in the exam.
- **Breakouts opt out with `data-contained`.** Wide exhibits and the two-zone order layout stay inside the question column in the split view.
- **Dialog state updates where the close is triggered** (buttons, backdrop, Esc via `cancel`), not in the `close` event, which is queued as a task and can arrive late.
- **Options that are all code** (DAX answers) render as one code block instead of a chain of inline chips.

### Learn path and progress (Step 5)

- **Course built from the bank** (`learn/course.ts`): units follow the exam's domain order, then case studies. Each topic is cut into lessons of about 9 questions, snapping each cut to a subtopic boundary within 2 of the ideal, so lessons cover whole subtopics where possible. Questions run easiest first within a lesson. One lesson per case study. 51 lessons in all, and a test checks that every question is used exactly once.
- **Paath's rules, as pure functions:** lessons unlock in order within a unit and every unit is open. The session reducer handles 5 hearts, misses returning at the end, 10 XP for a first try, 5 for a retry and +10 for a perfect lesson. XP is banked when a run ends (finished or out of hearts); quitting forfeits it. Streaks and daily goals count local calendar days, with DST-safe day maths.
- **Progress store:** one versioned document (XP, streak, lessons, a per-question summary) plus an append-only attempt log, in IndexedDB. It falls back to memory if storage is blocked. Everything is keyed by question id. Unrecognised saved data is backed up, not overwritten. React reads it through `useSyncExternalStore`, and writes are queued in order.
- **Lesson ids are positional** (`model-3`), so a bank change can move lesson boundaries. Completion records also keep the question ids they covered, so later steps can reconcile.
- **Lessons run in focus mode:** a separate route with no site navigation, just quit (with confirmation, also on Esc), progress and hearts.
- **The Learn page borrows Power Query's "Applied steps" pane:** lessons are numbered steps on a connector line, rather than imitating a game path.

### Practice, reviews and flashcards (Step 6)

- **One quiz engine** (`quiz/session.ts` + `quiz/QuizRun.tsx`) runs lessons and every practice mode. They differ only in options (lessons: 5 hearts and a perfect bonus; practice: neither), in the mode filed with each attempt, and in the finish screen.
- **Spaced repetition is Leitner boxes** with intervals of 1, 3, 7, 14 and 30 days. A first-try right answer moves a card up a box (a first sighting answered right starts in box 2); anything less resets it to box 1, due tomorrow. Partial credit counts as a miss.
- **The retry rule:** a missed question returns later in the same run, but getting it right then shows short-term memory, not learning. So a same-run retry is logged but neither promotes the card nor clears the mistake. Browser testing found this: when mistakes were derived from the latest attempt, the queue was almost always empty, because every run re-asks misses until they're right.
- **The mistakes queue is explicit** (question id → when missed). A miss adds to it; a first-try right answer in a later run removes it. Mock exams (`schedule: false`) log answers without touching reviews or mistakes.
- **Progress document v2** adds `srs` and `mistakes`, with a tested `migrate()` from v1. Unknown shapes are still backed up rather than overwritten.
- **Custom practice filters live in the URL** (`?domain=&topic=&subtopic=&d=&n=`), so a practice selection, its run and its flashcards are all linkable. Questions are ranked mistakes first, then unseen, then the rest (Paath's order), shuffled within each group.
- **Flashcards are a study aid and don't touch the review schedule:** that's driven by answering questions. The card flips in 3D (a simple swap under reduced motion) and, once turned, swipes with Pointer Events, with a threshold, tilt and a cue label. Keyboard: Space flips, ←/→ decide. The hidden face is `inert`, so screen readers only meet the visible side. Case questions are left out because their stems need the case study.

### Mock exam (Step 7)

- **Building** (`mock/build.ts`): 50 questions. The case study is section 2, always the case used least recently, so all four come round in turn. Section 1 fills the rest to the exam weight midpoints (27.5 / 27.5 / 27.5 / 17.5%) with largest-remainder rounding, which gives 12 / 12 / 12 / 8 alongside a 6-question case. Within a domain, questions are spread across topics in proportion to topic size, and questions from the last two mocks are picked last.
- **The exam is a pure, serialisable reducer** (`mock/exam.ts`), saved after every change. A reload resumes on the same question with answers, marks and section lock intact. The clock is an absolute end time, so reloads and throttled background tabs can't stretch it, and a late resume submits straight away.
- **Exam rules:** no feedback or topic hints while answering (only the answer format shows); free movement within a section; mark for review; a question map; a review screen ends each section; finishing section 1 locks it before the case study; time up or "End exam" submits everything. The time is announced to screen readers at 30, 10, 5 and 1 minutes.
- **Scoring** (`mock/score.ts`): every question is worth one mark, split across its parts (single and order are all or nothing; multi, yes/no and drop-down score per part). The score out of 1,000 is the share of marks scaled to 1,000, labelled as an estimate because Microsoft doesn't publish its scaling. Case questions count towards the domain they test.
- **Mock answers count as first tries:** they update reviews and the mistakes queue (BUILD_PROMPT: "every wrong answer goes into a queue"). Unanswered questions aren't attempts and aren't recorded. This reverses the Step 6 plan to keep mocks out of reviews.
- **Progress document v3** adds mock history (the last 50, each with its answers and shuffle seeds so the full review can be rebuilt), migrating from v1 and v2. The exam in progress is stored separately (`mock.current`), so answering doesn't re-render every progress subscriber.
- **`QuestionBody`** was split out of `QuestionCard`, so the exam and its results review render questions without the check bar.
- **Sticky headers publish their height** as `--sticky-offset`, so the case bar and panel pin below the focus-mode header. Browser testing found the case bar sliding under the header, in the exam and in case lessons.

### Progress dashboard (Step 8)

- **All numbers come from one pure module** (`progress/analytics.ts`) over the attempt log, so each figure can be explained in a sentence on the page and is unit-tested.
- **Mastery is recency-weighted accuracy:** an attempt's weight halves every 14 days, and credit is per part (2 of 3 yes/no statements is 2/3). It's reported per exam domain, with case questions under the domain they test. Coverage (questions seen / total) is shown alongside, never blended into the bar.
- **Weakest subtopics** need at least 3 answers before being judged, so one unlucky miss doesn't brand a subtopic. Each links straight into a 10-question practice run on it.
- **The readiness estimate** blends 60% mocks (the last 3, weighted 3:2:1 towards the latest) with 40% practice (per domain, mastery × coverage, where coverage counts in full at 60% seen, weighted by exam share). With only one source, that source is used. It's banded around the pass mark (≥700 on track, 600–699 getting close) and labelled an estimate, with a prompt to take more mocks below three.
- **The mock trend chart** is hand-built SVG to the dataviz rules: one series and no legend, recessive grid, a dashed pass line, a 2px line, dots with a surface ring, a crosshair tooltip on hover, ←/→ keyboard stepping with live announcements, and a table view.
- **The theme picker moved to the footer** so four nav items fit at 375px. Settings (Step 9) will own it.
