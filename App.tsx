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
import React, { Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
// Removed AgentOutput per request
// ApiKeyPrompt intentionally not auto-shown; keys are optional and set in Settings
import ApiKeyPrompt from './components/ApiKeyPrompt';
import CameraFeed, { CameraFeedHandle } from './components/CameraFeed';
import HealthBadge from './components/HealthBadge';
import InAppBrowser from './components/InAppBrowser';
import LoadingSpinner from './components/LoadingSpinner';
import MetallicBackground from './components/MetallicBackground';
import OfflineBanner from './components/OfflineBanner';
import PersistentActions from './components/PersistentActions';
import Researcher from './components/Researcher';
import TextGenerator from './components/TextGenerator';
import { CharacterContext, CharacterProvider } from './contexts/CharacterContext';
import { NotepadContext, NotepadProvider } from './contexts/NotepadContext';
import * as geminiService from './services/geminiService';
import { getSystemPrompt } from './services/systemPromptService';
// Autosave & storage layer
import { defaultLlmModuleUrls, defaultModelModuleUrls, loadOptionalModules } from './services/externalModuleLoader';
import * as ttsService from './services/ttsService'; // Import TTS Service
import { activateToolByIntent } from './src/agent/activateTool';
import type { Intent } from './src/agent/intent';
import { AgentLeeBehavior } from './src/agentlee.behavior';
import { finalizeSpokenOutput } from './src/agentlee.core'; // Use unified core sanitizer
import images from './src/assets/images';
import FlushPuckHost from './src/components/FlushPuckHost';
import SensorIntentBanner from './src/components/SensorIntentBanner';
import { DEFAULT_STUDIO_ORDER, STUDIOS, type StudioKey } from './src/config/studios';
import { useConversationAutosave } from './src/hooks/useConversationAutosave';
import { useStudioHotkeys } from './src/hooks/useStudioHotkeys';
import { receiptsLine } from './src/lib/agent/memoryReceipts';
import { mapFreeformReply } from './src/lib/agent/replyMapper';
import { emitConversationFlushed } from './src/lib/conversation/flush';
import memoryStore from './src/lib/memoryStore';
import { Autosave, buildSnapshot } from './src/lib/storage/autosave';
import type { SavedPayload } from './src/lib/storage/types';
import { addTurn as memAddTurn, retrieveContext as memRetrieve, upsertNote as memUpsert, proposeNoteFromRecent } from './src/memory/memoryStore';
import OnboardingWizard, { type OnboardingPayload } from './src/onboarding/OnboardingWizard';
import { seedLeeDocs } from './src/services/seedDocs';
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
const RecycleBinPanel = React.lazy(() => import('./components/RecycleBinPanel'));
const CharacterStudio = React.lazy(() => import('./components/CharacterStudio'));
const CreatorStudio = React.lazy(() => import('./components/ImageCharacterStudio'));
const OSControlPanel = React.lazy(() => import('./components/OSControlPanel'));

const ONBOARDING_STORAGE_KEY = 'lee.onboard.v11';

const STUDIO_FEATURE_MAP: Record<StudioKey, Feature> = {
    writers: 'text',
    dissect: 'analyze',
    creator: 'creator',
    dll: 'document',
    outreach: 'call',
    campaign: 'email',
    dbl: 'notepad',
    ta: 'settings',
    osc: 'oscontrol'
} as const;

const mergePinnedOrder = (selected?: StudioKey[]): StudioKey[] => {
    const seen = new Set<StudioKey>();
    const normalized: StudioKey[] = [];
    if (Array.isArray(selected)) {
        for (const key of selected) {
            if (STUDIOS[key as StudioKey] && !seen.has(key as StudioKey)) {
                const typedKey = key as StudioKey;
                seen.add(typedKey);
                normalized.push(typedKey);
            }
        }
    }
    for (const key of DEFAULT_STUDIO_ORDER) {
        if (!seen.has(key)) {
            seen.add(key);
            normalized.push(key);
        }
    }
    return normalized;
};

const loadOnboardingRecord = (): OnboardingPayload | null => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as OnboardingPayload;
        if (!parsed || typeof parsed !== 'object') return null;
        return {
            ts: parsed.ts || Date.now(),
            policy: parsed.policy,
            persona: parsed.persona,
            consent: {
                mic: Boolean(parsed.consent?.mic),
                cam: Boolean(parsed.consent?.cam),
            },
            pinned: mergePinnedOrder(parsed.pinned)
        };
    } catch {
        return null;
    }
};

const buildIntentForFeature = (feature: Feature, payload?: Record<string, unknown>): Intent | null => {
    const withPayload = (kind: Intent['kind']) => (payload ? { kind, payload } : { kind }) as Intent;
    switch (feature) {
        case 'text':
            return withPayload('WRITE_CONTENT');
        case 'analyze':
            return withPayload('ANALYZE_MEDIA');
        case 'creator':
            return withPayload('CREATE_IMAGE');
        case 'document':
            return withPayload('ANALYZE_DOC');
        case 'call':
            return withPayload('MAKE_CALL');
        case 'email':
            return withPayload('SEND_EMAIL');
        case 'notepad':
            return withPayload('OPEN_DBL');
        case 'settings':
            return withPayload('OPEN_TA');
        default:
            return null;
    }
};


// SpeechRecognition API interfaces for TypeScript
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    __LOCAL_ONLY__?: boolean;
  }
}

// Local-only fetch guard (runtime toggleable)
(() => {
    // Avoid double wrapping
    const w = window as any;
    if (w.__lee_fetch_wrapped) return;
    // Default to local-only on first run (user can disable in Settings/console)
    try { if (localStorage.getItem('local_only') === null) localStorage.setItem('local_only', 'true'); } catch {}
    const _fetch = window.fetch;
    window.fetch = async (input, init) => {
        try {
            const url = typeof input === 'string' ? input : (input instanceof URL ? input.href : (input as any).url);
            let isLocal = url.startsWith(location.origin) || url.startsWith('blob:') || url.startsWith('data:');
            // Allow localhost and 127.0.0.1 as local egress for bridges/tools
            if (!isLocal) {
                try {
                    const u = new URL(url, location.href);
                    if (u.hostname === '127.0.0.1' || u.hostname === 'localhost') {
                        isLocal = true;
                    }
                } catch { /* ignore */ }
            }
            // Effective flag: compile-time OR runtime (localStorage/local-only toggle)
            const runtimeLocalOnly = (localStorage.getItem('local_only') === 'true') || Boolean((window as any).__LOCAL_ONLY__);
            const effectiveLocalOnly = USE_LOCAL_ONLY || runtimeLocalOnly;
            if (effectiveLocalOnly && !isLocal) {
                const errorMessage = `Blocked egress in LOCAL_ONLY mode: ${url}`;
                console.error(errorMessage);
                throw new Error(errorMessage);
            }
        } catch {
            // fallthrough to original fetch
        }
        return _fetch(input as any, init);
    };
    w.__lee_fetch_wrapped = true;
})();


// FIX: All state and logic have been moved into AppContent to fix scope issues.
// AppContent is now rendered within NotepadProvider, allowing it to use the context.
const AppContent: React.FC = () => {
    const [activeFeature, setActiveFeature] = useState<Feature>('research');
    const [promptInput, setPromptInput] = useState('');
    const [systemInstruction, setSystemInstruction] = useState<string>(() => {
        try { return getSystemPrompt(); } catch { return ''; }
    });
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [documentFile, setDocumentFile] = useState<File | null>(null);

    const metricsUrl = useMemo(() => {
        if (typeof window === 'undefined') return '';
        const cfg = (window as any).AGENTLEE_CONFIG || {};
        if (cfg.OPS_METRICS_URL) return String(cfg.OPS_METRICS_URL);
        if (cfg.CHAT_PROXY_URL) {
            try {
                const parsed = new URL(String(cfg.CHAT_PROXY_URL));
                return `${parsed.protocol}//${parsed.host}/ops/metrics`;
            } catch {
                return '';
            }
        }
        return '';
    }, []);
    
    // Agent Lee States
    const [agentState, setAgentState] = useState<AgentState>('idle');
    const agentStateRef = useRef(agentState);
    const [isListening, setIsListening] = useState(false);
    const [isAlwaysListening, setIsAlwaysListening] = useState(false);
    const isAlwaysListeningRef = useRef(isAlwaysListening);
    isAlwaysListeningRef.current = isAlwaysListening;
    useEffect(() => { agentStateRef.current = agentState; }, [agentState]);
    
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
    const [onboardingRecord, setOnboardingRecord] = useState<OnboardingPayload | null>(() => loadOnboardingRecord());
    const [showOnboarding, setShowOnboarding] = useState(() => loadOnboardingRecord() === null);
    const isOnboardingComplete = Boolean(onboardingRecord);
    const [placeholderText, setPlaceholderText] = useState('Awaiting orders...');
    const [userName, setUserName] = useState<string | null>(() => localStorage.getItem('userName'));
    
    // Keys are optional; never block onboarding/UI on missing keys
    const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false);
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
    
    // NEW: Header button states
    const [showCharacterStudio, setShowCharacterStudio] = useState(false);
    const [showCameraFeed, setShowCameraFeed] = useState(false);
    const [showConversationHistory, setShowConversationHistory] = useState(false);
    const [showRecycleBin, setShowRecycleBin] = useState(false);
    
    const micHoverTimerRef = useRef<number | null>(null);
    const openMicZoom = useCallback((log: boolean = true) => { setIsMicZoomed(true); if (log) appendToLog('SYSTEM', '[System: Microphone detail view opened]'); }, []);
    const closeMicZoom = useCallback(() => { if (micHoverTimerRef.current) { window.clearTimeout(micHoverTimerRef.current); micHoverTimerRef.current = null; } setIsMicZoomed(false); appendToLog('SYSTEM', '[System: Microphone detail view closed]'); }, []);
    useEffect(() => { if (!isMicZoomed) return; const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeMicZoom(); }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler); }, [isMicZoomed, closeMicZoom]);


    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Position 2 toggles: avatar and camera can be on simultaneously
    const [pos2AvatarOn, setPos2AvatarOn] = useState(false);
    const [pos2CameraOn, setPos2CameraOn] = useState(false);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const cameraStreamRef = useRef<MediaStream | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);

    const stopCamera = useCallback(() => {
        const s = cameraStreamRef.current;
        if (s) {
            s.getTracks().forEach(t => t.stop());
            cameraStreamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);

    const startCamera = useCallback(async () => {
        if (cameraStreamRef.current) return;
        try {
            const s = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false,
            });
            cameraStreamRef.current = s;
            if (videoRef.current) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (videoRef.current as any).srcObject = s;
            }
            setCameraError(null);
        } catch (e: any) {
            console.error('Camera error:', e);
            setCameraError('Camera unavailable');
        }
    }, []);

    // Start/stop camera based on camera toggle
    useEffect(() => {
        if (pos2CameraOn) startCamera(); else stopCamera();
    }, [pos2CameraOn, startCamera, stopCamera]);

    // Clean up camera on visibility hide/unload
    useEffect(() => {
        const onVis = () => { if (document.hidden) stopCamera(); };
        window.addEventListener('visibilitychange', onVis);
        window.addEventListener('beforeunload', stopCamera);
        return () => {
            window.removeEventListener('visibilitychange', onVis);
            window.removeEventListener('beforeunload', stopCamera);
            stopCamera();
        };
    }, [stopCamera]);

    // Boot Notepad OS once
    useEffect(() => {
    memoryStore.init({ recycleDays: 7 });
    // Seed Markdown docs into the LEE drive (idempotent)
    seedLeeDocs().catch(() => {});
    // Try to load optional browser-based LLM modules if present under /llm-modules or /models
    // This is safe if files are missing; it will log a warning and continue.
    const urls = [...defaultLlmModuleUrls(), ...defaultModelModuleUrls('/models')];
    loadOptionalModules(urls).catch(() => {});
    }, []);
    const [researchMode, setResearchMode] = useState<ResearchMode>('general');

    const cameraFeedRef = useRef<CameraFeedHandle>(null);
    // Expose camera feed handle globally for tool access (camera.analyze_frame)
    useEffect(() => { (window as any).__cameraFeedHandle = cameraFeedRef.current; }, [cameraFeedRef.current]);
    
    // Refs for new voice interaction system
    const chatRef = useRef<Chat | null>(null);
    const recognitionRef = useRef<any>(null);
    const recognitionActiveRef = useRef(false);
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
    
    // Restore any previous snapshot on mount & attach network listener
    useEffect(() => {
        Autosave.attachNetworkListener();
        const restored = Autosave.restore();
        if (restored?.content && typeof restored.content === 'object') {
            try {
                const data: any = restored.content;
                if (data.promptInput) setPromptInput(data.promptInput);
                setResults((prev: typeof results) => ({
                    ...prev,
                    text: typeof data.text === 'string' ? data.text : prev.text,
                    research: data.research && typeof data.research === 'object' ? data.research : prev.research,
                    images: Array.isArray(data.images) ? data.images : prev.images,
                    analyze: typeof data.analyze === 'string' ? data.analyze : prev.analyze,
                    document: typeof data.document === 'string' ? data.document : prev.document,
                }));
                if (typeof (restored as any).content?.activeNoteId === 'number') setActiveNoteId((restored as any).content.activeNoteId);
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
    
    interface TabMeta {
        id: Feature;
        label: string;
        short: string;
        icon: string;
        pinned: boolean;
        toolKey?: StudioKey;
    }

    const studioOrder = useMemo(() => mergePinnedOrder(onboardingRecord?.pinned), [onboardingRecord]);

    const studioTabs: TabMeta[] = useMemo(() => {
        return studioOrder.map((studioKey) => {
            const feature = STUDIO_FEATURE_MAP[studioKey];
            const studio = STUDIOS[studioKey];
            return {
                id: feature,
                label: studio.label,
                short: studio.short,
                icon: studio.icon,
                pinned: Boolean(onboardingRecord?.pinned?.includes(studioKey)),
                toolKey: studioKey,
            };
        });
    }, [studioOrder, onboardingRecord]);

    const tabs: TabMeta[] = useMemo(() => {
        const baseTabs: TabMeta[] = [
            { id: 'research', label: 'Research', short: 'Research', icon: images.tabs.research, pinned: false },
        ];
        return [...baseTabs, ...studioTabs];
    }, [studioTabs]);
    
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

    // Policy: correct tool selection when LLM prose mentions wrong tools or forgets to emit actions
    const applyToolCorrectionPolicy = (text: string, lastUserPrompt: string): { text: string; actions: AgentAction[] } => {
        let corrected = text;
        const actions: AgentAction[] = [];

        // If the agent talks about creating images/logos/graphics, we must route to Creator (Image Studio)
        const imageKeywords = /(logo|image|graphic|icon|banner|illustration|artwork|poster|flyer|thumbnail|favicon|cover|visual|picture)/i;
        if (imageKeywords.test(text)) {
            // Soft-correct prose: replace "Writer tool" with "Creator Image Studio"
            corrected = corrected.replace(/Writer\s+tool/ig, 'Creator Image Studio');
            corrected = corrected.replace(/Writer\s+Studio/ig, 'Creator Image Studio');
            // Add navigate action to Creator, with follow-up prompt from the user's last request
            const follow = lastUserPrompt?.trim() || '';
            actions.push({ name: 'navigate', params: { tab: 'creator', followUpPrompt: follow } });
            // If the user prompt clearly requests creation, schedule generation too
            const createKeywords = /(create|generate|design|make|draft|produce)/i;
            if (createKeywords.test(lastUserPrompt)) {
                actions.push({ name: 'generate_image', params: { prompt: lastUserPrompt } });
            }
        }

        return { text: corrected, actions };
    };

    // Router: convert high-level AssistPlan to internal actions (navigate, generate_image, say)
    const planToActions = (plan: any, userPrompt: string): AgentAction[] => {
        const actions: AgentAction[] = [];
        const studioToTab: Record<string, Feature | 'hash'> = {
            creator: 'creator',
            imageEdit: 'creator', // editor mode lives under creator
            writers: 'text',
            research: 'research',
            documentAnalyzer: 'document',
            communication: 'call',
            diagnostics: 'settings',
            planner: 'text',
            notepad: 'notepad',
            drives: 'hash',
            showcase: 'creator',
        };
        for (const step of plan.steps) {
            if (step.say) actions.push({ name: 'say', params: { text: step.say } });
            const tab = studioToTab[step.studio];
            if (tab === 'hash') {
                actions.push({ name: 'navigate_hash', params: { hash: '#/drives' } });
            } else if (tab) {
                actions.push({ name: 'navigate', params: { tab, followUpPrompt: userPrompt } });
            }
            if (step.intent.startsWith('image.generate') || step.intent.startsWith('logo.generate') || step.intent.startsWith('flyer.layout')) {
                actions.push({ name: 'generate_image', params: { prompt: userPrompt } });
            }
        }
        return actions;
    };
    
    // NEW: Robust function to handle auto image generation
    const handleAutoImageGeneration = async (prompt: string) => {
        const intent = buildIntentForFeature('creator', { prompt });
        if (intent) {
            await activateToolByIntent(intent);
        } else {
            setActiveFeature('creator');
        }
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
                snapshotResult('creator');
            }

            // Notify image creation to any listeners
            try {
                window.dispatchEvent(new CustomEvent('creator:image:generate', { detail: { prompt, result: imageResult } }));
            } catch (dispatchError) {
                console.warn('Failed to dispatch creator:image:generate event:', dispatchError);
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


    const executeAgentAction = async (action: AgentAction) => {
        console.log("Executing agent action:", action);
        switch(action.name) {
            case 'say': {
                const text = action.params?.text as string;
                if (text) {
                    setAgentState('speaking');
                    await ttsService.speak(finalizeSpokenOutput(text), () => {}, () => setAgentState('idle'));
                }
                return;
            }
            case 'image.generate': {
                if (action.params.prompt) {
                    appendToLog('SYSTEM', `[System: (tool) Generating image: "${action.params.prompt}"]`);
                    await handleAutoImageGeneration(action.params.prompt);
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
                    const resolvedTab: Feature = requestedTab === 'image' ? 'creator' : requestedTab;
                    const intentPayload = action.params.followUpPrompt ? { prompt: action.params.followUpPrompt } : undefined;
                    const intent = buildIntentForFeature(resolvedTab, intentPayload);
                    if (intent) {
                        await activateToolByIntent(intent);
                    } else if (tabs.some(t => t.id === resolvedTab)) {
                        handleTabClick(resolvedTab);
                    }
                    appendToLog('SYSTEM', `[System: Agent Lee is navigating to the ${resolvedTab} tab.]`);
                    if (action.params.followUpPrompt) {
                        setPromptInput(action.params.followUpPrompt);
                        setIsAutoSubmitting(true); // Trigger auto-submission
                    }
                }
                break;
            }
            case 'navigate_hash': {
                const hash = action.params?.hash as string;
                if (hash) {
                    window.location.hash = hash;
                    appendToLog('SYSTEM', `[System: Navigating to ${hash}]`);
                }
                return;
            }
            case 'generate_image':
                if (action.params.prompt) {
                    appendToLog('SYSTEM', `[System: Agent Lee is generating an image with prompt: "${action.params.prompt}"]`);
                    await handleAutoImageGeneration(action.params.prompt);
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
                const callIntent = buildIntentForFeature('call', targetNumber ? { phone: targetNumber } : undefined);
                if (callIntent) {
                    await activateToolByIntent(callIntent);
                }
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

    const toggleCameraSlot = useCallback(() => {
        setPos2CameraOn(prev => {
            if (prev) {
                return false;
            }
            if (!onboardingRecord?.consent?.cam) {
                setCameraError('Camera consent not granted. Update access inside Toning & Adjustments.');
                appendToLog('SYSTEM', '[System: Camera activation blocked until you allow camera access in Toning & Adjustments.]');
                return prev;
            }
            setCameraError(null);
            return true;
        });
    }, [appendToLog, onboardingRecord]);

    useEffect(() => {
        if (!onboardingRecord) {
            setPlaceholderText('Awaiting orders...');
            return;
        }
        setPlaceholderText(`Agent Lee · ${onboardingRecord.persona} persona ready.`);
        if (!onboardingRecord.consent?.mic && isAlwaysListeningRef.current) {
            setIsAlwaysListening(false);
        }
        if (!onboardingRecord.consent?.cam) {
            setPos2CameraOn(false);
            setShowCameraFeed(false);
        }
    }, [onboardingRecord]);

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
            // Swallow silently; local model may still be loading.
            return true;
        }
        return false;
    };

    // Unified mic/send button behavior (+ alt/meta opens zoom)
    const handleUnifiedMicButton = (e?: React.MouseEvent) => {
        if (e && (e.altKey || e.metaKey)) {
            if (isMicZoomed) closeMicZoom(); else openMicZoom();
            return;
        }
        if (e && e.detail > 1) {
            return;
        }
        const trimmed = promptInput.trim();
        // 1. If there's text, treat as send
        if (trimmed.length > 0 && !isSubmitDisabled) {
            handleSubmit(promptInput);
            return;
        }
        if (!isOnboardingComplete) return;

        if (!isAlwaysListeningRef.current && !(onboardingRecord?.consent?.mic)) {
            appendToLog('SYSTEM', '[System: Microphone activation blocked until you allow mic access in Toning & Adjustments.]');
            return;
        }

        if (!isAlwaysListeningRef.current) {
            setIsAlwaysListening(true);
            appendToLog('SYSTEM', "[System: Always-on microphone enabled. I\'m listening.]");
            sessionModeRef.current = false;
            // Immediately allow speech without wake word for this session
            wakeActiveRef.current = true;
            clearSilenceTimer();
            const recognition = recognitionRef.current;
            if (recognition && agentStateRef.current === 'idle' && !isListening && !recognitionActiveRef.current) {
                try {
                    recognitionActiveRef.current = true;
                    recognition.start();
                } catch (err) {
                    recognitionActiveRef.current = false;
                    console.warn('Failed to start always-on listening immediately:', err);
                }
            }
            return;
        }

        setIsAlwaysListening(false);
        appendToLog('SYSTEM', '[System: Always-on microphone disabled.]');
        wakeActiveRef.current = false;
        sessionModeRef.current = false;
        clearSilenceTimer();
        const recognition = recognitionRef.current;
        if (recognition && recognitionActiveRef.current) {
            try {
                recognition.stop();
            } catch (err) {
                console.warn('Failed to stop recognition after disabling always-on:', err);
            }
        }
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
        if (!onboardingRecord?.consent?.mic) {
            appendToLog('SYSTEM', '[System: Push-to-talk blocked until you allow microphone access in Toning & Adjustments.]');
            return;
        }
        // Do not start if already listening (either session or always-on)
    if (isListening || isAlwaysListeningRef.current || recognitionActiveRef.current) return;
        const recognition = recognitionRef.current;
        if (!recognition) return;
        sessionModeRef.current = true;
        ttsService.cancel();
        try {
            lastSpeechTimeRef.current = Date.now();
            scheduleSilenceTimer();
            recognitionActiveRef.current = true;
            recognition.start();
        } catch (e) {
            console.warn('Failed to start push-to-talk session:', e);
            sessionModeRef.current = false;
            recognitionActiveRef.current = false;
        }
    };

    const finalizePushToTalkSession = () => {
        const recognition = recognitionRef.current;
        if (!sessionModeRef.current || !recognition) return;
        clearSilenceTimer();
        // Stopping recognition will trigger onend handler which submits the transcript
        try {
            if (recognitionActiveRef.current) {
                recognition.stop();
            }
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
            let { cleanedText, actions } = parseAgentActions(fullResponse);
            // High-level intent routing: compute tool chain and merge actions first
            try {
                const behavior = new AgentLeeBehavior();
                const plan = behavior.plan(transcript);
                const routed = planToActions(plan, transcript);
                if (routed.length) actions = [...routed, ...actions];
            } catch (e) {
                console.warn('Routing plan failed:', e);
            }
            // Enforce tool policy for cases where LLM used prose instead of actions
            const policy = applyToolCorrectionPolicy(cleanedText, transcript);
            cleanedText = policy.text;
            if (policy.actions.length) actions = [...actions, ...policy.actions];
            
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
            // Archive this Q/A pair into Notepad OS (LEE drive)
            try {
                const title = `Q: ${transcript.substring(0, 64)}…`;
                const utterance = `USER: ${transcript}\n\nAGENT: ${cleanedText}`;
                await memoryStore.createTask(title, { utterance, tags: ['conversation','LEE'] }, { drive: 'LEE' });
            } catch (e) {
                console.warn('Failed to archive conversation to LEE drive', e);
            }
            setAgentState('speaking');
            const cleanResponseForSpeech = finalizeSpokenOutput(cleanedText);
            await ttsService.speak(
                cleanResponseForSpeech,
                () => {}, // onBoundary
                () => { 
                    setAgentState('idle'); 
                    // Step 6: Execute actions after speech is complete
                    if (actions.length > 0) {
                        void (async () => {
                            for (const action of actions) {
                                await executeAgentAction(action);
                            }
                        })();
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
        let cancelled = false;
        const waitForLocal = async (msTotal = 10000, interval = 250) => {
            const start = Date.now();
            while (!cancelled && Date.now() - start < msTotal) {
                if (geminiService.hasLocalModel()) return true;
                await new Promise(r => setTimeout(r, interval));
            }
            return geminiService.hasLocalModel();
        };
        (async () => {
            // Wait for local model modules; do not show any modal during this period
            await waitForLocal();
            try {
                if (cancelled) return;
                chatRef.current = geminiService.createChat(userName || 'Operator');
                setShowApiKeyPrompt(false);
                setApiKeyError(null);
            } catch (error: any) {
                // If still missing API key and no local model, keep UI usable; no modal
                if (error?.message !== 'MISSING_API_KEY') {
                    console.error('Error initializing chat:', error);
                    setError('Failed to initialize chat service');
                }
            }
        })();
        return () => { cancelled = true; };
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
            recognitionActiveRef.current = true;
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
            recognitionActiveRef.current = false;
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
            recognitionActiveRef.current = false;
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
        if (isAlwaysListening && agentState === 'idle' && !recognitionActiveRef.current) {
            ttsService.cancel();
            try {
                recognitionActiveRef.current = true;
                recognition.start();
            } catch (e) {
                recognitionActiveRef.current = false;
                console.warn('Failed to start always-on recognition loop:', e);
            }
        } 
        // Condition to STOP listening:
        // 1. User has disabled "always on" mode.
        else if (!isAlwaysListening && recognitionActiveRef.current) {
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
            targetFeature = 'creator';
        }

        setActiveFeature(targetFeature);
        const payload = note.content.type === 'image' ? { prompt: note.content.prompt } : undefined;
        const intent = buildIntentForFeature(targetFeature, payload);
        if (intent) {
            void activateToolByIntent(intent);
        }
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
                if (['character', 'creator'].includes(activeFeature) && currentResultData.imageUrl) {
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

    useStudioHotkeys((feature: Feature) => {
        if (!isOnboardingComplete) return;
        const intent = buildIntentForFeature(feature);
        if (intent) {
            return activateToolByIntent(intent);
        }
        handleTabClick(feature);
    });

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
    body { background: #000; }
    .metallic-background-layer { position: fixed; inset: 0; z-index: -5; pointer-events: none; }
    .metallic-background-canvas { width: 100vw; height: 100vh; display: block; }
    body.theme-onyx-gold { --bg-gradient: linear-gradient(135deg, #121212 0%, #000000 100%); --text-primary: #f0f0f0; --text-secondary: #D4AF37; --border-color: #D4AF37; --accent-bg: #D4AF37; --accent-text: #121212; }
    body.theme-midnight { --bg-gradient: linear-gradient(135deg, #1a202c 0%, #2d3748 100%); --text-primary: #e2e8f0; --text-secondary: #63b3ed; --border-color: #4a5568; --accent-bg: #63b3ed; --accent-text: #1a202c; }
    body.theme-slate { --bg-gradient: linear-gradient(135deg, #334155 0%, #475569 100%); --text-primary: #f1f5f9; --text-secondary: #a78bfa; --border-color: #64748b; --accent-bg: #a78bfa; --accent-text: #1e293b; }
    body.theme-nebula { --bg-gradient: linear-gradient(135deg, #4c1d95 0%, #5b21b6 100%); --text-primary: #f5f3ff; --text-secondary: #f472b6; --border-color: #7c3aed; --accent-bg: #f472b6; --accent-text: #4c1d95; }
    .leeway-multitool-wrapper { width: 100%; height: 100%; background: transparent; display: flex; flex-direction: row; gap: 1rem; align-items: stretch; padding: 1rem; color: var(--text-primary); font-family: 'Inter', sans-serif; overflow-x: hidden; overflow-y: auto; position: relative; }
    .logo-watermark { position: absolute; top: 1rem; left: 1rem; z-index: 10; opacity: 0.55; transition: opacity 0.3s ease; pointer-events: none; }
    .logo-watermark img { width: 70px; height: 70px; object-fit: contain; filter: brightness(0.85) drop-shadow(0 0 12px rgba(212, 175, 55, 0.45)); }
    .logo-watermark:hover { opacity: 0.85; }
    .left-pane { width: 30%; flex-shrink: 0; display: flex; flex-direction: column; gap: 1rem; }
    .top-info-wrapper { flex-shrink: 0; }
    .app-container { flex-grow: 1; background: rgba(10, 10, 10, 0.26); border-radius: 1rem; padding: 1.5rem; box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18); border: 1px solid rgba(212, 175, 55, 0.2); display: flex; flex-direction: column; min-height: 0; position: relative; backdrop-filter: blur(6px); }
    .top-banner-header { 
        --banner-h: 84px;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 1000;
        display: flex; 
        align-items: center; 
        justify-content: space-between; 
        padding: 0.75rem 2rem;
        background: #000000;
        border-bottom: 1px solid #333;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.8);
        height: var(--banner-h);
    }
    .header-left {
        display: flex;
        align-items: center;
        flex: 1;
    }
    .header-logo {
        width: 70px;
        height: 70px;
        object-fit: contain;
        filter: brightness(1.3) contrast(1.1) drop-shadow(0 0 20px rgba(212, 175, 55, 0.8));
    }
    .header-center {
        display: flex;
        align-items: center;
        justify-content: center;
        flex: 1;
    }

    /* Recycle Bin Drawer */
    .recycle-bin-drawer {
        position: fixed;
        left: 0; right: 0;
        bottom: 20vh;
        margin-left: auto; margin-right: auto;
        max-width: 56rem; /* ~max-w-3xl */
        background: rgba(0,0,0,0.9);
        -webkit-backdrop-filter: blur(6px);
        backdrop-filter: blur(6px);
        border: 1px solid #374151; /* gray-700 */
        border-bottom: none;
        border-top-left-radius: 0.75rem;
        border-top-right-radius: 0.75rem;
        box-shadow: 0 20px 45px rgba(0,0,0,0.6);
        z-index: 40;
    }
    .recycle-bin-scroll {
        max-height: 30vh;
        overflow-y: auto;
    }
    .branding {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        height: calc(var(--banner-h) - 10px);
        padding: 0.35rem 1.5rem;
        overflow: hidden;
        transition: filter 0.4s ease;
    }
    .branding img {
        display: block;
        height: 100%;
        width: auto;
        object-fit: contain;
    }
    .branding::before {
        content: '';
        position: absolute;
        inset: 0.2rem 0.75rem;
        border-radius: 999px;
        background: radial-gradient(circle, rgba(72, 255, 182, 0.45) 0%, rgba(72, 255, 182, 0.15) 40%, rgba(0, 0, 0, 0) 72%);
        opacity: 0;
        transform: scale(0.85);
        transition: opacity 0.45s ease, transform 0.45s ease;
        pointer-events: none;
    }
    .branding.branding-online::before {
        opacity: 1;
        transform: scale(1);
    }
    .branding.branding-online {
        filter: drop-shadow(0 0 18px rgba(72, 255, 182, 0.45));
    }
    .header-right {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex: 1;
        justify-content: flex-end;
    }
    .header-metrics {
        display: flex;
        align-items: center;
    }
    /* Header pure-image buttons (for #1/#2) */
    .image-btn{ width:36px; height:36px; padding:0; margin:0; border:none; background:none; cursor:pointer; display:block; border-radius:8px; overflow:hidden; }
    .image-btn img{ width:100%; height:100%; display:block; object-fit:cover; }
    .image-btn[aria-pressed="true"]{ outline:2px solid var(--border-color); outline-offset:2px; border-radius:8px; }
    .mac-million-btn:hover {
        box-shadow: 0 4px 20px rgba(212, 175, 55, 0.4);
    }
    .leeway-multitool-wrapper {
        padding-top: calc(var(--banner-h) + 32px); /* Extra space for fixed header */
    }
    .top-info-wrapper {
        width: 100%;
        height: auto;
        min-height: 0;
        display: block;
        padding: 0;
    }
    .agent-avatar-simple {
        width: 100%;
        height: auto;
        display: block;
        padding: 0;
        text-align: center;
        margin: 0 auto;
    }
    .avatar-image {
        width: 100%;
        max-width: clamp(360px, 45vw, 520px);
        max-height: min(65vh, 620px);
        height: auto;
        object-fit: contain;
        border-radius: 12px;
        filter: drop-shadow(0 8px 25px rgba(0, 0, 0, 0.6));
        cursor: default;
        transition: none;
        margin: 0 auto;
        display: inline-block;
    }
    .avatar-image:hover {
        transform: scale(1.01);
        filter: drop-shadow(0 10px 30px rgba(0, 0, 0, 0.7));
    }
    .mac-million-mic {
        background: transparent !important;
        border: none !important;
        border-radius: 50% !important;
        padding: 0 !important;
        width: var(--mic-diameter) !important;
        height: var(--mic-diameter) !important;
        max-width: 100% !important;
        max-height: 100% !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        line-height: 0 !important;
        box-sizing: border-box !important;
        aspect-ratio: 1 / 1 !important;
    }
    .mac-mic-image {
        width: 100% !important;
        height: 100% !important;
        object-fit: contain !important;
        filter: none !important;
        display: block !important;
    }
    .mac-million-mic:hover {
        border-color: rgba(212, 175, 55, 0.6) !important;
        background: rgba(212, 175, 55, 0.2) !important;
        box-shadow: 0 0 20px rgba(212, 175, 55, 0.4) !important;
    }
    .mac-million-mic.listening {
        background: rgba(212, 55, 55, 0.2) !important;
        border-color: rgba(212, 55, 55, 0.5) !important;
        animation: pulse-red 1.5s infinite !important;
    }
    .mac-million-mic.always-on {
        box-shadow: 0 0 15px rgba(212, 175, 55, 0.6) !important;
    }
    .mac-mic-image {
        width: 100% !important;
        height: 100% !important;
        object-fit: contain !important;
        filter: brightness(1.1) drop-shadow(0 0 8px rgba(212, 175, 55, 0.5)) !important;
    }
    .app-tabs-container { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 0.75rem; padding: 0.25rem 0; background: transparent; border-radius: 0.9rem; border: none; box-shadow: none; backdrop-filter: none; }
    .app-tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.4rem; border-bottom: none; padding-bottom: 0.35rem; }
    .app-tab-btn { padding: 0.35rem; border: 0; border-radius: 0; cursor: pointer; position: relative; display: flex; overflow: hidden; background: none; width: 100%; line-height: 0; aspect-ratio: 1 / 1; align-items: center; justify-content: center; }
    .app-tab-btn img { width: 100%; height: 100%; display: block; border-radius: inherit; object-fit: contain; }
    .app-tab-btn.active img { box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.6); }
    .app-tab-btn:focus-visible { outline: 2px solid rgba(212, 175, 55, 0.9); outline-offset: 4px; }
    .app-content-area { border-radius: 0.75rem; flex-grow: 1; display: flex; flex-direction: column; overflow: hidden; backdrop-filter: blur(4px); }
    .app-content-area:not(.no-surface) { background: rgba(15, 15, 15, 0.26); color: var(--surface-text); padding: 1.5rem; border: 1px solid rgba(212, 175, 55, 0.18); box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.3); }
    .research-mode-selector { display: flex; align-items: center; gap: 0.5rem; padding-bottom: 0.85rem; justify-content: flex-start; flex-wrap: nowrap; overflow-x: auto; }
    .research-mode-btn { border: 0; padding: 0; cursor: pointer; position: relative; overflow: hidden; display: flex; background: none; line-height: 0; border-radius: 10px; align-items: center; justify-content: center; flex: 0 0 auto; width: 84px; height: 84px; }
    .research-mode-btn img { display: block; width: 100%; height: 100%; border-radius: inherit; object-fit: contain; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); border: 0; white-space: nowrap; }
    .research-mode-btn::after { content: none; }
    .research-mode-btn.active img { box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.6); }
    .research-mode-btn:focus-visible { outline: 2px solid rgba(212, 175, 55, 0.9); outline-offset: 4px; }
    .is-hidden{ display:none !important; }
    :root{ --rail-h: 64px; --rail-radius: 12px; --mic-scale: 6.5; --mic-diameter: calc(var(--rail-h) * var(--mic-scale)); }
    @media (max-width: 1400px) { :root{ --mic-scale: 5.4; } }
    @media (max-width: 1200px) { :root{ --mic-scale: 4.2; } }
    .bottom-controls-wrapper { display: flex; flex-direction: column; gap: 0.75rem; margin-top: auto; flex-shrink: 0; }
    /* Gold rail container */
    .central-input-bar{ display:grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items:center; gap:.75rem; padding:.75rem 1rem; background:rgba(16,16,16,0.46); border:1px solid rgba(212, 175, 55, 0.25); border-radius: var(--rail-radius); min-height: calc(var(--mic-diameter) + 16px); box-shadow: 0 12px 26px rgba(0,0,0,0.28); backdrop-filter: blur(6px); }
    .central-input-bar textarea { width:100%; min-height: max(var(--rail-h), calc(var(--mic-diameter) * 0.55)); max-height: var(--mic-diameter); background:rgba(34,34,34,0.5); color:#f9fafb; border: 1px solid rgba(212, 175, 55, 0.22); border-radius:10px; padding:.6rem .9rem; font-size: 1rem; resize: none; line-height: 1.45; backdrop-filter: blur(4px); }
    .central-input-bar textarea::placeholder { color: #d4af37a0; }
    .central-input-bar textarea:focus { outline: none; box-shadow: 0 0 0 2px var(--border-color); }
    .input-buttons { display: contents; }
    .input-buttons.horizontal { display: contents; }
    .input-buttons button, .note-picker-btn { border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease; }
    .input-buttons button.mic-button { width: var(--mic-diameter); height: var(--mic-diameter); background-color: #444; color: white; border:1px solid var(--lee-gold-2); box-shadow:0 0 0 1px rgba(202,162,74,.15) inset; border-radius: 50%; flex: 0 0 var(--mic-diameter); overflow: hidden; position: relative; }
    .input-buttons button.mic-button.always-on { box-shadow: 0 0 8px 2px rgba(212, 175, 55, 0.8); }
    .input-buttons button.mic-button.listening { background-color: #d43737; animation: pulse-red 1.5s infinite; box-shadow: none; }
    .input-buttons button.send-button { width:44px; height:44px; background-color: #22c55e; color: white; }
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

            /* Position 2 square left slot equal to mic size */
            :root{ --lee-gold-2:#8c6a18; }
            .left-slot{ min-width: var(--rail-h); height: var(--rail-h); display:flex; align-items:center; justify-content:flex-start; gap:.35rem; padding-left:0; flex:0 0 auto; transition:width .12s ease; overflow:hidden; border-radius:8px; }
            .left-slot.left-slot--empty{ width:0; min-width:0; height:0; gap:0; overflow:hidden; }
            .pos2-square{ width:var(--rail-h); height:var(--rail-h); border-radius:.5rem; overflow:hidden; display:block; position:relative; cursor:pointer; background:#000; border:1px solid var(--lee-gold-2); box-shadow:0 0 0 1px rgba(202,162,74,.15) inset; }
            .pos2-square img, .pos2-square video{ width:100%; height:100%; object-fit:cover; display:block; }
            .camera-error-inline{ position:absolute; inset:0; display:grid; place-items:center; color:#d9c58a; background:rgba(0,0,0,.5); font-size:12px; }
    
    /* --- Responsive Design for Mobile & Tablet --- */
    @media (max-width: 960px) {
        :root{ --mic-scale: 1.85; }
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
            padding-bottom: calc(var(--mic-diameter) + 120px); /* Ensure full input rail stays in view */
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
            gap: 0.5rem;
        }

        .research-mode-btn {
            width: 84px;
            height: 84px;
        }
        
        .research-mode-btn img {
            width: 100%;
            height: 100%;
        }
        
        .app-tabs {
            grid-template-columns: repeat(3, 1fr);
            gap: 0.75rem;
        }
        
        .app-tab-btn {
            min-height: 0;
            aspect-ratio: 1 / 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0.3rem;
        }
        .app-tab-btn img {
            width: 100%;
            height: 100%;
        }
        
        /* Fix bottom controls and input */
        .bottom-controls-wrapper {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 1000;
            background: linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.65) 65%, rgba(0,0,0,0.2) 100%);
            padding: 0.75rem 1rem 0.75rem 1rem;
            padding-left: calc(1rem + env(safe-area-inset-left, 0rem));
            padding-right: calc(1rem + env(safe-area-inset-right, 0rem));
            padding-bottom: calc(0.75rem + env(safe-area-inset-bottom, 0rem));
            border-top: 1px solid rgba(212, 175, 55, 0.22);
            box-shadow: 0 -2px 10px rgba(0,0,0,0.18);
            height: auto;
            overflow: visible;
        }

        .central-input-bar {
            gap: 0.65rem;
            padding: 0.65rem 0.85rem;
            min-height: calc(var(--mic-diameter) + 12px);
            background: rgba(16,16,16,0.46);
            border: 1px solid rgba(212, 175, 55, 0.25);
            box-shadow: 0 10px 24px rgba(0,0,0,0.3);
            backdrop-filter: blur(6px);
        }

        .central-input-bar textarea {
            min-height: max(56px, calc(var(--mic-diameter) * 0.45));
            max-height: var(--mic-diameter);
            font-size: 16px; /* Prevent zoom on iOS */
            background: rgba(34,34,34,0.52);
            border: 1px solid rgba(212, 175, 55, 0.22);
            color: #fff;
            overflow-y: auto;
            backdrop-filter: blur(4px);
        }

        /* Fix microphone button sizing */
        .input-buttons button:not(.mic-button), .note-picker-btn {
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
            gap: 0.65rem;
        }
    }

    @media (max-width: 768px) {
        :root{ --mic-scale: 1.65; }
    }

    @media (max-width: 480px) {
        :root{ --mic-scale: 1.45; }
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
            width: 76px;
            height: 76px;
        }
        
        .research-mode-btn img {
            width: 100%;
            height: 100%;
        }
        
        .central-input-bar {
            padding: 0.5rem;
            min-height: calc(var(--mic-diameter) + 10px);
        }
        
        .input-buttons button:not(.mic-button), .note-picker-btn {
            width: 44px;
            height: 44px;
            min-width: 44px;
            min-height: 44px;
        }
    }
    
    /* Galaxy Fold specific optimizations */
    @media (max-width: 344px) {
        :root{ --mic-scale: 1.2; }
        .app-tabs {
            grid-template-columns: 1fr 1fr; /* Two columns for very narrow screens */
        }
        
        .research-mode-selector {
            flex-wrap: nowrap;
            gap: 0.4rem;
        }

        .research-mode-btn {
            width: 68px;
            height: 68px;
        }
        
        .research-mode-btn img {
            width: 100%;
            height: 100%;
        }
        
        .central-input-bar textarea {
            font-size: 14px;
            min-height: 40px;
        }
        
        .input-buttons button:not(.mic-button), .note-picker-btn {
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
                    case 'creator':
                        return <CreatorStudio />;
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
                    case 'oscontrol':
                        return <OSControlPanel />;
          // FIX: Changed 'case "default"' to 'default' to correctly handle the switch statement's default case.
          default:
            return <p>Select a feature.</p>;
        }
    };
    
    const isPromptEmpty = !promptInput.trim();
    const isSubmitDisabled = loading || isPromptEmpty;

    const handleOnboardingComplete = useCallback((record?: OnboardingPayload | null) => {
        const updated = record ?? loadOnboardingRecord();
        if (updated) {
            setOnboardingRecord(updated);
            setPlaceholderText(`Agent Lee · ${updated.persona} persona ready.`);
            if (!updated.consent?.mic) {
                setIsAlwaysListening(false);
            }
            if (!updated.consent?.cam) {
                setPos2CameraOn(false);
                setShowCameraFeed(false);
            }
        }
        setShowOnboarding(false);
        localStorage.setItem('onboardingComplete', 'true');
    }, [setPlaceholderText, setShowOnboarding]);

    return (
        <React.Fragment>
            <MetallicBackground />
            {showApiKeyPrompt && (
                <ApiKeyPrompt onApiKeySet={handleApiKeySet} />
            )}
            {showOnboarding && (
                <OnboardingWizard onDone={handleOnboardingComplete} />
            )}
            {browserUrl && <InAppBrowser url={browserUrl} onClose={() => setBrowserUrl(null)} />}
            {/* Top Level Header (never hides) */}
            <header className={`top-banner-header`}>
                <div className="header-left">
                    <div className="logo-container">
                        <img src={images.logo} alt="RWD Logo" className="header-logo" />
                    </div>
                </div>
                <div className="header-center">
                    <div className={`branding ${agentState === 'idle' ? '' : 'branding-online'}`}>
                        <img
                            src={images.agentNameBanner}
                            alt="Agent Lee — Autonomous Personal Computer"
                        />
                    </div>
                </div>
                <div className="header-right">
                    {/* #1 Avatar button (pure image) */}
                    <button
                        type="button"
                        className="image-btn"
                        {...(pos2AvatarOn ? { 'aria-pressed': 'true' } : {})}
                        title="Show avatar in input"
                        onClick={() => setPos2AvatarOn(v => !v)}
                    >
                        <img src={images.agentButton} alt="Avatar toggle" />
                    </button>
                    {/* #2 Camera button (pure image) */}
                    <button
                        type="button"
                        className="image-btn"
                        {...(pos2CameraOn ? { 'aria-pressed': 'true' } : {})}
                        title="Show camera in input"
                        onClick={toggleCameraSlot}
                    >
                        <img src={images.cameraFeed} alt="Camera toggle" />
                    </button>
                    {/* #3 search/spyglass removed intentionally */}
                    {metricsUrl && (
                        <div className="header-metrics">
                            <HealthBadge metricsUrl={metricsUrl} />
                        </div>
                    )}
                </div>
            </header>

            <SensorIntentBanner />

            <div className="leeway-multitool-wrapper">
                <style>{styles}</style>
                
                <div className="left-pane">
                    <div className={`top-info-wrapper ${pos2AvatarOn ? 'is-hidden' : ''}`} id="agent-avatar-container">
                        <div className="agent-avatar-simple">
                            <img src={images.agentLeeAvatar} alt="Agent Lee" className="avatar-image" />
                        </div>
                    </div>
                    {/* Agent output removed as requested */}
                    <div id="camera-feed-container" className={`${pos2CameraOn ? 'is-hidden' : ''}`}>
                        <CameraFeed ref={cameraFeedRef} onCameraEnabled={handleCameraEnabled} />
                    </div>
                                        <div className="bottom-controls-wrapper">
                                                <PersistentActions
                                                    activeFeature={activeFeature as Feature}
                                                    resultData={currentResultData}
                                                    onAiAnalyze={handleGlobalAiAnalysis}
                                                    showRecycleBin={showRecycleBin}
                                                    onToggleRecycleBin={() => setShowRecycleBin(v => !v)}
                                                />
                                                {/* Input Row with Position 2 at the left (square same size as mic) */}
                                                <div className={`central-input-bar ${(!pos2AvatarOn && !pos2CameraOn) ? 'no-left' : ''}`} id="central-input-bar">
                                                    <div id="pos2" className={`left-slot ${(!pos2AvatarOn && !pos2CameraOn) ? 'left-slot--empty' : ''}`} aria-live="polite">
                                                        {/* Avatar square (image-only) */}
                                                        {pos2AvatarOn && (
                                                            <button id="avatarBox" className="pos2-square" aria-label="Avatar active (click to hide)" onClick={() => setPos2AvatarOn(false)}>
                                                                <img src={images.agentLeeAvatar} alt="Avatar preview" />
                                                            </button>
                                                        )}
                                                        {/* Camera square (live preview) */}
                                                        {pos2CameraOn && (
                                                            <div id="cameraBox" className="pos2-square" onClick={() => setPos2CameraOn(false)}>
                                                                <video ref={videoRef} autoPlay muted playsInline />
                                                                {cameraError && (<div className="camera-error-inline">{cameraError}</div>)}
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
                                <button
                                    id="mic-button"
                                    onClick={(e) => handleUnifiedMicButton(e)}
                                    onDoubleClick={() => {
                                        wakeActiveRef.current = false;
                                        sessionModeRef.current = false;
                                        clearSilenceTimer();
                                        const recognition = recognitionRef.current;
                                        if (recognition && recognitionActiveRef.current) {
                                            try { recognition.stop(); }
                                            catch (e) { console.warn('Double-click stop failed', e); }
                                        }
                                    }}
                                    onContextMenu={(e) => { e.preventDefault(); openMicZoom(); }}
                                    className={`mic-button unified mac-million-mic ${isAlwaysListening ? 'always-on' : ''} ${isListening ? 'listening' : ''}`}
                                    aria-label={promptInput.trim() ? 'Send message' : (isListening ? 'Click again or double-click to send' : (isAlwaysListening ? 'Disable always-on microphone' : 'Enable push-to-talk'))}
                                    title={promptInput.trim() ? 'Send message' : (isListening ? 'Click again or double-click to send' : (isAlwaysListening ? 'Disable always-on microphone' : 'Enable push-to-talk'))} 
                                    disabled={!isOnboardingComplete}
                                >
                                    <img src={images.macMillionMic} alt="Mac Million Mic" className="mac-mic-image" />
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
                                                {showRecycleBin && (
                                                    <div className="recycle-bin-drawer">
                                        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
                                            <div className="text-sm text-gray-200">Recycle Bin</div>
                                            <button className="text-xs text-gray-300 hover:text-white" onClick={() => setShowRecycleBin(false)}>Close</button>
                                        </div>
                                                        <div className="recycle-bin-scroll">
                                            <Suspense fallback={<div className="p-3 text-xs text-gray-400">Loading…</div>}>
                                                <RecycleBinPanel />
                                            </Suspense>
                                        </div>
                                    </div>
                                )}

                <div className="app-container" id="app-container">

                    <div className="app-tabs-container" id="app-tabs-container">
                        <div className="app-tabs" role="tablist" aria-label="Main features">
                            {tabs.map(tab => {
                                const isActive = activeFeature === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => handleTabClick(tab.id as Feature)}
                                        className={`app-tab-btn ${isActive ? 'active' : ''} ${tab.pinned ? 'pinned' : ''}`}
                                        role="tab"
                                        {...(isActive ? { 'aria-selected': 'true' } : {})}
                                        aria-controls={`feature-panel-${tab.id}`}
                                        id={`feature-tab-${tab.id}`}
                                        aria-label={tab.label}
                                        title={tab.label}
                                        data-tool={tab.toolKey ?? undefined}
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

                                   if (isActiveMode) {
                                       return (
                                           <button
                                               key={id}
                                               type="button"
                                               onClick={() => setResearchMode(id)}
                                               className="research-mode-btn active"
                                               aria-pressed="true"
                                               aria-label={label}
                                           >
                                               <img src={icon} alt="" aria-hidden="true" draggable={false} />
                                           </button>
                                       );
                                   }

                                   return (
                                       <button
                                           key={id}
                                           type="button"
                                           onClick={() => setResearchMode(id)}
                                           className="research-mode-btn"
                                           aria-pressed="false"
                                           aria-label={label}
                                       >
                                           <img src={icon} alt="" aria-hidden="true" draggable={false} />
                                       </button>
                                   );
                               })}
                           </div>
                        )}
                    </div>
                    
                    {['text', 'character', 'creator'].includes(activeFeature) && <CharacterSelector />}

                    <main 
                        id={`feature-panel-${activeFeature}`}
                        role="tabpanel"
                        aria-labelledby={`feature-tab-${activeFeature}`}
                        className={`app-content-area ${['notepad', 'call', 'email', 'settings', 'character', 'creator', 'oscontrol'].includes(activeFeature) ? 'no-surface' : ''}`}>
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
                <OfflineBanner />
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
    s.textContent = `.input-buttons-flex{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.75rem}`;
    document.head.appendChild(s);
}