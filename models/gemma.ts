import type { LLM, LLMResult, LLMGenerateOptions, ChatMessage } from './types';
import { pipeline } from '@xenova/transformers';

export class GemmaLLM implements LLM {
  private model: any = null;
  private isLoaded = false;
  private isLoading = false;
  private loadingProgress = 0;
  private fallbackModels = ['Xenova/LaMini-Flan-T5-248M', 'Xenova/distilgpt2', 'microsoft/DialoGPT-medium'];
  private modelName = this.fallbackModels[0];

  async initialize() {
    if (this.isLoaded || this.isLoading) return this.model;
    this.isLoading = true;
    try {
      this.model = await pipeline('text-generation', this.modelName);
      this.isLoaded = true;
    } catch (err) {
      // try fallbacks
      for (const m of this.fallbackModels) {
        try {
          this.model = await pipeline('text-generation', m);
          this.modelName = m;
          this.isLoaded = true;
          break;
        } catch (e) {
          // continue
        }
      }
    }
    this.isLoading = false;
    try { window.dispatchEvent(new CustomEvent('llmReady', { detail: { model: 'gemma', hemisphere: 'gemini' } })); } catch { }
    return this.model;
  }

  async generate(prompt: string, options: LLMGenerateOptions = {}): Promise<LLMResult> {
    if (!this.isLoaded) await this.initialize();
    const out = await this.model(prompt, { max_length: options.maxTokens ?? 128, temperature: options.temperature ?? 0.7 });
    const text = Array.isArray(out) ? String(out[0]?.generated_text ?? out[0]) : String((out as any).generated_text ?? out);
    return { text, model: this.modelName };
  }

  async chat(message: string, context: ChatMessage[] = []): Promise<LLMResult> {
    const prompt = `${context.map((c) => `${c.role}: ${c.content}`).join('\n')}\nUser: ${message}\nAssistant:`;
    return this.generate(prompt);
  }

  getStatus() {
    return { model: 'gemma', name: 'Gemma', isLoaded: this.isLoaded, isLoading: this.isLoading, progress: this.loadingProgress, hemisphere: 'gemini' };
  }
}
