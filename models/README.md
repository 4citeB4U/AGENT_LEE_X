# Model Files

This directory will store the quantized model files for Agent Lee:

1. `tinyllama-1.1b-q4.gguf.part1` and `tinyllama-1.1b-q4.gguf.part2` - Chunked TinyLlama model
2. `whisper-tiny.en.br` - Brotli-compressed Whisper ASR model
3. `embeddinggemma-300m.*` - Gemma embedding model (google/embeddinggemma-300m). Note: you must accept the Hugging Face license before downloading when using remote loaders.

These files should be downloaded and placed here to enable full offline functionality.