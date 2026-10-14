# PL-300 question bank: format for the app

Each batch is one JSON file in `questions/` (`batchNN_<slug>.json`). `questions/index.json` lists every batch with its count and ID range, so the app can load the whole bank from it.
Exhibits are SVG files in `images/<domain>/`. Image paths in the JSON are relative to the `pl300-bank` folder (for example `images/model/MOD-001.svg`).

## Batch file

```json
{
  "bank": "PL-300 question bank",
  "batch": 6,
  "title": "Optimise model performance and secure data",
  "domains": ["manage", "model"],
  "schemaVersion": 2,
  "count": 39,
  "questions": [ ... ]
}
```

A batch can contain questions from more than one domain; group by each question's own `domain` and `topic`, not by the batch.

## Changes in schema version 2

- Batch files moved to `questions/`; images moved to `images/<domain>/`.
- Batch header: `domain` and `topic` replaced by `title` and `domains`.
- Question fields are unchanged.

## Question fields (all types)

| Field | Type | Notes |
|---|---|---|
| `id` | string | Unique across the bank. Prefix by domain: `PRE-`, `MOD-`, `VIS-`, `MAN-`, `CASE-`. |
| `caseId` | string | Only on case-study questions; refers to an entry in the batch's `cases` array. |
| `domain` | string | `prepare`, `model`, `visualize`, `manage`, or `case` for case-study questions (their `subtopic` names the exam domain they test). |
| `topic`, `subtopic` | string | For grouping into units and lessons. |
| `difficulty` | 1–3 | 1 = recall, 2 = applied, 3 = exam-hard. |
| `type` | string | `single`, `multi`, `yesno`, `order`, `dropdown`. |
| `stem` | string | The question. `\n\n` separates paragraphs. Inline code uses single backticks. |
| `image` | object or null | `{ "src": "images/prepare/PRE-006.svg", "alt": "..." }`. Show it between the stem and the answers. Use `alt` as the image's alt text. Exhibits are 560–1100 px wide: scale to the container width, and allow pinch-zoom or tap-to-enlarge on phones. |
| `answer` | varies | See each type below. |
| `explanation` | string | Why the answer is right and the others wrong. Show after answering. |
| `takeaway` | string | One-line rule to remember. Good for review cards. |

## Types

**single**: `options: [{id, text}]`, `answer: "C"`. One choice.

**multi**: `options`, `selectCount: 2`, `answer: ["B", "D"]`. Let the user pick exactly `selectCount`. Suggested scoring: 1 point per correct pick.

**yesno**: `statements: [string]`, `answer: [true, false, true]`. One Yes/No toggle per statement. Score each statement separately.

**order**: `items: [{id, text}]` (includes distractors), `answer: ["A", "B", "C", "D"]` is the correct sequence. The user picks the needed items and arranges them. Score only an exact sequence. **Items are stored in answer order, so shuffle them before display.**

**dropdown**: `parts: [{label, options: [string]}]`, `answer: {"parts": [1, 0, 2]}`, where each number is the index of the correct option for that part. Show one drop-down per part. Score each part separately.

## Case studies

Case-study batches have a top-level `cases` array next to `questions`:

```json
"cases": [
  {
    "id": "CS1",
    "title": "Tailwind Traders",
    "tabs": [
      { "title": "Overview", "paragraphs": ["...", "..."], "image": null },
      { "title": "Exhibit", "paragraphs": ["..."], "image": { "src": "images/case/CS1-exhibit.svg", "alt": "..." } }
    ]
  }
]
```

Each case question has a `caseId` field (for example `"caseId": "CS1"`). Show the case's tabs (Overview, Data sources, Requirements, Exhibit…) beside or above the question, the way the real exam does, so the user can switch tabs while answering. Questions in the same case can be answered in any order.

## Display rules

- Shuffle `options` for `single` and `multi` on each attempt; keep the `id` to check answers.
- Option and statement text can contain backtick code (DAX or M). Render it in a monospace font.
- Never show the `answer`, `explanation` or `takeaway` before the user submits.
