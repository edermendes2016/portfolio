#!/usr/bin/env python3
"""Builds the knowledge base for Eder's agent. No API, no paid service, no dependencies.

    python tools/build_kb.py

Reads kb/profile.json (the résumé, written by hand) and writes:

- assets/data/kb.json: the data the browser uses. It holds every skill with the
  jobs, projects and certifications that prove it, the text passages, and a
  TF-IDF index of those passages, so the page can find the passage that best
  answers a question (a small retrieval step, the "R" of RAG, done ahead of time).
- the Skills section of index.html, between the kb:skills markers, so each tag
  on the page is a button linked to the same skill id.

It fails if a job or project points to a skill that doesn't exist, and warns
about skills that no job, project or certification backs up.
"""
import html
import json
import math
import re
import sys
import unicodedata
from collections import Counter
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "kb" / "profile.json"
OUTPUT = ROOT / "assets" / "data" / "kb.json"
INDEX_HTML = ROOT / "index.html"

# The browser applies exactly these rules (assets/js/agent.js reads them from kb.json),
# so a question is cut into words the same way the passages were.
REPLACEMENTS = [
    ["c#", " csharp "], ["c sharp", " csharp "], ["f#", " fsharp "],
    ["asp.net", " aspnet "], [".net", " dotnet "], ["node.js", " nodejs "],
    ["three.js", " threejs "], ["ci/cd", " cicd "], ["ci cd", " cicd "],
    ["pl/sql", " plsql "], ["gov.br", " govbr "], ["hit@5", " hit5 "],
    ["re/start", " restart "], ["t-sql", " tsql "], ["fine-tuning", " finetuning "],
    ["fine tuning", " finetuning "], ["az-900", " az900 "], ["k8s", " kubernetes "],
]
STOPWORDS = sorted(set("""
a o as os um uma uns umas de do da dos das em no na nos nas num numa e ou com sem por para pra pro
que se ja nao sim ele ela eles elas dele dela seu sua seus suas isso esse essa este esta aqui la
eder amaral mendes silva qual quais quem como onde quando quanto quanta muito muita mais menos bem
ser foi era sao esta estao tem ter teve fez faz sabe saber conhece conhecer usa usou trabalha trabalhou
me te voce voces sobre ao aos pelo pela pelos pelas tambem entao the an of in on at and or with without
for to from by is are was were be been does do did done has have had he his him its it this that these
those what which who whom how when where why much many more most any some can could would should will
know knows knew use used uses using work worked works about tell me please your you
""".split()))


def normalize(text):
    text = unicodedata.normalize("NFD", str(text).lower())
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    for src, dst in REPLACEMENTS:
        text = text.replace(src, dst)
    return text


def tokens(text):
    out = []
    for tok in re.split(r"[^a-z0-9]+", normalize(text)):
        if len(tok) < 2 or tok in STOPWORDS:
            continue
        if len(tok) > 4 and tok.endswith("s"):
            tok = tok[:-1]
        out.append(tok)
    return out


def months_between(start, end):
    y1, m1 = map(int, start.split("-"))
    y2, m2 = map(int, end.split("-"))
    return (y2 - y1) * 12 + (m2 - m1) + 1


def merged_months(spans):
    """Total months covered by (start, end) spans, counting overlaps once."""
    months = set()
    for start, end in spans:
        y, m = map(int, start.split("-"))
        for _ in range(months_between(start, end)):
            months.add((y, m))
            m += 1
            if m > 12:
                y, m = y + 1, 1
    return len(months)


def build():
    src = json.loads(SOURCE.read_text(encoding="utf-8"))
    skills = {s["id"]: s for s in src["skills"]}
    categories = {c["id"] for c in src["categories"]}
    errors, warnings = [], []

    for s in src["skills"]:
        if s["category"] not in categories:
            errors.append(f"skill {s['id']}: unknown category {s['category']}")
    for kind in ("experiences", "projects", "certifications"):
        for item in src[kind]:
            for sid in item.get("skills", []):
                if sid not in skills:
                    errors.append(f"{kind} {item['id']}: unknown skill '{sid}'")
    if errors:
        sys.exit("\n".join(["kb/profile.json has errors:"] + errors))

    # Link every skill to what backs it up.
    out_skills = []
    for s in src["skills"]:
        exps = [e for e in src["experiences"] if s["id"] in e.get("skills", [])]
        projs = [p for p in src["projects"] if s["id"] in p.get("skills", [])]
        certs = [c for c in src["certifications"] if s["id"] in c.get("skills", [])]
        if not (exps or projs or certs):
            warnings.append(f"{s['name']} ({s['id']}) is not linked to any job, project or certification")
        months = merged_months([(e["start"], e["end"]) for e in exps])
        alias_tokens = []
        for alias in [s["name"], s.get("name_pt", "")] + s.get("aliases", []):
            t = tokens(alias)
            if t and t not in alias_tokens:
                alias_tokens.append(t)
        out_skills.append({
            "id": s["id"], "name": s["name"], "name_pt": s.get("name_pt", s["name"]), "category": s["category"],
            "aliases": alias_tokens, "github": s.get("github", []),
            "experiences": [e["id"] for e in exps], "projects": [p["id"] for p in projs],
            "certifications": [c["id"] for c in certs],
            "months": months, "since": min((e["start"][:4] for e in exps), default=None),
        })

    # Passages the agent can quote, each in both languages.
    docs = []
    for f in src["facts"]:
        docs.append({"id": f"fact:{f['id']}", "kind": "fact", "ref": f["id"], "pt": f["pt"], "en": f["en"], "extra": f.get("keywords", "")})
    for e in src["experiences"]:
        names = " ".join(skills[sid]["name"] for sid in e.get("skills", []))
        for i, h in enumerate(e["highlights"]):
            docs.append({"id": f"exp:{e['id']}:{i}", "kind": "experience", "ref": e["id"], "pt": h["pt"], "en": h["en"],
                         "extra": f"{e['company']} {e['role']['pt']} {e['role']['en']} experiencia trabalho experience job {names}"})
    for p in src["projects"]:
        names = " ".join(skills[sid]["name"] for sid in p.get("skills", []))
        for i, h in enumerate(p["highlights"]):
            docs.append({"id": f"proj:{p['id']}:{i}", "kind": "project", "ref": p["id"], "pt": h["pt"], "en": h["en"],
                         "extra": f"{p['name']['pt']} {p['name']['en']} {p['repo']} projeto project {names}"})
    for e in src["education"]:
        docs.append({"id": f"edu:{e['id']}", "kind": "education", "ref": e["id"], "pt": e["pt"], "en": e["en"], "extra": e.get("keywords", "")})
    for c in src["certifications"]:
        docs.append({"id": f"cert:{c['id']}", "kind": "certification", "ref": c["id"], "pt": c["pt"], "en": c["en"], "extra": c.get("keywords", "")})

    # TF-IDF: words rare across passages weigh more; each passage becomes a unit vector.
    doc_tokens = [tokens(f"{d['pt']} {d['en']} {d.pop('extra')}") for d in docs]
    df = Counter(t for toks in doc_tokens for t in set(toks))
    n = len(docs)
    idf = {t: round(math.log((n + 1) / (c + 1)) + 1, 4) for t, c in sorted(df.items())}
    for d, toks in zip(docs, doc_tokens):
        tf = Counter(toks)
        vec = {t: (1 + math.log(c)) * idf[t] for t, c in tf.items()}
        norm = math.sqrt(sum(v * v for v in vec.values())) or 1
        d["vec"] = {t: round(v / norm, 4) for t, v in sorted(vec.items())}

    generic = [
        ("Quem é o Eder?", "Who is Eder?"),
        ("Onde ele trabalhou?", "Where has he worked?"),
        ("Quais projetos ele tem?", "What projects has he built?"),
        ("Quanto tempo de experiência ele tem?", "How many years of experience does he have?"),
        ("Que vaga ele procura?", "What role is he looking for?"),
        ("Onde ele mora? Aceita remoto?", "Where does he live? Is he open to remote?"),
        ("Ele fala inglês?", "Does he speak English?"),
        ("Qual a formação dele?", "What is his education?"),
        ("Quais certificações ele tem?", "What certifications does he have?"),
        ("Em quais setores ele trabalhou?", "Which sectors has he worked in?"),
        ("Como falar com ele?", "How can I contact him?"),
    ]
    suggestions = {
        "pt": [g[0] for g in generic] + [f"O Eder sabe {s.get('name_pt', s['name'])}?" for s in src["skills"]],
        "en": [g[1] for g in generic] + [f"Does Eder know {s['name']}?" for s in src["skills"]],
    }

    kb = {
        "generated": date.today().isoformat(),
        "person": src["person"],
        "tokenizer": {"replacements": REPLACEMENTS, "stopwords": STOPWORDS},
        "categories": src["categories"],
        "skills": out_skills,
        "experiences": src["experiences"],
        "projects": src["projects"],
        "docs": docs,
        "idf": idf,
        "suggestions": suggestions,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(kb, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    write_skills_html(src)

    print(f"Wrote {OUTPUT.relative_to(ROOT)}: {len(out_skills)} skills, {len(docs)} passages, "
          f"{len(idf)} terms, {OUTPUT.stat().st_size // 1024} KB")
    for w in warnings:
        print("warning:", w)


def write_skills_html(src):
    """Rewrites the Skills section of index.html so every tag is a button tied to a skill id."""
    page = INDEX_HTML.read_text(encoding="utf-8")
    start, end = "<!-- kb:skills:start -->", "<!-- kb:skills:end -->"
    if start not in page or end not in page:
        print("note: kb:skills markers not found in index.html, Skills section left as is")
        return
    cards = []
    for cat in src["categories"]:
        items = [s for s in src["skills"] if s["category"] == cat["id"]]
        if not items:
            continue
        buttons = "".join(
            f'<li><button type="button" class="skill" data-skill="{html.escape(s["id"])}"'
            + (f' data-pt="{html.escape(s["name_pt"])}"' if s.get("name_pt") else "")
            + f'>{html.escape(s["name"])}</button></li>'
            for s in items)
        cards.append(
            '          <div class="card">\n'
            f'            <h3 data-pt="{html.escape(cat["pt"])}">{html.escape(cat["en"])}</h3>\n'
            f'            <ul class="tags">{buttons}</ul>\n'
            '          </div>')
    block = f"{start}\n" + "\n".join(cards) + f"\n          {end}"
    page = re.sub(re.escape(start) + r".*?" + re.escape(end), lambda _: block, page, flags=re.S)
    INDEX_HTML.write_text(page, encoding="utf-8")


if __name__ == "__main__":
    build()
