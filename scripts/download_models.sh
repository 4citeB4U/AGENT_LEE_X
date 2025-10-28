#!/usr/bin/env bash
# Save as download_models.sh
set -euo pipefail
DEST_DIR="${1:-./AIModels}"
mkdir -p "$DEST_DIR"

URLS=(
  "https://huggingface.co/mlc-ai/web-llm/resolve/main/webllm-weights.bin"
  "https://huggingface.co/Qwen/Qwen2-VL-7B-Instruct/resolve/main/pytorch_model.bin"
  "https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-q4.gguf"
  "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors"
  "https://huggingface.co/black-forest-labs/FLUX.1-schnell/resolve/main/flux1-schnell.safetensors"
)

for url in "${URLS[@]}"; do
  filename=$(basename "$url")
  echo "Downloading $filename..."
  curl -L "$url" -o "$DEST_DIR/$filename"
  echo "✓ Downloaded: $filename"
done
