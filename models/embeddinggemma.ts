let _embedder: any = null;
let _loading: Promise<any> | null = null;

async function getEmbedder() {
  if (_embedder) return _embedder;
  if (_loading) return _loading;
  _loading = (async () => {
    try {
      const mod = await import('@xenova/transformers');
      // pipeline('feature-extraction', 'google/embeddinggemma-300m')
      const p = await (mod.pipeline as any)('feature-extraction', 'google/embeddinggemma-300m');
      _embedder = p;
      return _embedder;
    } catch (err) {
      _loading = null;
      throw new Error('Failed to load @xenova/transformers embedding pipeline: ' + String(err));
    }
  })();
  return _loading;
}

export async function embedMany(texts: string[]): Promise<number[][]> {
  const e = await getEmbedder();
  const out: number[][] = [];
  for (const t of texts) {
    // pipeline returns nested token embeddings; use pooling mean + normalize if available
    const res = (await e(t, { pooling: 'mean', normalize: true })) as any;
    // res may be [embedding] or embedding directly depending on pipeline; normalize to number[]
    const arr = Array.isArray(res) && Array.isArray(res[0]) ? res[0] : (Array.isArray(res) ? res : [res]);
    const vec = Array.isArray(arr) ? arr.map((n: any) => Number(n)) : [Number(arr)];
    out.push(vec);
  }
  return out;
}

export async function embedOne(text: string): Promise<number[]> {
  const r = await embedMany([text]);
  return r[0];
}

export default { embedMany, embedOne };
