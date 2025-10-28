# Local Models and Modules

Place optional model interface modules here (browser-executable JavaScript):

- azr.js
- phi3.js
- gemma.js
- llama.js
- embedder.js
- azr_modules_combined.js

At startup, the app will attempt to load modules from both `/llm-modules` and `/models`:

- /llm-modules/*.js (legacy path)
- /models/*.js (this folder)

These files should export functions compatible with your local engine adapters (e.g., using @mlc-ai/web-llm or @xenova/transformers in-browser).

## Weights and Binaries

Do NOT commit model weights to this repository. Instead, download them locally using one of the scripts:

- PowerShell (Windows): `scripts/Download-AIModels.ps1`
- Bash (Linux/macOS): `scripts/download_models.sh`

Example locations after download:

- C:\\AIModels\\Phi-3-mini-4k-instruct-q4.gguf
- C:\\AIModels\\webllm-weights.bin

## Licensing

Each model has its own license (commercial vs research). Verify licensing before use. This project does not distribute weights and only provides paths and loaders.
