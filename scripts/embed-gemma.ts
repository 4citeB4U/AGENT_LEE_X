// Run: npm run embed:gemma
import fs from "fs/promises";
import type { ReadStream } from "fs";
import { pipeline, env } from "@xenova/transformers";

// Prefer process.env first; fallback to .env.local
async function ensureHfToken(): Promise<string | undefined> {
  if (process.env.HF_TOKEN) return process.env.HF_TOKEN;
  try {
    const data = await fs.readFile(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of data.split(/\r?\n/)) {
      const m = line.match(/^\s*HF_TOKEN\s*=\s*(.+)\s*$/);
      if (m) {
        const token = m[1].trim();
        if (token) {
          process.env.HF_TOKEN = token;
          return token;
        }
      }
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

const _hf = await ensureHfToken();
(env as any).HF_TOKEN = process.env.HF_TOKEN ?? _hf ?? (env as any).HF_TOKEN;
env.allowLocalModels = false;

const PRIMARY = "Xenova/all-MiniLM-L6-v2";
const FALLBACK = "Xenova/all-MiniLM-L6-v2";

type FEOutput = { data: Float32Array; model?: { model_id?: string; modelId?: string } };
type FeatureExtractor = ((text: string, opts?: { pooling?: string; normalize?: boolean }) => Promise<FEOutput>) & {
  model?: { model_id?: string; modelId?: string };
};

async function getFE(): Promise<FeatureExtractor> {
  try {
    console.log("Creating embedding pipeline (try Gemma)...");
    const p = (await pipeline("feature-extraction", PRIMARY, { quantized: true })) as FeatureExtractor;
    return p;
  } catch (e: unknown) {
    const msg = (e as Error)?.message ?? String(e);
    console.warn(`Gemma failed (${msg}).`);

    if (process.env.HF_TOKEN) {
      console.log("Attempting Hugging Face Inference API fallback using HF_TOKEN...");
      try {
        const feh = makeHfInferenceFeatureExtractor(PRIMARY, process.env.HF_TOKEN) as FeatureExtractor;
        await feh("test");
        console.log("HF Inference API accepted; using API-backed extractor.");
        return feh;
      } catch (errApi: unknown) {
        console.warn("HF Inference API fallback failed:", (errApi as Error)?.message ?? String(errApi));
      }
    }

    console.warn(`Falling back to ${FALLBACK}.`);
    const fb = (await pipeline("feature-extraction", FALLBACK, { quantized: true })) as FeatureExtractor;
    return fb;
  }
}

function makeHfInferenceFeatureExtractor(modelId: string, token: string) {
  const url = `https://api-inference.huggingface.co/models/${encodeURIComponent(modelId)}`;
  const fe = async (text: string, _opts: { pooling?: string; normalize?: boolean } = {}): Promise<FEOutput> => {
    const body = { inputs: text, options: { wait_for_model: true } };
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HF inference API error ${res.status}: ${await res.text()}`);
    const data: unknown = await res.json();
    // Normalize shapes
    if ((data as any)?.error) throw new Error((data as any).error);

    let arr: Float32Array;
    if (Array.isArray(data) && typeof (data as number[])[0] === "number") {
      arr = Float32Array.from(data as number[]);
    } else if (Array.isArray(data) && Array.isArray((data as any[])[0])) {
      const toks = (data as number[][]).map(t => Float32Array.from(t));
      const dim = toks[0].length;
      const out = new Float32Array(dim);
      for (const t of toks) for (let i = 0; i < dim; i++) out[i] += t[i];
      for (let i = 0; i < dim; i++) out[i] /= toks.length;
      arr = out;
    } else {
      throw new Error("Unexpected HF inference response shape");
    }
    return { data: arr, model: { model_id: modelId } };
  };
  (fe as any).model = { model_id: modelId };
  return fe;
}

async function main(): Promise<void> {
  console.time("load");
  const fe = await getFE();
  console.timeEnd("load");

  const sentences = [
    "That is a happy person",
    "That is a happy dog",
    "That is a very happy person",
    "Today is a sunny day",
  ];

  const vecs: number[][] = [];
  for (const s of sentences) {
    const out = await fe(s, { pooling: "mean", normalize: true });
    vecs.push(Array.from(out.data));
  }

  const cos = (a: number[], b: number[]) => a.reduce((sum, v, i) => sum + v * b[i], 0);
  const sim = vecs.map(v => vecs.map(w => +cos(v, w).toFixed(3)));

  const usedModel = fe.model?.model_id ?? fe.model?.modelId ?? PRIMARY;
  (fe as FeatureExtractor).model ??= { model_id: usedModel };
  console.log("Model used:", usedModel);
  console.log("Embedding dim:", vecs[0].length);
  console.table(sim);
}

main().catch(err => {
  console.error("Embedding run failed:", err);
  process.exitCode = 1;
});
