/* LEEWAY HEADER
TAG: FRONTEND.SERVICE.GEMINI_BRIDGE
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: layout-dashboard
ICON_SIG: CD534113
5WH: WHAT=Gemini streaming + utility bridge (context assembly, error mediation, action tags); WHY=Provide model-agnostic pattern baseline (can swap vendor) while ensuring resilience & consistent shape; WHO=Leeway Core (agnostic); WHERE=services/geminiService.ts; WHEN=2025-10-05; HOW=TypeScript + streaming wrapper abstraction
SPDX-License-Identifier: MIT
*/

import { Chat, GoogleGenAI } from "@google/genai";
import { buildSystemPromptV11 } from '../src/agentlee.core';
import type { Note } from '../types';
import { geminiApiLimiter } from '../utils/rateLimiter';

// -------- API key helpers --------
const getApiKey = (): string => {
    const envApiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.AGENT_LEE_X;
    if (envApiKey) return envApiKey;
    const lsKey = typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') : null;
    if (lsKey) return lsKey;
    return '';
};

export const setApiKey = (apiKey: string): void => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('gemini_api_key', apiKey);
        ai = new GoogleGenAI({ apiKey });
    }
};

export const hasApiKey = (): boolean => !!getApiKey();

let ai: GoogleGenAI | null = null;
const getAI = (): GoogleGenAI => {
    const key = getApiKey();
    if (!key) throw new Error('MISSING_API_KEY');
    if (!ai) ai = new GoogleGenAI({ apiKey: key });
    return ai as GoogleGenAI;
};

// -------- Local browser LLM fallback (public/models/*.js) --------
type BrowserLLM = {
    chat?: (message: string, context?: Array<{ role: 'user'|'assistant'; content: string }>) => Promise<{ text?: string }|{ text: string }>;
    generate?: (prompt: string, options?: any) => Promise<{ text?: string }|{ text: string }>;
    getStatus?: () => { model?: string; name?: string };
};

function getBrowserLlm(): { name: string; impl: BrowserLLM } | null {
    try {
        const w: any = typeof window !== 'undefined' ? window : {};
        const order = [
            { name: 'phi3', key: 'phi3LLM' },
            { name: 'llama', key: 'llamaLLM' },
            { name: 'gemma', key: 'gemmaLLM' },
            { name: 'azr', key: 'azrLLM' },
        ];
        for (const c of order) {
            if (w[c.key]) return { name: c.name, impl: w[c.key] as BrowserLLM };
        }
    } catch {}
    return null;
}

async function handleGeminiError<T>(apiCall: () => Promise<T>): Promise<T> {
    try {
        return await apiCall();
    } catch (error: any) {
        let message = (error?.message || '').toLowerCase();
        if (message.startsWith('{')) {
            try {
                const parsed = JSON.parse(error.message);
                message = (parsed?.error?.message || message).toLowerCase();
            } catch {}
        }
        if (message.includes('quota') || message.includes('resource_exhausted') || message.includes('429')) {
            throw new Error('API quota exceeded. Please check your plan and billing details, or try again later.');
        }
        throw error;
    }
}

// Public probe for UI: is a local in-browser model available?
export const hasLocalModel = (): boolean => {
    return getBrowserLlm() !== null;
};

// -------- Classifiers (with heuristic fallbacks) --------
export const classifyVisualRequest = async (prompt: string): Promise<boolean> => {
    if (!hasApiKey()) {
        const p = prompt.toLowerCase();
        return /(see|look|camera|photo|picture|what am i wearing|scan)/.test(p);
    }
    return geminiApiLimiter.schedule(() => handleGeminiError(async () => {
        const systemInstruction = "You are a request classifier. Determine if the user's request requires using the device's camera. Respond only YES or NO.";
        const response = await getAI().models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `User request: "${prompt}"`,
            config: { systemInstruction, temperature: 0, thinkingConfig: { thinkingBudget: 0 } },
        });
        const text = (response.text ?? '').trim().toUpperCase();
        return text.includes('YES');
    }));
};

export const classifyToolUseRequest = async (prompt: string): Promise<boolean> => {
    if (!hasApiKey()) {
        const p = prompt.toLowerCase();
        return /(go to|switch to|open|make a phone call|draw|generate an image|compose email|settings)/.test(p);
    }
    return geminiApiLimiter.schedule(() => handleGeminiError(async () => {
        const systemInstruction = `You classify if a prompt is a DIRECT COMMAND for the agent (navigation/tool-use) vs a content query. Respond JSON: {"is_tool_use": boolean}.`;
        const response = await getAI().models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `User prompt: "${prompt}"`,
            config: { systemInstruction, temperature: 0, responseMimeType: 'application/json', thinkingConfig: { thinkingBudget: 0 } },
        });
        const raw = response.text ?? '{}';
        try { const j = JSON.parse(raw); return !!j.is_tool_use; } catch { return false; }
    }));
};

// -------- Generation APIs --------
export const generateContentStreamMultiModal = (prompt: string, base64Data: string, mimeType: string) => {
    if (!hasApiKey()) {
        const llm = getBrowserLlm();
        if (!llm) throw new Error('Vision requires a cloud model; no local vision model available.');
            const impl = llm.impl;
        async function* stream() {
                const res = impl.chat ? await impl.chat(prompt) : await impl.generate?.(prompt);
            const full = (res as any)?.text || '';
            for (const token of full.split(/(\s+)/)) { if (token) yield { text: token }; await new Promise(r => setTimeout(r, 5)); }
        }
        return stream();
    }
    const imagePart = { inlineData: { data: base64Data, mimeType } };
    const textPart = { text: prompt };
    return getAI().models.generateContentStream({ model: 'gemini-2.5-flash', contents: { parts: [imagePart, textPart] } });
};

export const generateText = async (prompt: string, systemInstruction?: string) => {
    if (!hasApiKey()) {
        const llm = getBrowserLlm();
        if (!llm) throw new Error('No local text model found.');
        const res = llm.impl.chat ? await llm.impl.chat(prompt) : await llm.impl.generate?.(prompt);
        return ((res as any)?.text || '').toString();
    }
    return geminiApiLimiter.schedule(() => handleGeminiError(async () => {
        const response = await getAI().models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: systemInstruction ? { systemInstruction } : undefined });
        return response.text ?? '';
    }));
};

export const generateImage = async (prompt: string) => geminiApiLimiter.schedule(() => handleGeminiError(async () => {
    const response = await getAI().models.generateImages({ model: 'imagen-4.0-generate-001', prompt, config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '1:1' } });
    const base64 = response.generatedImages?.[0]?.image?.imageBytes;
    if (!base64) throw new Error('No image was generated.');
    return `data:image/jpeg;base64,${base64}`;
}));

export const analyzeMedia = async (prompt: string, base64Data: string, mimeType: string) => {
    if (!hasApiKey()) return generateText(`${prompt}\n\n[Image provided; local vision analysis unavailable]`);
    return geminiApiLimiter.schedule(() => handleGeminiError(async () => {
        const imagePart = { inlineData: { data: base64Data, mimeType } };
        const textPart = { text: prompt };
        const response = await getAI().models.generateContent({ model: 'gemini-2.5-flash', contents: { parts: [imagePart, textPart] } });
        return response.text ?? '';
    }));
};

export const analyzeImageFromUrl = async (prompt: string, imageUrl: string) => {
    const [header, base64Data] = imageUrl.split(',');
    if (!header || !base64Data) throw new Error('Invalid image data URL.');
    const mime = /:(.*?);/.exec(header)?.[1];
    if (!mime) throw new Error('Could not determine MIME type from data URL.');
    return analyzeMedia(prompt, base64Data, mime);
};

export const analyzeDocument = async (prompt: string, documentText: string) => geminiApiLimiter.schedule(() => handleGeminiError(async () => {
    const full = `Please analyze the following document and answer the user's question.\n\nDOCUMENT:\n"""\n${documentText}\n"""\n\nQUESTION:\n"""\n${prompt}\n"""\n\nANALYSIS:`;
    const response = await getAI().models.generateContent({ model: 'gemini-2.5-flash', contents: full });
    return response.text ?? '';
}));

export const research = async (prompt: string) => geminiApiLimiter.schedule(() => handleGeminiError(async () => {
    const response = await getAI().models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { tools: [{ googleSearch: {} }] } });
    const text = response.text ?? '';
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    return { text, groundingChunks };
}));

export const analyzeNote = async (noteContent: string) => geminiApiLimiter.schedule(() => handleGeminiError(async () => {
    const prompt = `Please provide a concise analysis of the following note. Identify key entities (people, places, organizations), provide a brief summary, and list any potential action items in a markdown format.\n\nNOTE CONTENT:\n---\n${noteContent}\n---\n\nANALYSIS:`;
    const response = await getAI().models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text ?? '';
}));

export const draftEmail = async (prompt: string, context?: { recipient?: string, subject?: string, history?: string }) => geminiApiLimiter.schedule(() => handleGeminiError(async () => {
    const full = `You are an AI assistant drafting an email.
    ${context?.recipient ? `\nRECIPIENT: ${context.recipient}` : ''}
    ${context?.subject ? `\nSUBJECT: ${context.subject}` : ''}
    ${context?.history ? `\nPREVIOUS CONTEXT:\n${context.history}` : ''}
    \nINSTRUCTIONS: "${prompt}"
    \nBased on the instructions, write only the body of the email. Do not include a subject line.`;
    const response = await getAI().models.generateContent({ model: 'gemini-2.5-flash', contents: full });
    return response.text ?? '';
}));

export const draftSms = async (prompt: string, recipient?: string) => geminiApiLimiter.schedule(() => handleGeminiError(async () => {
    const full = `You are an AI assistant drafting a SMS text message. The message must be concise, under 160 characters, and use a casual, natural tone appropriate for texting.
    ${recipient ? `\nRECIPIENT: ${recipient}` : ''}
    \nINSTRUCTIONS: "${prompt}"
    \nDraft ONLY the body of the text message.`;
    const response = await getAI().models.generateContent({ model: 'gemini-2.5-flash', contents: full });
    return (response.text ?? '').trim();
}));

export const summarizeEmail = async (emailBody: string, sender: string) => geminiApiLimiter.schedule(() => handleGeminiError(async () => {
    const prompt = `Provide a concise, one-paragraph summary of the following email from ${sender}. Then, list any key questions or action items in a separate bulleted list below the summary.
\nEMAIL CONTENT:\n---\n${emailBody}\n---\n\nSUMMARY AND ACTION ITEMS:`;
    const response = await getAI().models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text ?? '';
}));

export const summarizeCallTranscript = async (transcript: string) => geminiApiLimiter.schedule(() => handleGeminiError(async () => {
    const prompt = `You are an expert AI assistant specializing in communication analysis. Your task is to process a raw call transcript and extract meaningful insights.
\nPlease provide the following, formatted in clean Markdown:
1.  **Concise Summary:** A brief, one-paragraph overview of the entire conversation.
2.  **Key Discussion Points:** A bulleted list of the main topics, decisions, and outcomes discussed.
3.  **Action Items:** A bulleted list of all explicit tasks, deadlines, and responsibilities mentioned. If possible, assign each action item to a speaker (e.g., "SPEAKER 1: Follow up with the finance team.").
\nTRANSCRIPT:\n---\n${transcript}\n---\n\nANALYSIS:`;
    const response = await getAI().models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text ?? '';
}));

export const findRelevantMemory = async (prompt: string, memories: Note[]): Promise<string | null> => geminiApiLimiter.schedule(() => handleGeminiError(async () => {
    if (memories.length === 0) return null;
    const memoryList = memories.map(n => n.content.type === 'memory' ? `ID: ${n.id}\nUser: ${n.content.userPrompt}\nAgent: ${n.content.agentResponse}\n---` : '').join('\n');
    const systemInstruction = `You are a memory retrieval system. Respond ONLY with the numeric ID of the most relevant conversation. If none are relevant, respond with "NONE".`;
    const fullPrompt = `PAST CONVERSATIONS:\n${memoryList}\n\nCURRENT USER QUERY: "${prompt}"\n\nMOST RELEVANT ID:`;
    const response = await getAI().models.generateContent({ model: 'gemini-2.5-flash', contents: fullPrompt, config: { systemInstruction, temperature: 0, thinkingConfig: { thinkingBudget: 0 } } });
    const text = (response.text ?? '').trim();
    if (text.toUpperCase() === 'NONE' || !/^\d+$/.test(text)) return null;
    const id = parseInt(text, 10);
    const note = memories.find(n => n.id === id);
    if (note && note.content.type === 'memory') return `User asked: "${note.content.userPrompt}"\nYou responded: "${note.content.agentResponse}"`;
    return null;
}));

// -------- Chat creation (proxy -> browser fallback -> Gemini) --------
export const createChat = (userName?: string): Chat => {
    try {
        const cfg: any = (typeof window !== 'undefined' && (window as any).AGENTLEE_CONFIG) ? (window as any).AGENTLEE_CONFIG : {};
        const proxyUrl: string | undefined = cfg?.CHAT_PROXY_URL;
        if (proxyUrl) {
            const defaultPolicy = (cfg.DEFAULT_POLICY || 'FAST').toString().toUpperCase();
            const systemInstruction = buildSystemPromptV11(userName || 'User');
            class WorkerChatShim {
                async sendMessageStream({ message }: { message: string }): Promise<AsyncIterable<{ text?: string }>> {
                    const body = { messages: [{ role: 'system', content: systemInstruction }, { role: 'user', content: message }] };
                    const target = new URL(String(proxyUrl));
                    if (!target.searchParams.has('policy')) target.searchParams.set('policy', defaultPolicy);
                    const res = await fetch(target.toString(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
                    if (!res.body) throw new Error('No response body from proxy');
                    const reader = res.body.getReader();
                    const decoder = new TextDecoder();
                    async function* stream() {
                        let buffer = '';
                        while (true) {
                            const { value, done } = await reader.read();
                            if (done) break;
                            buffer += decoder.decode(value, { stream: true });
                            let idx;
                            while ((idx = buffer.indexOf('\n\n')) !== -1) {
                                const chunk = buffer.slice(0, idx).trim();
                                buffer = buffer.slice(idx + 2);
                                if (!chunk) continue;
                                for (const line of chunk.split('\n')) {
                                    const m = /^data:\s*(.*)$/.exec(line);
                                    if (!m) continue;
                                    const data = m[1];
                                    if (data === '[DONE]') return;
                                    try { const json = JSON.parse(data); const token = json?.choices?.[0]?.delta?.content || json?.choices?.[0]?.message?.content || ''; if (token) yield { text: token as string }; } catch {}
                                }
                            }
                        }
                    }
                    return stream();
                }
            }
            return new (WorkerChatShim as any)() as unknown as Chat;
        }
    } catch {}

    if (!hasApiKey()) {
        const browser = getBrowserLlm();
        if (!browser) throw new Error('MISSING_API_KEY');
        const systemInstruction = buildSystemPromptV11(userName || 'User');
            const impl = browser.impl;
        class BrowserChatShim {
            async sendMessageStream({ message }: { message: string }): Promise<AsyncIterable<{ text?: string }>> {
                const ctx = [{ role: 'user' as const, content: systemInstruction }];
                    const res = impl.chat ? await impl.chat(message, ctx as any) : await impl.generate?.(message);
                const full = (res as any)?.text || '';
                async function* stream() { for (const t of full.split(/(\s+)/)) { if (t) yield { text: t }; await new Promise(r => setTimeout(r, 8)); } }
                return stream();
            }
        }
        return new (BrowserChatShim as any)() as unknown as Chat;
    }

    const systemInstruction = buildSystemPromptV11(userName || 'User');
    return getAI().chats.create({ model: 'gemini-2.5-flash', config: { systemInstruction } });
};
