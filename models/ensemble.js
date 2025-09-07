// ensemble.js — fanout + voting + optional judge
(function(){
  const Registry = []; const byId = new Map();
  function register(adapter){ if(!adapter||!adapter.id||typeof adapter.infer!="function") throw new Error("bad adapter"); Registry.push(adapter); byId.set(adapter.id, adapter); return adapter.id; }
  function list(filter={}){ return Registry.filter(m=> !filter.tier || m.tier===filter.tier); }

  async function _callAdapter(adapter, messages, opts){
    const t0 = performance.now();
    try{ const out = await adapter.infer(messages, opts||{});
      return { ok:true,id:adapter.id,tier:adapter.tier,text:out?.text ?? String(out ?? ""),meta:out?.meta||{},ms:performance.now()-t0 };
    }catch(e){ return { ok:false,id:adapter.id,tier:adapter.tier,error:String(e),ms:performance.now()-t0 }; }
  }
  function _score(c, k){ if(!c.ok) return -1; const txt=c.text||""; let s=0; if(txt.trim().length) s+=1; const len=txt.length; if(len>=k.minLen && len<=k.maxLen) s+=1; if(k.mustContain){ for(const m of k.mustContain){ if(txt.toLowerCase().includes(m.toLowerCase())) s+=0.5 } } s += Math.max(0,1.0-Math.min(c.ms/4000,1.0))*0.5; return s; }

  async function run(messages, opts){
    const o = Object.assign({useFrontend:true,useBackend:true,judge:false,constraints:{minLen:1,maxLen:8000}}, opts||{});
    const targets = Registry.filter(m => (o.useFrontend && m.tier==="frontend") || (o.useBackend && m.tier==="backend"));
    if(!targets.length) throw new Error("No models registered");

    const results = await Promise.all(targets.map(a => _callAdapter(a, messages, o)));
    const scores = results.map(r => ({ id:r.id, tier:r.tier, s:_score(r,o.constraints), r })).sort((a,b)=>b.s-a.s);
    const winner = scores[0]?.r;

    let judged=null;
    if(o.judge){
      const judge = Registry.find(m=>m.role==="judge");
      if(judge){
        const prompt = [
          { role:"system", content:"You are a strict grader. Pick best candidate and include \"id\":\"<id>\" in JSON." },
          { role:"user", content: JSON.stringify({ query: messages, candidates: results.map(x=>({id:x.id,text:x.text})) }) }
        ];
        try{
          const evalr = await judge.infer(prompt, { maxTokens:128 });
          judged = { judge: judge.id, text: evalr?.text||"", pick: null };
          const m = /\"id\"\s*:\s*\"([^\"]+)\"/.exec(evalr?.text||"");
          if(m) judged.pick = m[1];
        }catch{}
      }
    }

    const finalId = judged?.pick && byId.has(judged.pick) ? judged.pick : (winner?.id || results[0]?.id);
    const final = results.find(r => r.id===finalId) || results[0];
    const envelope = { ok:!!final?.ok, id:final?.id, tier:final?.tier, text:final?.text||"", meta:{ ms:final?.ms, votes:scores, judge:judged, usedModels:results.map(r=>({id:r.id,tier:r.tier,ok:r.ok,ms:r.ms})) } };
    if(window.Bus) window.Bus.emit("ensemble:result", envelope);
    return envelope;
  }

  function makeAdapterFromGlobal(id, tier, globalName){
    const obj = window[globalName]; if(!obj) return null;
    const infer = async (messages, opts) => {
      if (typeof obj.generate==="function") return await obj.generate(messages, opts);
      if (typeof obj.chat==="function") return await obj.chat(messages, opts);
      if (typeof obj.infer==="function") return await obj.infer(messages, opts);
      if (typeof obj==="function") return await obj(messages, opts);
      throw new Error(globalName+" has no infer function");
    };
    return { id, tier, infer };
  }

  window.ModelRegistry = { register, list };
  window.Ensemble = { run };

  // auto-register common globals if present
  const known = [
    ["gemma-web","frontend","GemmaLLM"],
    ["phi3-web","frontend","Phi3LLM"],
    ["llama-web","frontend","LlamaLLM"],
    ["phi3-gguf","backend","Phi3GGUF"],
    ["llama-gguf","backend","LlamaGGUF"],
    ["gemini","backend","GeminiLLM"],
  ];
  for(const [id,tier,globalName] of known){ try{ const a=makeAdapterFromGlobal(id,tier,globalName); if(a) ModelRegistry.register(a) }catch{} }
})();
