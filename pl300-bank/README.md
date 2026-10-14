# PL-300 question bank

Original practice questions for the Microsoft PL-300 (Power BI Data Analyst) exam, built from the current official skills outline.
**440 questions, 92 with exhibits.**

## Folder layout

```
pl300-bank/
├── README.md            This file
├── BUILD_PROMPT.md      Build brief for Claude Code: the PL-300 study web app
├── SCHEMA.md            Question format (read this before loading questions into the app)
├── questions/
│   ├── index.json       Manifest: every batch file with counts and ID ranges
│   ├── all_questions.json  Every question and case study in one file (same format as a batch)
│   └── batchNN_*.json   One file per batch
├── images/
│   ├── prepare/         Exhibits for PRE- questions
│   ├── model/           Exhibits for MOD- questions
│   ├── visualize/       Exhibits for VIS- questions
│   ├── manage/          Exhibits for MAN- questions
│   └── case/            Exhibits for CASE- questions
└── tools/               Python scripts that generate the batches and exhibits (not needed by the app)
```

Image paths inside the JSON (for example `images/model/MOD-001.svg`) are relative to the `pl300-bank` folder.

## Batches

| Batch | Title | Questions | With exhibits | IDs |
|---|---|---|---|---|
| 1 | Get or connect to data | 42 | 9 | PRE-001 – PRE-042 |
| 2 | Profile and clean the data | 45 | 18 | PRE-043 – PRE-087 |
| 3 | Transform and load the data | 45 | 13 | PRE-088 – PRE-132 |
| 4 | Design and implement a data model | 39 | 8 | MOD-001 – MOD-039 |
| 5 | Create model calculations by using DAX | 60 | 9 | MOD-040 – MOD-099 |
| 6 | Optimise model performance and secure data | 39 | 6 | MOD-100 – MAN-018 |
| 7 | Create reports: choose, build and format visuals | 45 | 12 | VIS-001 – VIS-045 |
| 8 | Enhance reports for usability and analysis: interactivity, AI visuals and Copilot | 36 | 6 | VIS-046 – VIS-081 |
| 9 | Manage and secure Power BI: workspaces, sharing, refresh and governance | 39 | 5 | MAN-019 – MAN-057 |
| 10 | Case studies | 25 | 0 | CASE-001 – CASE-025 |
| 11 | Visualize and analyze: mixed-format practice | 25 | 6 | VIS-082 – VIS-106 |
