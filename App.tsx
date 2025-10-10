/* LEEWAY HEADER
TAG: FRONTEND.APP.ROOT
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: layout-dashboard
ICON_SIG: CD534113
5WH: WHAT=Root multi-tool application shell & feature orchestrator; WHY=Unified UX for research, generation, memory & voice; WHO=Leeway Core (model+system agnostic, mobile-first); WHERE=App.tsx; WHEN=2025-10-05; HOW=React 19 + Vite edge-first progressive enhancement
SPDX-License-Identifier: MIT
*/

import type { Chat } from '@google/genai'; // Import Chat type
import React, { Suspense, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AgentAvatar from './components/AgentAvatar';
import AgentOutput from './components/AgentOutput'; // New component import
import ApiKeyPrompt from './components/ApiKeyPrompt'; // Import API key prompt
import CameraFeed, { CameraFeedHandle } from './components/CameraFeed';
import InAppBrowser from './components/InAppBrowser';
import LoadingSpinner from './components/LoadingSpinner';
import OnboardingGuide from './components/OnboardingGuide';
import PersistentActions from './components/PersistentActions';
import Researcher from './components/Researcher';
import TextGenerator from './components/TextGenerator';
import { CharacterContext, CharacterProvider } from './contexts/CharacterContext';
import { NotepadContext, NotepadProvider } from './contexts/NotepadContext';
import * as geminiService from './services/geminiService';
// Autosave & storage layer
import * as ttsService from './services/ttsService'; // Import TTS Service
import images from './src/assets/images';
import ConversationCountdown from './src/components/ConversationCountdown';
import FlushPuckHost from './src/components/FlushPuckHost';
import SavedBadge from './src/components/SavedBadge';
import { useConversationAutosave } from './src/hooks/useConversationAutosave';
import { receiptsLine } from './src/lib/agent/memoryReceipts';
import { mapFreeformReply } from './src/lib/agent/replyMapper';
import { emitConversationFlushed } from './src/lib/conversation/flush';
import { Autosave, buildSnapshot } from './src/lib/storage/autosave';
import type { SavedPayload } from './src/lib/storage/types';
import { addTurn as memAddTurn, retrieveContext as memRetrieve, upsertNote as memUpsert, proposeNoteFromRecent } from './src/memory/memoryStore';
import { finalizeSpokenOutput } from './src/prompts'; // Import the centralized text cleaner
import type { AgentState, Contact, Feature, GroundingChunk, Note, NoteContent, ResearchMode, TransmissionLogEntry } from './types';
import { parseFile } from './utils/fileParser';
import { mdToHtml } from './utils/markdown';
// Optional voice pipeline (local wake + whisper stub) dynamic import later
// Feature flag key: 'lee-voice-pipeline' (set in localStorage to 'on')


// New imports for multi-engine image generation
import { USE_LOCAL_ONLY } from './src/config';
import { generateImage as generateImageWithRouter } from './src/engines/engine.router';
import type { GenOut } from './src/engines/engine.types';


// Lazy-load heavier components for faster initial load
const MediaAnalyzer = React.lazy(() => import('./components/MediaAnalyzer'));
const DocumentAnalyzer = React.lazy(() => import('./components/DocumentAnalyzer'));
const CommunicationControl = React.lazy(() => import('./components/CommunicationControl'));
const EmailClient = React.lazy(() => import('./components/EmailClient'));
const AgentNotepad = React.lazy(() => import('./components/AgentNotepad'));
const Settings = React.lazy(() => import('./components/Settings'));
const CharacterStudio = React.lazy(() => import('./components/CharacterStudio'));


// SpeechRecognition API interfaces for TypeScript
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    __LOCAL_ONLY__?: boolean;
  }
}

// Local-only fetch guard
if (USE_LOCAL_ONLY) {
    const _fetch = window.fetch;
    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : (input instanceof URL ? input.href : input.url);
      if (window.__LOCAL_ONLY__ && !(url.startsWith(location.origin) || url.startsWith('blob:') || url.startsWith('data:'))) {
        const errorMessage = `Blocked egress in LOCAL_ONLY mode: ${url}`;
        console.error(errorMessage);
        throw new Error(errorMessage);
      }
      return _fetch(input as any, init);
    };
    window.__LOCAL_ONLY__ = true;
}


// FIX: All state and logic have been moved into AppContent to fix scope issues.
// AppContent is now rendered within NotepadProvider, allowing it to use the context.
const AppContent: React.FC = () => {
    const [activeFeature, setActiveFeature] = useState<Feature>('research');
    const [promptInput, setPromptInput] = useState('');
    const [systemInstruction, setSystemInstruction] = useState('');
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [documentFile, setDocumentFile] = useState<File | null>(null);
    
    // Agent Lee States
    const [agentState, setAgentState] = useState<AgentState>('idle');
    const [isListening, setIsListening] = useState(false);
    const [isAlwaysListening, setIsAlwaysListening] = useState(false);
    const isAlwaysListeningRef = useRef(isAlwaysListening);
    isAlwaysListeningRef.current = isAlwaysListening;
    
    // NEW: State for interruption handling
    const [interruptedResponse, setInterruptedResponse] = useState<TransmissionLogEntry | null>(null);

    const [agentTransmissionLog, setAgentTransmissionLog] = useState<TransmissionLogEntry[]>(() => {
        try {
            const savedLog = localStorage.getItem('agent-lee-transmission-log');
            return savedLog ? JSON.parse(savedLog) : [];
        } catch (error) {
            console.error('Failed to load transmission log from localStorage:', error);
            return [];
        }
    });

    // Onboarding & user identity
    const [isOnboardingComplete, setIsOnboardingComplete] = useState(() => localStorage.getItem('onboardingComplete') === 'true');
    const [placeholderText, setPlaceholderText] = useState('Awaiting orders...');
    const [userName, setUserName] = useState<string | null>(() => localStorage.getItem('userName'));
    
    // API Key management - check immediately on startup
    const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(() => !geminiService.hasApiKey());
    const [apiKeyError, setApiKeyError] = useState<string | null>(null);

    const [results, setResults] = useState({
        text: '',
        research: { text: '', sources: [] as GroundingChunk[] },
        images: [] as GenOut[],
        analyze: '',
        document: ''
    });

    // (moved below NotepadContext usage) snapshotResult declared after activeNoteId to avoid temporal dead zone.
    
    // NEW: State to trigger auto-submission after navigation
    const [isAutoSubmitting, setIsAutoSubmitting] = useState(false);

    // NEW: State for automatic conversation saving
    const [conversationTurns, setConversationTurns] = useState<{ user: string; agent: string }[]>([]);
    const CONVO_AUTOSAVE_INTERVAL = 60_000; // 1 minute

    // NEW: State for passing a number to the call component
    const [numberToCall, setNumberToCall] = useState<string | null>(null);

    // NEW: State for in-app browser
    const [browserUrl, setBrowserUrl] = useState<string | null>(null);
    // NEW: Microphone zoom overlay state
    const [isMicZoomed, setIsMicZoomed] = useState(false);
    const micHoverTimerRef = useRef<number | null>(null);
    const openMicZoom = useCallback((log: boolean = true) => { setIsMicZoomed(true); if (log) appendToLog('SYSTEM', '[System: Microphone detail view opened]'); }, []);
    const closeMicZoom = useCallback(() => { if (micHoverTimerRef.current) { window.clearTimeout(micHoverTimerRef.current); micHoverTimerRef.current = null; } setIsMicZoomed(false); appendToLog('SYSTEM', '[System: Microphone detail view closed]'); }, []);
    useEffect(() => { if (!isMicZoomed) return; const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeMicZoom(); }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler); }, [isMicZoomed, closeMicZoom]);


    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [researchMode, setResearchMode] = useState<ResearchMode>('general');

    const cameraFeedRef = useRef<CameraFeedHandle>(null);
    // Expose camera feed handle globally for tool access (camera.analyze_frame)
    useEffect(() => { (window as any).__cameraFeedHandle = cameraFeedRef.current; }, [cameraFeedRef.current]);
    
    // Refs for new voice interaction system
    const chatRef = useRef<Chat | null>(null);
    const recognitionRef = useRef<any>(null);
    // Refs & constants for push-to-talk session logic (single-click start)
    const sessionModeRef = useRef(false); // true while a manual (non-always) session is active
    const silenceTimeoutRef = useRef<number | null>(null);
    const lastSpeechTimeRef = useRef<number>(0);
    const SILENCE_TIMEOUT_MS = 6000; // Will be used in later todo for auto-send after silence
    // Wake word & follow-up capture
    const WAKE_WORDS = [
        'hey agent lee', 'agent lee', 'hi agent lee', 'okay agent lee', 'ok agent lee'
    ];
    const wakeActiveRef = useRef(false); // true after wake word until question captured
    const wakeFollowWindowRef = useRef<number | null>(null);
    const WAKE_FOLLOW_TIMEOUT_MS = 8000; // window for user to ask after greeting


    const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
    const [analysisModalContent, setAnalysisModalContent] = useState('');
    const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);

    const [isNotePickerOpen, setIsNotePickerOpen] = useState(false);

    // NEW: State to hold a visual query that is pending camera activation
    const [pendingVisualQuery, setPendingVisualQuery] = useState<string | null>(null);

    const { notes, addNote, setActiveNoteId, activeNoteId } = useContext(NotepadContext);

    // Snapshot helper (result-focused). We version with Date.now() to keep ordering monotonic.
    const snapshotResult = useCallback((feature: string) => {
        const composite: Record<string, unknown> = {
            feature,
            promptInput,
            text: results.text,
            research: results.research,
            images: results.images?.slice(0, 4),
            analyze: results.analyze,
            document: results.document,
            activeNoteId,
        };
        const payload: SavedPayload = buildSnapshot('result', 'current', feature, composite);
        Autosave.snapshot(payload);
    }, [results, promptInput, activeNoteId]);
    const { characters } = useContext(CharacterContext);
    const [activeCharacterId, setActiveCharacterId] = useState<number | null>(null);
    // Voice controller ref (new local pipeline)
    const voiceControllerRef = useRef<any>(null);
    
    const tabs: { id: Feature; label: string; icon: string; }[] = [
        { id: 'research', label: 'Research', icon: images.tabs.research },
        { id: 'text', label: 'Text', icon: images.tabs.text },
        { id: 'character', label: 'Character Studio', icon: images.tabs.image },
        { id: 'analyze', label: 'Analyze', icon: images.tabs.analyze },
        { id: 'document', label: 'Document', icon: images.tabs.documents },
        { id: 'call', label: 'Call', icon: images.tabs.call },
        { id: 'email', label: 'Email', icon: images.tabs.email },
        { id: 'notepad', label: 'Notepad', icon: images.tabs.notepad },
        { id: 'settings', label: 'Settings', icon: images.tabs.settings },
    ];
    
    // NEW: agent action types and parsing/execution logic
    interface AgentAction {
        name: string;
        params: any;
    }

    const parseAgentActions = (responseText: string): { cleanedText: string, actions: AgentAction[] } => {
        const actionRegex = /\[ACTION:\s*([\w_]+),\s*({.*?})\]/g;
        const actions: AgentAction[] = [];
        let match;
        
        // Use a while loop to find all matches, as exec() with /g flag maintains state
        while ((match = actionRegex.exec(responseText)) !== null) {
            try {
                const actionName = match[1];
                const params = JSON.parse(match[2]);
                actions.push({ name: actionName, params });
            } catch (e) {
                console.error("Failed to parse agent action params:", match[2], e);
            }
        }
        
        // Clean the action tags from the text that will be shown to the user
        const cleanedText = responseText.replace(actionRegex, '').trim();

        return { cleanedText, actions };
    };
    
    // NEW: Robust function to handle auto image generation
    const handleAutoImageGeneration = async (prompt: string) => {
    setActiveFeature('character');
        setPromptInput(prompt); // Set prompt for UI consistency
        setLoading(true);
        setError('');
        setAgentState('thinking');
        
        try {
            const imageResult = await generateImageWithRouter({ prompt });
            setResults((prev: typeof results) => ({ ...prev, images: [imageResult, ...prev.images] })); // Prepend new image
            
            // Automatically save to notepad
            if (imageResult.type === 'base64') {
                const imageUrl = `data:image/png;base64,${imageResult.data}`;
                const noteContent: NoteContent = { type: 'image', imageUrl, prompt };
                addNote(`Image: ${prompt.substring(0, 40)}...`, noteContent, "VISUAL");
                // Persist metadata for tool layer
                try {
                    localStorage.setItem('agentlee:lastImage', JSON.stringify({ prompt, at: Date.now() }));
                    localStorage.setItem('agentlee:lastImageUrl', imageUrl);
                } catch {}
                snapshotResult('character');

    // Restore any previous snapshot on mount & attach network listener
    useEffect(() => {
        Autosave.attachNetworkListener();
        const restored = Autosave.restore();
        if (restored?.content && typeof restored.content === 'object') {
            try {
                const data: any = restored.content;
                if (data.promptInput) setPromptInput(data.promptInput);
                setResults(prev => ({
                    ...prev,
                    text: typeof data.text === 'string' ? data.text : prev.text,
                    research: data.research && typeof data.research === 'object' ? data.research : prev.research,
                    images: Array.isArray(data.images) ? data.images : prev.images,
                    analyze: typeof data.analyze === 'string' ? data.analyze : prev.analyze,
                    document: typeof data.document === 'string' ? data.document : prev.document,
                }));
                if (typeof data.activeNoteId === 'number') setActiveNoteId(data.activeNoteId);
                console.debug('[Autosave] restored snapshot');
            } catch (e) {
                console.warn('[Autosave] failed to restore snapshot', e);
            }
        }
    }, [setActiveNoteId]);

    // Debounced snapshots when core result state changes.
    useEffect(() => { const t = setTimeout(() => snapshotResult(activeFeature), 800); return () => clearTimeout(t); }, [results, promptInput, activeFeature, snapshotResult]);

    // Snapshot when notes array changes (structure or active note changes)
    useEffect(() => { const t = setTimeout(() => snapshotResult('notepad'), 1000); return () => clearTimeout(t); }, [notes, activeNoteId, snapshotResult]);
            }

        } catch (err: any) {
            const errorMessage = err?.message || 'An unknown error occurred during image generation.';
            setError(errorMessage);
            appendToLog('SYSTEM', `Error: ${errorMessage}`);
        } finally {
            setLoading(false);
            setAgentState('idle');
        }
    };


    const executeAgentAction = (action: AgentAction) => {
        console.log("Executing agent action:", action);
        switch(action.name) {
            case 'image.generate': {
                if (action.params.prompt) {
                    appendToLog('SYSTEM', `[System: (tool) Generating image: "${action.params.prompt}"]`);
                    handleAutoImageGeneration(action.params.prompt);
                } else {
                    appendToLog('SYSTEM', 'image.generate requires a prompt');
                }
                return;
            }
            case 'image.retrieve_last': {
                const meta = localStorage.getItem('agentlee:lastImage');
                if (meta) {
                    appendToLog('SYSTEM', `[System: Last image metadata] ${meta.slice(0,140)}...`);
                } else {
                    appendToLog('SYSTEM', 'No prior image found. Use image.generate or upload one.');
                }
                return;
            }
            case 'image.describe_current': {
                const imgUrl = localStorage.getItem('agentlee:lastImageUrl');
                if (!imgUrl) { appendToLog('SYSTEM', 'Need an existing image to describe.'); return; }
                (async () => {
                    try {
                        appendToLog('SYSTEM', '[System: Describing current image...]');
                        const analysis = await geminiService.analyzeImageFromUrl('Describe this image focusing on key objects, context, and any notable elements.', imgUrl);
                        appendToLog('SYSTEM', analysis || 'No description returned');
                    } catch(e:any) {
                        appendToLog('SYSTEM', 'Image description failed: ' + (e?.message||'error'));
                    }
                })();
                return;
            }
            case 'call.start': {
                action.name = 'initiate_call'; // reuse existing handler path
                break;
            }
            case 'camera.analyze_frame': {
                try {
                    const handle = (window as any).__cameraFeedHandle;
                    const frame = handle?.captureFrame?.();
                    if (!frame) {
                        appendToLog('SYSTEM', 'Camera not ready. Enable it to analyze.');
                    } else {
                        const approxKB = Math.round((frame.length * 3 / 4) / 1024);
                        appendToLog('SYSTEM', `[System: Captured frame (~${approxKB}KB). Vision model placeholder — upgrade pending.]`);
                    }
                } catch(e:any) { appendToLog('SYSTEM', 'Camera analysis failed: ' + (e?.message||'error')); }
                return;
            }
            case 'memory.retrieve': {
                const q = action.params.query;
                if (!q) { appendToLog('SYSTEM', 'memory.retrieve requires a query'); return; }
                const limit = action.params.limit || 5;
                const hits = notes.filter(n => n.title.toLowerCase().includes(q.toLowerCase())).slice(0, limit).map(n=>n.title);
                appendToLog('SYSTEM', hits.length ? `Memory hits (${hits.length}): ${hits.join(' | ')}` : 'No memory matches for that query.');
                return;
            }
            case 'browse_web':
                if (action.params.search_query) {
                    const query = encodeURIComponent(action.params.search_query);
                    setBrowserUrl(`https://lite.duckduckgo.com/lite/?q=${query}`);
                    appendToLog('SYSTEM', `[System: Opening in-app browser to search for "${action.params.search_query}"]`);
                }
                break;
            case 'navigate': {
                const requestedTab = action.params.tab as Feature | 'image' | undefined;
                if (requestedTab) {
                    const resolvedTab: Feature = requestedTab === 'image' ? 'character' : requestedTab;
                    if (tabs.some(t => t.id === resolvedTab)) {
                        handleTabClick(resolvedTab);
                        appendToLog('SYSTEM', `[System: Agent Lee is navigating to the ${resolvedTab} tab.]`);
                        if (action.params.followUpPrompt) {
                            setPromptInput(action.params.followUpPrompt);
                            setIsAutoSubmitting(true); // Trigger auto-submission
                        }
                    }
                }
                break;
            }
            case 'generate_image':
                if (action.params.prompt) {
                    appendToLog('SYSTEM', `[System: Agent Lee is generating an image with prompt: "${action.params.prompt}"]`);
                    handleAutoImageGeneration(action.params.prompt);
                }
                break;
            case 'initiate_call': {
                const contactName = action.params.contact_name;
                let targetNumber = action.params.phone_number;
                
                let script = '';

                if (contactName) {
                    const contacts: Contact[] = JSON.parse(localStorage.getItem('agent-lee-contacts') || '[]');
                    const contact = contacts.find(c => c.name.toLowerCase() === contactName.toLowerCase());
                    if (contact) {
                        targetNumber = contact.phone;
                        script = `Found ${contact.name}. Opening your phone's dialer now.`;
                    } else {
                        script = `Contact "${contactName}" not found. You can add them in Settings.`;
                    }
                } else if (targetNumber) {
                    script = `Understood. I'm opening your phone's dialer with the number ${targetNumber}.`;
                } else {
                    script = `I need a contact name or a phone number to initiate a call.`;
                }

                appendToLog('SYSTEM', `[System: ${script}]`);
                setAgentState('speaking');
                ttsService.speak(finalizeSpokenOutput(script), () => {}, () => {
                    if (targetNumber) {
                        setNumberToCall(targetNumber);
                        handleTabClick('call');
                    }
                    setAgentState('idle');
                });
                break;
            }
            case 'list_contacts': {
                const contacts: Contact[] = JSON.parse(localStorage.getItem('agent-lee-contacts') || '[]');
                let responseText;
                if (contacts.length > 0) {
                    const contactNames = contacts.map(c => c.name).join(', ');
                    responseText = `Here are your saved contacts: ${contactNames}. Who would you like to call?`;
                } else {
                    responseText = "You have no contacts saved. You can add them in the Settings tab.";
                }
                appendToLog('SYSTEM', responseText);
                setAgentState('speaking');
                ttsService.speak(finalizeSpokenOutput(responseText), () => {}, () => setAgentState('idle'));
                break;
            }
            default:
                console.warn("Unknown agent action:", action.name);
        }
    };

    const flushConversationTurns = useCallback(async () => {
        if (!conversationTurns.length) return;
        const count = conversationTurns.length;
        const userPrompts = conversationTurns.map(t => t.user).join('\n---\n');
        const agentResponses = conversationTurns.map(t => t.agent).join('\n---\n');
        const noteContent: NoteContent = { type: 'memory', userPrompt: userPrompts, agentResponse: agentResponses } as any;
        const title = `Memory (autosave): ${conversationTurns[0].user.substring(0,40)}...`;
        addNote(title, noteContent, 'MEMORY');
        setConversationTurns([]);
        setAgentTransmissionLog([]);
        try { Autosave.snapshot(buildSnapshot('note','conversation-autosave','memory',{ count, at: Date.now() })); } catch {}
    emitConversationFlushed(new Date().toISOString(), count);
    }, [conversationTurns, addNote]);

    const { remainingMs, percentElapsed, isFlushing, manualSave } = useConversationAutosave({ windowMs: CONVO_AUTOSAVE_INTERVAL, onFlush: flushConversationTurns });
    
    // Legacy >=3 turn autosave removed (timer-based flush now authoritative)


    // Save transmission log to localStorage whenever it changes
    useEffect(() => {
        try {
            localStorage.setItem('agent-lee-transmission-log', JSON.stringify(agentTransmissionLog));
        } catch (error) {
            console.error('Failed to save transmission log to localStorage:', error);
        }
    }, [agentTransmissionLog]);
    
    const appendToLog = (speaker: 'USER' | 'AGENT' | 'SYSTEM', text: string) => {
        setAgentTransmissionLog((prev: TransmissionLogEntry[]) => {
            const newLog = [...prev, { id: Date.now(), speaker, text, timestamp: new Date().toISOString() }];
            // Limit log size to prevent performance issues
            if (newLog.length > 200) {
                return newLog.slice(newLog.length - 200);
            }
            return newLog;
        });
    };

    // Handle API key setting from user input
    const handleApiKeySet = (apiKey: string) => {
        try {
            geminiService.setApiKey(apiKey);
            setShowApiKeyPrompt(false);
            setApiKeyError(null);
            appendToLog('SYSTEM', 'API key configured successfully');
        } catch (error) {
            setApiKeyError('Failed to set API key. Please try again.');
        }
    };

    // Check for API key errors and show prompt if needed
    const handleApiKeyError = (error: any) => {
        if (error?.message === 'MISSING_API_KEY') {
            setShowApiKeyPrompt(true);
            setApiKeyError('API key required to use Agent Lee');
            return true; // Indicates error was handled
        }
        return false; // Let other errors bubble up
    };

    // Unified mic/send button behavior (+ alt/meta opens zoom)
    const handleUnifiedMicButton = (e?: React.MouseEvent) => {
        if (e && (e.altKey || e.metaKey)) {
            if (isMicZoomed) closeMicZoom(); else openMicZoom();
            return;
        }
        const trimmed = promptInput.trim();
        // 1. If there's text, treat as send
        if (trimmed.length > 0 && !isSubmitDisabled) {
            handleSubmit(promptInput);
            return;
        }
        // 2. If currently in a push-to-talk session and listening, finalize (second click behavior)
        if (sessionModeRef.current && isListening) {
            finalizePushToTalkSession();
            return;
        }
        // 3. Otherwise start a push-to-talk session (single click start)
        startPushToTalkSession();
    };

    // --- Push-To-Talk Session Helpers (Todo #1) ---
    const clearSilenceTimer = () => {
        if (silenceTimeoutRef.current) {
            window.clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
        }
    };

    const scheduleSilenceTimer = () => {
        clearSilenceTimer();
        // (Silence auto-submit used in later todo; timer exit currently just finalizes session when implemented)
        silenceTimeoutRef.current = window.setTimeout(() => {
            // We'll activate auto-send in Todo #3; for now just finalize if still in session & listening with some input
            if (sessionModeRef.current && isListening) {
                finalizePushToTalkSession();
            }
        }, SILENCE_TIMEOUT_MS);
    };

    const startPushToTalkSession = () => {
        // Do not start if already listening (either session or always-on)
        if (isListening || isAlwaysListeningRef.current) return;
        const recognition = recognitionRef.current;
        if (!recognition) return;
        sessionModeRef.current = true;
        ttsService.cancel();
        try {
            lastSpeechTimeRef.current = Date.now();
            scheduleSilenceTimer();
            recognition.start();
        } catch (e) {
            console.warn('Failed to start push-to-talk session:', e);
            sessionModeRef.current = false;
        }
    };

    const finalizePushToTalkSession = () => {
        const recognition = recognitionRef.current;
        if (!sessionModeRef.current || !recognition) return;
        clearSilenceTimer();
        // Stopping recognition will trigger onend handler which submits the transcript
        try {
            recognition.stop();
        } catch (e) {
            console.warn('Failed to stop recognition cleanly:', e);
        }
        // Session flag will be cleared after onend logic completes
    };
    // --- End Push-To-Talk Helpers ---
    
    // New handler for streaming text to create a "typing" effect
    const appendToLastAgentLog = (chunk: string) => {
        setAgentTransmissionLog((prev: TransmissionLogEntry[]) => {
            if (prev.length === 0) {
                 return [{ id: Date.now(), speaker: 'AGENT', text: chunk, timestamp: new Date().toISOString() }];
            }
            const lastEntry = prev[prev.length - 1];
            if (lastEntry && lastEntry.speaker === 'AGENT') {
                const newLog = [...prev];
                newLog[newLog.length - 1] = { ...lastEntry, text: lastEntry.text + chunk };
                return newLog;
            } else {
                return [...prev, { id: Date.now(), speaker: 'AGENT', text: chunk, timestamp: new Date().toISOString() }];
            }
        });
    };
    

    // --- New Voice Interaction Logic ---
    
    // NEW: Unified retrieval from memoryStore (ephemeral turns + compressed notes)
    const getMemoryContext = (prompt: string): string | null => {
        try {
            const { turns, notes: memNotes } = memRetrieve({ query: prompt, limitTurns: 8, limitNotes: 5 });
            if (turns.length === 0 && memNotes.length === 0) return null;
            const turnLines = turns.map(t => `${t.role.toUpperCase()}: ${t.text}`);
            const noteLines = memNotes.map(n => `NOTE: ${n.summary}`);
            return [...noteLines, ...turnLines].join('\n');
        } catch (e) {
            console.warn('Memory retrieval failed', e);
            return null;
        }
    };


    const sendTranscriptToGemini = async (transcript: string) => {
        if (!chatRef.current || !transcript) return;
        
    setAgentState('thinking');
    appendToLog('USER', transcript);
    // Persist user turn into memory store
    memAddTurn('user', transcript);
        setPromptInput(''); // Clear input after sending
        setInterruptedResponse(null); // Clear any pending interruptions

        try {
            const memoryContext = getMemoryContext(transcript);
            
            const activeCharacter = activeCharacterId ? characters.find((c: any) => c.id === activeCharacterId) : null; // TODO type Character from context
            const characterContext = activeCharacter ? `
---
ACTIVE CHARACTER PROFILE (for consistency):
- Name: ${activeCharacter.name}
- Appearance: ${activeCharacter.appearance}
- Personality: ${activeCharacter.personality}
---
` : '';

            const finalTranscript = [
                memoryContext ? `CONTEXT FROM PREVIOUS INTERACTION:\n${memoryContext}` : '',
                characterContext,
                `CURRENT USER REQUEST:\n${transcript}`
            ].filter(Boolean).join('\n\n');

            let responseStream: AsyncIterable<{ text?: string }> | null = null;
            
            // If the user uploads a file for analysis, we need to handle it here.
            if (activeFeature === 'analyze' && mediaFile) {
                 const { base64, mimeType } = await parseFile(mediaFile);
                 if (!base64 || !mimeType) throw new Error("The selected file is not a supported media type.");
                 responseStream = await geminiService.generateContentStreamMultiModal(finalTranscript, base64, mimeType);
                 setMediaFile(null); // Consume the file
            } else if (activeFeature === 'document' && documentFile) {
                const { content } = await parseFile(documentFile);
                const docPrompt = `Please analyze the following document and answer the user's question.\n\nDOCUMENT:\n"""\n${content}\n"""\n\nQUESTION:\n"""\n${finalTranscript}\n"""\n\nANALYSIS:`;
                responseStream = await chatRef.current.sendMessageStream({ message: docPrompt });
                setDocumentFile(null); // Consume the file
            }
            else {
                // Step 1: Classify if the request requires visual context
                const isVisualQuery = await geminiService.classifyVisualRequest(transcript);

                // Step 2a: If visual, check camera, prompt if needed, or capture frame
                if (isVisualQuery && cameraFeedRef.current) {
                    if (!cameraFeedRef.current.isReady()) {
                        setPendingVisualQuery(transcript); // Save prompt
                        const message = "I need to use the visual feed for that, but it's not active. Please click 'Enable Camera' below, and I'll proceed.";
                        appendToLog('AGENT', message);
                        setAgentState('speaking');
                        await ttsService.speak(finalizeSpokenOutput(message), () => {}, () => setAgentState('idle'));
                        return; // Stop processing and wait for user to enable camera
                    }

                    appendToLog('SYSTEM', '[System: Visual query detected. Capturing frame...]');
                    const frameDataUrl = cameraFeedRef.current.captureFrame();

                    if (frameDataUrl) {
                        const [, base64Data] = frameDataUrl.split(',');
                        responseStream = await geminiService.generateContentStreamMultiModal(finalTranscript, base64Data, 'image/jpeg');
                    } else {
                        appendToLog('SYSTEM', '[System: Frame capture failed. Proceeding with text only.]');
                        responseStream = await chatRef.current.sendMessageStream({ message: finalTranscript });
                    }
                } else {
                    // Step 2b: Standard text-only chat
                    responseStream = await chatRef.current.sendMessageStream({ message: finalTranscript });
                }
            }

            if (!responseStream) {
                throw new Error('Failed to generate a response stream from Gemini.');
            }

            
            // Step 3: Process the stream
            let fullResponse = "";
            let firstChunk = true;

            for await (const chunk of responseStream) {
                if (firstChunk) {
                    appendToLog('AGENT', ""); // Create empty entry for streaming
                    firstChunk = false;
                }
                const chunkText = chunk.text;
                if (chunkText) {
                    fullResponse += chunkText;
                    appendToLastAgentLog(chunkText); // Stream to UI log
                }
            }
            
            // Step 4: Parse actions from the full response
            const { cleanedText, actions } = parseAgentActions(fullResponse);
            
            // Enhance with receipts + ARR mapping
            const receiptKeys: string[] = [];
            try {
                if (localStorage.getItem('agentlee:lastImage')) receiptKeys.push('lastImage');
                if (localStorage.getItem('agentlee:lastImageUrl')) receiptKeys.push('lastImageUrl');
            } catch {}
            const augmentedBody = cleanedText + receiptsLine(receiptKeys);
            const mappedReply = mapFreeformReply(transcript, augmentedBody, "Confirm or provide the next directive.", 'general');

            setAgentTransmissionLog((prev: TransmissionLogEntry[]) => {
                const newLog = [...prev];
                if (newLog.length > 0 && newLog[newLog.length - 1].speaker === 'AGENT') {
                    newLog[newLog.length - 1].text = mappedReply;
                }
                return newLog;
            });
            
            // Add to conversation history for auto-saving
            setConversationTurns((prev: {user:string;agent:string}[]) => [...prev, { user: transcript, agent: mappedReply }]);
            // Persist agent turn into memory store
            memAddTurn('agent', mappedReply);

            // Opportunistic summarization into a compressed note
            const proposed = proposeNoteFromRecent();
            if (proposed) {
                memUpsert({ summary: proposed.summary, tags: proposed.tags, utility: proposed.utility });
            }

            // FIX: Pipe the agent's response to the active feature's result state.
            // This ensures that when the agent performs a task (e.g., writing a story),
            // the result appears in the correct UI component (e.g., TextGenerator).
            switch (activeFeature) {
                case 'text':
                    setResults((prev: typeof results) => ({ ...prev, text: cleanedText }));
                    break;
                case 'research':
                    // Note: When the agent handles research, it uses its general knowledge.
                    // It doesn't have access to the googleSearch tool in this conversational flow,
                    // so sources will be empty. We still display the text response.
                    setResults((prev: typeof results) => ({ ...prev, research: { text: cleanedText, sources: [] } }));
                    break;
                case 'analyze':
                    setResults((prev: typeof results) => ({ ...prev, analyze: cleanedText }));
                    break;
                case 'document':
                    setResults((prev: typeof results) => ({ ...prev, document: cleanedText }));
                    break;
                default:
                    // For other features like 'character', 'call', etc., the result is handled
                    // differently (e.g., direct image generation, side effects) or there's no text output.
                    break;
            }


            // Step 5: Speak the cleaned response
            setAgentState('speaking');
            const cleanResponseForSpeech = finalizeSpokenOutput(cleanedText);
            await ttsService.speak(
                cleanResponseForSpeech,
                () => {}, // onBoundary
                () => { 
                    setAgentState('idle'); 
                    // Step 6: Execute actions after speech is complete
                    if (actions.length > 0) {
                        actions.forEach(executeAgentAction);
                    }
                }
            );

        } catch (err: any) {
            // Check if this is an API key error first
            if (handleApiKeyError(err)) {
                setAgentState('idle');
                setLoading(false);
                return; // Don't show generic error message for API key issues
            }
            
            const errorMessage = err?.message || 'An unknown error occurred.';
            setError(errorMessage);
            appendToLog('SYSTEM', `Error: ${errorMessage}`);
            setAgentState('idle');
        } finally {
            setLoading(false);
        }
    };
    
    const initializeChat = useCallback(() => {
        try {
            chatRef.current = geminiService.createChat(userName || 'Operator');
        } catch (error: any) {
            if (error?.message === 'MISSING_API_KEY') {
                setShowApiKeyPrompt(true);
                setApiKeyError('API key is required to use Agent Lee. Please enter your Google Gemini API key.');
            } else {
                console.error('Error initializing chat:', error);
                setError('Failed to initialize chat service');
            }
        }
    }, [userName]);

    // Initialize optional local voice pipeline
    useEffect(() => {
        const enabled = localStorage.getItem('lee-voice-pipeline') === 'on';
        if (!enabled) return; // keep legacy path
        let disposed = false;
        (async () => {
            try {
                const { startVoiceSystem } = await import('./src/voice/voiceController');
                // Bridge send to existing Gemini pipeline (return text reply)
                const geminiSend = async (text: string) => {
                    // Reuse existing submit path; capture spoken reply by returning cleaned text from stream end
                    // We'll call sendTranscriptToGemini but need a simple adapter
                    await sendTranscriptToGemini(text); // existing handles speaking
                    return ''; // VoiceController will skip its own TTS if empty
                };
                const vc = await startVoiceSystem({
                    wakeEnabled: true,
                    onState: (s) => appendToLog('SYSTEM', `[VoicePipeline:${s}]`),
                    onWake: () => appendToLog('SYSTEM', '[Wake word detected]'),
                    onTranscript: (raw, cleaned) => appendToLog('USER', `(local) ${cleaned || raw}`),
                    geminiSend
                });
                if (disposed) { vc.dispose(); return; }
                voiceControllerRef.current = vc;
                appendToLog('SYSTEM', '[Local voice pipeline initialized]');
            } catch (e) {
                appendToLog('SYSTEM', `[Local voice pipeline failed to init: ${(e as Error).message}]`);
            }
        })();
        return () => {
            disposed = true;
            if (voiceControllerRef.current) {
                try { voiceControllerRef.current.dispose(); } catch { /* ignore */ }
                voiceControllerRef.current = null;
            }
        };
    // sendTranscriptToGemini & appendToLog stable enough; ignore exhaustive deps intentionally
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Effect to manage onboarding and chat initialization
    useEffect(() => {
        if (isOnboardingComplete) {
            initializeChat();
        }
    }, [isOnboardingComplete, initializeChat]);


    // This effect runs once on mount to initialize services
    useEffect(() => {
        ttsService.initTts();
        
        if (!recognitionRef.current) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                setError("Speech recognition not supported by this browser. Voice input disabled.");
                return;
            }
            const recognition = new SpeechRecognition();
            recognition.continuous = true; // Keep listening even after pauses
            recognition.interimResults = true;
            recognitionRef.current = recognition;
        }
    }, []);

    // FIX: Simplified handleSubmit to always use the conversational agent.
    // This fixes the "stuck in a mode" bug.
    const handleSubmit = async (text: string) => {
        const currentPrompt = text.trim();
        if (!currentPrompt || !isOnboardingComplete) {
            return;
        }

        setLoading(true);
        setError('');
        setAgentState('thinking');

        try {
            // All prompts now go through the main agent logic
            await sendTranscriptToGemini(currentPrompt);
        } catch (err: any) {
            const errorMessage = err?.message || 'An unknown error occurred.';
            setError(errorMessage);
            appendToLog('SYSTEM', `Error: ${errorMessage}`);
            setAgentState('idle');
            setLoading(false);
        } finally {
            // setLoading(false) is now handled inside sendTranscriptToGemini
            setPromptInput('');
        }
    };

    const handleSubmitCallback = useCallback(handleSubmit, [activeFeature, systemInstruction, researchMode, mediaFile, documentFile, sendTranscriptToGemini, isOnboardingComplete, appendToLog, setAgentState, setLoading, setError, setResults, setPromptInput, userName, activeCharacterId, characters]);
    
    // NEW: Effect to handle auto-submission after navigation
    useEffect(() => {
        if (isAutoSubmitting && !loading && promptInput) {
            handleSubmitCallback(promptInput);
            setIsAutoSubmitting(false); // Reset the trigger
        }
    }, [isAutoSubmitting, loading, promptInput, handleSubmitCallback]);


    // Effect to attach and update STT event handlers
    useEffect(() => {
        const recognition = recognitionRef.current;
        if (!recognition) return;

        recognition.onstart = () => {
            setAgentState('listening');
            setIsListening(true);
        };

        recognition.onresult = (event: any) => {
            let fullTranscript = '';
            for (let i = 0; i < event.results.length; i++) {
                fullTranscript += event.results[i][0].transcript;
            }
            setPromptInput(fullTranscript);
            // Update speech activity timestamp & silence timer only for session mode
            if (sessionModeRef.current) {
                lastSpeechTimeRef.current = Date.now();
                scheduleSilenceTimer();
            }
            // Wake word detection (only in always-on mode, not while already thinking/speaking)
            if (isAlwaysListeningRef.current && agentState === 'listening') {
                const normalized = fullTranscript.toLowerCase().trim();
                if (!wakeActiveRef.current) {
                    const heardWake = WAKE_WORDS.some(w => normalized.startsWith(w) || normalized.includes(w + ' '));
                    if (heardWake) {
                        wakeActiveRef.current = true;
                        // Remove wake phrase from prompt field so user can continue naturally
                        const stripped = WAKE_WORDS.reduce((acc, w) => acc.replace(new RegExp('^' + w.replace(/ /g, '\\s*'), 'i'), '').trim(), normalized);
                        setPromptInput(stripped);
                        // Greet immediately
                        appendToLog('AGENT', 'Hello. How can I assist you?');
                        setAgentState('speaking');
                        ttsService.speak(finalizeSpokenOutput('Hello. How can I assist you?'), () => {}, () => {
                            // After greeting return to listening state for follow-up
                            if (isAlwaysListeningRef.current) {
                                setAgentState('listening');
                            } else {
                                setAgentState('idle');
                            }
                        });
                        // Start follow-up window timer
                        if (wakeFollowWindowRef.current) window.clearTimeout(wakeFollowWindowRef.current);
                        wakeFollowWindowRef.current = window.setTimeout(() => {
                            wakeActiveRef.current = false;
                        }, WAKE_FOLLOW_TIMEOUT_MS);
                        return; // Wait for user question
                    }
                } else {
                    // Already in wake follow-up; if user paused and resumed, keep timer fresh on new speech
                    if (wakeFollowWindowRef.current) {
                        window.clearTimeout(wakeFollowWindowRef.current);
                        wakeFollowWindowRef.current = window.setTimeout(() => { wakeActiveRef.current = false; }, WAKE_FOLLOW_TIMEOUT_MS);
                    }
                }
            }
        };

        recognition.onend = () => {
            setIsListening(false);
            // If this was a push-to-talk session, clear its state
            if (sessionModeRef.current) {
                sessionModeRef.current = false;
                clearSilenceTimer();
            }
            const finalTranscript = promptInput.trim();
            if (finalTranscript) {
                // If we are in wake follow-up mode and the transcript is just a wake word (no question) ignore send
                const lower = finalTranscript.toLowerCase();
                const wakeOnly = WAKE_WORDS.some(w => lower === w);
                if (wakeOnly && wakeActiveRef.current) {
                    // restart listening loop without sending
                    if (isAlwaysListeningRef.current) {
                        setAgentState('idle');
                    }
                } else if (wakeActiveRef.current || !isAlwaysListeningRef.current) {
                    // If wake window active OR we're in PTT session, send transcript
                    wakeActiveRef.current = false;
                    handleSubmitCallback(finalTranscript);
                } else if (isAlwaysListeningRef.current) {
                    // In always on, treat any spoken phrase (that wasn't only the wake word) as a direct request
                    handleSubmitCallback(finalTranscript);
                }
            } else if (isAlwaysListeningRef.current) {
                // If in always-on mode and there was no speech, reset state to idle
                // so the main loop can restart the recognition.
                setAgentState('idle');
            }
        };
        
        recognition.onerror = (event: any) => {
            if (event.error !== 'no-speech') {
                 console.error("Speech Recognition Error:", event.error);
                 setError(`Speech Recognition Error: ${event.error}`);
            }
            setIsListening(false);
            // On any error, onend will be called next, which will handle recovery.
        };

    }, [promptInput, handleSubmitCallback]);

    // This is now the master controller for the "always listening" loop.
    // It starts, stops, and restarts listening based on the application state.
    useEffect(() => {
        const recognition = recognitionRef.current;
        if (!recognition) return;

        // Condition to START listening:
        // 1. User has enabled "always on" mode.
        // 2. The agent is idle (not thinking or speaking).
        if (isAlwaysListening && agentState === 'idle') {
            ttsService.cancel();
            recognition.start();
        } 
        // Condition to STOP listening:
        // 1. User has disabled "always on" mode.
        else if (!isAlwaysListening) {
            recognition.stop();
        }
    }, [isAlwaysListening, agentState]);


    const handleMicToggle = () => {
        // NEW: Handle interruption
        if (agentState === 'speaking') {
            ttsService.cancel();
            const lastAgentResponse = [...agentTransmissionLog].reverse().find(entry => entry.speaker === 'AGENT');
            if (lastAgentResponse) {
                setInterruptedResponse(lastAgentResponse);
            }
        }
    setIsAlwaysListening((prev: boolean) => !prev);
    };


    // --- End of New Voice Interaction Logic ---

    const applyNoteToPrompt = (note: Note) => {
        let targetFeature: Feature = 'text';
        if (note.content.type === 'text' || note.content.type === 'analysis' || note.content.type === 'call') {
            setPromptInput(note.content.text);
            targetFeature = 'text';
        } else if (note.content.type === 'research') {
             setPromptInput(note.content.text);
             targetFeature = 'research';
        } else if (note.content.type === 'image') {
            setPromptInput(note.content.prompt);
            targetFeature = 'character';
        }
        
        setActiveFeature(targetFeature);
        setIsNotePickerOpen(false); 
        
        const input = document.getElementById('central-prompt-input');
        if (input) {
            input.style.transition = 'all 0.1s ease-in-out';
            input.style.transform = 'scale(1.02)';
            setTimeout(() => {
                input.style.transform = 'scale(1)';
            }, 200);
        }
    };
    
    const getActiveResultText = () => {
        switch(activeFeature) {
            case 'text': return results.text;
            case 'research': return results.research.text;
            case 'analyze': return results.analyze;
            case 'document': return results.document;
            default: return '';
        }
    };
    
    const currentResultData = {
        text: getActiveResultText(),
        // Use the first image for single-image actions like AI Analysis
        imageUrl: (results.images[0]?.type === 'base64') ? `data:image/png;base64,${results.images[0].data}` : '',
        sources: results.research.sources,
        prompt: promptInput,
        fileName: activeFeature === 'analyze' ? mediaFile?.name : (activeFeature === 'document' ? documentFile?.name : undefined),
    };
    
    const handleGlobalAiAnalysis = async () => {
        setIsAnalysisLoading(true);
        setIsAnalysisModalOpen(true);
        setAnalysisModalContent('');

        try {
            let analysis = '';
            if (activeFeature === 'notepad') {
                const activeNote = notes.find((n: Note) => n.id === activeNoteId);
                if (!activeNote) throw new Error("No active note to analyze.");

                if (activeNote.content.type === 'image') {
                    analysis = await geminiService.analyzeImageFromUrl("Describe this image in detail. Provide context and identify key objects.", activeNote.content.imageUrl);
                } else if (['text', 'research', 'analysis', 'call', 'memory'].includes(activeNote.content.type)) {
                    const textToAnalyze = (activeNote.content.type === 'memory') 
                        ? `User: ${activeNote.content.userPrompt}\nAgent: ${activeNote.content.agentResponse}`
                        : (activeNote.content as any).text;
                    analysis = await geminiService.analyzeNote(textToAnalyze);
                } else {
                    throw new Error("This note type cannot be analyzed.");
                }
            } else {
                if (activeFeature === 'character' && currentResultData.imageUrl) {
                    analysis = await geminiService.analyzeImageFromUrl("Describe this image in detail. Provide context and identify key objects.", currentResultData.imageUrl);
                } else if (currentResultData.text) {
                    analysis = await geminiService.analyzeNote(currentResultData.text);
                } else {
                    throw new Error("No content to analyze for the current feature.");
                }
            }
            setAnalysisModalContent(analysis);
        } catch (err: any) {
            setAnalysisModalContent(`Error during analysis: ${(err as Error).message}`);
        } finally {
            setIsAnalysisLoading(false);
        }
    };
    

    const handleTabClick = useCallback((feature: Feature) => {
        setActiveFeature(feature);
    }, []);

    const researchModes: { id: ResearchMode; label: string; icon: string; }[] = [
        { id: 'general', label: 'General', icon: images.icons.general },
        { id: 'academic', label: 'Academic', icon: images.icons.academic },
        { id: 'wikipedia', label: 'Wikipedia', icon: images.icons.wiki },
    ];

    const handleLogAction = (action: 'save' | 'memory', entry: TransmissionLogEntry) => {
        if (action === 'save') {
             const title = `Log: ${entry.text.substring(0, 30).trim()}${entry.text.length > 30 ? '...' : ''}`;
             const noteText = `**Transmission from ${entry.speaker}**\n*Timestamp: ${new Date(entry.timestamp).toLocaleString()}*\n---\n${entry.text}`;
             const noteContent: NoteContent = { type: 'text', text: noteText };
             addNote(title, noteContent);
        } else if (action === 'memory') {
            const userPromptEntry = [...agentTransmissionLog].reverse().find(e => e.speaker === 'USER' && e.timestamp < entry.timestamp);
            if (userPromptEntry) {
                const title = `Memory: ${userPromptEntry.text.substring(0, 40).trim()}${userPromptEntry.text.length > 40 ? '...' : ''}`;
                const noteContent: NoteContent = { type: 'memory', userPrompt: userPromptEntry.text, agentResponse: entry.text };
                addNote(title, noteContent, 'MEMORY');
            } else {
                // Fallback if no preceding user prompt is found
                addNote(`Memory: ${entry.text.substring(0, 40)}...`, { type: 'memory', userPrompt: 'N/A', agentResponse: entry.text }, 'MEMORY');
            }
        }
    };


    const handleDeleteLogEntry = (id: number) => {
        if (window.confirm("Are you sure you want to permanently delete this message from the log?")) {
            setAgentTransmissionLog((prev: TransmissionLogEntry[]) => prev.filter((entry: TransmissionLogEntry) => entry.id !== id));
        }
    };
    
    // NEW: Handlers for interruption banner
    const handleResumeInterruption = () => {
        if (interruptedResponse) {
            setAgentState('speaking');
            ttsService.speak(finalizeSpokenOutput(interruptedResponse.text), () => {}, () => {
                setAgentState('idle');
            });
        }
        setInterruptedResponse(null);
    };

    const handleDismissInterruption = () => {
        setInterruptedResponse(null);
    };

    // NEW: Callback for when the camera is successfully enabled
    const handleCameraEnabled = () => {
        if (pendingVisualQuery) {
            appendToLog('SYSTEM', '[System: Camera activated. Resuming visual query...]');
            sendTranscriptToGemini(pendingVisualQuery);
            setPendingVisualQuery(null);
        }
    };
    
    const styles = `
    :root { --bg-gradient: linear-gradient(135deg, #121212 0%, #000000 100%); --text-primary: #f0f0f0; --text-secondary: #D4AF37; --border-color: #D4AF37; --accent-bg: #D4AF37; --accent-text: #121212; --surface-bg: #1E1E1E; --surface-text: #E0E0E0; }
    * { box-sizing: border-box; }
    html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; }
    body.theme-onyx-gold { --bg-gradient: linear-gradient(135deg, #121212 0%, #000000 100%); --text-primary: #f0f0f0; --text-secondary: #D4AF37; --border-color: #D4AF37; --accent-bg: #D4AF37; --accent-text: #121212; }
    body.theme-midnight { --bg-gradient: linear-gradient(135deg, #1a202c 0%, #2d3748 100%); --text-primary: #e2e8f0; --text-secondary: #63b3ed; --border-color: #4a5568; --accent-bg: #63b3ed; --accent-text: #1a202c; }
    body.theme-slate { --bg-gradient: linear-gradient(135deg, #334155 0%, #475569 100%); --text-primary: #f1f5f9; --text-secondary: #a78bfa; --border-color: #64748b; --accent-bg: #a78bfa; --accent-text: #1e293b; }
    body.theme-nebula { --bg-gradient: linear-gradient(135deg, #4c1d95 0%, #5b21b6 100%); --text-primary: #f5f3ff; --text-secondary: #f472b6; --border-color: #7c3aed; --accent-bg: #f472b6; --accent-text: #4c1d95; }
    .leeway-multitool-wrapper { width: 100%; height: 100%; background: var(--bg-gradient); display: flex; flex-direction: row; gap: 1rem; align-items: stretch; padding: 1rem; color: var(--text-primary); font-family: 'Inter', sans-serif; overflow: hidden; position: relative; }
    .logo-watermark { position: absolute; top: 1rem; left: 1rem; z-index: 10; opacity: 0.55; transition: opacity 0.3s ease; pointer-events: none; }
    .logo-watermark img { width: 70px; height: 70px; object-fit: contain; filter: brightness(0.85) drop-shadow(0 0 12px rgba(212, 175, 55, 0.45)); }
    .logo-watermark:hover { opacity: 0.85; }
    .left-pane { width: 30%; flex-shrink: 0; display: flex; flex-direction: column; gap: 1rem; }
    .top-info-wrapper { flex-shrink: 0; }
    .app-container { flex-grow: 1; background: var(--bg-gradient); border-radius: 1rem; padding: 1.5rem; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3); border: 1px solid var(--border-color); display: flex; flex-direction: column; min-height: 0; position: relative; }
    .app-header { text-align: center; margin-bottom: 1.5rem; }
    .app-header h1 { color: #ffffff; font-size: 2.25rem; font-weight: 600; }
    .app-header p { font-size: 1rem; color: var(--text-secondary); }
    .app-tabs-container { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
    .app-tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem; }
    .app-tab-btn { padding: 0; border: none; border-radius: 0.75rem; cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease; position: relative; overflow: hidden; aspect-ratio: 1 / 1; display: flex; }
    .app-tab-btn img { width: 100%; height: 100%; object-fit: cover; display: block; border-radius: inherit; }
    .app-tab-btn::after { content: ""; position: absolute; inset: 0; border-radius: inherit; border: 3px solid transparent; transition: border-color 0.2s ease, box-shadow 0.2s ease; pointer-events: none; }
    .app-tab-btn:hover { transform: translateY(-2px); }
    .app-tab-btn:hover::after { border-color: rgba(212, 175, 55, 0.5); box-shadow: 0 8px 16px rgba(0,0,0,0.35); }
    .app-tab-btn.active { transform: translateY(-2px) scale(1.01); }
    .app-tab-btn.active::after { border-color: var(--accent-bg); box-shadow: 0 10px 20px rgba(212, 175, 55, 0.35); }
    .app-tab-btn:focus-visible { outline: 3px solid var(--accent-bg); outline-offset: 4px; }
    .app-content-area { border-radius: 0.5rem; flex-grow: 1; display: flex; flex-direction: column; overflow: hidden; }
    .app-content-area:not(.no-surface) { background: var(--surface-bg); color: var(--surface-text); padding: 1.5rem; }
    .research-mode-selector { display: flex; gap: 0.75rem; padding-bottom: 1rem; }
    .research-mode-btn { border: none; padding: 0; width: 64px; height: 64px; border-radius: 0.5rem; cursor: pointer; position: relative; overflow: hidden; transition: transform 0.2s ease; display: flex; }
    .research-mode-btn img { width: 100%; height: 100%; object-fit: cover; display: block; border-radius: inherit; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); border: 0; white-space: nowrap; }
    .research-mode-btn::after { content: ""; position: absolute; inset: 0; border-radius: inherit; border: 2px solid transparent; transition: border-color 0.2s ease, box-shadow 0.2s ease; pointer-events: none; }
    .research-mode-btn:hover { transform: translateY(-1px); }
    .research-mode-btn:hover::after { border-color: rgba(212, 175, 55, 0.5); box-shadow: 0 6px 12px rgba(0,0,0,0.25); }
    .research-mode-btn.active::after { border-color: var(--accent-bg); box-shadow: 0 8px 16px rgba(212, 175, 55, 0.35); }
    .research-mode-btn:focus-visible { outline: 2px solid var(--accent-bg); outline-offset: 3px; }
    .bottom-controls-wrapper { display: flex; flex-direction: column; gap: 0.75rem; margin-top: auto; flex-shrink: 0; }
    .central-input-bar { display: flex; gap: 0.5rem; background: #111; padding: 0.375rem; border-radius: 0.5rem; border: 1px solid var(--border-color); flex-grow: 1; align-items: center; min-height: 52px; }
    .central-input-bar textarea { flex-grow: 1; background: #222; color: #f9fafb; border: 1px solid var(--border-color); border-radius: 0.5rem; padding: 0.5rem 0.75rem; font-size: 1rem; resize: none; min-height: 40px; max-height: 120px; line-height: 1.4; }
    .central-input-bar textarea::placeholder { color: #d4af37a0; }
    .central-input-bar textarea:focus { outline: none; box-shadow: 0 0 0 2px var(--border-color); }
    .input-buttons { display: flex; flex-direction: column; justify-content: space-between; gap: 0.5rem; }
    .input-buttons.horizontal { flex-direction: row; gap: 0.5rem; align-items: center; }
    .input-buttons button, .note-picker-btn { background: var(--accent-bg); color: var(--accent-text); border: none; border-radius: 0.5rem; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease; }
    .input-buttons button.mic-button { background-color: #444; color: white; }
    .input-buttons button.mic-button.always-on { box-shadow: 0 0 8px 2px rgba(212, 175, 55, 0.8); }
    .input-buttons button.mic-button.listening { background-color: #d43737; animation: pulse-red 1.5s infinite; box-shadow: none; }
    .input-buttons button.send-button { background-color: #22c55e; color: white; }
    .input-buttons button.send-button:hover { background-color: #16a34a; }
    .input-buttons button svg { width: 20px; height: 20px; flex-shrink: 0; }
    @keyframes pulse-red { 0% { box-shadow: 0 0 0 0 rgba(212, 55, 55, 0.7); } 70% { box-shadow: 0 0 0 8px rgba(212, 55, 55, 0); } 100% { box-shadow: 0 0 0 0 rgba(212, 55, 55, 0); } }
    .input-buttons button:hover, .note-picker-btn:hover { background: #b8860b; }
    .input-buttons button:disabled { background: #555; cursor: not-allowed; }
    .ai-modal-backdrop { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 50; }
    .ai-modal-content { background: var(--surface-bg); color: var(--surface-text); border-radius: 10px; padding: 2rem; width: 90%; max-width: 700px; max-height: 80vh; overflow-y: auto; border: 2px solid var(--border-color); }
    .ai-modal-content h2 { color: var(--text-secondary); }
    .ai-modal-content button { background: var(--accent-bg); color: var(--accent-text); }
    .note-picker-container { position: relative; }
    .note-picker-dropdown { position: absolute; bottom: 110%; right: 0; background: #fff; color: #333; border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.2); width: 300px; max-height: 400px; overflow-y: auto; z-index: 20; border: 1px solid #ccc; }
    .note-picker-dropdown button { display: block; width: 100%; text-align: left; padding: 12px 15px; background: none; border: none; border-bottom: 1px solid #eee; cursor: pointer; }
    .note-picker-dropdown button:hover { background: #f5f5f5; }
    .note-picker-dropdown button:last-child { border-bottom: none; }
    .interruption-banner { background-color: #fff3cd; color: #664d03; border: 1px solid #ffecb5; padding: 0.75rem 1rem; border-radius: 0.5rem; display: flex; align-items: center; justify-content: space-between; font-size: 0.9rem; margin: -0.5rem 0 0.5rem 0; }
    .interruption-banner button { background: #ffc107; border: none; color: #000; padding: 0.25rem 0.75rem; border-radius: 0.375rem; cursor: pointer; margin-left: 0.5rem; font-weight: 600; }
    .interruption-banner button.dismiss { background: #6c757d; color: #fff; }
    .character-selector-container { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; padding: 0.5rem; background: rgba(0,0,0,0.2); border-radius: 0.5rem; }
    .character-selector-container label { font-weight: 500; color: var(--text-secondary); }
    .character-selector-container select { background: #333; color: #fff; border: 1px solid var(--border-color); border-radius: 0.375rem; padding: 0.25rem 0.5rem; }
    
    /* --- Responsive Design for Mobile & Tablet --- */
    @media (max-width: 960px) {
        html, body, #root {
            height: auto;
            overflow: auto;
        }
        .leeway-multitool-wrapper {
            flex-direction: column;
            height: auto;
            min-height: 100dvh;
            gap: 0.5rem;
            padding: 0.5rem;
            padding-top: env(safe-area-inset-top, 0.5rem);
            padding-left: env(safe-area-inset-left, 0.5rem);
            padding-right: env(safe-area-inset-right, 0.5rem);
            padding-bottom: 160px; /* Increased space for the fixed input bar */
        }
        
        .left-pane, .app-container {
            width: 100%;
            min-height: 0; 
            flex-shrink: 1;
        }

        /* Fix Agent Avatar visibility */
        .left-pane {
            order: 1;
            margin-bottom: 1rem;
        }
        
        .top-info-wrapper {
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 1rem;
            min-height: 120px; /* Ensure avatar has space */
        }

        .app-container {
            order: 2;
            padding: 1rem;
        }
        
        .app-header {
            margin-bottom: 1rem;
        }
        .app-header h1 {
            font-size: 1.5rem;
        }
        .app-header p {
            font-size: 0.875rem;
        }

        .app-content-area:not(.no-surface) {
            padding: 1rem;
        }

        /* Improve tool interaction */
        .research-mode-selector {
            flex-wrap: wrap;
            justify-content: center;
            padding-bottom: 0.5rem;
            gap: 1rem;
        }
        
        .research-mode-btn {
            width: 72px; /* Larger for better touch targets */
            height: 72px;
            min-width: 72px;
        }
        
        .app-tabs {
            grid-template-columns: repeat(3, 1fr);
            gap: 1rem; /* More space between tabs */
        }
        
        .app-tab-btn {
            min-height: 80px; /* Better touch targets */
        }
        
        /* Fix bottom controls and input */
        .bottom-controls-wrapper {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 1000;
            background: linear-gradient(to top, #000 0%, #000 80%, rgba(0,0,0,0.95) 90%, rgba(0,0,0,0.8) 100%);
            padding: 1rem;
            padding-left: calc(1rem + env(safe-area-inset-left, 0rem));
            padding-right: calc(1rem + env(safe-area-inset-right, 0rem));
            padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0rem));
            border-top: 1px solid var(--border-color);
            box-shadow: 0 -4px 12px rgba(0,0,0,0.25);
        }

        .central-input-bar {
            gap: 0.75rem;
            padding: 0.75rem;
            min-height: 60px; /* Ensure input area is visible */
            background: #1a1a1a;
            border: 2px solid var(--border-color);
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }

        .central-input-bar textarea {
            min-height: 44px; /* Better for mobile */
            font-size: 16px; /* Prevent zoom on iOS */
            background: #2a2a2a;
            border: 1px solid #444;
            color: #fff;
        }

        /* Fix microphone button sizing */
        .input-buttons button, .note-picker-btn {
            width: 48px; /* Larger touch target */
            height: 48px;
            min-width: 48px;
            min-height: 48px;
        }
        
        .input-buttons button svg {
            width: 24px;
            height: 24px;
        }
        
        .input-buttons.horizontal {
            gap: 0.75rem;
        }
    }

    @media (max-width: 480px) {
        .leeway-multitool-wrapper {
            padding: 0.25rem;
            padding-bottom: 170px;
        }
        
        .app-header h1 {
            font-size: 1.25rem;
        }
        .app-container {
            padding: 0.75rem;
        }
        .app-content-area:not(.no-surface) {
            padding: 0.75rem;
        }
        
        /* Smaller screens adjustments */
        .research-mode-btn {
            width: 64px;
            height: 64px;
            min-width: 64px;
        }
        
        .central-input-bar {
            padding: 0.5rem;
        }
        
        .input-buttons button, .note-picker-btn {
            width: 44px;
            height: 44px;
            min-width: 44px;
            min-height: 44px;
        }
    }
    
    /* Galaxy Fold specific optimizations */
    @media (max-width: 344px) {
        .app-tabs {
            grid-template-columns: 1fr 1fr; /* Two columns for very narrow screens */
        }
        
        .research-mode-selector {
            flex-wrap: wrap;
            gap: 0.5rem;
        }
        
        .research-mode-btn {
            width: 56px;
            height: 56px;
            min-width: 56px;
        }
        
        .central-input-bar textarea {
            font-size: 14px;
            min-height: 40px;
        }
        
        .input-buttons button, .note-picker-btn {
            width: 40px;
            height: 40px;
            min-width: 40px;
            min-height: 40px;
        }
    }
    `;
    
    const CharacterSelector = () => {
        if (characters.length === 0) return null;

        return (
            <div className="character-selector-container">
                <label htmlFor="character-select">Active Character:</label>
                <select 
                    id="character-select" 
                    value={activeCharacterId ?? ''} 
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setActiveCharacterId(e.target.value ? Number(e.target.value) : null)}
                >
                    <option value="">None</option>
                    {characters.map((char: any) => (
                        <option key={char.id} value={char.id}>{char.name}</option>
                    ))}
                </select>
            </div>
        );
    };

        const renderFeature = () => {
        switch (activeFeature) {
          case 'text':
            return <TextGenerator result={results.text} loading={loading} error={error} systemInstruction={systemInstruction} setSystemInstruction={setSystemInstruction} />;
                    case 'character':
                        return (
                            <CharacterStudio
                                imageResults={results.images}
                                imageLoading={loading && activeFeature === 'character'}
                                imageError={activeFeature === 'character' ? error : ''}
                            />
                        );
          case 'analyze':
            return <MediaAnalyzer result={results.analyze} loading={loading} error={error} file={mediaFile} setFile={setMediaFile} onStartNew={() => setActiveFeature('analyze')} />;
          case 'research':
            return <Researcher result={results.research} loading={loading} error={error} setBrowserUrl={setBrowserUrl} />;
          case 'document':
            return <DocumentAnalyzer result={results.document} loading={loading} error={error} file={documentFile} setFile={setDocumentFile} onStartNew={() => setActiveFeature('document')} />;
          case 'call':
            return <CommunicationControl userName={userName || 'the operator'} numberToCall={numberToCall} />;
          case 'email':
            return <EmailClient />;
          case 'notepad':
            return <AgentNotepad applyNoteToPrompt={applyNoteToPrompt} />;
          case 'settings':
            return <Settings transmissionLog={agentTransmissionLog} userName={userName || null} />;
          // FIX: Changed 'case "default"' to 'default' to correctly handle the switch statement's default case.
          default:
            return <p>Select a feature.</p>;
        }
    };
    
    const isPromptEmpty = !promptInput.trim();
    const isSubmitDisabled = loading || isPromptEmpty;

    const handleOnboardingComplete = useCallback(() => {
        setIsOnboardingComplete(true);
        localStorage.setItem('onboardingComplete', 'true');
    }, []);

    const handleNameSet = (name: string) => {
        const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
        setUserName(capitalizedName);
        localStorage.setItem('userName', capitalizedName);
    };

    return (
        <React.Fragment>
            {showApiKeyPrompt && (
                <ApiKeyPrompt onApiKeySet={handleApiKeySet} />
            )}
            {!isOnboardingComplete && (
                <OnboardingGuide
                    onComplete={handleOnboardingComplete}
                    onTabClick={handleTabClick}
                    onNameSet={handleNameSet}
                />
            )}
            {browserUrl && <InAppBrowser url={browserUrl} onClose={() => setBrowserUrl(null)} />}
            <div className="leeway-multitool-wrapper">
                <style>{styles}</style>
                <div className="logo-watermark">
                    <img src={images.logo} alt="Logo" />
                </div>
                
                <div className="left-pane">
                    <div className="top-info-wrapper" id="agent-avatar-container">
                        <AgentAvatar agentState={agentState} />
                    </div>
                    <div id="agent-output-container">
                        <AgentOutput 
                            log={agentTransmissionLog} 
                            onAction={handleLogAction}
                            onDelete={handleDeleteLogEntry}
                        />
                         {interruptedResponse && (
                            <div className="interruption-banner">
                                <span>Agent Lee was interrupted.</span>
                                <div>
                                    <button onClick={handleResumeInterruption}>Resume</button>
                                    <button onClick={handleDismissInterruption} className="dismiss">Dismiss</button>
                                </div>
                            </div>
                         )}
                    </div>
                    <div id="camera-feed-container">
                        <CameraFeed ref={cameraFeedRef} onCameraEnabled={handleCameraEnabled} />
                    </div>
                    <div className="bottom-controls-wrapper">
                        <PersistentActions activeFeature={activeFeature as Feature} resultData={currentResultData} onAiAnalyze={handleGlobalAiAnalysis} />
                        <div className="central-input-bar" id="central-input-bar">
                            <div className="note-picker-container">
                                <button onClick={() => setIsNotePickerOpen(p => !p)} className="note-picker-btn" title="Use content from a note">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" /><path d="M7 11l5 5l5 -5" /><path d="M12 4l0 12" /></svg>
                                </button>
                                {isNotePickerOpen && (
                                    <div className="note-picker-dropdown">
                                        {notes.length > 0 ? notes.map(note => (
                                            <button key={note.id} onClick={() => applyNoteToPrompt(note)}>
                                                {note.title}
                                            </button>
                                        )) : <p className="p-4 text-sm text-center">No notes available.</p>}
                                    </div>
                                )}
                            </div>
                            <textarea
                                id="central-prompt-input"
                                value={promptInput}
                                onChange={(e) => setPromptInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(promptInput); } }}
                                placeholder={isAlwaysListening ? "Listening..." : placeholderText}
                                aria-label="Central prompt input"
                                rows={1}
                                disabled={!isOnboardingComplete}
                            />
                            <div className="input-buttons horizontal unified-mic input-buttons-flex">
                           <SavedBadge />
                                 <button
                                     id="mic-button"
                     onClick={(e) => handleUnifiedMicButton(e)}
                     onDoubleClick={() => { /* Explicit double-click finalize */ if (isListening) { const recognition = recognitionRef.current; if (recognition) { try { recognition.stop(); } catch(e) { console.warn('Double-click stop failed', e);} } } }}
                     onContextMenu={(e) => { e.preventDefault(); openMicZoom(); }}
                                     className={`mic-button unified ${isAlwaysListening ? 'always-on' : ''} ${isListening ? 'listening' : ''}`}
                     aria-label={promptInput.trim() ? 'Send message' : (isListening ? 'Click again or double-click to send' : (isAlwaysListening ? 'Disable always-on microphone' : 'Enable push-to-talk'))}
                     title={promptInput.trim() ? 'Send message' : (isListening ? 'Click again or double-click to send' : (isAlwaysListening ? 'Disable always-on microphone' : 'Enable push-to-talk'))}
                                     disabled={!isOnboardingComplete}
                                 >
                                    {isListening ? (
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>
                                        </svg>
                                    ) : (
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M12 2C13.1046 2 14 2.89543 14 4V12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12V4C10 2.89543 10.8954 2 12 2Z" fill="currentColor"/>
                                            <path d="M19 10V12C19 16.4183 15.4183 20 11 20H9C7.89543 20 7 20.8954 7 22C7 23.1046 7.89543 24 9 24H11C17.0751 24 22 19.0751 22 13V10C22 8.89543 21.1046 8 20 8C18.8954 8 18 8.89543 18 10H19Z" fill="currentColor"/>
                                            <path d="M5 10V12C5 16.4183 8.58172 20 13 20H15C16.1046 20 17 20.8954 17 22C17 23.1046 16.1046 24 15 24H13C6.92487 24 2 19.0751 2 13V10C2 8.89543 2.89543 8 4 8C5.10457 8 6 8.89543 6 10H5Z" fill="currentColor"/>
                                        </svg>
                                    )}
                                 </button>
                                 {promptInput.trim() && (
                                    <button
                                        onClick={() => handleSubmit(promptInput)}
                                        className="send-button"
                                        disabled={!isOnboardingComplete}
                                        aria-label="Send message"
                                        title="Send message"
                                    >
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" fill="currentColor"/>
                                        </svg>
                                    </button>
                                 )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="app-container" id="app-container">
                    <header className="app-header">
                        <div className="header-left">
                            <h1>Agent Lee Multi-Tool</h1>
                            <p>Classified Intelligence Hub</p>
                        </div>
                        <div className="header-right">
                            <ConversationCountdown remainingMs={remainingMs} percentElapsed={percentElapsed} isFlushing={isFlushing} onManualSave={manualSave} />
                        </div>
                    </header>

                    <div className="app-tabs-container" id="app-tabs-container">
                        <div className="app-tabs" role="tablist" aria-label="Main features">
                            {tabs.map(tab => {
                                const isActive = activeFeature === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => handleTabClick(tab.id as Feature)}
                                        className={`app-tab-btn ${isActive ? 'active' : ''}`}
                                        role="tab"
                                        {...(isActive ? { 'aria-selected': 'true' } : {})}
                                        aria-controls={`feature-panel-${tab.id}`}
                                        id={`feature-tab-${tab.id}`}
                                        aria-label={tab.label}
                                    >
                                        <img src={tab.icon} alt="" aria-hidden="true" draggable={false} />
                                    </button>
                                );
                            })}
                        </div>
                        {activeFeature === 'research' && (
                           <div className="research-mode-selector" role="group" aria-label="Research modes">
                               {researchModes.map(({ id, label, icon }) => {
                                   const isActiveMode = researchMode === id;
                                   return (
                                       <button
                                           key={id}
                                           type="button"
                                           onClick={() => setResearchMode(id)}
                                           className={`research-mode-btn ${isActiveMode ? 'active' : ''}`}
                                           {...(isActiveMode ? { 'aria-pressed': 'true' } : {})}
                                           aria-label={label}
                                       >
                                           <img src={icon} alt="" aria-hidden="true" draggable={false} />
                                       </button>
                                   );
                               })}
                           </div>
                        )}
                    </div>
                    
                    {['text', 'character'].includes(activeFeature) && <CharacterSelector />}

                    <main 
                        id={`feature-panel-${activeFeature}`}
                        role="tabpanel"
                        aria-labelledby={`feature-tab-${activeFeature}`}
                        className={`app-content-area ${['notepad', 'call', 'email', 'settings', 'character'].includes(activeFeature) ? 'no-surface' : ''}`}>
                         <Suspense fallback={<LoadingSpinner message={`Loading ${activeFeature} module...`} />}>
                            {renderFeature()}
                        </Suspense>
                    </main>
                </div>
                {isMicZoomed && (
                    <div className="mic-zoom-overlay" role="dialog" aria-modal="true" aria-label="Microphone detail view" onClick={closeMicZoom}>
                        <div className="mic-zoom-inner" onClick={(e) => e.stopPropagation()}>
                            <img src={images.macMillionMic} alt="Enlarged MacMillian microphone showing engraved name" />
                            <button className="mic-zoom-close" onClick={closeMicZoom} aria-label="Close microphone detail">×</button>
                            <p className="mic-zoom-caption">MacMillian Microphone – detail view (Press Esc to close)</p>
                        </div>
                    </div>
                )}
                 {isAnalysisModalOpen && (
                    <div className="ai-modal-backdrop" onClick={() => setIsAnalysisModalOpen(false)}>
                        <div className="ai-modal-content" onClick={(e) => e.stopPropagation()}>
                            <h2 className="text-2xl font-bold mb-4">AI Note Analysis</h2>
                            {isAnalysisLoading ? <LoadingSpinner message="Analyzing..." /> : 
                                <div className="prose max-w-none prose-invert" dangerouslySetInnerHTML={{ __html: mdToHtml(analysisModalContent) }}></div>
                            }
                            <button onClick={() => setIsAnalysisModalOpen(false)} className="mt-6 text-white px-4 py-2 rounded-md float-right">Close</button>
                        </div>
                    </div>
                 )}
            </div>
            <FlushPuckHost />
        </React.Fragment>
    );
};
    
const App: React.FC = () => {
    return (
        <NotepadProvider>
            <CharacterProvider>
                <AppContent />
            </CharacterProvider>
        </NotepadProvider>
    )
};

export default App;

/* Inline style augmentation for new flex container (could be moved to dedicated stylesheet) */
const styleEl = document.getElementById('app-inline-styles-flex');
if (!styleEl) {
    const s = document.createElement('style');
    s.id = 'app-inline-styles-flex';
    s.textContent = `.input-buttons-flex{display:flex;align-items:center;gap:.5rem}`;
    document.head.appendChild(s);
}