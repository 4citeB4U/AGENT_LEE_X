
"""
LEEWAY HEADER
TAG: FRONTEND.AUDIT
5WH: WHAT=Frontend audit; WHY=surface missing headers, duplicate IDs, assets; WHO=RapidWebDevelop; WHERE=tools\leeway_frontend_audit.py; WHEN=2025-09-07; HOW=python tools\leeway_frontend_audit.py
SPDX-License-Identifier: MIT
"""
import os, re, json
from pathlib import Path

ROOT = Path(r"D:\agentleegeminialmost\frontend")

HEADER_RE = re.compile(r"LEEWAY HEADER|LEEWAY MICRO:", re.M)
DUPLICATE_ID_RE = re.compile(r'id=["\\\']([^"\\\']+)["\\\']')

REQUIRED_IMAGES = [
    "image/macmillionmic.png",
    "image/macmillionmic2.png",
]

def list_files(root: Path, exts):
    for p in root.rglob("*"):
        if p.is_file() and p.suffix.lower() in exts:
            yield p

def scan_headers():
    missing = []
    for p in list_files(ROOT, {".tsx",".ts",".jsx",".js",".mjs",".html",".css",".md"}):
        try:
            text = p.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        if not HEADER_RE.search(text):
            missing.append(str(p))
    return missing

def scan_duplicate_ids():
    dups = {}
    for p in list_files(ROOT, {".html",".tsx",".jsx"}):
        try:
            text = p.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        ids = DUPLICATE_ID_RE.findall(text)
        if not ids: 
            continue
        counts = {}
        for i in ids:
            counts[i] = counts.get(i, 0) + 1
        offenders = [k for k,v in counts.items() if v > 1]
        if offenders:
            dups[str(p)] = {k:v for k,v in counts.items() if v > 1}
    return dups

def check_assets():
    pub = ROOT / "public"
    results = {}
    for rel in REQUIRED_IMAGES:
        fp = pub / rel
        results[rel] = fp.exists()
    return results

def main():
    report = {
        "headers_missing": scan_headers(),
        "duplicate_ids": scan_duplicate_ids(),
        "required_assets": check_assets(),
    }
    out = ROOT / "run" / "leeway_frontend_audit_report.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Wrote {out}")

if __name__ == "__main__":
    main()