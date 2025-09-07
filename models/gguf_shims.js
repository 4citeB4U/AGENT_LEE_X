// gguf_shims.js — Frontend adapters for local OpenAI-compatible servers (llama.cpp)
(function(){
  function getEndpoint(key, fallback){
    try { const v = localStorage.getItem(key); if (v && v.startsWith("http")) return v; } catch {}
    return fallback;
  }

  function createOpenAIShim(id, endpointKey, defaultEndpoint, defaultModel="local") {
    async function _chat(messages, opts) {
      const url = getEndpoint(endpointKey, defaultEndpoint) + "/v1/chat/completions";
      const body = {
        model: (opts && opts.model) || defaultModel,
        messages,
        temperature: opts?.temperature ?? 0.6,
        max_tokens:  opts?.maxTokens   ?? 512,
        stream: false
      };
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) { const txt = await r.text().catch(()=>String(r.status)); throw new Error(`GGUF shim ${id} HTTP ${r.status}: ${txt}`); }
      const j = await r.json(); const text = j?.choices?.[0]?.message?.content ?? "";
      return { text, meta: { id, endpoint: getEndpoint(endpointKey, defaultEndpoint), usage: j?.usage || null } };
    }
    async function chat(messages, opts){ return _chat(messages, opts); }
    async function generate(messages, opts){ return _chat(messages, opts); }
    async function infer(messages, opts){ return _chat(messages, opts); }
    return { id, chat, generate, infer };
  }

  const Phi3 = createOpenAIShim("phi3-gguf",  "phi3_gguf_endpoint",  "http://127.0.0.1:8081");
  const Lla3 = createOpenAIShim("llama-gguf", "llama_gguf_endpoint", "http://127.0.0.1:8082");

  window.Phi3GGUF  = Phi3;
  window.LlamaGGUF = Lla3;

  if (window.ModelRegistry?.register) {
    try { window.ModelRegistry.register({ id: "phi3-gguf",  tier: "backend", infer: window.Phi3GGUF.infer  }); } catch {}
    try { window.ModelRegistry.register({ id: "llama-gguf", tier: "backend", infer: window.LlamaGGUF.infer }); } catch {}
  }
})();
