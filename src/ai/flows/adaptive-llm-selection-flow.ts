// adaptive-llm-selection-flow.ts
'use server';

/**
 * @fileOverview This flow adaptively selects the best LLM for a given task.
 *
 * @exported `adaptiveLLMSelection` - An async function that takes a task and optional text/file type, then returns the selected LLM, its parameters, and the result.
 * @exported `AdaptiveLLMSelectionInput` - The input type for the `adaptiveLLMSelection` function, defining the task and optional data.
 * @exported `AdaptiveLLMSelectionOutput` - The output type for the `adaptiveLLMSelection` function, including the selected model, parameters, and result.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AdaptiveLLMSelectionInputSchema = z.object({
  task: z.string().describe('The task to be performed, such as summarizing, answering a question, or translating.'),
  text: z.string().optional().describe('Optional text to be processed; can be a document or a question.'),
  fileType: z.string().optional().describe('Optional file type to be processed, such as PDF, DOC, or TXT.'),
});

export type AdaptiveLLMSelectionInput = z.infer<typeof AdaptiveLLMSelectionInputSchema>;

const AdaptiveLLMSelectionOutputSchema = z.object({
  model: z.string().describe('The LLM model selected for the task.'),
  parameters: z.record(z.any()).describe('The parameters configured for the selected model.'),
  result: z.string().describe('The result of the task performed by the selected model.'),
});

export type AdaptiveLLMSelectionOutput = z.infer<typeof AdaptiveLLMSelectionOutputSchema>;

export async function adaptiveLLMSelection(input: AdaptiveLLMSelectionInput): Promise<AdaptiveLLMSelectionOutput> {
  return adaptiveLLMSelectionFlow(input);
}

const adaptiveLLMSelectionPrompt = ai.definePrompt({
  name: 'adaptiveLLMSelectionPrompt',
  input: { schema: AdaptiveLLMSelectionInputSchema },
  output: { schema: AdaptiveLLMSelectionOutputSchema },
  prompt: `You are an AI expert. Your task is to intelligently select the best LLM and fine-tune its parameters for a given task.

You will receive the "task", the "text" input, and the "fileType". Based on these, determine the best "model" to use (choose from summarize, chat, or default) and its appropriate configuration.

The choices of model are summarize, chat, or default.
*   The summarize model will be a Gemini model fine-tuned for summarization.
*   If the input is a question that is chat-like, choose the chat model. The Chat model will be a Gemini model.
*   The default model will also be a Gemini model suitable for general tasks.

Based on the model, also set the parameters for that model, like temperature or maxTokens. Ensure all chosen parameters are appropriate for the chosen model.

You will output this in the JSON format specified by the AdaptiveLLMSelectionOutputSchema schema.

Task: {{{task}}}
Text: {{{text}}}
FileType: {{{fileType}}}`,
});

const adaptiveLLMSelectionFlow = ai.defineFlow(
  {
    name: 'adaptiveLLMSelectionFlow',
    inputSchema: AdaptiveLLMSelectionInputSchema,
    outputSchema: AdaptiveLLMSelectionOutputSchema,
  },
  async input => {
    const {output} = await adaptiveLLMSelectionPrompt(input);
    return output!;
  }
);
