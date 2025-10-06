"""
LEEWAY HEADER
REGION: BACKEND.AUDIT.PLUS.V2
5WH: WHAT=Backend audit (dirs/headers/requirements/checkpoints/ffmpeg), OS-agnostic, CI;
WHY=portable across Windows/macOS/Linux; WHO=RapidWebDevelop;
WHERE=tools/leeway_backend_audit_plus.py; WHEN=2025-10-04;
HOW=python tools/leeway_backend_audit_plus.py [--strict] [--report-html]
SPDX-License-Identifier: MIT
"""

import argparse, json, os, re, sys, shutil
from pathlib import Path
from typing import Dict, List

# ---------- Roots (repo-relative; override via env) ----------
REPO_ROOT = Path(os.getenv("GITHUB_WORKSPACE") or os.getcwd()).resolve()
ENV_ROOT = os.getenv("LW_BACKEND_ROOT")
DEFAULT_ROOT = (REPO_ROOT / (ENV_ROOT or "backend")).resolve()
DEFAULT_JSON = (DEFAULT_ROOT / "run" / "leeway_audit_report.json").resolve()

# If you want this script to emit the combined HTML report (optional)
DEFAULT_FE_JSON = (REPO_ROOT / (os.getenv("LW_FRONTEND_ROOT") or "frontend") / "run" / "leeway_frontend_audit_report.json").resolve()
DEFAULT_HTML = (DEFAULT_ROOT / "run" / "leeway_audit_report.html").resolve()

HEADER_RE = re.compile(r"LEEWAY HEADER|LEEWAY MICRO:", re.M)

# Use portable, POSIX-like rel paths; join via Path(..., *rel.split("/"))
REQUIRED_DIRS = [
    "agentlee_mcp_hub/mcp",
    "checkpoints/converter",
    "checkpoints/base_speakers/EN",
    "checkpoints/base_speakers/ZH",
    "models", "routes", "scripts", "tools", "webrtc", "run",
]

REQUIRED_PY_PKGS = [
    "fastapi","uvicorn","structlog","pydantic","pydantic-settings",
    "websockets","soundfile","scipy","numpy","ffmpeg-python","jieba",
]

CHECKPOINT_LAYOUT = {
    "converter": ["checkpoint.pth","config.json"],
    "EN": ["checkpoint.pth","config.json","en_default_se.pth","en_style_se.pth"],
    "ZH": ["checkpoint.pth","config.json","zh_default_se.pth"],
}

def have_ffmpeg() -> bool:
    # portable detection
    if shutil.which("ffmpeg"): return True
    if os.name == "nt" and shutil.which("ffmpeg.exe"): return True
    return False

def rglob(root: Path, exts: List[str]) -> List[Path]:
    out: List[Path] = []
    extset = {e.lower() for e in exts}
    for p in root.rglob("*"):
        if p.is_file() and p.suffix.lower() in extset:
            out.append(p)
    return out

def scan_headers_backend(root: Path) -> List[str]:
    files = rglob(root, [".py",".ps1",".psm1",".mjs",".js",".ts",".md",".surql"])
    missing: List[str] = []
    for f in files:
        try: text = f.read_text(encoding="utf-8", errors="ignore")
        except Exception: missing.append(str(f)); continue
        if not HEADER_RE.search(text):
            missing.append(str(f))
    return sorted(missing)

def check_dirs(root: Path) -> Dict[str, bool]:
    res: Dict[str, bool] = {}
    for rel in REQUIRED_DIRS:
        res[rel] = (root / Path(*rel.split("/"))).exists()
    return res

def check_models(root: Path):
    models = root / "models"
    present: List[str] = []
    try: present = [str(n) for n in models.iterdir()]
    except Exception: present = []
    base = [Path(p).name for p in present]
    flags = {
        "azr": any("Absolute_Zero_Reasoner" in n for n in base),
        "phi3": any("phi3" in n.lower() for n in base),
        "gemma": any("gemma" in n.lower() for n in base),
        "llama": any("llama" in n.lower() for n in base),
        "voice": any("voice" in n.lower() for n in base),
    }
    return {"present": base, "flags": flags}

def check_checkpoints(root: Path) -> Dict[str, Dict[str, bool]]:
    base = root / "checkpoints"
    found: Dict[str, Dict[str, bool]] = {}
    for key, files in CHECKPOINT_LAYOUT.items():
        dirp = base / ("converter" if key == "converter" else Path("base_speakers") / key)
        res: Dict[str, bool] = {}
        for f in files:
            res[f] = (dirp / f).exists()
        found[key] = res
    return found

def check_requirements(root: Path):
    req = root / "requirements.txt"
    try: text = req.read_text(encoding="utf-8", errors="ignore")
    except Exception: text = ""
    present, missing = [], []
    for pkg in REQUIRED_PY_PKGS:
        rx = re.compile(rf"^{re.escape(pkg)}(\W|$)", re.I | re.M)
        (present if rx.search(text) else missing).append(pkg)
    return {"present": present, "missing": missing}

def summarize_failures(rept: dict, ignore_ffmpeg: bool) -> List[str]:
    fails: List[str] = []
    miss_dirs = [k for k, ok in rept.get("dirs", {}).items() if not ok]
    if miss_dirs: fails.append(f"[backend] missing dirs: {', '.join(miss_dirs)}")
    if rept.get("headers_missing"): fails.append(f"[backend] missing headers: {len(rept['headers_missing'])}")
    miss_pkgs = rept.get("requirements", {}).get("missing", [])
    if miss_pkgs: fails.append(f"[backend] missing py pkgs: {', '.join(miss_pkgs)}")
    for k, d in (rept.get("checkpoints") or {}).items():
        need = [f for f, ok in d.items() if not ok]
        if need: fails.append(f"[backend] checkpoints:{k} missing {', '.join(need)}")
    if not ignore_ffmpeg and (rept.get("ffmpeg_available") is False):
        fails.append("[backend] ffmpeg not available")
    return fails

def write_json(fp: Path, obj: dict):
    fp.parent.mkdir(parents=True, exist_ok=True)
    fp.write_text(json.dumps(obj, indent=2), encoding="utf-8")

def write_html(out_html: Path, fe_json: Path, be_json: Path):
    # Minimal HTML report (same look/feel as Node)
    def _safe_list(items: List[str]) -> str:
        return "<ul>" + "".join(f"<li>{x}</li>" for x in items) + "</ul>" if items else "<p>None ✅</p>"

    try: f = json.loads(fe_json.read_text(encoding="utf-8"))
    except Exception: f = None
    try: b = json.loads(be_json.read_text(encoding="utf-8"))
    except Exception: b = None

    def _kv_missing(d: Dict[str, bool]): return [k for k, ok in (d or {}).items() if not ok]

    fe_missing_hdrs = (f or {}).get("headers_missing", [])
    fe_dup_files = list(((f or {}).get("duplicate_ids") or {}).keys())
    fe_missing_req = _kv_missing((f or {}).get("required_assets") or {})
    fe_missing_disc = _kv_missing((f or {}).get("discovered_assets") or {})

    be_missing_hdrs = (b or {}).get("headers_missing", [])
    be_missing_dirs = [k for k, ok in ((b or {}).get("dirs") or {}).items() if not ok]
    be_missing_pkgs = ((b or {}).get("requirements") or {}).get("missing", [])
    be_ff = (b or {}).get("ffmpeg_available") is False
    be_chk: List[str] = []
    for k, d in ((b or {}).get("checkpoints") or {}).items():
        need = [kk for kk, ok in d.items() if not ok]
        if need: be_chk.append(f"{k}: {', '.join(need)}")

    html = f"""<!doctype html><html><head><meta charset="utf-8"/>
<title>LEEWAY Audit Report</title>
<style>
body{{font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;padding:24px;line-height:1.5}}
h1{{margin:0 0 8px}} h2{{margin-top:24px;border-bottom:1px solid #eee;padding-bottom:4px}}
h3{{margin-top:16px}} .grid{{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}}
.ok{{color:#16a34a}} .bad{{color:#dc2626}} .pill{{display:inline-block;border:1px solid #e5e7eb;border-radius:999px;padding:2px 8px;margin:2px 6px 2px 0}}
.mono{{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}}
</style></head><body>
<h1>LEEWAY Audit Report</h1><div class="mono">Generated: {__import__('datetime').datetime.utcnow().isoformat()}Z</div>

<h2>Frontend</h2>
<div class="grid">
  <div><h3>Missing Headers</h3>{_safe_list(fe_missing_hdrs)}</div>
  <div><h3>Files with Duplicate IDs</h3>{_safe_list(fe_dup_files)}</div>
</div>
<div class="grid">
  <div><h3>Missing Required Assets</h3>{_safe_list(fe_missing_req)}</div>
  <div><h3>Missing Discovered Assets</h3>{_safe_list(fe_missing_disc)}</div>
</div>

<h2>Backend</h2>
<div class="grid">
  <div><h3>Missing Headers</h3>{_safe_list(be_missing_hdrs)}</div>
  <div><h3>Missing Dirs</h3>{_safe_list(be_missing_dirs)}</div>
</div>
<div class="grid">
  <div><h3>Missing Python Packages</h3>{_safe_list(be_missing_pkgs)}</div>
  <div><h3>Checkpoints Missing</h3>{_safe_list(be_chk)}{"<p class='bad'>FFmpeg: not available</p>" if be_ff else "<p class='ok'>FFmpeg: available</p>"}</div>
</div>
</body></html>"""
    out_html.parent.mkdir(parents=True, exist_ok=True)
    out_html.write_text(html, encoding="utf-8")
    print(f"Wrote {out_html}")

def main():
    ap = argparse.ArgumentParser(description="Leeway Backend Audit (OS-agnostic)")
    ap.add_argument("--root", type=Path, default=DEFAULT_ROOT, help="backend root (default: repo-relative ./backend or env LW_BACKEND_ROOT)")
    ap.add_argument("--out", type=Path, default=DEFAULT_JSON, help="JSON report path (default: <root>/run/leeway_audit_report.json)")
    ap.add_argument("--strict", nargs="?", const="all", choices=["all","headers","dirs","requirements","checkpoints","ffmpeg"],
                    help="Exit non-zero if selected checks fail (or 'all')")
    ap.add_argument("--no-ffmpeg", action="store_true", help="Do not fail on missing ffmpeg")
    ap.add_argument("--report-html", action="store_true", help="Also emit combined HTML report (reads FE+BE JSON)")
    ap.add_argument("--fe-json", type=Path, default=DEFAULT_FE_JSON, help="Path to frontend JSON (for HTML)")
    ap.add_argument("--html-out", type=Path, default=DEFAULT_HTML, help="HTML output path (for --report-html)")
    args = ap.parse_args()

    root = args.root.resolve()
    rept = {
        "root": str(root),
        "dirs": check_dirs(root),
        "headers_missing": scan_headers_backend(root),
        "models": check_models(root),
        "checkpoints": check_checkpoints(root),
        "requirements": check_requirements(root),
        "ffmpeg_available": have_ffmpeg(),
        "config": {"strict": args.strict or ""},
    }

    write_json(args.out.resolve(), rept)
    print(json.dumps(rept, indent=2))

    # Strict
    if args.strict:
        fails = summarize_failures(rept, ignore_ffmpeg=args.no_ffmpeg)
        # Filter by category if not 'all'
        if args.strict != "all":
            cat = args.strict
            fails = [f for f in fails if f.startswith(f"[backend] {cat}")]
        if fails:
            print("❌ LEEWAY AUDIT FAIL\n" + "\n".join(f" - {x}" for x in fails))
            sys.exit(1)
        else:
            print("✅ LEEWAY AUDIT PASS")

    # Optional HTML
    if args.report_html:
        write_html(args.html_out.resolve(), args.fe_json.resolve(), args.out.resolve())

if __name__ == "__main__":
    main()
