import type { RerankerFn } from './types';

export type Doc = { id?: string; text: string; meta?: Record<string, unknown> };
export type Index = { dim: number; docs: Doc[]; vectors: Float32Array[] };
export type EmbedderFn = (texts: string[]) => Promise<number[][]>;
export type SingleEmbedFn = (text: string) => Promise<number[]>;

export class RAGEmbedder {
  private embedMany: EmbedderFn | null = null;
  private embedOne: SingleEmbedFn | null = null;

  constructor(embedManyOrOne: EmbedderFn | SingleEmbedFn) {
    if (typeof embedManyOrOne === 'function') {
      // guess if function expects array by calling length === 1 at runtime is not reliable.
      // We store as both possibilities and adapt at call time.
      this.embedMany = (texts: string[]) => (embedManyOrOne as EmbedderFn)(texts);
      this.embedOne = (text: string) => (embedManyOrOne as SingleEmbedFn)(text);
    }
  }

  async buildIndex(docs: Doc[], opts?: { autoChunk?: boolean; chunker?: { maxChars?: number; overlapChars?: number; respectNewlines?: boolean } }): Promise<Index> {
    const chunkOpts = opts?.chunker ?? { maxChars: 1000, overlapChars: 200, respectNewlines: true };
    const pieces: Doc[] = [];
    for (const d of docs) {
      if (opts?.autoChunk) {
        const chunks = simpleChunk(d.text, chunkOpts);
        for (let i = 0; i < chunks.length; i++) pieces.push({ id: d.id ? `${d.id}--${i}` : undefined, text: chunks[i], meta: d.meta });
      } else {
        pieces.push(d);
      }
    }
    const texts = pieces.map((p) => p.text);
    if (!this.embedMany) throw new Error('No embedder provided');
    const vectors2d = await this.embedMany(texts);
    const vectors = vectors2d.map((v) => Float32Array.from(v));
    const dim = vectors[0]?.length ?? 0;
    return { dim, docs: pieces, vectors };
  }

  async searchIndex(query: string, index: Index, k = 5, reranker?: RerankerFn) {
    if (!this.embedOne && !this.embedMany) throw new Error('No embedder available');
    const qv = this.embedOne ? await this.embedOne(query) : (await this.embedMany!([query]))[0];
    const qf = Float32Array.from(qv);
    const scores: Array<{ id?: string; text: string; score: number; meta?: Record<string, unknown> }> = [];
    for (let i = 0; i < index.vectors.length; i++) {
      const v = index.vectors[i];
      const score = dot(qf, v) / (norm(qf) * norm(v) + 1e-12);
      scores.push({ id: index.docs[i].id, text: index.docs[i].text, score, meta: index.docs[i].meta });
    }
    scores.sort((a, b) => b.score - a.score);
    const topk = scores.slice(0, k);
    if (reranker) {
      const reranked = await reranker({ query, candidates: topk, k });
      return reranked;
    }
    return topk;
  }
}

export function simpleChunk(text: string, opts?: { maxChars?: number; overlapChars?: number; respectNewlines?: boolean }) {
  const maxChars = opts?.maxChars ?? 1000;
  const overlap = opts?.overlapChars ?? 200;
  const out: string[] = [];
  if (opts?.respectNewlines) {
    const parts = text.split(/\n{2,}/g);
    for (const p of parts) {
      if (!p) continue;
      if (p.length <= maxChars) out.push(p);
      else {
        for (let i = 0; i < p.length; i += maxChars - overlap) out.push(p.slice(i, i + maxChars));
      }
    }
  } else {
    for (let i = 0; i < text.length; i += maxChars - overlap) out.push(text.slice(i, i + maxChars));
  }
  return out;
}

export function makeLLMReranker(llmComplete: (prompt: string) => Promise<string>, preamble = ''): RerankerFn {
  return async ({ query, candidates, k }) => {
    const prompt = `${preamble}\nRank the following candidates for query: "${query}"\nReturn JSON: { \"items\": [{ \"idx\": number, \"score\": number }] }\nCandidates:\n${candidates.map((c, i) => `${i}: ${c.text}`).join('\n')}`;
    try {
      const raw = await llmComplete(prompt);
      const j = JSON.parse(raw);
      if (!Array.isArray(j.items)) return candidates.slice(0, k);
      type Item = { idx: number; score: number };
      const mapped: Array<{ id?: string; text: string; score: number; meta?: Record<string, unknown> }> =
        j.items.map((it: Item) => ({ ...(candidates[it.idx] || {}), score: Number(it.score ?? 0) }));
      mapped.sort((a, b) => b.score - a.score);
      return mapped.slice(0, k);
    } catch (err) {
      return candidates.slice(0, k);
    }
  };
}

function dot(a: Float32Array, b: Float32Array) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function norm(a: Float32Array) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * a[i];
  return Math.sqrt(s);
}
