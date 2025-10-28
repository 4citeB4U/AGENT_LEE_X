# Save as Download-AIModels.ps1
param(
  [string]$DestFolder = "C:\\AIModels"
)

If (!(Test-Path -Path $DestFolder)) { New-Item -Type Directory -Path $DestFolder | Out-Null }

$urlList = @(
    "https://huggingface.co/mlc-ai/web-llm/resolve/main/webllm-weights.bin",
    "https://huggingface.co/meta-llama/Llama-3.2-11B-Vision/resolve/main/pytorch_model.bin",
    "https://huggingface.co/meta-llama/Llama-3.2-11B-Vision/resolve/main/config.json",
    "https://huggingface.co/meta-llama/Llama-3.2-11B-Vision/resolve/main/tokenizer.json",
    "https://huggingface.co/Qwen/Qwen2-VL-7B/resolve/main/pytorch_model.bin",
    "https://huggingface.co/Qwen/Qwen2-VL-7B-Instruct/resolve/main/pytorch_model.bin",
    "https://huggingface.co/Qwen/Qwen2-VL-2B/resolve/main/pytorch_model.bin",
    "https://huggingface.co/Qwen/Qwen2-VL-2B-Instruct/resolve/main/pytorch_model.bin",
    "https://huggingface.co/meta-llama/Llama-3-8B/resolve/main/pytorch_model.bin",
    "https://huggingface.co/meta-llama/Llama-3-70B/resolve/main/pytorch_model.bin",
    "https://huggingface.co/mistralai/Mistral-7B-v0.2/resolve/main/pytorch_model.bin",
    "https://huggingface.co/google/gemma-7b-it/resolve/main/gemma-7b-it.bin",
    "https://huggingface.co/google/gemma-2b-it/resolve/main/gemma-2b-it.bin",
    "https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-q4.gguf",
    "https://huggingface.co/codellama/CodeLlama-7b-Instruct-hf/resolve/main/pytorch_model.bin",
    "https://huggingface.co/codellama/CodeLlama-13b-Instruct-hf/resolve/main/pytorch_model.bin",
    "https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.2/resolve/main/pytorch_model.bin",
    "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors",
    "https://huggingface.co/stabilityai/stable-diffusion-xl-refiner-1.0/resolve/main/sd_xl_refiner_1.0.safetensors",
    "https://huggingface.co/black-forest-labs/FLUX.1-dev/resolve/main/flux1-dev.safetensors",
    "https://huggingface.co/black-forest-labs/FLUX.1-schnell/resolve/main/flux1-schnell.safetensors",
    "https://huggingface.co/HiDream-ai/HiDream-I1/resolve/main/hidream_i1_base.safetensors",
    "https://huggingface.co/HiDream-ai/HiDream-E1/resolve/main/hidream_e1_editing.safetensors",
    "https://huggingface.co/Lightricks/LTXVideo/resolve/main/ltx-video-2b-v0.9.safetensors",
    "https://huggingface.co/Lightricks/LTXVideo/resolve/main/config.json",
    "https://huggingface.co/genmo/mochi-1/resolve/main/mochi-1-preview.safetensors",
    "https://huggingface.co/genmo/mochi-1/resolve/main/config.json",
    "https://huggingface.co/Kuaishou/Kling/resolve/main/kling-v1-5.safetensors",
    "https://huggingface.co/Kuaishou/Kling-Video/resolve/main/kling-video-v1.safetensors",
    "https://huggingface.co/pika-ai/pika/resolve/main/pika-v1.safetensors",
    "https://huggingface.co/openai/clip-vit-base-patch32/resolve/main/pytorch_model.bin",
    "https://huggingface.co/openai/clip-vit-large-patch14/resolve/main/pytorch_model.bin",
    "https://huggingface.co/Salesforce/blip2-flan-t5-xxl/resolve/main/pytorch_model.bin",
    "https://huggingface.co/Salesforce/blip2-flan-t5-xl/resolve/main/pytorch_model.bin"
)

foreach ($url in $urlList) {
    $fileName = Split-Path $url -Leaf
    $destPath = Join-Path $DestFolder $fileName
    Write-Host "Downloading $fileName..."
    try {
        Invoke-WebRequest -Uri $url -OutFile $destPath -UseBasicParsing
        Write-Host "✓ Downloaded: $fileName"
    } catch {
        Write-Host "✗ Failed: $fileName"
    }
}
