import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QDIR = os.path.join(ROOT, "questions")
IMG = os.path.join(ROOT, "images")
DOMAINS = {"prepare": ("PRE", "Prepare the data"), "model": ("MOD", "Model the data"),
           "visualize": ("VIS", "Visualize and analyze the data"), "manage": ("MAN", "Manage and secure Power BI"),
           "case": ("CASE", "Case studies")}
os.makedirs(QDIR, exist_ok=True)


class Batch:
    """starts: {domain_key: first number}. Questions take the batch's default domain unless add(domain=...) overrides it."""
    def __init__(self, number, slug, title, default_domain, starts, topic=None):
        self.number, self.slug, self.title, self.default = number, slug, title, default_domain
        self.counters = {d: n - 1 for d, n in starts.items()}
        self.topic = topic or title
        self.q = []
        self.cases = []

    def case(self, cid, title, tabs):
        """tabs: [(tab_title, [paragraph strings], optional (svg, alt))]"""
        out = {"id": cid, "title": title, "tabs": []}
        for t in tabs:
            tab = {"title": t[0], "paragraphs": t[1], "image": None}
            if len(t) > 2 and t[2]:
                svg, alt = t[2]
                folder = os.path.join(IMG, "case")
                os.makedirs(folder, exist_ok=True)
                fn = f"{cid}-{t[0].lower().replace(' ', '-')}.svg"
                with open(os.path.join(folder, fn), "w", encoding="utf-8") as f:
                    f.write(svg)
                tab["image"] = {"src": f"images/case/{fn}", "alt": alt}
            out["tabs"].append(tab)
        self.cases.append(out)

    def add(self, sub, typ, stem, answer, explanation, takeaway, options=None, statements=None, items=None,
            parts=None, select=None, image=None, difficulty=2, domain=None, topic=None, case=None):
        d = domain or self.default
        self.counters[d] += 1
        prefix = DOMAINS[d][0]
        qid = f"{prefix}-{self.counters[d]:03d}"
        q = {"id": qid, "domain": d, "topic": topic or self.topic, "subtopic": sub,
             "difficulty": difficulty, "type": typ, "stem": stem}
        if case:
            q["caseId"] = case
        if image:
            svg, alt = image
            folder = os.path.join(IMG, d)
            os.makedirs(folder, exist_ok=True)
            with open(os.path.join(folder, f"{qid}.svg"), "w", encoding="utf-8") as f:
                f.write(svg)
            q["image"] = {"src": f"images/{d}/{qid}.svg", "alt": alt}
        else:
            q["image"] = None
        if options:
            q["options"] = [{"id": chr(65 + i), "text": o} for i, o in enumerate(options)]
        if select:
            q["selectCount"] = select
        if statements:
            q["statements"] = statements
        if items:
            q["items"] = [{"id": chr(65 + i), "text": t} for i, t in enumerate(items)]
        if parts:
            q["parts"] = parts
        q["answer"] = answer
        q["explanation"] = explanation
        q["takeaway"] = takeaway
        self.validate(q)
        self.q.append(q)

    @staticmethod
    def validate(q):
        t, a = q["type"], q["answer"]
        if t == "single":
            assert a in [o["id"] for o in q["options"]], q["id"]
        elif t == "multi":
            assert len(a) == q["selectCount"] and all(x in [o["id"] for o in q["options"]] for x in a), q["id"]
        elif t == "yesno":
            assert len(a) == len(q["statements"]), q["id"]
        elif t == "order":
            assert all(x in [i["id"] for i in q["items"]] for x in a), q["id"]
        elif t == "dropdown":
            assert len(a["parts"]) == len(q["parts"]), q["id"]
            for i, p in zip(a["parts"], q["parts"]):
                assert 0 <= i < len(p["options"]), q["id"]

    def save(self):
        fn = f"batch{self.number:02d}_{self.slug}.json"
        out = {"bank": "PL-300 question bank", "batch": self.number, "title": self.title,
               "domains": sorted({q["domain"] for q in self.q}), "schemaVersion": 2, "count": len(self.q), "questions": self.q}
        if self.cases:
            out["cases"] = self.cases
        with open(os.path.join(QDIR, fn), "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, indent=2)
        print(fn, len(self.q), "questions;", sum(1 for q in self.q if q["image"]), "with images;",
              f"ids {self.q[0]['id']}..{self.q[-1]['id']}")
