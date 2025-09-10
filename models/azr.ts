import type { LLMResult } from './types';
// Note: @wllama/wllama may not be installed in this repo; this file assumes a DOM/browser environment.

export class AbsoluteZeroReasoner {
  private wllama: any = null;
  private isLoaded = false;
  private isLoading = false;
  private modelUrl: string | null = null;
  private loadingProgress = 0;

  private configPaths = {
    'single-thread/wllama.wasm': './node_modules/@wllama/wllama/esm/single-thread/wllama.wasm',
    'multi-thread/wllama.wasm': './node_modules/@wllama/wllama/esm/multi-thread/wllama.wasm',
    'multi-thread/wllama.worker.mjs': './node_modules/@wllama/wllama/esm/multi-thread/wllama.worker.mjs',
  };

  private modelConfig = { n_ctx: 2048, n_threads: Math.min((navigator as any).hardwareConcurrency || 4, 4), temperature: 0.1, top_p: 0.9, n_gpu_layers: 0 };

  async initialize() {
    if (this.isLoaded || this.isLoading) return this.wllama;
    this.isLoading = true;
    // lazy require to avoid breaking node builds
    const Wllama = (globalThis as any).Wllama;
    if (!Wllama) {
    try {
      // try dynamic import
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      // @ts-ignore - dynamic optional dependency
      const mod = await import('@wllama/wllama/esm/index.js');
        this.wllama = new (mod?.Wllama ?? mod?.default)(this.configPaths);
      } catch (err) {
        this.isLoading = false;
        throw new Error('Wllama not available: ' + String(err));
      }
    } else {
      this.wllama = new Wllama(this.configPaths);
    }
    await this.loadModel();
    this.isLoaded = true; this.isLoading = false;
    try { window.dispatchEvent(new CustomEvent('llmReady', { detail: { model: 'azr', hemisphere: 'azr' } })); } catch { /* ignore non-browser */ }
    return this.wllama;
  }

  private async loadModel(): Promise<void> {
    const sources = [
      'https://huggingface.co/Xenova/llama2.c-stories15M/resolve/main/ggml-model-q8_0.gguf',
      'https://huggingface.co/Xenova/llama2.c-stories42M/resolve/main/ggml-model-q8_0.gguf',
      './electron backend/llama_models/andrewzh_Absolute_Zero_Reasoner-Coder-3b-Q4_K_M.gguf'
    ];
    for (const url of sources) {
      try {
        const head = await fetch(url, { method: 'HEAD' });
        if (!head.ok) continue;
        await this.wllama.loadModelFromUrl(url, {
          progressCallback: (p: { total?: number; loaded?: number }) => {
            if (p.total && p.loaded) {
              this.loadingProgress = Math.round((p.loaded / p.total) * 100);
              try { window.dispatchEvent(new CustomEvent('llmLoadingProgress', { detail: { model: 'azr', progress: this.loadingProgress } })); } catch { }
            }
          },
          ...this.modelConfig
        });
        this.modelUrl = url;
        return;
      } catch {
        // try next
      }
    }
    throw new Error('Could not load AZR model from any source');
  }

  async reason(problem: string, context: Record<string, unknown> = {}): Promise<LLMResult> {
    if (this.isLoaded) return this.reasonWithWllama(problem, context);
    return this.reasonWithPhi3Fallback(problem, context);
  }

  private async reasonWithWllama(problem: string, context: Record<string, unknown>): Promise<LLMResult> {
    if (!this.isLoaded) await this.initialize();
    const prompt = this.buildReasoningPrompt(problem, context);
    const text = await this.wllama.createCompletion(prompt, { nPredict: (context as any)['maxTokens'] ?? 512, temperature: 0.1, topP: 0.9, repeatPenalty: 1.1, stopSequence: ['</reasoning>','Human:','User:'] });
    return { text: String(text), model: 'azr', hemisphere: 'azr' };
  }

  private buildReasoningPrompt(problem: string, context: Record<string, unknown>) {
    return `<reasoning>\nProblem: ${problem}\nContext: ${JSON.stringify(context, null, 2)}\nInstructions:\n1. Break down\n2. Analyze\n3. Consider approaches\n4. Provide solution\n5. Verify\nReasoning Process:\n`;
  }

  private async reasonWithPhi3Fallback(problem: string, context: Record<string, unknown>): Promise<LLMResult> {
    const phi3 = (globalThis as any).phi3LLM;
    if (!phi3) return { text: 'AZR unavailable; PHI-3 fallback missing.', model: 'azr-basic-fallback' };
    const prompt = `You are an advanced reasoning system.\nProblem: ${problem}\nAnalysis:`;
    const r = await phi3.generate(prompt, { maxTokens: (context as any)['maxTokens'] ?? 512, temperature: 0.1 });
    return { text: r.text, model: 'azr-phi3-fallback', hemisphere: 'azr' };
  }
}
