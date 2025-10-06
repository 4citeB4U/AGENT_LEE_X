/* LEEWAY HEADER
TAG: FRONTEND.UI.PERSISTENT_ACTIONS
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: layout-dashboard
ICON_SIG: CD534113
5WH: WHAT=Persistent action bar (notes, export, AI triggers); WHY=Provide quick-access durable operations across modes; WHO=Leeway Core (agnostic); WHERE=components/PersistentActions.tsx; WHEN=2025-10-05; HOW=React 19 + TypeScript + contextual note system
SPDX-License-Identifier: MIT
*/

import React, { useContext, useEffect, useRef, useState } from 'react';
import { NotepadContext } from '../contexts/NotepadContext';
import { Autosave, buildSnapshot } from '../src/lib/storage/autosave';
import type { Feature, GroundingChunk, NoteContent } from '../types';

interface PersistentActionsProps {
    activeFeature: Feature;
    resultData: {
        text: string;
        imageUrl: string;
        sources: GroundingChunk[];
        prompt: string;
        fileName?: string;
    };
    onAiAnalyze: () => void;
}

const icons = {
    newNote: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M13 20l7 -7" /><path d="M13 20v-6a1 1 0 0 1 1 -1h6v-7a2 2 0 0 0 -2 -2h-12a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7" /></svg>,
    save: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M6 4h10l4 4v10a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2" /><path d="M12 14m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M14 4l0 4l-6 0l0 -4" /></svg>,
    sync: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" /><path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" /></svg>,
    ai: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M10 16.5l-3 -3l3 -3" /><path d="M14 16.5l3 -3l-3 -3" /><path d="M9 12h6" /><path d="M6 8.25c.5 1 1.5 1.5 3 1.5c1.5 0 2.5 -.5 3 -1.5" /><path d="M12 3a9 9 0 0 0 0 18a9 9 0 0 0 6.362 -15.365" /></svg>,
    eye: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M21 12c-2.2 4.6 -6.1 7 -9 7s-6.8 -2.4 -9 -7c2.2 -4.6 6.1 -7 9 -7s6.8 2.4 9 7" /></svg>,
    export: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M11.5 21h-4.5a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v5m-5 6h7m-3 -3l3 3l-3 3" /></svg>,
    print: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M17 17h2a2 2 0 0 0 2 -2v-4a2 2 0 0 0 -2 -2h-14a2 2 0 0 0 -2 2v4a2 2 0 0 0 2 2h2" /><path d="M17 9v-4a2 2 0 0 0 -2 -2h-6a2 2 0 0 0 -2 2v4" /><path d="M7 13m0 2a2 2 0 0 1 2 -2h6a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2h-6a2 2 0 0 1 -2 -2z" /></svg>,
    share: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M6 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /><path d="M18 6m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /><path d="M18 18m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /><path d="M8.7 10.7l6.6 -3.4" /><path d="M8.7 13.3l6.6 3.4" /></svg>,
}

const PersistentActions: React.FC<PersistentActionsProps> = ({ activeFeature, resultData, onAiAnalyze }) => {
    const { addNote, notes, activeNoteId } = useContext(NotepadContext);
    const [syncStatus, setSyncStatus] = useState('Sync');

    const activeNote = notes.find(n => n.id === activeNoteId);

    const handleSave = () => {
        let noteContent: NoteContent | null = null;
        let title = `Note from ${activeFeature}`;

        switch (activeFeature as any) {
            case 'text':
                if (!resultData.text) return;
                title = resultData.prompt.substring(0, 40) || 'Text Result';
                noteContent = { type: 'text', text: resultData.text };
                break;
            case 'image':
                if (!resultData.imageUrl) return;
                title = resultData.prompt.substring(0, 40) || 'Image Result';
                noteContent = { type: 'image', imageUrl: resultData.imageUrl, prompt: resultData.prompt };
                break;
            case 'research':
                if (!resultData.text) return;
                title = resultData.prompt.substring(0, 40) || 'Research Result';
                noteContent = { type: 'research', text: resultData.text, sources: resultData.sources };
                break;
            case 'analyze':
            case 'document':
                 if (!resultData.text) return;
                 title = `Analysis of ${resultData.fileName || 'file'}`;
                 noteContent = { type: 'analysis', text: resultData.text, fileName: resultData.fileName };
                 break;
        }

        if (noteContent) {
            addNote(title, noteContent);
            Autosave.snapshot(buildSnapshot('note', 'last-created', activeFeature, { title, noteContent }));
        }
    };

    const handleSync = () => {
        setSyncStatus('...');
        setTimeout(() => {
            setSyncStatus('OK');
            setTimeout(() => setSyncStatus('Sync'), 2000);
        }, 1500);
    };

    const handleExport = () => {
        if (!activeNote) return;
        let content = '';
        // FIX: Added explicit checks for note content type to prevent accessing properties on the wrong type.
        if (activeNote.content.type === 'text' || activeNote.content.type === 'research' || activeNote.content.type === 'analysis' || activeNote.content.type === 'call') {
            content = activeNote.content.text;
        } else if (activeNote.content.type === 'image') {
            content = `Image Prompt: ${activeNote.content.prompt}\nImage URL: ${activeNote.content.imageUrl}`;
        } else if (activeNote.content.type === 'memory') {
            content = `--- MEMORY ---\n\nUSER PROMPT:\n${activeNote.content.userPrompt}\n\nAGENT RESPONSE:\n${activeNote.content.agentResponse}`;
        }
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeNote.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        Autosave.snapshot(buildSnapshot('settings', 'export', activeFeature, { exported: activeNote.id, at: Date.now() }));
    }
    
    const handlePrint = () => {
        if (!activeNote) return;
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <head><title>${activeNote.title}</title></head>
                    <body><h1>${activeNote.title}</h1><pre>${activeNote.content.type === 'text' ? activeNote.content.text : 'Cannot print this note type.'}</pre></body>
                </html>
            `);
            printWindow.document.close();
            printWindow.print();
            Autosave.snapshot(buildSnapshot('settings', 'print', activeFeature, { printed: activeNote.id, at: Date.now() }));
        }
    };
    
    const handleShare = async () => {
        if (!activeNote || !navigator.share) return;
        try {
            await navigator.share({
                title: activeNote.title,
                text: activeNote.content.type === 'text' ? activeNote.content.text : `Link to note: ${activeNote.title}`,
            });
            Autosave.snapshot(buildSnapshot('settings', 'share', activeFeature, { shared: activeNote.id, at: Date.now() }));
        } catch (error) {
            console.error("Share failed:", error);
        }
    }


    const hasSaveableContent = resultData.text || resultData.imageUrl;
    
    const isContentAvailable = !!(resultData.text || resultData.imageUrl);
    const isNotepadActiveWithNote = activeFeature === 'notepad' && !!activeNote;
    const isAnalysisDisabled = !isNotepadActiveWithNote && !isContentAvailable;

    const styles = `
        .persistent-actions-wrapper { position: relative; }
        .persistent-actions-container {
            display: flex;
            gap: 0.5rem;
            align-items: stretch;
            overflow-x: auto;
            padding: 0.25rem 2.25rem 0.5rem 2.25rem; /* space for arrows */
            -ms-overflow-style: none;
            scrollbar-width: none;
            scroll-behavior: smooth;
        }
        .persistent-actions-container::-webkit-scrollbar { display: none; }
        .pa-scroll-btn { position: absolute; top: 0; bottom: 0; width: 2rem; display: flex; align-items: center; justify-content: center; background: linear-gradient(to right, rgba(0,0,0,0.65), rgba(0,0,0,0)); border: none; cursor: pointer; z-index: 5; padding: 0; }
        .pa-scroll-btn.right { right: 0; background: linear-gradient(to left, rgba(0,0,0,0.65), rgba(0,0,0,0)); }
        .pa-scroll-btn.left { left: 0; }
        .pa-scroll-btn svg { width: 20px; height: 20px; stroke: #39FF14; }
        .pa-scroll-btn:hover svg { filter: drop-shadow(0 0 4px #39FF14); }
        .pa-scroll-btn[disabled] { opacity: 0.25; cursor: default; }
        .persistent-actions-container:active { cursor: grabbing; }
        .action-button-green { background: #064e3b; border: 1px solid #0d6e52; }
        .action-button-green:hover { background: #0a7a5b; border-color: #39FF14; }
        .action-button-green:focus-visible { outline: 2px solid #39FF14; outline-offset: 2px; }
        .action-button-green[disabled] { background: #244c42; opacity: 0.55; border-color: #244c42; }
    `;

    const scrollRef = useRef<HTMLDivElement | null>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const updateScrollState = () => {
        const el = scrollRef.current; if (!el) return;
        setCanScrollLeft(el.scrollLeft > 8);
        setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
    };

    useEffect(() => {
        updateScrollState();
        const el = scrollRef.current;
        if (!el) return;
        const handler = () => updateScrollState();
        el.addEventListener('scroll', handler, { passive: true });
        window.addEventListener('resize', handler);
        return () => { el.removeEventListener('scroll', handler); window.removeEventListener('resize', handler); };
    }, []);

    // Simple swipe / drag support
    useEffect(() => {
        const el = scrollRef.current; if (!el) return;
        let isDown = false; let startX = 0; let scrollStart = 0;
        const onDown = (e: MouseEvent) => { isDown = true; startX = e.clientX; scrollStart = el.scrollLeft; };
        const onMove = (e: MouseEvent) => { if (!isDown) return; el.scrollLeft = scrollStart - (e.clientX - startX); };
        const onUp = () => { isDown = false; };
        el.addEventListener('mousedown', onDown);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => { el.removeEventListener('mousedown', onDown); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, []);

    return (
        <>
            <style>{styles}</style>
                        <div className="persistent-actions-wrapper">
                                <button
                                    type="button"
                                    className="pa-scroll-btn left"
                                    aria-label="Scroll actions left"
                                    disabled={!canScrollLeft}
                                    onClick={() => { const el = scrollRef.current; if (el) el.scrollBy({ left: -220, behavior: 'smooth' }); }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                                </button>
                                <div
                                    ref={scrollRef}
                                    className="persistent-actions-container"
                                    onWheel={(e) => { if (e.shiftKey) { e.preventDefault(); (e.currentTarget as HTMLDivElement).scrollBy({ left: e.deltaY, behavior: 'smooth' }); } }}
                                >
                                        <ActionButton onClick={() => addNote('New Note', { type: 'text', text: '' })} icon={icons.newNote} label="New Note" />
                                        <ActionButton onClick={handleSave} icon={icons.save} label="Save Result" disabled={!hasSaveableContent || activeFeature === 'notepad'} />
                                        <div className="w-px h-10 bg-gray-600 mx-1 flex-shrink-0"></div>
                                        <ActionButton onClick={onAiAnalyze} icon={icons.ai} label="AI Analysis" disabled={isAnalysisDisabled} />
                                        <div className="w-px h-10 bg-gray-600 mx-1 flex-shrink-0"></div>
                                        <ActionButton onClick={handleSync} icon={icons.sync} label={syncStatus} disabled={syncStatus !== 'Sync'} />
                                        <ActionButton onClick={handleExport} icon={icons.export} label="Export Note" disabled={!activeNote} />
                                        <ActionButton onClick={handlePrint} icon={icons.print} label="Print Note" disabled={!activeNote || activeNote.content.type !== 'text'} />
                                        <ActionButton onClick={handleShare} icon={icons.share} label="Share Note" disabled={!activeNote || !navigator.share} />
                                </div>
                                <button
                                    type="button"
                                    className="pa-scroll-btn right"
                                    aria-label="Scroll actions right"
                                    disabled={!canScrollRight}
                                    onClick={() => { const el = scrollRef.current; if (el) el.scrollBy({ left: 220, behavior: 'smooth' }); }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                                </button>
                        </div>
        </>
    );
};

const ActionButton: React.FC<{onClick: () => void, icon: React.ReactElement, label: string, disabled?: boolean}> = ({onClick, icon, label, disabled}) => {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={label}
                        className="action-button-green flex flex-col items-center justify-center w-20 h-16 text-white rounded-md transition-all disabled:cursor-not-allowed p-1 text-center flex-shrink-0"
        >
            {icon}
            <span className="text-xs mt-1 leading-tight">{label}</span>
        </button>
    )
}

export default PersistentActions;