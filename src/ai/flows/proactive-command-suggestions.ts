// proactive-command-suggestions.ts
'use server';

/**
 * @fileOverview This flow provides proactive command suggestions based on the current context to enhance user efficiency and feature discovery.
 *
 * @exported `getProactiveCommandSuggestions` - An async function that takes a context description and returns a list of suggested commands.
 * @exported `ProactiveCommandSuggestionsInput` - The input type for the `getProactiveCommandSuggestions` function, defining the context description.
 * @exported `ProactiveCommandSuggestionsOutput` - The output type for the `getProactiveCommandSuggestions` function, a list of command suggestions.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProactiveCommandSuggestionsInputSchema = z.object({
  contextDescription: z.string().describe('A description of the current context, including the user\'s current activity and available tools.'),
});

export type ProactiveCommandSuggestionsInput = z.infer<typeof ProactiveCommandSuggestionsInputSchema>;

const ProactiveCommandSuggestionsOutputSchema = z.array(z.string()).describe('A list of suggested commands relevant to the current context.');

export type ProactiveCommandSuggestionsOutput = z.infer<typeof ProactiveCommandSuggestionsOutputSchema>;

export async function getProactiveCommandSuggestions(input: ProactiveCommandSuggestionsInput): Promise<ProactiveCommandSuggestionsOutput> {
  return proactiveCommandSuggestionsFlow(input);
}

const proactiveCommandSuggestionsPrompt = ai.definePrompt({
  name: 'proactiveCommandSuggestionsPrompt',
  input: {schema: ProactiveCommandSuggestionsInputSchema},
  output: {schema: ProactiveCommandSuggestionsOutputSchema},
  prompt: `You are an AI assistant that suggests useful commands to the user based on the current context.

  The current context is described as follows:
  {{contextDescription}}

  Given this context, suggest a list of commands that would be helpful to the user. Be specific and only suggest commands that would be immediately useful. Return the commands as a JSON array of strings.`, safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
    ],
});

const proactiveCommandSuggestionsFlow = ai.defineFlow(
  {
    name: 'proactiveCommandSuggestionsFlow',
    inputSchema: ProactiveCommandSuggestionsInputSchema,
    outputSchema: ProactiveCommandSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await proactiveCommandSuggestionsPrompt(input);
    return output!;
  }
); 
