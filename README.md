# PL-300 Prep

A study app for the Microsoft PL-300 (Power BI Data Analyst) exam: short lessons, targeted practice, spaced repetition, full mock exams with case studies, and interactive concept simulators. Mobile-first and installable.

> Work in progress. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the design and build order.

Not affiliated with or endorsed by Microsoft. "PL-300" is used descriptively. All questions are original.

## Getting started

Requires Node 20 or later.

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Scripts

| Script               | What it does                                              |
| -------------------- | --------------------------------------------------------- |
| `npm run dev`        | Start the dev server                                      |
| `npm run build`      | Check the bank, typecheck, and build to `dist/`           |
| `npm run check:bank` | Validate the question bank and confirm every image exists |
| `npm test`           | Run unit tests                                            |
| `npm run lint`       | Lint with ESLint                                          |
| `npm run typecheck`  | Typecheck with TypeScript                                 |
| `npm run format`     | Format with Prettier                                      |

## Content

Questions and exhibits live in [`pl300-bank/`](pl300-bank/README.md); its format is defined in [`pl300-bank/SCHEMA.md`](pl300-bank/SCHEMA.md). The app treats the bank as read-only: corrections are made there and picked up on the next build.

Current bank: 440 questions (prepare 132, model 120, visualize 106, manage 57, case 25) across five formats, 4 case studies and 94 exhibits.
