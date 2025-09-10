export interface LocalModel {
  id: string;
  family: 'phi3' | 'gemma' | 'llama';
  variant: string;
  format: 'gguf' | 'mlc';
  quant: string;
  path: string;
  engine: 'llama.cpp' | 'webllm';
}

declare const models: { models: LocalModel[] };
export default models;
