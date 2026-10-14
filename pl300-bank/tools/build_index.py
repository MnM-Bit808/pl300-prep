"""Rebuilds questions/index.json and the batch table in README.md from the batch files."""
import json, os, glob
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
batches, total, imgs = [], 0, 0
all_q, all_cases = [], []
for f in sorted(glob.glob(os.path.join(ROOT, "questions", "batch*.json"))):
    d = json.load(open(f, encoding="utf-8"))
    n_img = sum(1 for q in d["questions"] if q["image"])
    ids = [q["id"] for q in d["questions"]]
    batches.append({"file": f"questions/{os.path.basename(f)}", "batch": d["batch"], "title": d["title"],
                    "domains": d["domains"], "count": d["count"], "withImages": n_img, "firstId": ids[0], "lastId": ids[-1]})
    total += d["count"]; imgs += n_img
    all_q += d["questions"]; all_cases += d.get("cases", [])
json.dump({"bank": "PL-300 question bank", "schemaVersion": 2, "totalQuestions": total, "totalWithImages": imgs, "batches": batches},
          open(os.path.join(ROOT, "questions", "index.json"), "w", encoding="utf-8"), indent=2)
json.dump({"bank": "PL-300 question bank", "schemaVersion": 2, "count": len(all_q), "questions": all_q, "cases": all_cases},
          open(os.path.join(ROOT, "questions", "all_questions.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
rows = "\n".join(f"| {b['batch']} | {b['title']} | {b['count']} | {b['withImages']} | {b['firstId']} – {b['lastId']} |" for b in batches)
readme = f"""# PL-300 question bank

Original practice questions for the Microsoft PL-300 (Power BI Data Analyst) exam, built from the current official skills outline.
**{total} questions, {imgs} with exhibits.**

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
{rows}
"""
open(os.path.join(ROOT, "README.md"), "w", encoding="utf-8").write(readme)
print(total, "questions;", imgs, "with images;", len(batches), "batches")
