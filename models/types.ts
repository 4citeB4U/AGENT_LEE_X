export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export interface LLMGenerateOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
}

export interface LLMResult {
  text: string;
  model: string;
  tokens?: number;
  hemisphere?: string;
}

export interface LLM {
  initialize(): Promise<unknown>;
  generate(prompt: string, options?: LLMGenerateOptions): Promise<LLMResult>;
  chat(message: string, context?: ChatMessage[]): Promise<LLMResult>;
  getStatus(): {
    model: string;
    name?: string;
    isLoaded?: boolean;
    isLoading?: boolean;
    progress?: number;
    hemisphere?: string;
  };
}

export interface RerankerInput {
  query: string;
  candidates: Array<{ id?: string; text: string; score: number; meta?: Record<string, unknown> }>;
  k: number;
}
export type RerankerFn = (
  input: RerankerInput,
) => Promise<RerankerInput['candidates']>;
