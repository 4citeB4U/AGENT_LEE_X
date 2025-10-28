/*
LEEWAY HEADER — DO NOT REMOVE
TAG: DOC.MODELS.DOWNLOAD
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: download
ICON_SIG: CD534113
5WH: WHAT=Local model download helpers; WHY=enable offline/LAN use; WHO=LeeWay Core; WHERE=scripts/MODELS.md; WHEN=2025-10-28; HOW=Markdown
SPDX-License-Identifier: MIT
*/

# Local Models — Download Helpers (Optional)

These scripts fetch model weights and artifacts for local or LAN-only scenarios. Weights are not committed to the repository.

---

## Scripts

- Windows PowerShell: `scripts/Download-AIModels.ps1`
- Bash (macOS/Linux): `scripts/download_models.sh`

Run from the repo root:

```powershell
# PowerShell
pwsh -File .\scripts\Download-AIModels.ps1
```

```bash
# Bash
bash ./scripts/download_models.sh
```

---

## Placement

- Default destination: `public/models/`
- Keep directory names readable; avoid spaces and special characters
- Ensure any browser-loadable `.js` modules you want auto-imported live under `public/models/` or `public/llm-modules/`

---

## Notes & Licenses

- Check each model’s license before use or distribution
- Some models require additional runtime libraries or hardware (e.g., WebGPU)
- Large downloads can take significant time and disk space — plan accordingly

---

## Troubleshooting

- If diagnostics shows failed module imports, verify file paths and filenames
- Ensure MIME types are served correctly by Vite/Pages for `.js` modules
- Use the Diagnostics page Hard Reload button after changing files

---

## See Also

- Diagnostics: `docs/DIAGNOSTICS.md`
- Worker proxy: `cf-proxy/README.md`
