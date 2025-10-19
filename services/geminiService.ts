/* LEEWAY HEADER
TAG: FRONTEND.SERVICE.GEMINI_BRIDGE
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: layout-dashboard
ICON_SIG: CD534113
5WH: WHAT=Gemini streaming + utility bridge (context assembly, error mediation, action tags); WHY=Provide model-agnostic pattern baseline (can swap vendor) while ensuring resilience & consistent shape; WHO=Leeway Core (agnostic); WHERE=services/geminiService.ts; WHEN=2025-10-05; HOW=TypeScript + streaming wrapper abstraction
SPDX-License-Identifier: MIT
*/

// FIX: Updated import path from "@google/ai" to "@google/genai"
import { Chat, GoogleGenAI } from "@google/genai";
import { buildSystemPromptV11 } from '../src/agentlee.core'; // Use v11-aware prompt builder
import type { Note } from '../types';
import { geminiApiLimiter } from '../utils/rateLimiter'; // FIX: Import the API rate limiter

// Get API key from environment with fallback checks
const getApiKey = (): string => {
  // Check for environment variables first
  const envApiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.AGENT_LEE_X;
  
  if (envApiKey) {
    return envApiKey;
  }
  
  // Check for API key in localStorage as fallback for user-provided keys
  const storedApiKey = typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') : null;
  
  if (storedApiKey) {
    return storedApiKey;
  }
  
  // Only log in development mode to avoid console clutter in production
  if (process.env.NODE_ENV === 'development') {
    console.error('Environment variables checked:', {
      API_KEY: !!process.env.API_KEY,
      GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
      VITE_GEMINI_API_KEY: !!process.env.VITE_GEMINI_API_KEY,
      AGENT_LEE_X: !!process.env.AGENT_LEE_X,
      localStorage_key: !!storedApiKey
    });
  }
  
  throw new Error("MISSING_API_KEY");
};

// Helper function to set API key from UI
export const setApiKey = (apiKey: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('gemini_api_key', apiKey);
    // Reset the AI instance to use the new key
    ai = new GoogleGenAI({ apiKey });
  }
};

// Helper function to check if API key is available
export const hasApiKey = (): boolean => {
  try {
    getApiKey();
    return true;
  } catch (error) {
    return false;
  }
};

let ai: GoogleGenAI;

// Initialize AI service lazily to avoid issues during build
const getAI = (): GoogleGenAI => {
  if (!ai) {
    ai = new GoogleGenAI({ apiKey: getApiKey() });
  }
  return ai;
};

/**
 * A wrapper function to handle common Gemini API errors, specifically for rate limiting and quota issues.
 * @param apiCall The asynchronous API function to execute.
 * @returns The result of the API call.
 * @throws A user-friendly error message if a quota error is detected.
 */
async function handleGeminiError<T>(apiCall: () => Promise<T>): Promise<T> {
    try {
        return await apiCall();
    } catch (error: any) {
        console.error("Gemini API Error:", error);
        
        let errorMessage = (error.message || error.toString() || '').toLowerCase();
        
        // FIX: The error message from the API can be a JSON string.
        // We attempt to parse it to get a more specific message.
        if (errorMessage.startsWith('{')) {
             try {
                const parsedError = JSON.parse(error.message);
                if (parsedError.error?.message) {
                    errorMessage = parsedError.error.message.toLowerCase();
                }
             } catch (e) {
                // Ignore if it's not valid JSON.
             }
        }
        
        if (errorMessage.includes('quota') || errorMessage.includes('resource_exhausted') || errorMessage.includes('429')) {
            throw new Error("API quota exceeded. Please check your plan and billing details, or try again later.");
        }
        
        throw error;
    }
}


/**
 * NEW: Determines if a user's prompt requires visual input from the camera.
 * @param prompt The user's text prompt.
 * @returns A boolean indicating if the query is visual.
 */
export const classifyVisualRequest = async (prompt: string): Promise<boolean> => geminiApiLimiter.schedule(() => handleGeminiError(async () => {
    const systemInstruction = "You are a request classifier. Your task is to determine if a user's request requires using the device's camera to see something in the real world. Answer only with 'YES' or 'NO'. For example, if the user asks 'what am I wearing?' or 'can you see this?', answer 'YES'. If they ask 'what is the capital of France?', answer 'NO'.";
    
    const response = await getAI().models.generateContent({
        model: "gemini-2.5-flash",
        contents: `User request: "${prompt}"`,
        config: {
            systemInstruction,
            temperature: 0,
            thinkingConfig: { thinkingBudget: 0 }
        },
    });
    
    const text = (response.text ?? '').trim().toUpperCase();
    console.log(`Visual Classifier for prompt "${prompt}" -> Response: "${text}" -> Decision: ${text.includes("YES")}`);
    return text.includes("YES");
}));

/**
 * NEW: Determines if a user's prompt is a direct command to the agent versus a content query.
 * This is the core of the "Agent-First" command processing logic.
 * @param prompt The user's text prompt.
 * @returns A boolean indicating if the prompt is a tool-use command.
 */
export const classifyToolUseRequest = async (prompt: string): Promise<boolean> => geminiApiLimiter.schedule(() => handleGeminiError(async () => {
    const systemInstruction = `You are an expert intent classifier for an AI agent. Your task is to determine if a user's prompt is a DIRECT COMMAND for the agent to perform an action (like navigating, generating content, or making a call), or if it is a CONTENT QUERY for the agent to process with its current tool.

Actions are direct commands like:
- "Go to the image tab"
- "Switch to notepad"
- "Draw a picture of a car"
- "Make a phone call to Sarah"
- "Show me the email composer"

Content queries are requests for information or generation within the current context:
- "Who was the first president?"
- "Write a poem about the moon"
- "What is in this picture?"

Analyze the user's prompt and respond with ONLY a valid JSON object with a single key "is_tool_use" which is a boolean.

Example 1:
User prompt: "go to text"
Your response:
{"is_tool_use": true}

Example 2:
User prompt: "tell me about the history of Rome"
Your response:
{"is_tool_use": false}

Example 3:
User prompt: "can you generate an image of a dragon"
Your response:
{"is_tool_use": true}`;
    
    const response = await getAI().models.generateContent({
        model: "gemini-2.5-flash",
        contents: `User prompt: "${prompt}"`,
        config: {
            systemInstruction,
            temperature: 0,
            responseMimeType: 'application/json',
            thinkingConfig: { thinkingBudget: 0 }
        },
    });
    
    const rawText = response.text ?? "{}";
    try {
    const result = JSON.parse(rawText);
        const isToolUse = !!result.is_tool_use;
    console.log(`Tool Use Classifier for prompt "${prompt}" -> Response: ${rawText} -> Decision: ${isToolUse}`);
        return isToolUse;
    } catch (e) {
        console.error("Failed to parse tool use classification response:", rawText, e);
        return false; // Default to content query on parsing failure
    }
}));


/**
 * NEW: Generates a streaming response from a multimodal (image + text) prompt.
 * @param prompt The user's text prompt.
 * @param base64Data The base64-encoded image data.
 * @param mimeType The MIME type of the image.
 * @returns An async iterable stream of response chunks.
 */
export const generateContentStreamMultiModal = (prompt: string, base64Data: string, mimeType: string) => {
    // Note: Streaming functions are not rate-limited by this utility.
    const imagePart = { inlineData: { data: base64Data, mimeType } };
    const textPart = { text: prompt };
    
    return getAI().models.generateContentStream({
        model: "gemini-2.5-flash",
        contents: { parts: [imagePart, textPart] },
    });
};


export const generateText = async (prompt: string, systemInstruction?: string) => geminiApiLimiter.schedule(() => handleGeminiError(async () => {
  const response = await getAI().models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: systemInstruction ? { systemInstruction } : undefined,
  });
    return response.text ?? '';
}));

export const generateImage = async (prompt: string) => geminiApiLimiter.schedule(() => handleGeminiError(async () => {
    const response = await getAI().models.generateImages({
    model: "imagen-4.0-generate-001",
    prompt,
    config: {
      numberOfImages: 1,
      outputMimeType: "image/jpeg",
      aspectRatio: "1:1",
    },
  });

    const generatedImages = response.generatedImages ?? [];
    const base64 = generatedImages[0]?.image?.imageBytes;
  if (!base64) {
    throw new Error("No image was generated.");
  }
  return `data:image/jpeg;base64,${base64}`;
}));

export const generateMultipleImages = async (prompt: string, count: number): Promise<string[]> => geminiApiLimiter.schedule(() => handleGeminiError(async () => {
    const response = await getAI().models.generateImages({
        model: "imagen-4.0-generate-001",
        prompt,
        config: {
            numberOfImages: count,
            outputMimeType: "image/jpeg",
            aspectRatio: "1:1",
        },
    });

    if (!response.generatedImages || response.generatedImages.length === 0) {
        throw new Error("No images were generated.");
    }
    
    return response.generatedImages.map(img => {
        const base64 = img?.image?.imageBytes;
        if (!base64) {
             throw new Error("An error occurred while processing one of the images.");
        }
        return `data:image/jpeg;base64,${base64}`;
    });
}));


export const analyzeMedia = async (prompt: string, base64Data: string, mimeType: string) => geminiApiLimiter.schedule(() => handleGeminiError(async () => {
    const imagePart = {
        inlineData: {
            data: base64Data,
            mimeType: mimeType,
        },
    };
    const textPart = {
        text: prompt
    };

    const response = await getAI().models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts: [imagePart, textPart] },
    });

    return response.text ?? '';
}));

export const generateFromAudio = async (prompt: string, base64Data: string, mimeType: string) => geminiApiLimiter.schedule(() => handleGeminiError(async () => {
    const audioPart = {
        inlineData: {
            data: base64Data,
            mimeType: mimeType,
        },
    };
    
    const fullPrompt = `First, transcribe the user's audio. Then, based on the transcription and the optional text prompt below, provide a comprehensive answer.\n\nText Prompt: "${prompt || 'None'}"`;

    const textPart = {
        text: fullPrompt
    };

    const response = await getAI().models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts: [audioPart, textPart] },
    });

    return response.text ?? '';
}));


export const analyzeImageFromUrl = async (prompt: string, imageUrl: string) => {
    const [header, base64Data] = imageUrl.split(',');
    if (!header || !base64Data) throw new Error("Invalid image data URL.");
    
    const mimeTypeMatch = /:(.*?);/.exec(header);
    if (!mimeTypeMatch || !mimeTypeMatch[1]) throw new Error("Could not determine MIME type from data URL.");
    
    const mimeType = mimeTypeMatch[1];
    
    return await analyzeMedia(prompt, base64Data, mimeType);
};


export const analyzeDocument = async (prompt: string, documentText: string) => geminiApiLimiter.schedule(() => handleGeminiError(async () => {
    const fullPrompt = `Please analyze the following document and answer the user's question.\n\nDOCUMENT:\n"""\n${documentText}\n"""\n\nQUESTION:\n"""\n${prompt}\n"""\n\nANALYSIS:`;
    const response = await getAI().models.generateContent({
        model: "gemini-2.5-flash",
        contents: fullPrompt,
    });
    return response.text ?? '';
}));


export const research = async (prompt: string) => geminiApiLimiter.schedule(() => handleGeminiError(async () => {
    const response = await getAI().models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }],
        },
    });

    const text = response.text ?? '';
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return { text, groundingChunks };
}));

export const analyzeNote = async (noteContent: string) => geminiApiLimiter.schedule(() => handleGeminiError(async () => {
  const prompt = `Please provide a concise analysis of the following note. Identify key entities (people, places, organizations), provide a brief summary, and list any potential action items in a markdown format.

NOTE CONTENT:
---
${noteContent}
---

ANALYSIS:`;

  const response = await getAI().models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });
    return response.text ?? '';
}));

export const draftEmail = async (prompt: string, context?: { recipient?: string, subject?: string, history?: string }) => geminiApiLimiter.schedule(() => handleGeminiError(async () => {
    const fullPrompt = `You are an AI assistant drafting an email.
  ${context?.recipient ? `\nRECIPIENT: ${context.recipient}` : ''}
  ${context?.subject ? `\nSUBJECT: ${context.subject}` : ''}
  ${context?.history ? `\nPREVIOUS CONTEXT:\n${context.history}` : ''}
  \nINSTRUCTIONS: "${prompt}"
  \nBased on the instructions, write only the body of the email. Do not include a subject line.`;

    const response = await getAI().models.generateContent({
        model: "gemini-2.5-flash",
        contents: fullPrompt,
    });
    return response.text ?? '';
}));

export const draftSms = async (prompt: string, recipient?: string) => geminiApiLimiter.schedule(() => handleGeminiError(async () => {
    const fullPrompt = `You are an AI assistant drafting a SMS text message. The message must be concise, under 160 characters, and use a casual, natural tone appropriate for texting.
  ${recipient ? `\nRECIPIENT: ${recipient}` : ''}
  \nINSTRUCTIONS: "${prompt}"
  \nDraft ONLY the body of the text message.`;

    const response = await getAI().models.generateContent({
        model: "gemini-2.5-flash",
        contents: fullPrompt,
    });
    return (response.text ?? '').trim();
}));


export const summarizeEmail = async (emailBody: string, sender: string) => geminiApiLimiter.schedule(() => handleGeminiError(async () => {
    const prompt = `Provide a concise, one-paragraph summary of the following email from ${sender}. Then, list any key questions or action items in a separate bulleted list below the summary.

EMAIL CONTENT:
---
${emailBody}
---

SUMMARY AND ACTION ITEMS:`;

    const response = await getAI().models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
    });
    return response.text ?? '';
}));

export const summarizeCallTranscript = async (transcript: string) => geminiApiLimiter.schedule(() => handleGeminiError(async () => {
    const prompt = `You are an expert AI assistant specializing in communication analysis. Your task is to process a raw call transcript and extract meaningful insights.

Please provide the following, formatted in clean Markdown:
1.  **Concise Summary:** A brief, one-paragraph overview of the entire conversation.
2.  **Key Discussion Points:** A bulleted list of the main topics, decisions, and outcomes discussed.
3.  **Action Items:** A bulleted list of all explicit tasks, deadlines, and responsibilities mentioned. If possible, assign each action item to a speaker (e.g., "SPEAKER 1: Follow up with the finance team.").

TRANSCRIPT:
---
${transcript}
---

ANALYSIS:`;

    const response = await getAI().models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
    });
    return response.text ?? '';
}));

/**
 * NEW: Analyzes a user's prompt against a list of memory notes to find the most relevant context.
 * @param prompt The current user prompt.
 * @param memories An array of 'memory' type notes.
 * @returns The content of the most relevant memory note as a string, or null if no relevant memory is found.
 */
export const findRelevantMemory = async (prompt: string, memories: Note[]): Promise<string | null> => geminiApiLimiter.schedule(() => handleGeminiError(async () => {
    if (memories.length === 0) return null;

    // Create a simplified list of memories for the prompt
    const memoryList = memories.map(note => {
        if (note.content.type === 'memory') {
            return `ID: ${note.id}\nUser: ${note.content.userPrompt}\nAgent: ${note.content.agentResponse}\n---`;
        }
        return '';
    }).join('\n');

    const systemInstruction = `You are a memory retrieval system. Your task is to determine which of the following past conversations is most relevant to the user's current query. Respond ONLY with the numeric ID of the most relevant conversation. If none are relevant, respond with "NONE".`;
    
    const fullPrompt = `PAST CONVERSATIONS:\n${memoryList}\n\nCURRENT USER QUERY: "${prompt}"\n\nMOST RELEVANT ID:`;

    const response = await getAI().models.generateContent({
        model: "gemini-2.5-flash",
        contents: fullPrompt,
        config: {
            systemInstruction,
            temperature: 0,
            thinkingConfig: { thinkingBudget: 0 }
        }
    });

    const relevantIdText = (response.text ?? '').trim();
    if (relevantIdText.toUpperCase() === "NONE" || !/^\d+$/.test(relevantIdText)) {
        return null;
    }
    
    const relevantId = parseInt(relevantIdText, 10);
    const relevantNote = memories.find(note => note.id === relevantId);

    if (relevantNote && relevantNote.content.type === 'memory') {
        console.log(`Memory System: Found relevant context from Memory ID ${relevantId}`);
        return `User asked: "${relevantNote.content.userPrompt}"\nYou responded: "${relevantNote.content.agentResponse}"`;
    }
    
    return null;
}));


// createChat is used by the CommunicationControl component
export const createChat = (userName?: string): Chat => {
    // Build the comprehensive system prompt for Agent Lee
    const systemInstruction = buildSystemPromptV11(userName || 'User');

    return getAI().chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction,
        }
    });
};
