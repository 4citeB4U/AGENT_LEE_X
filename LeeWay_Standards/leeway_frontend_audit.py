"""
LEEWAY HEADER
REGION: FRONTEND.AUDIT.PLUS.V2
5WH: WHAT=Hardened frontend audit (headers/IDs/assets), OS-agnostic, CI; WHY=fast, configurable, CI-friendly;
WHO=RapidWebDevelop; WHERE=tools/leeway_frontend_audit_plus.py; WHEN=2025-10-04; HOW=python tools/leeway_frontend_audit_plus.py [--strict]
SPDX-License-Identifier: MIT
"""

import argparse, json, os, re, sys
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Set, Tuple

# ---------- Roots (repo-relative; override via env) ----------
REPO_ROOT = Path(os.getenv("GITHUB_WORKSPACE") or os.getcwd()).resolve()
ENV_ROOT = os.getenv("LW_FRONTEND_ROOT")
DEFAULT_ROOT = (REPO_ROOT / (ENV_ROOT or "frontend")).resolve()
DEFAULT_OUT  = (DEFAULT_ROOT / "run" / "leeway_frontend_audit_report.json").resolve()

HEADER_RE = re.compile(r"LEEWAY HEADER|LEEWAY MICRO:", re.M)
DUPLICATE_ID_RE = re.compile(r'id=["\']([^"\']+)["\']')

IMG_REF_RE = re.compile(
    r"""(?:
        (?:src|href)\s*=\s*["'](?P<a>[^"']+\.(?:png|jpg|jpeg|gif|svg|webp))["'] |
        import\s+[^'"]+\s+from\s+["'](?P<b>[^"']+\.(?:png|jpg|jpeg|gif|svg|webp))["'] |
        ["'](?P<c>[^"']+\.(?:png|jpg|jpeg|gif|svg|webp))["']
    )""",
    re.IGNORECASE | re.VERBOSE,
)

BASE_REQUIRED_IMAGES = [
    "image/macmillionmic.png",
    "image/macmillionmic2.png",
]

SCAN_EXTS_ALL: Set[str] = {".tsx", ".ts", ".jsx", ".js", ".mjs", ".html", ".css", ".md"}
SCAN_EXTS_IDS: Set[str] = {".html", ".tsx", ".jsx"}
ASSET_EXTS: Set[str] = {".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"}

DEFAULT_IGNORES = [
    "node_modules/**", "dist/**", "build/**", ".next/**", ".vercel/**",
    ".cache/**", "coverage/**", "**/*.map",
]

@dataclass
class Report:
    headers_missing: List[str]
    duplicate_ids: Dict[str, Dict[str, int]]
    duplicate_ids_lines: Dict[str, Dict[str, List[int]]]
    required_assets: Dict[str, bool]
    discovered_assets: Dict[str, bool]
    root: str
    config: Dict[str, str]

def _load_ignore_patterns(ignore_file: Path, inline_ignores: List[str]) -> List[str]:
    pats: List[str] = []
    if ignore_file and ignore_file.exists():
        pats += [ln.strip() for ln in ignore_file.read_text(encoding="utf-8", errors="ignore").splitlines()
                 if ln.strip() and not ln.strip().startswith("#")]
    pats += inline_ignores or []
    return pats

def _should_ignore(path: Path, root: Path, patterns: List[str]) -> bool:
    rel = path.relative_to(root).as_posix()
    for pat in patterns:
        if Path(rel).match(pat) or ("/" not in pat and Path(path.name).match(pat)):
            return True
    return False

def _list_files(root: Path, exts: Set[str], patterns: List[str]) -> List[Path]:
    files: List[Path] = []
    for p in root.rglob("*"):
        if p.is_file() and p.suffix.lower() in exts and not _should_ignore(p, root, patterns):
            files.append(p)
    return files

def _top_n_lines(text: str, n: int) -> str:
    if n <= 0: return text
    return "\n".join(text.splitlines()[:n])

def _scan_headers(files: List[Path], max_header_lines: int) -> List[str]:
    missing: List[str] = []
    for p in files:
        try: text = p.read_text(encoding="utf-8", errors="ignore")
        except Exception: missing.append(str(p)); continue
        hay = _top_n_lines(text, max_header_lines) if max_header_lines else text
        if not HEADER_RE.search(hay): missing.append(str(p))
    return sorted(missing)

def _scan_duplicate_ids(files: List[Path]) -> Tuple[Dict[str, Dict[str, int]], Dict[str, Dict[str, List[int]]]]:
    counts_all: Dict[str, Dict[str, int]] = {}
    lines_all: Dict[str, Dict[str, List[int]]] = {}
    for p in files:
        try: text = p.read_text(encoding="utf-8", errors="ignore")
        except Exception: continue
        local_counts: Dict[str, int] = {}
        local_lines: Dict[str, List[int]] = {}
        for m in DUPLICATE_ID_RE.finditer(text):
            _id = m.group(1)
            local_counts[_id] = local_counts.get(_id, 0) + 1
            line_no = text.count("\n", 0, m.start()) + 1
            local_lines.setdefault(_id, []).append(line_no)
        offenders = {k: v for k, v in local_counts.items() if v > 1}
        if offenders:
            counts_all[str(p)] = offenders
            lines_all[str(p)] = {k: local_lines.get(k, []) for k in offenders.keys()}
    return counts_all, lines_all

def _discover_image_refs(files: List[Path]) -> List[str]:
    refs = set()
    for p in files:
        try: text = p.read_text(encoding="utf-8", errors="ignore")
        except Exception: continue
        for m in IMG_REF_RE.finditer(text):
            rel = m.group("a") or m.group("b") or m.group("c")
            if not rel: continue
            rel = rel.lstrip("./").lstrip("/")
            if Path(rel).suffix.lower() in ASSET_EXTS:
                refs.add(rel)
    return sorted(refs)

def _check_assets(public_dir: Path, rels: List[str]) -> Dict[str, bool]:
    out: Dict[str, bool] = {}
    for rel in rels: out[rel] = (public_dir / rel).exists()
    return out

def run(
    root: Path,
    out: Path,
    ignore_file: Path,
    inline_ignores: List[str],
    strict: str,
    fmt: str,
    require_images: List[str],
    max_header_lines: int,
    workers: int,
):
    patterns = _load_ignore_patterns(ignore_file, inline_ignores)
    public_dir = root / "public"
    files_all = _list_files(root, SCAN_EXTS_ALL, patterns)
    files_ids = [p for p in files_all if p.suffix.lower() in SCAN_EXTS_IDS]

    with ThreadPoolExecutor(max_workers=max(2, workers)) as ex:
        fut_hdr = ex.submit(_scan_headers, files_all, max_header_lines)
        fut_ids = ex.submit(_scan_duplicate_ids, files_ids)
        fut_ref = ex.submit(_discover_image_refs, files_all)
        headers_missing = fut_hdr.result()
        dup_counts, dup_lines = fut_ids.result()
        discovered_refs = fut_ref.result()

    required_images = BASE_REQUIRED_IMAGES + list(dict.fromkeys(require_images or []))
    required_status = _check_assets(public_dir, required_images)
    discovered_status = _check_assets(public_dir, discovered_refs)

    report = Report(
        headers_missing=headers_missing,
        duplicate_ids=dup_counts,
        duplicate_ids_lines=dup_lines,
        required_assets=required_status,
        discovered_assets=discovered_status,
        root=str(root),
        config={
            "ignore_file": str(ignore_file) if ignore_file else "",
            "strict": strict or "",
            "format": fmt,
            "max_header_lines": str(max_header_lines),
            "workers": str(workers),
        },
    )

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report.__dict__, indent=2), encoding="utf-8")

    if fmt == "json":
        print(json.dumps(report.__dict__, indent=2))
    else:
        miss_req = [k for k, ok in required_status.items() if not ok]
        miss_disc = [k for k, ok in discovered_status.items() if not ok]
        print("\n=== LEEWAY FRONTEND AUDIT (PLUS) ===")
        print(f"root: {root}")
        print(f"ignored patterns: {len(patterns)}")
        print(f"headers missing: {len(headers_missing)} file(s)")
        print(f"files with duplicate IDs: {len(dup_counts)}")
        if miss_req:  print(f"missing required assets: {', '.join(miss_req)}")
        if miss_disc: print(f"missing discovered assets: {', '.join(miss_disc[:10])}" + (f" ... (+{len(miss_disc)-10} more)" if len(miss_disc) > 10 else ""))

    # CI gating
    exit_fail = False
    if strict:
        def any_missing(d: Dict[str, bool]) -> bool: return any(not ok for ok in d.values())
        wants_headers = strict in ("all", "headers")
        wants_ids     = strict in ("all", "ids")
        wants_assets  = strict in ("all", "assets")
        if wants_headers and headers_missing: exit_fail = True
        if wants_ids     and dup_counts:      exit_fail = True
        if wants_assets  and (any_missing(required_status) or any_missing(discovered_status)): exit_fail = True

    if exit_fail:
        print("\n❌ LEEWAY AUDIT FAIL"); sys.exit(1)
    else:
        print("\n✅ LEEWAY AUDIT PASS")

def main():
    p = argparse.ArgumentParser(description="Leeway Frontend Audit (OS-agnostic)")
    p.add_argument("--root", type=Path, default=DEFAULT_ROOT, help="frontend root (default: repo-relative ./frontend or env LW_FRONTEND_ROOT)")
    p.add_argument("--out", type=Path, default=DEFAULT_OUT, help="JSON report path (default: <root>/run/leeway_frontend_audit_report.json)")
    p.add_argument("--ignore-file", type=Path, default=None, help="Path to .leewayignore (gitignore-like)")
    p.add_argument("--ignore", action="append", default=[], help="Extra ignore glob (repeatable)")
    p.add_argument("--strict", nargs="?", const="all", choices=["all","headers","ids","assets"], help="Exit non-zero if selected checks fail")
    p.add_argument("--format", dest="format_", choices=["json","table"], default="table", help="Console output format")
    p.add_argument("--require-image", action="append", default=[], help="Additional required image path (relative to /public)")
    p.add_argument("--max-header-lines", type=int, default=120, help="Only search header within first N lines (0=entire file)")
    p.add_argument("--workers", type=int, default=os.cpu_count() or 4, help="Thread workers")
    args = p.parse_args()

    if args.ignore_file is None:
        args.ignore.extend(DEFAULT_IGNORES)

    run(
        root=args.root.resolve(),
        out=args.out.resolve(),
        ignore_file=args.ignore_file.resolve() if args.ignore_file else None,
        inline_ignores=args.ignore,
        strict=args.strict or "",
        fmt=args.format_,
        require_images=args.require_image,
        max_header_lines=int(args.max_header_lines),
        workers=int(args.workers),
    )

if __name__ == "__main__":
    main()
