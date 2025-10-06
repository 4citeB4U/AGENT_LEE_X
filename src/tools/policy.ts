/* LEEWAY CANONICAL HEADER — DO NOT REMOVE
TAG: CONFIG.TOOLS.POLICY
COLOR_ONION_HEX: CORE=#2563EB|#9333EA LAYER=#EC4899|#FBBF24
ICON_FAMILY: lucide
ICON_GLYPH: wrench
ICON_SIG: TOOLS_POLICY
5WH: WHAT=Tool invocation mandate; WHY=Ensure Agent Lee emits ACTION tags invoking real tools; WHO=Leeway Core; WHERE=src/tools/policy.ts; WHEN=2025-10-05; HOW=Typed constant consumed by prompts
SPDX-License-Identifier: MIT
*/

export const TOOL_INVOCATION_POLICY = `TOOL MANDATE (ENFORCED):
You possess these tools:
1. image.generate { "prompt": string }
2. image.retrieve_last {}
3. image.describe_current { "mode?": "brief"|"detailed" }
4. call.start { "contact_name?": string, "phone_number?": string }
5. camera.analyze_frame { "focus?": string }
6. memory.retrieve { "query": string, "limit?": number }

Rules:
- If user intent matches a tool capability, output an ACTION tag FIRST.
- ACTION format: [ACTION: tool.namespace, {JSON_ARGUMENTS}]
- If prerequisite missing (no image, no camera permission, no query): ask a concise question for that prerequisite instead of fabricating results.
- After a tool executes (system side), you may follow with strategic guidance + CTA.
- Do NOT invent tool names; choose the most specific one. Do not wrap JSON in markdown fences.
- If purely conversational and no tool adds value, state reasoning briefly why no tool was invoked.
`;
