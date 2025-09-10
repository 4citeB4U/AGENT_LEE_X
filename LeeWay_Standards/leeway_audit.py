# LEEWAY HEADER — DO NOT REMOVE
# REGION: QA.CHECKS.AUDIT
# COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
# ICON_ASCII: family=lucide glyph=check ICON_SIG=CD534113
# 5WH: WHAT=Backend audit; WHY=surface missing deps, models, and headers; WHO=RapidWebDevelop; WHERE=tools\leeway_audit.py; WHEN=2025-09-07; HOW=python tools\leeway_audit.py
# SIG: 00000000
# AGENTS: AZR, PHI3, GEMINI, QWEN, LLAMA, ECHO
# SPDX-License-Identifier: MIT

import os, sys, json, re, shutil, subprocess
from pathlib import Path

ROOT = Path(r"D:\agentleegeminialmost\backend")
REQUIRED_DIRS = [
    "agentlee_mcp_hub\\mcp",
    "checkpoints\\converter",
    "checkpoints\\base_speakers\\EN",
    "checkpoints\\base_speakers\\ZH",
    "models",
    "routes",
    "scripts",
    "tools",
    "webrtc",
    "run",
]

REQUIRED_PY_PKGS = [
    "fastapi", "uvicorn", "structlog", "pydantic", "pydantic-settings",
    "websockets", "soundfile", "scipy", "numpy", "ffmpeg-python", "jieba"
]

HEADER_RE = re.compile(r"LEEWAY HEADER — DO NOT REMOVE|LEEWAY MICRO:", re.M)

def have_ffmpeg():
    try:
        subprocess.run(["ffmpeg","-version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return True
    except Exception:
        return False

def scan_headers(root: Path):
    missing = []
    for p in root.rglob("*"):
        if not p.is_file(): continue
        if p.suffix.lower() in {".py",".ps1",".psm1",".mjs",".js",".ts",".md",".surql"}:
            try:
                text = p.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                continue
            if not HEADER_RE.search(text):
                missing.append(str(p))
    return missing

def check_models(root: Path):
    models = root / "models"
    present = [str(p.name) for p in models.glob("*")]
    flags = {
        "azr": any("Absolute_Zero_Reasoner" in n or "Absolute_Zero_Reasoner" in n for n in present),
        "phi3": any("phi3" in n.lower() for n in present),
        "gemma": any("gemma" in n.lower() for n in present),
        "llama": any("llama" in n.lower() for n in present),
        "voice": any("voice" in n.lower() for n in present),
    }
    return {"present": present, "flags": flags}

def check_checkpoints(root: Path):
    req = {
        "converter": ["checkpoint.pth","config.json"],
        "EN": ["checkpoint.pth","config.json","en_default_se.pth","en_style_se.pth"],
        "ZH": ["checkpoint.pth","config.json","zh_default_se.pth"],
    }
    base = root / "checkpoints"
    found = {}
    for k, files in req.items():
        if k == "converter":
            d = base / "converter"
        elif k == "EN":
            d = base / "base_speakers" / "EN"
        else:
            d = base / "base_speakers" / "ZH"
        found[k] = {f: (d / f).exists() for f in files}
    return found

def check_requirements(root: Path):
    req = root / "requirements.txt"
    present = []
    missing = []
    if req.exists():
        text = req.read_text(encoding="utf-8", errors="ignore")
        for pkg in REQUIRED_PY_PKGS:
            if re.search(rf"^{re.escape(pkg)}(\W|$)", text, re.M|re.I):
                present.append(pkg)
            else:
                missing.append(pkg)
    else:
        missing = REQUIRED_PY_PKGS[:]
    return {"present": present, "missing": missing}

def check_dirs(root: Path):
    res = {}
    for d in REQUIRED_DIRS:
        res[d] = (root / d).exists()
    return res

def main():
    report = {
        "root": str(ROOT),
        "dirs": check_dirs(ROOT),
        "headers_missing": scan_headers(ROOT),
        "models": check_models(ROOT),
        "checkpoints": check_checkpoints(ROOT),
        "requirements": check_requirements(ROOT),
        "ffmpeg_available": have_ffmpeg(),
    }
    out = ROOT / "run" / "leeway_audit_report.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Wrote {out}")

if __name__ == "__main__":
    main()