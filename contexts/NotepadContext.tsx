/*
LEEWAY HEADER — DO NOT REMOVE
REGION: UI.UNKNOWN
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_ASCII: family=lucide glyph=layout-dashboard ICON_SIG=CD534113
5WH: WHAT=Module: NotepadContext.tsx; WHY=standardize; WHO=RapidWebDevelop; WHERE=F:\4leeway-multitool\contexts\NotepadContext.tsx; WHEN=2025-10-05; HOW=React/Tailwind
SIG: 00000000
AGENTS: AZR, PHI3, GEMINI, QWEN, LLAMA, ECHO
SPDX-License-Identifier: MIT
*/



import React, { createContext, ReactNode, useEffect, useRef, useState } from 'react';
import memoryStore, { type BaseItem } from '../src/lib/memoryStore';
import type { Note, NoteContent } from '../types';

interface NotepadContextType {
    notes: Note[];
    activeNoteId: number | null;
    setActiveNoteId: (id: number | null) => void;
    addNote: (title: string, content: NoteContent, tag?: string) => void;
    updateNote: (updatedNote: Note) => void;
    deleteNote: (id: number) => void;
    deleteAllNotes: () => void;
    importNotes: (importedNotes: Note[]) => void;
}

export const NotepadContext = createContext<NotepadContextType>({
    notes: [],
    activeNoteId: null,
    setActiveNoteId: () => {},
    addNote: () => {},
    updateNote: () => {},
    deleteNote: () => {},
    deleteAllNotes: () => {},
    importNotes: () => {},
});

const initialNotes: Note[] = [];

// Deterministic 32-bit hash for mapping string ids to numeric ids used by legacy consumers
function hashToInt(id: string): number {
    let h = 0;
    for (let i = 0; i < id.length; i++) {
        h = (h << 5) - h + id.charCodeAt(i);
        h |= 0; // 32-bit
    }
    // Make positive and add a high bit to reduce collision with Date.now ids
    return Math.abs(h) + 1_000_000_000;
}

function osToNote(item: BaseItem): Note {
    const numericId = hashToInt(item.id);
    // Project content as editable text first; richer types can be handled via artifacts if needed
    const text = item.utterance || '';
    const content: NoteContent = { type: 'text', text };
    // Preserve drive for UI filtering by encoding it in the single tag field
    const tag = `DRIVE-${item.drive}`;
    const date = new Date(item.updated || item.created).toLocaleString();
    return { id: numericId, title: item.title, date, tag, content };
}


export const NotepadProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [notes, setNotes] = useState<Note[]>(initialNotes);
    const [activeNoteId, setActiveNoteIdState] = useState<number | null>(null);

    // Map numeric id <-> OS id for operations
    const numToOsIdRef = useRef<Map<number, string>>(new Map());
    const osIdToNumRef = useRef<Map<string, number>>(new Map());

    // Project OS -> UI notes and maintain id maps
    const refreshFromStore = () => {
        // Show items from all drives (exclude recycled)
        const items = memoryStore.list({ includeRecycled: false });
        const projected = items.map(osToNote);
        const numToOs = new Map<number, string>();
        const osToNum = new Map<string, number>();
        for (const it of items) {
            const nId = hashToInt(it.id);
            numToOs.set(nId, it.id);
            osToNum.set(it.id, nId);
        }
        numToOsIdRef.current = numToOs;
        osIdToNumRef.current = osToNum;
        setNotes(projected);
        // Sync active id
        const active = memoryStore.getActive();
        if (active) setActiveNoteIdState(osToNum.get(active.id) || null);
        else if (projected.length > 0) setActiveNoteIdState(projected[0].id);
        else setActiveNoteIdState(null);
    };

    useEffect(() => {
        // Initial hydration from store and subscribe
        refreshFromStore();
        const unsub = memoryStore.subscribe(() => refreshFromStore());
        return () => { try { unsub(); } catch {} };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const setActiveNoteId = (id: number | null) => {
        setActiveNoteIdState(id);
        const osId = id != null ? numToOsIdRef.current.get(id) : undefined;
        memoryStore.setActive(osId);
    };

    const addNote = async (title: string, content: NoteContent, tag: string = 'CONFIDENTIAL') => {
        // Map content -> utterance + artifacts
        let utterance = '';
        const tags = [tag, 'notepad'].filter(Boolean);
        try {
            switch (content.type) {
                case 'text':
                    utterance = content.text || '';
                    break;
                case 'image':
                    utterance = `Image: ${content.prompt || ''}`;
                    break;
                case 'research':
                case 'analysis':
                case 'call':
                    utterance = content.text || '';
                    break;
                case 'memory':
                    utterance = `USER: ${content.userPrompt}\nAGENT: ${content.agentResponse}`;
                    break;
            }
            const created = await memoryStore.createTask(title, { utterance, tags });
            if (content.type === 'image' && content.imageUrl) {
                await memoryStore.attachArtifacts(created.id, [{ name: 'image.url', text: content.imageUrl, type: 'image/url' }]);
            }
            // refresh is handled by subscription; set active id to created
            const maybeNum = osIdToNumRef.current.get(created.id) || hashToInt(created.id);
            setActiveNoteId(maybeNum);
        } catch (e) {
            console.warn('Failed to add note via memory store', e);
        }
    };

    const updateNote = async (updatedNote: Note) => {
        const osId = numToOsIdRef.current.get(updatedNote.id);
        if (!osId) return;
        // Only text content is editable in current UI
        let utterance: string | undefined;
        if (updatedNote.content.type === 'text') utterance = updatedNote.content.text;
        try {
            await memoryStore.update(osId, { title: updatedNote.title, utterance });
        } catch (e) {
            console.warn('Failed to update note', e);
        }
    };

    const deleteNote = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this note? This action cannot be undone.')) return;
        const osId = numToOsIdRef.current.get(id);
        if (!osId) return;
        try {
            await memoryStore.recycle(osId);
        } catch (e) {
            console.warn('Failed to recycle note', e);
        }
    };

    const deleteAllNotes = async () => {
        if (!window.confirm('Are you sure you want to delete ALL notes? This action is permanent and cannot be undone.')) return;
        const items = memoryStore.list({ drive: 'R' });
        for (const it of items) {
            try { await memoryStore.recycle(it.id); } catch {}
        }
    };

    const importNotes = async (importedNotes: Note[]) => {
        for (const n of importedNotes) {
            try {
                await addNote(n.title, n.content, n.tag);
            } catch {}
        }
    };

    return (
        <NotepadContext.Provider value={{ notes, activeNoteId, setActiveNoteId, addNote, updateNote, deleteNote, deleteAllNotes, importNotes }}>
            {children}
        </NotepadContext.Provider>
    );
};