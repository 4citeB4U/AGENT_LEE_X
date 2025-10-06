/*
LEEWAY HEADER — DO NOT REMOVE
REGION: UI.UNKNOWN
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_ASCII: family=lucide glyph=layout-dashboard ICON_SIG=CD534113
5WH: WHAT=Module: worker.ts; WHY=standardize; WHO=RapidWebDevelop; WHERE=F:\4leeway-multitool\cf-proxy\src\worker.ts; WHEN=2025-10-05; HOW=React/Tailwind
SIG: 00000000
AGENTS: AZR, PHI3, GEMINI, QWEN, LLAMA, ECHO
SPDX-License-Identifier: MIT
*/

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const allow = ["https://<your-username>.github.io", "https://<your-username>.github.io/<your-repo>"];
    const ok = allow.some(o => origin.startsWith(o));
    if (req.method === "OPTIONS") return new Response(null, { headers: {
      "Access-Control-Allow-Origin": ok? origin : allow[0],
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary":"Origin" }});
    if (req.method !== "POST") return new Response(JSON.stringify({error:"Method not allowed"}), {status:405});
    if (!env.GEMINI_API_KEY) return new Response(JSON.stringify({error:"Missing GEMINI_API_KEY"}), {status:500});
    try {
      const { model = "models/gemini-1.5-flash", input } = await req.json();
      const url = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
      const r = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(input ?? { contents: [] }) });
      return new Response(r.body, { status: r.status, headers: { "Content-Type":"application/json", "Cache-Control":"no-store", "Access-Control-Allow-Origin": ok? origin : allow[0], "Vary":"Origin" }});
    } catch(e) { return new Response(JSON.stringify({error: String(e?.message||e)}), {status:500}); }
  }
};
