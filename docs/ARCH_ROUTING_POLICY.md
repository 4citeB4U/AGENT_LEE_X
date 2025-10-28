/*
LEEWAY HEADER — DO NOT REMOVE
TAG: DOC.ARCH.ROUTING.POLICY
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: route
ICON_SIG: CD534113
5WH: WHAT=Model routing & arbitration policy; WHY=Determinism; WHO=LeeWay Core; WHERE=docs/ARCH_ROUTING_POLICY.md; WHEN=2025-10-28; HOW=Markdown
SPDX-License-Identifier: MIT
*/

# Model Routing & Arbitration Policy

Deterministic order per task type (fallback on OOM/init timeout):

- Copy/plan/summaries: mistral_7b_instruct_v02 → llama3_8b → phi3_mini_4k_instr
- Code/TSX/Tailwind: codellama_13b_instr → codellama_7b_instr → mistral_7b_instruct_v02
- Vision/OCR: qwen2_vl_7b_instr → qwen2_vl_2b_instr → llama_3_2_vision_11b
- Embeddings: embedder.js (text) → clip_vit_* (image)
- Image gen: flux1-schnell → sdxl_base_1.0 (+refiner) → flux1-dev
- Image edit: hidream_e1_editing
- Video: ltx_video_2b_v0_9 → pika_v1 → mochi_1_preview

Arbitration rules:
- Prefer local-first; if Local-only ON, never call remote.
- If multiple qualify, choose first available by capability and resource fit.
- On failure: downgrade size/quant; reduce params; switch engine family if needed.
- Always return schema-conformant results (answer/plan/code/media_request/vision/retrieval).
