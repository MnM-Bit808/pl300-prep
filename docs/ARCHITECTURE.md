# Architecture

## Goals that shape the design

1. **Exam-faithful interactions.** Five question formats, exhibits that stay readable on a phone, case studies beside the question, a timed exam with a locking final section.
2. **Content stays separate from code.** `pl300-bank/` is authored elsewhere and is read-only to the app. Fixes happen in the bank and are re-imported.
3. **Progress is keyed by question id**, never by position, so the bank can change without corrupting history.
4. **Works offline, installs on a phone** (PWA), deploys as static files.

## Stack

| Concern         | Choice                                                                         | Why                                                                                               |
| --------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| UI              | React 19 + TypeScript (strict)                                                 | Component model fits five renderers, case panel and simulators; types catch answer-shape mistakes |
| Build           | Vite                                                                           | Fast dev loop, static output for Cloudflare Pages                                                 |
| Bank validation | Zod schemas + pure rule checks                                                 | One validator for both the build-time CLI and the browser                                         |
| Styling         | CSS Modules over design tokens (`src/styles/global.css`)                       | Scoped styles, theming through custom properties, no runtime cost                                 |
| Tests           | Vitest + Testing Library (unit, component); Playwright + axe-core (end-to-end) | Engines and components in jsdom; real browsers for flows, offline, keyboard and accessibility     |
| Storage         | IndexedDB for history, notes and reports; localStorage for settings            | History grows; settings must be readable synchronously before first paint                         |
| Offline         | Service worker via vite-plugin-pwa (Workbox)                                   | Precache shell, bank and exhibits                                                                 |
| Hosting         | Cloudflare Pages via wrangler                                                  | Same as Paath                                                                                     |

## Content pipeline

```
pl300-bank/questions/all_questions.json ──► src/bank/schema.ts   (structure, Zod)
                                         └► src/bank/validate.ts (cross-field rules)
                                                 │
                    ┌────────────────────────────┴───────────────────┐
         npm run check:bank (build gate)                 src/bank/load.ts (runtime)
         + image files exist on disk                     dynamic import of the JSON and of
         exits 1 on any error                            build.ts (Zod) together, off the main
                                                         bundle; invalid questions skipped, logged

pl300-bank/images/**  ──► vite/bank-assets.ts ──► /bank/images/** (dev middleware, copied into dist)
```

Validation policy: a question that breaks a rule is dropped and logged as an error; everything else still loads. Unknown fields and header-count mismatches are warnings.

## Source layout

```
src/
  app/          routes, site frame, page titles, focus on navigation, fallbacks, display prefs
  bank/         constants, schema (Zod), validation, building, loading, stats
  questions/    one renderer per type, shared answer model and scoring
  quiz/         the focus-mode runner shared by lessons and practice
  exhibits/     image thumbnail + zoom/pan viewer
  case/         case-study panel and tabs
  learn/        course, lessons, Learn page
  practice/     practice, review queues, spaced repetition, flashcards
  mock/         exam builder and reducer, timed exam, results
  progress/     progress store, XP and streaks, analytics, dashboard
  workings/     notes, flags, reports
  data/         backup and restore
  settings/     settings page
  concepts/     the four simulators: engines, views, pages
  pwa/          service worker registration, update prompt, install
  storage/      IndexedDB access with an in-memory fallback
  lab/ dev/     question lab and bank check (developer pages)
  lib/ ui/      shared helpers and components
  styles/       tokens and global styles
e2e/            Playwright specs (phone and desktop)
scripts/        check-bank, publish
vite/           bank assets plugin, security headers
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
9. My workings, export/import, settings. ✅
10. Concept simulators (Append vs Merge, join kinds, filter context and context transition, star vs snowflake). ✅
11. Offline/PWA install, accessibility pass, end-to-end tests, CI, deploy. ✅ Live at https://pl300-prep.pages.dev

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

### My workings, backup and settings (Step 9)

- **Workings is its own versioned document** (notes on questions and topics, flags, reports), separate from progress, so resetting progress keeps your notes unless you also tick "delete notes". One `Storage` is opened once and shared by both stores through `openAppData()`. Building this turned up that the old `reset()` called `storage.clear()`, which would have wiped notes; reset now clears only progress, attempts and the exam in progress, and a test proves notes survive.
- **Notes support a Markdown subset** (`lib/markdown.ts`) parsed to a tree and rendered as React elements, never as HTML strings, so a note can't inject markup. Links are allowed only for `http(s)` and `mailto`. A test feeds it an `<img onerror>`.
- **The note editor saves itself** 500 ms after typing stops and on blur, with a live "Saving… / Saved" status and a Write / Preview toggle.
- **Question tools** (flag, note, report) appear once a question has been answered (lessons, practice, the lab, mock results), never during a mock. They render nothing where no saved data is provided.
- **Reports stay on the device** and export on their own as JSON with each question's topic, type, stem and exhibit, ready to fix in the bank.
- **One backup file** (`data/backup.ts`) holds progress, the full attempt log, workings, any exam in progress and display settings. Import validates the envelope with Zod, migrates older progress and workings, shows a summary to confirm, writes, then reloads. Unknown setting names or values are ignored. Errors are written in plain words ("This is a reports export, not a backup"). Round-trip, migration and rejection are all tested.
- **Settings** cover theme, text size (the root font size, since every type token is in rem) and an app-level Reduce motion that applies on top of the device setting. All are stored in localStorage and applied before the first paint. There's no sound setting because the app (like Paath) makes no sound. Storage status shows, with an option to ask the browser to keep data (`navigator.storage.persist()`).
- **Phone navigation is a bottom tab bar** below 760px (five sections with icon and label); wide screens keep it in the header. Settings is a gear in the header.
- **Accessibility fix found by tests:** count badges sat flush against button labels, so names read as "Notes2" (also in the lab's format buttons since Step 3). They now read "Notes 2".

### Concept simulators (Step 10)

- **Each simulator is a pure engine plus a view.** `joins`, `append`, `dax` and `schema` each have an `engine.ts` with no React in it, unit-tested against the rules the exam checks: all six join kinds (null keys never match, a repeated key multiplies rows), Append matching columns by name, CALCULATE replacing a filter while KEEPFILTERS intersects, context transition in a calculated column, and the hops a filter takes from the one side to the many side.
- **Small, hand-made data,** so every number can be checked by eye: four orders and three customers, ten sales rows totalling 1,380. Nothing comes from the question bank, so the simulators can't drift from it or leak an answer.
- **The view always says what happened in words:** a live summary ("Left outer join: 4 rows: 3 matched, 1 from Orders only"), Kept / Left out badges on every input row, Came from on every result row, and "changed" tags on filters that CALCULATE rewrote. Tint is never the only signal.
- **The filter context matrix is a set of buttons.** Clicking a cell opens an inspector with the cell's filters, what CALCULATE did to them, and the exact Sales rows counted with the sum written out. Each cell's name reads like a sentence ("Blue, Total: 100"). On wide screens the matrix and inspector sit side by side, the matrix sticky, so the working stays next to the cell.
- **The schema diagram is SVG with two layouts,** chosen by the simulator's own width (narrow below 600px). It's labelled by its `<title>` and a `<desc>` that spells out the filter's path, so the picture isn't the only place the answer lives. "Flatten into a star" lists the three Power Query steps and moves focus to them, because the button disappears once used.
- **Loaded on demand.** `concepts/registry.ts` holds each simulator's title, rule and subtopics, and lazy-imports the component, so the four simulators (5–11 kB each) stay out of the main bundle. A concept page links to a 10-question practice run on its subtopic and on to the next simulator.
- **Questions link to them.** After a question is answered, a "See it working" link appears when its subtopic has a simulator (Merge queries, Append queries, CALCULATE and filter context, calculated columns vs measures, star schema design, relationships). The Learn page has an entry card, and the Learn tab stays current on concept pages.
- **Tables size to their own box, not the viewport.** Found on a phone: a wide table inside nested `display: grid` blocks set each track to the table's min-content width, and because the stage width uses `100vw`, the page then grew to 732px and held itself there. Every grid in the simulators now uses `minmax(0, 1fr)` tracks; tables scroll inside their own box and tighten their padding with container queries (below 420px and 340px).
- **Fixed while checking:** shared action buttons had no padding, so a two-line label ran to the edges (now padded and centred everywhere). A checkbox label whose inline `<code>` became separate flex items now wraps as one sentence. Text columns in the matrix align left with their header. An exam-flow test allowed only one second of clock drift and failed once under load; it now allows a few.

### Offline, accessibility, tests and deploy (Step 11)

- **Every page but Learn is its own chunk**, loaded through React Router's `lazy` routes, and Zod moved off the start-up path: bank constants live in `bank/constants.ts`, and validation (`bank/build.ts`) is fetched together with the questions. React and the router sit in their own chunk, which changes far less often than the app. The start-up JavaScript went from one 612 kB file to 36 kB of app code plus 315 kB of React and the router (112 kB gzipped together).
- **Installable and offline.** vite-plugin-pwa generates the manifest, the icons (from `public/icon.svg`, an original mark) and a Workbox service worker that precaches all 186 files (2.3 MB, every exhibit included), so a mock exam works with no connection. Updates wait for the learner: a note offers Reload, and it appears only in the site frame, never during a lesson or exam. The first install claims the open tab, so it is offline-ready straight away. Settings shows offline status and an Install button where the browser offers one, with Add to Home Screen steps for iPhone.
- **A bug the end-to-end tests caught:** the manifest was listed twice in the precache with different revisions. Workbox rejects the whole list when that happens, inside a promise, so the worker installed and activated normally and cached nothing. The offline test now checks that the cache holds the shell and all 94 exhibits.
- **One set of security headers** (`vite/headers.ts`) becomes `dist/_headers` for Cloudflare Pages and is also sent by `vite preview`, so the end-to-end tests run under the production CSP: `'self'` only, no inline script or style, no eval. Zod runs `jitless` for that reason, through `lib/zod.ts`; a lint rule blocks importing `zod` directly. Hashed assets are cached for a year; the service worker and manifest are always revalidated.
- **Navigation is announced.** Each page sets its title. After moving to another page, focus goes to its `<h1>` (unless the page placed focus itself, as the exam does) and scroll resets. Focus-mode screens gained a real `<h1>`, visually unchanged. Unknown paths get a Page not found page, and a failed chunk load explains itself and offers Reload instead of React Router's developer screen.
- **Accessibility pass, and what it found.** axe-core (WCAG 2.2 A and AA plus best practices) runs on every page in light and dark, and on the interactive states: an answered question, the exhibit viewer, the case panel, the exam and its question map, flashcards and the simulators. It found grey `null` and `blank` text under 4.5:1 on tinted cells, `aria-label` on elements with no role (the hearts count, the note preview), a `<main>` inside `<main>` on the bank page, and simulator headings that skipped a level. Keyboard specs check the skip link, focus after navigation, a visible ring on every tab stop, answering by keyboard, and Escape returning focus.
- **Windows High Contrast.** Forced colours remove backgrounds, and selection here is drawn with backgrounds, so chosen answers, chips, settings and the current tab all looked unselected. `global.css` now redraws every selected state (`aria-pressed`, `aria-selected`, `aria-current`, `data-chosen`, and labels marked `data-choice` whose input is checked) and every progress fill in the system Highlight colours. A test fails if that is removed.
- **End-to-end suite (Playwright):** 176 tests across a 375px phone and a 1280px desktop, against the production build. They cover the brief's acceptance checks: all 440 questions and 94 exhibits load; each type scores; case tabs and exhibit; a full mock that locks section 1, scores by domain, and submits itself when the (fast-forwarded) clock runs out; progress, notes and reports surviving a reload and a backup, wipe and restore round trip; and every page fitting a phone with no sideways scroll. Every test also fails on any console error, failed request or CSP violation.
- **CI** (`.github/workflows/ci.yml`) runs format, lint, typecheck, unit tests, the build (which validates the bank) and the end-to-end suite on Chromium, and keeps the Playwright report.
- **Deploy** mirrors Paath: `wrangler.toml` plus `scripts/publish.ts`, which builds, checks `dist/` (shell, worker, manifest, headers, icons and every exhibit present; no source maps, Markdown or raw bank files), then uploads with `wrangler pages deploy` to `main` or the `test` preview branch. `npm run deploy:check` does everything but upload. Preview first (https://test.pl300-prep.pages.dev), then production (https://pl300-prep.pages.dev); the end-to-end suite passed against both (`PW_BASE_URL` points it at a deployed site). Production received zero new files: it is byte-for-byte the build that was tested on preview.
- **A wrangler quirk worth knowing:** wrangler 4.149, when it detects an AI coding agent, redirects `pages project create` (and a first `pages deploy`) for a project that does not exist yet to Cloudflare Workers static assets. The brief asks for the same host and process as Paath, and preview branches are a Pages feature, so the project was created once with wrangler's documented opt-out, `--force`. Now that the project exists, every later command goes straight to Pages and needs no flag.

### First CI run on GitHub (after Step 11)

The first run on GitHub's Linux runners failed, usefully. Every cause was real, and each is now covered so it can't come back quietly:

- **An ordering question's zone headings were `<h3>` under the exam's `<h1>`.** Locally the exam's random first question had never been an ordering one. The zones are now `<h2>`, and the accessibility spec audits every answer format by id instead of relying on the exam's draw.
- **"Report saved" and "deleted" were shown before the write reached IndexedDB.** On a slower machine a reload straight afterwards could still find the old data. Both messages now wait for the store to flush, so the words are true when they appear, and the end-to-end test waits for them as a learner would.
- **Two clocks.** Pages read today's date from the wall clock while the progress store used its own (injectable) clock, so a test with a fixed date broke the day after it was written. Pages now ask the store (`store.today()`), so the app has one idea of what day it is.
- **The intermittent unit-test failure (seen since Step 10), finally caught:** a page test could render while the question bank's dynamic import was still in flight on a busy machine, and find only the Loading fallback. The test setup now loads the bank before any test renders, and `loadBank()` marks its promise fulfilled the way React's `use()` expects, so revisiting a page never flashes its fallback either. Clean across repeated full runs, including two suites at once.
