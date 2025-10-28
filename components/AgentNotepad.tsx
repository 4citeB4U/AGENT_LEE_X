/* LEEWAY HEADER
TAG: FRONTEND.COMPONENT.AGENT_NOTEPAD
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: notebook
ICON_SIG: CD534113
5WH: WHAT=Agent notepad UI (local storage + audio notes); WHY=Persistent multi-modal memory capture; WHO=Leeway Core (agnostic); WHERE=components/AgentNotepad.tsx; WHEN=2025-10-05; HOW=React context + structured note types
SPDX-License-Identifier: MIT
*/

import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { NotepadContext } from '../contexts/NotepadContext';
import { audioRecorderService } from '../services/ttsService';
import type { Note } from '../types';

const AudioPlayer = ({ audioData }: { audioData: { base64: string; mimeType: string } }) => {
    const [audioSrc, setAudioSrc] = useState<string | null>(null);

    useEffect(() => {
        if (!audioData?.base64 || !audioData?.mimeType) return;

        const base64toBlob = (base64: string, mimeType: string) => {
            const byteCharacters = atob(base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            return new Blob([byteArray], { type: mimeType });
        };

        try {
            const blob = base64toBlob(audioData.base64, audioData.mimeType);
            const url = URL.createObjectURL(blob);
            setAudioSrc(url);

            return () => {
                if (url) URL.revokeObjectURL(url);
            };
        } catch (error) {
            console.error("Failed to create audio blob from base64", error);
        }

    }, [audioData]);

    if (!audioSrc) return null;

    return (
        <div className="audio-playback block">
            <audio controls src={audioSrc} className="w-full mt-2"></audio>
        </div>
    );
};

type DriveKey = 'LEE' | 'L' | 'E' | 'O' | 'N' | 'A' | 'R' | 'D';
type DriveFilter = DriveKey | 'ALL';

const DRIVE_ORDER: DriveKey[] = ['LEE', 'L', 'E', 'O', 'N', 'A', 'R', 'D'];

const DRIVE_LABELS: Record<DriveKey, string> = {
    LEE: 'Lee Registry',
    L: 'Drive L — Surface UI',
    E: 'Drive E — Evidence',
    O: 'Drive O — Operations Cache',
    N: 'Drive N — Nexus Streams',
    A: 'Drive A — Analysis Lab',
    R: 'Drive R — Runbook Notes',
    D: 'Drive D — Defense Logs'
};

const DRIVE_DESCRIPTIONS: Record<DriveKey, string> = {
    LEE: 'Registry + system receipts',
    L: 'UI artifacts and render hints',
    E: 'Evidence, logs, transcripts',
    O: 'Operational buffers and queues',
    N: 'Nexus feeds, media, comms',
    A: 'Analysis drafts and playbooks',
    R: 'Run-time notes and briefings',
    D: 'Security outcomes and audits'
};

const DRIVE_ACCENTS: Record<DriveKey, string> = {
    LEE: 'accent-lee',
    L: 'accent-l',
    E: 'accent-e',
    O: 'accent-o',
    N: 'accent-n',
    A: 'accent-a',
    R: 'accent-r',
    D: 'accent-d'
};

const DRIVE_ICONS: Record<DriveKey, string> = {
    LEE: 'fa-user-secret',
    L: 'fa-display',
    E: 'fa-database',
    O: 'fa-gears',
    N: 'fa-compass',
    A: 'fa-brain',
    R: 'fa-pen-to-square',
    D: 'fa-shield-halved'
};

const getDriveShortName = (drive: DriveKey): string => {
    const [shortName] = DRIVE_LABELS[drive].split(' — ');
    return shortName || DRIVE_LABELS[drive];
};

const sanitizeForPath = (input: string): string => input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'draft';

const buildPathDisplay = (drive: DriveKey, noteTitle?: string): string => {
    const base = drive === 'LEE' ? 'LEE://registry' : `LEONARD://${drive.toLowerCase()}`;
    if (!noteTitle) return base;
    return `${base}/${sanitizeForPath(noteTitle)}`;
};

const deriveDriveFromTag = (tag?: string): DriveKey => {
    if (!tag) return 'R';
    const normalized = tag.toUpperCase();
    const tokens = normalized.split(/[^A-Z]+/).filter(Boolean);
    const explicit = DRIVE_ORDER.find(key => normalized.includes(`DRIVE-${key}`) || normalized.includes(`[${key}]`) || tokens.includes(key));
    return explicit || 'R';
};

const AgentNotepad: React.FC<{ applyNoteToPrompt: (note: Note) => void; }> = ({ applyNoteToPrompt }) => {
    const { notes, addNote, updateNote, activeNoteId, setActiveNoteId } = useContext(NotepadContext);
    const [searchTerm, setSearchTerm] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [selectedDrive, setSelectedDrive] = useState<DriveFilter>('ALL');

    const editorRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);

    const activeNote = notes.find(n => n.id === activeNoteId);
    const isNoteEditable = activeNote?.content?.type === 'text' && !activeNote.content.isEncrypted;

    const driveStats = useMemo(() => {
        const counts: Record<DriveKey, number> = {
            LEE: 0,
            L: 0,
            E: 0,
            O: 0,
            N: 0,
            A: 0,
            R: 0,
            D: 0
        };
        notes.forEach(note => {
            const drive = deriveDriveFromTag(note.tag);
            counts[drive] = (counts[drive] || 0) + 1;
        });
        return counts;
    }, [notes]);

    const targetDriveForCreation: DriveKey = selectedDrive === 'ALL' ? 'R' : selectedDrive;
    const createButtonLabel = selectedDrive === 'ALL' ? 'New Note' : `New ${getDriveShortName(targetDriveForCreation)} Note`;
    const activeDriveKey: DriveKey = activeNote ? deriveDriveFromTag(activeNote.tag) : targetDriveForCreation;
    const drivePathDisplay = buildPathDisplay(activeDriveKey, activeNote?.title);
    const activeDriveCount = driveStats[activeDriveKey] || 0;
    const selectedDriveName = selectedDrive === 'ALL' ? 'All Drives' : getDriveShortName(selectedDrive);

    const filteredNotes = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return notes.filter(note => {
            if (!note) return false;
            const noteDrive = deriveDriveFromTag(note.tag);
            if (selectedDrive !== 'ALL' && noteDrive !== selectedDrive) return false;
            if (!term) return true;
            if (note.title && note.title.toLowerCase().includes(term)) return true;
            if (note.content.type === 'text' && note.content.text) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = note.content.text;
                return tempDiv.textContent?.toLowerCase().includes(term) ?? false;
            }
            return false;
        });
    }, [notes, searchTerm, selectedDrive]);

    useEffect(() => {
        if (selectedDrive === 'ALL') return;
        if (activeNote && deriveDriveFromTag(activeNote.tag) === selectedDrive) return;
        const next = filteredNotes[0];
        if (next) setActiveNoteId(next.id);
    }, [selectedDrive, filteredNotes, activeNote, setActiveNoteId]);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("Speech recognition not supported by this browser.");
            return;
        }
        
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;

        recognitionRef.current.onresult = (event: any) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }
            
            if (finalTranscript && editorRef.current) {
                 const currentContent = editorRef.current.innerHTML;
                 editorRef.current.innerHTML = (currentContent.endsWith(' ') || currentContent.endsWith('</p>') || currentContent === '' ? currentContent : currentContent + ' ') + finalTranscript;
                 handleContentChange();
            }
        };

        recognitionRef.current.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            if(isRecording) toggleRecording();
        };

        return () => {
            recognitionRef.current?.stop();
        }
    }, [isRecording]);

    useEffect(() => {
        if (activeNote && editorRef.current) {
            const noteContent = activeNote.content;
            if (noteContent.type === 'text') {
                if(editorRef.current.innerHTML !== noteContent.text) {
                     editorRef.current.innerHTML = noteContent.text || '';
                }
                editorRef.current.contentEditable = 'true';
            } else {
                editorRef.current.innerHTML = `
                    <div style="padding: 20px; color: #aaa;">
                        <p><strong>Note Type:</strong> ${noteContent.type.charAt(0).toUpperCase() + noteContent.type.slice(1)}</p>
                        <p><em>This note type is not editable here.</em></p>
                    </div>
                `;
                editorRef.current.contentEditable = 'false';
            }
        } else if (!activeNote && editorRef.current) {
            editorRef.current.innerHTML = '';
            editorRef.current.contentEditable = 'false';
        }
    }, [activeNote]);

    const handleContentChange = () => {
        if (!activeNote || !isNoteEditable || !editorRef.current) return;

        const newContentHTML = editorRef.current.innerHTML;
        const firstLine = editorRef.current.textContent?.split('\n')[0] || 'New Operation';
        
        const updatedContent = { ...activeNote.content, text: newContentHTML };
        const updatedNote = { ...activeNote, title: activeNote.title === 'New Operation' ? firstLine.substring(0, 50) : activeNote.title, content: updatedContent };
        
        updateNote(updatedNote);
    };

    const handleFormat = (command: string) => {
        if (!isNoteEditable) return;
        document.execCommand(command, false, undefined);
        editorRef.current?.focus();
        handleContentChange();
    };

    const handleNewNote = () => {
        const shortName = getDriveShortName(targetDriveForCreation);
        addNote(`${shortName} Entry`, { type: 'text', text: '' }, `DRIVE-${targetDriveForCreation}`);
        setSelectedDrive(targetDriveForCreation);
        setSearchTerm('');
    };

    const handleDriveSelect = (drive: DriveKey) => {
        setSelectedDrive(prev => (prev === drive ? 'ALL' : drive));
    };

    const handleSync = (e: React.MouseEvent<HTMLButtonElement>) => {
        const syncButton = e.currentTarget;
        const originalHtml = syncButton.innerHTML;
        syncButton.disabled = true;
        syncButton.innerHTML = '<i class="fas fa-sync fa-spin"></i><span>Syncing...</span>';
        
        setTimeout(() => {
            syncButton.innerHTML = '<i class="fas fa-check"></i><span>Synced</span>';
            setTimeout(() => {
                syncButton.innerHTML = originalHtml;
                syncButton.disabled = false;
            }, 2000);
        }, 1500);
    };

    const toggleRecording = async () => {
        if (isRecording) {
            setIsRecording(false);
            recognitionRef.current?.stop();
            const micBtn = document.getElementById('mic-btn');
            const recIndicator = document.getElementById('recording-indicator');
            if(micBtn) {
                micBtn.innerHTML = '<i class="fas fa-microphone"></i><span>Record</span>';
                micBtn.classList.remove('active');
            }
            if(recIndicator) recIndicator.style.display = 'none';
            
            try {
                const { blob, mimeType } = await audioRecorderService.stopRecording();
                const base64 = await audioRecorderService.blobToBase64(blob);

                if (activeNote && activeNote.content.type === 'text') {
                    const newContent = { ...activeNote.content, audioData: { base64, mimeType } };
                    updateNote({ ...activeNote, content: newContent });
                }
            } catch (e) {
                console.error("Error stopping recording:", e);
            }

        } else {
            if (!isNoteEditable) {
                alert("Please select an editable text note to start recording.");
                return;
            }
            try {
                await audioRecorderService.startRecording();
                recognitionRef.current?.start();
                setIsRecording(true);

                const micBtn = document.getElementById('mic-btn');
                const recIndicator = document.getElementById('recording-indicator');
                if(micBtn) {
                    micBtn.innerHTML = '<i class="fas fa-stop"></i><span>Stop</span>';
                    micBtn.classList.add('active');
                }
                if(recIndicator) recIndicator.style.display = 'block';
            } catch (e) {
                alert('Could not access microphone. Please ensure permission is granted.');
            }
        }
    };

    const formatDate = (dateString: string) => {
        const now = new Date();
        const noteDate = new Date(dateString);
        const diffTime = Math.abs(now.getTime() - noteDate.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0 && now.getDate() === noteDate.getDate()) {
            return `Today, ${noteDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else if (diffDays === 1 || (diffDays === 0 && now.getDate() !== noteDate.getDate())) {
            return `Yesterday, ${noteDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else {
            return noteDate.toLocaleDateString() + ', ' + noteDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
    };
    
    const styles = `
        .agent-notepad-wrapper { display: flex; gap: 20px; height: 100%; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: transparent; }
        .sidebar { width: 320px; flex-shrink: 0; background: #121212; border-radius: 12px; padding: 20px; box-shadow: 0 12px 24px rgba(0,0,0,0.25); display: flex; flex-direction: column; border: 1px solid rgba(57,255,20,0.25); }
        .drive-cabinet { background: rgba(12,40,32,0.85); border: 1px solid rgba(57,255,20,0.35); border-radius: 10px; padding: 14px; margin-bottom: 16px; }
        .drive-cabinet-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .drive-cabinet-title { font-size: 0.9rem; font-weight: 600; color: #39FF14; text-transform: uppercase; letter-spacing: 0.08em; }
        .drive-cabinet-subtitle { font-size: 0.72rem; color: rgba(199,255,216,0.85); }
        .drive-reset { display: flex; align-items: center; gap: 6px; padding: 6px 10px; background: rgba(255,255,255,0.12); color: #C7FFD8; border: 1px solid rgba(255,255,255,0.18); border-radius: 6px; cursor: pointer; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; transition: all 0.2s ease; }
        .drive-reset.active, .drive-reset:hover { background: rgba(57,255,20,0.25); color: #111; }
        .drive-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
        .drive-card { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; background: rgba(17,25,22,0.9); border: 1px solid rgba(255,255,255,0.08); border-left: 4px solid transparent; padding: 12px; border-radius: 10px; cursor: pointer; transition: all 0.25s ease; color: #e2f7f0; text-align: left; }
        .drive-card .drive-pill { display: flex; align-items: center; gap: 6px; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(199,255,216,0.9); }
        .drive-card .drive-label { font-size: 0.9rem; font-weight: 600; color: #f5fff9; }
        .drive-card .drive-count { font-size: 0.75rem; color: rgba(199,255,216,0.75); }
        .drive-card .drive-description { font-size: 0.72rem; color: rgba(199,255,216,0.6); line-height: 1.3; }
        .drive-card:hover { transform: translateY(-2px); box-shadow: 0 10px 18px rgba(0,0,0,0.25); }
        .drive-card.active { background: rgba(57,255,20,0.12); border-color: rgba(57,255,20,0.35); }
        .drive-card.active .drive-label { color: #39FF14; }
        .accent-lee { border-left-color: #39FF14; }
        .accent-l { border-left-color: #0DFF94; }
        .accent-e { border-left-color: #20C997; }
        .accent-o { border-left-color: #38BDF8; }
        .accent-n { border-left-color: #FBBF24; }
        .accent-a { border-left-color: #FF6B6B; }
        .accent-r { border-left-color: #A855F7; }
        .accent-d { border-left-color: #F87171; }
        .search-box { margin-bottom: 12px; position: relative; }
        .search-box input[type="text"] { width: 100%; padding: 12px 15px; border: 1px solid #2f4941; border-radius: 8px; background: rgba(20,50,40,0.8); color: #C7FFD8; padding-left: 40px; }
        .search-box i { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: rgba(199,255,216,0.65); }
        .notes-list { display: flex; flex-direction: column; gap: 12px; overflow-y: auto; flex: 1; padding-right: 6px; }
        .note-item { padding: 15px; border-radius: 10px; background-color: rgba(32,32,32,0.85); cursor: pointer; transition: all 0.3s; border-left: 4px solid rgba(57,255,20,0.4); box-shadow: 0 6px 14px rgba(0, 0, 0, 0.25); position: relative; }
        .note-item:hover { background-color: rgba(45,45,45,0.92); transform: translateX(4px); }
        .note-item.active { background-color: rgba(57,255,20,0.12); border-left-color: #39FF14; }
        .note-title { font-weight: 600; margin-bottom: 8px; color: #C7FFD8; display: flex; justify-content: space-between; align-items: center; gap: 8px; }
        .note-title button { background: rgba(57,255,20,0.1); border: 1px solid rgba(57,255,20,0.25); border-radius: 6px; color: #39FF14; padding: 4px 6px; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; cursor: pointer; transition: all 0.2s ease; }
        .note-title button:hover { background: rgba(57,255,20,0.3); color: #0b1f16; }
        .note-preview { font-size: 0.85rem; color: #d0f3e4; margin-bottom: 8px; line-height: 1.5; max-height: 3.2em; overflow: hidden; }
        .note-item.active .note-preview { color: #f5fff9; }
        .note-date { font-size: 0.72rem; color: rgba(199,255,216,0.7); display: flex; align-items: center; gap: 5px; }
        .drive-chip { display: inline-block; margin-top: 10px; padding: 4px 10px; border-radius: 999px; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.08em; background: rgba(57,255,20,0.12); color: #39FF14; border: 1px solid rgba(57,255,20,0.3); }
        .drive-chip.drive-l { background: rgba(13,255,148,0.15); color: #0DFF94; border-color: rgba(13,255,148,0.3); }
        .drive-chip.drive-e { background: rgba(32,201,151,0.18); color: #20C997; border-color: rgba(32,201,151,0.3); }
        .drive-chip.drive-o { background: rgba(56,189,248,0.18); color: #38BDF8; border-color: rgba(56,189,248,0.3); }
        .drive-chip.drive-n { background: rgba(251,191,36,0.18); color: #FBBF24; border-color: rgba(251,191,36,0.3); }
        .drive-chip.drive-a { background: rgba(255,107,107,0.18); color: #FF6B6B; border-color: rgba(255,107,107,0.3); }
        .drive-chip.drive-r { background: rgba(168,85,247,0.18); color: #A855F7; border-color: rgba(168,85,247,0.3); }
        .drive-chip.drive-d { background: rgba(248,113,113,0.18); color: #F87171; border-color: rgba(248,113,113,0.3); }
        .notes-empty { padding: 18px; background: rgba(17,25,22,0.9); border: 1px dashed rgba(57,255,20,0.35); border-radius: 10px; color: rgba(199,255,216,0.8); text-align: center; font-size: 0.85rem; }
        .notes-empty strong { color: #39FF14; display: block; margin-bottom: 6px; }
        .notepad-container { flex: 1; background-color: rgba(16,29,26,0.95); border-radius: 12px; overflow: hidden; box-shadow: 0 18px 30px rgba(0, 0, 0, 0.35); display: flex; flex-direction: column; border: 1px solid rgba(57,255,20,0.2); }
        .notepad-info { display: flex; justify-content: space-between; align-items: center; padding: 14px 24px; background: linear-gradient(90deg, rgba(17,39,32,0.95), rgba(10,19,15,0.95)); border-bottom: 1px solid rgba(57,255,20,0.2); color: #C7FFD8; }
        .notepad-info .path { display: flex; align-items: center; gap: 10px; font-size: 0.85rem; }
        .notepad-info .path span { background: rgba(0,0,0,0.45); padding: 6px 10px; border-radius: 6px; border: 1px solid rgba(57,255,20,0.2); letter-spacing: 0.05em; }
        .notepad-info .metadata { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
        .metadata-chip { display: flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 8px; font-size: 0.75rem; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.16); text-transform: uppercase; letter-spacing: 0.06em; color: #C7FFD8; }
        .metadata-chip i { color: #39FF14; }
        .toolbar { padding: 16px 24px; background: linear-gradient(to right, #0c1411, #050908); display: flex; gap: 16px; flex-wrap: wrap; align-items: center; border-bottom: 1px solid rgba(57,255,20,0.2); }
        .toolbar .drive-context { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; color: rgba(199,255,216,0.8); text-transform: uppercase; letter-spacing: 0.05em; }
        .toolbar .formatting-tools { display: flex; gap: 10px; padding-right: 18px; border-right: 1px solid rgba(255,255,255,0.12); }
        .toolbar .action-tools { display: flex; gap: 10px; align-items: center; }
        .toolbar button { background: rgba(255, 255, 255, 0.12); color: #C7FFD8; padding: 8px 12px; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px; cursor: pointer; transition: all 0.3s ease; display: flex; align-items: center; gap: 6px; font-size: 0.78rem; letter-spacing: 0.03em; }
        .toolbar button:hover:not(:disabled) { background: rgba(57,255,20,0.25); color: #0b1f16; transform: translateY(-2px); }
        .toolbar button:disabled { opacity: 0.55; cursor: not-allowed; }
        .notepad-editor-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; position: relative; }
        .notepad { position: relative; padding: 32px 50px; background-color: rgba(24,33,30,0.9); flex: 1; background-image: linear-gradient(rgba(255,255,255,0.06) .1em, transparent .1em); background-size: 100% 1.6em; background-position: 0 .6em; overflow-y: auto; }
        .notepad::before { content: ''; position: absolute; top: 0; left: 40px; height: 100%; width: 2px; background-color: #39FF14; }
        #note-content { width: 100%; height: 100%; border: none; outline: none; background: transparent; font-size: 16px; line-height: 1.6em; padding-left: 15px; margin-left: 25px; resize: none; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #f5fff9; }
        .recording-indicator { display: none; position: absolute; top: 14px; right: 18px; background: #ff4757; color: white; padding: 6px 12px; border-radius: 999px; font-size: 12px; z-index: 10; animation: pulse 1.5s infinite; letter-spacing: 0.05em; text-transform: uppercase; }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
        .audio-playback { padding: 12px 24px 24px; background: #0d1412; border-top: 1px solid rgba(57,255,20,0.2); }
        .audio-playback audio { width: 100%; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #0b1613; border-radius: 10px; }
        ::-webkit-scrollbar-thumb { background: #0d3b33; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #1a5c4d; }
        @media (max-width: 900px) {
            .agent-notepad-wrapper { flex-direction: column; gap: 1rem; }
            .sidebar { width: 100%; height: auto; }
            .notes-list { max-height: 200px; }
            .notepad-container { min-height: 420px; }
            .toolbar { flex-direction: column; align-items: flex-start; }
            .toolbar .formatting-tools { border-right: none; border-bottom: 1px solid rgba(255, 255, 255, 0.2); padding-right: 0; padding-bottom: 10px; margin-bottom: 10px; }
            .notepad { padding: 20px; }
            #note-content { margin-left: 0; padding-left: 5px; }
            .notepad::before { display: none; }
        }
    `;

    return (
        <>
            <style>{styles}</style>
            <div className="agent-notepad-wrapper">
                <div className="sidebar">
                    <div className="drive-cabinet">
                        <div className="drive-cabinet-header">
                            <div>
                                <div className="drive-cabinet-title">LEE · LEONARD Drives</div>
                                <div className="drive-cabinet-subtitle">{selectedDriveName}</div>
                            </div>
                            <button
                                type="button"
                                className={`drive-reset ${selectedDrive === 'ALL' ? 'active' : ''}`}
                                onClick={() => setSelectedDrive('ALL')}
                            >
                                <i className="fa-solid fa-layer-group"></i>
                                <span>All</span>
                            </button>
                        </div>
                        <div className="drive-grid">
                            {DRIVE_ORDER.map(driveKey => {
                                const isActive = selectedDrive === driveKey;
                                return (
                                    <button
                                        key={driveKey}
                                        type="button"
                                        className={`drive-card ${DRIVE_ACCENTS[driveKey]} ${isActive ? 'active' : ''}`}
                                        onClick={() => handleDriveSelect(driveKey)}
                                    >
                                        <div className="drive-pill">
                                            <i className={`fa-solid ${DRIVE_ICONS[driveKey]}`}></i>
                                            <span>{driveKey}</span>
                                        </div>
                                        <div className="drive-label">{getDriveShortName(driveKey)}</div>
                                        <div className="drive-count">{driveStats[driveKey] || 0} files</div>
                                        <div className="drive-description">{DRIVE_DESCRIPTIONS[driveKey]}</div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="search-box">
                        <i className="fas fa-search"></i>
                        <input
                            type="text"
                            placeholder={`Search ${selectedDriveName.toLowerCase()}...`}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="notes-list">
                        {filteredNotes.length === 0 ? (
                            <div className="notes-empty">
                                <strong>No notes in {selectedDriveName}</strong>
                                <span>Use the new note action to mint the first entry to {getDriveShortName(targetDriveForCreation)}.</span>
                            </div>
                        ) : (
                            filteredNotes.map(note => {
                                const noteDrive = deriveDriveFromTag(note.tag);
                                const driveClass = `drive-${noteDrive.toLowerCase()}`;
                                let previewText = `[${note.content.type} note]`;
                                if (note.content.type === 'text' && note.content.text) {
                                    const doc = new DOMParser().parseFromString(note.content.text, 'text/html');
                                    const text = doc.body.textContent?.trim() || '';
                                    previewText = text.length > 140 ? `${text.slice(0, 140)}…` : text || 'Draft';
                                }
                                return (
                                    <div
                                        key={note.id}
                                        className={`note-item ${driveClass} ${activeNoteId === note.id ? 'active' : ''}`}
                                        onClick={() => setActiveNoteId(note.id)}
                                    >
                                        <div className="note-title">
                                            <span>{note.title}</span>
                                            <button
                                                type="button"
                                                onClick={event => {
                                                    event.stopPropagation();
                                                    applyNoteToPrompt(note);
                                                }}
                                            >
                                                Apply
                                            </button>
                                        </div>
                                        <div className="note-preview">{previewText}</div>
                                        <div className="note-date"><i className="far fa-clock"></i> {formatDate(note.date)}</div>
                                        <div className={`drive-chip ${driveClass}`}>{getDriveShortName(noteDrive)}</div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
                <div className="notepad-container">
                    <div className="notepad-info">
                        <div className="path">
                            <i className="fa-solid fa-route"></i>
                            <span>{drivePathDisplay}</span>
                        </div>
                        <div className="metadata">
                            <div className="metadata-chip">
                                <i className="fa-solid fa-diagram-project"></i>
                                {getDriveShortName(activeDriveKey)}
                            </div>
                            <div className="metadata-chip">
                                <i className="fa-solid fa-database"></i>
                                {activeDriveCount} stored
                            </div>
                            <div className="metadata-chip">
                                <i className="fa-solid fa-shield"></i>
                                LEEWAY v10
                            </div>
                        </div>
                    </div>
                    <div className="toolbar">
                        <div className="drive-context">
                            <i className="fa-solid fa-hard-drive"></i>
                            <span>{getDriveShortName(activeDriveKey)}</span>
                        </div>
                        <div className="formatting-tools">
                            <button title="Bold" onClick={() => handleFormat('bold')} disabled={!isNoteEditable}><i className="fas fa-bold"></i></button>
                            <button title="Italic" onClick={() => handleFormat('italic')} disabled={!isNoteEditable}><i className="fas fa-italic"></i></button>
                            <button title="Underline" onClick={() => handleFormat('underline')} disabled={!isNoteEditable}><i className="fas fa-underline"></i></button>
                            <button title="Bullet List" onClick={() => handleFormat('insertUnorderedList')} disabled={!isNoteEditable}><i className="fas fa-list-ul"></i></button>
                            <button title="Numbered List" onClick={() => handleFormat('insertOrderedList')} disabled={!isNoteEditable}><i className="fas fa-list-ol"></i></button>
                        </div>
                        <div className="action-tools">
                            <button onClick={handleNewNote}><i className="fas fa-plus"></i><span>{createButtonLabel}</span></button>
                            <button id="mic-btn" onClick={toggleRecording} disabled={!isNoteEditable}><i className="fas fa-microphone"></i><span>Record</span></button>
                            <button onClick={handleSync}><i className="fas fa-cloud"></i><span>Sync</span></button>
                        </div>
                    </div>
                    <div className="notepad-editor-area">
                        <div id="recording-indicator" className="recording-indicator"><i className="fas fa-circle"></i> Recording...</div>
                        <div className="notepad">
                            <div
                                id="note-content"
                                ref={editorRef}
                                contentEditable={isNoteEditable}
                                onInput={handleContentChange}
                                onBlur={handleContentChange}
                            />
                        </div>
                        {activeNote?.content.type === 'text' && activeNote.content.audioData && (
                            <AudioPlayer audioData={activeNote.content.audioData} />
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default AgentNotepad;