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

/* ──────────────────────────────────────────────────────────────
     ExplorerShell — Windows-11 File Explorer wrapper
     Keeps your Notepad UI but skins the chrome + behaviors.
     Drop inside AgentNotepad.tsx (after imports).
     ────────────────────────────────────────────────────────────── */

const ExplorerShell: React.FC<{
    pathDisplay: string;
    itemCount: number;
    onNew: () => void;
    onRename?: () => void;
    onDelete?: () => void;
    viewMode?: 'details' | 'tiles' | 'icons';
    setViewMode?: (m: 'details'|'tiles'|'icons') => void;
    children: React.ReactNode;
}> = ({ pathDisplay, itemCount, onNew, onRename, onDelete, viewMode='details', setViewMode, children }) => {
    return (
        <div className="win-explorer">
            {/* Command Bar (Windows 11) */}
            <div className="win-explorer__commandbar" role="toolbar" aria-label="Explorer commands">
                <button className="wx-btn primary" onClick={onNew}>
                    <i className="fa-solid fa-folder-plus"></i>
                    <span>New</span>
                </button>
                <div className="wx-sep" />
                <button className="wx-btn" onClick={onRename} disabled>
                    <i className="fa-solid fa-i-cursor"></i>
                    <span>Rename</span>
                </button>
                <button className="wx-btn" onClick={onDelete} disabled>
                    <i className="fa-regular fa-trash-can"></i>
                    <span>Delete</span>
                </button>
                <div className="wx-sep" />
                <div className="wx-group">
                    <button className={`wx-btn ${viewMode==='details'?'active':''}`} onClick={()=>setViewMode?.('details')}>
                        <i className="fa-solid fa-list"></i>
                        <span>Details</span>
                    </button>
                    <button className={`wx-btn ${viewMode==='tiles'?'active':''}`} onClick={()=>setViewMode?.('tiles')}>
                        <i className="fa-solid fa-table-cells-large"></i>
                        <span>Tiles</span>
                    </button>
                    <button className={`wx-btn ${viewMode==='icons'?'active':''}`} onClick={()=>setViewMode?.('icons')}>
                        <i className="fa-regular fa-image"></i>
                        <span>Icons</span>
                    </button>
                </div>
                <div className="wx-flex-spacer" />
                    {/* Only one settings/tuning button should be shown. Remove duplicates. */}
            </div>

            {/* Address / Breadcrumb */}
            <div className="win-explorer__address">
                <i className="fa-regular fa-hdd"></i>
                <div className="wx-breadcrumb" role="navigation" aria-label="Breadcrumb">
                    <span className="crumb">{pathDisplay.split('://')[0]}</span>
                    <span className="sep">›</span>
                    <span className="crumb">{pathDisplay.split('://')[1] || ''}</span>
                </div>
                <div className="wx-addressbar" role="textbox" aria-label="Address bar">
                    {pathDisplay}
                </div>
            </div>

            {/* Body panes */}
            <div className="win-explorer__body">
                {/* Left navigation pane stays inside children (your drive cards) or could be separate */}
                {children}
            </div>

            {/* Status bar */}
            <div className="win-explorer__status">
                <div>{itemCount} items</div>
                <div className="wx-flex-spacer" />
                <div><i className="fa-regular fa-hard-drive"></i> Ready</div>
            </div>
        </div>
    );
};

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
/* ===== Windows-11 Explorer Chrome (glass + command bar) ===== */
.win-explorer {
    display: flex; flex-direction: column; height: 100%;
    background: rgba(28,28,28,0.55);
    backdrop-filter: blur(14px) saturate(1.05);
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 12px;
    box-shadow: 0 18px 30px rgba(0,0,0,0.35);
}

/* Command bar */
.win-explorer__commandbar{
    display:flex; align-items:center; gap:8px;
    padding:8px 10px;
    background: linear-gradient(180deg, rgba(40,40,40,.6), rgba(20,20,20,.6));
    border-bottom:1px solid rgba(255,255,255,.08);
}
.wx-btn{
    display:inline-flex; align-items:center; gap:8px;
    padding:8px 12px; font-size:.84rem; letter-spacing:.02em;
    background: rgba(255,255,255,.08);
    border:1px solid rgba(255,255,255,.12);
    border-radius:8px; color:#E8F7F0; cursor:pointer;
    transition:.18s ease;
}
.wx-btn:hover{ background: rgba(57,255,20,.22); color:#0b1f16; transform: translateY(-1px); }
.wx-btn.primary{ background: rgba(57,255,20,.18); border-color: rgba(57,255,20,.35); color:#39FF14; }
.wx-btn.primary:hover{ background: rgba(57,255,20,.28); color:#0b1f16; }
.wx-btn.active{ outline:2px solid rgba(57,255,20,.45) }
.wx-group{ display:flex; gap:6px }
.wx-sep{ width:1px; height:26px; background:rgba(255,255,255,.08) }
.wx-flex-spacer{ flex:1 }

/* Address / breadcrumb row */
.win-explorer__address{
    display:flex; align-items:center; gap:12px;
    padding:10px 14px; border-bottom:1px solid rgba(255,255,255,.08);
    background: linear-gradient(180deg, rgba(24,24,24,.55), rgba(16,16,16,.55));
    color:#C7FFD8;
}
.wx-breadcrumb{ display:flex; align-items:center; gap:8px; font-size:.88rem }
.wx-breadcrumb .crumb{ background: rgba(0,0,0,.35); padding:6px 10px; border-radius:6px; border:1px solid rgba(255,255,255,.12) }
.wx-breadcrumb .sep{ opacity:.5 }
.wx-addressbar{
    flex:1; margin-left:8px; padding:6px 12px;
    border:1px solid rgba(255,255,255,.12); border-radius:8px;
    background:rgba(0,0,0,.35); color:#C7FFD8; font-size:.86rem
}

/* Body: we’ll reuse your left sidebar + right notepad but in a two-column Explorer grid */
.win-explorer__body{
    display:grid; grid-template-columns: 320px 1fr; gap:14px;
    padding:14px;
}

/* Status bar */
.win-explorer__status{
    display:flex; align-items:center; gap:12px;
    padding:8px 12px; border-top:1px solid rgba(255,255,255,.08);
    background: linear-gradient(0deg, rgba(24,24,24,.55), rgba(16,16,16,.55));
    color:#C7FFD8; font-size:.82rem
}

/* ===== Your existing Notepad/Drive styles (kept + lightly adjusted) ===== */
.agent-notepad-wrapper { display: contents; }
.sidebar { width: 100%; background: #121212; border-radius: 12px; padding: 14px; box-shadow: 0 12px 24px rgba(0,0,0,0.25); display: flex; flex-direction: column; border: 1px solid rgba(57,255,20,0.25); }
.drive-cabinet { background: rgba(12,40,32,0.85); border: 1px solid rgba(57,255,20,0.35); border-radius: 10px; padding: 12px; margin-bottom: 10px; }
.drive-cabinet-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.drive-cabinet-title { font-size: 0.9rem; font-weight: 600; color: #39FF14; text-transform: uppercase; letter-spacing: 0.08em; }
.drive-cabinet-subtitle { font-size: 0.72rem; color: rgba(199,255,216,0.85); }
.drive-reset { display: flex; align-items: center; gap: 6px; padding: 6px 10px; background: rgba(255,255,255,0.12); color: #C7FFD8; border: 1px solid rgba(255,255,255,0.18); border-radius: 6px; cursor: pointer; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; transition: all 0.2s ease; }
.drive-reset.active, .drive-reset:hover { background: rgba(57,255,20,0.25); color: #111; }
.drive-grid { display: grid; grid-template-columns: 1fr; gap: 8px; }
.drive-card { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; background: rgba(17,25,22,0.9); border: 1px solid rgba(255,255,255,0.08); border-left: 4px solid transparent; padding: 10px; border-radius: 10px; cursor: pointer; transition: all 0.2s ease; color: #e2f7f0; text-align: left; }
.drive-card .drive-pill { display: flex; align-items: center; gap: 6px; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(199,255,216,0.9); }
.drive-card .drive-label { font-size: 0.9rem; font-weight: 600; color: #f5fff9; }
.drive-card .drive-count { font-size: 0.75rem; color: rgba(199,255,216,0.75); }
.drive-card .drive-description { font-size: 0.72rem; color: rgba(199,255,216,0.6); line-height: 1.3; }
.drive-card:hover { background: rgba(57,255,20,0.12); }
.drive-card.active { background: rgba(57,255,20,0.18); border-color: rgba(57,255,20,0.45); }
.accent-lee { border-left-color: #39FF14; }
.accent-l { border-left-color: #0DFF94; }
.accent-e { border-left-color: #20C997; }
.accent-o { border-left-color: #38BDF8; }
.accent-n { border-left-color: #FBBF24; }
.accent-a { border-left-color: #FF6B6B; }
.accent-r { border-left-color: #A855F7; }
.accent-d { border-left-color: #F87171; }
.search-box { margin-bottom: 12px; position: relative; }
.search-box input[type="text"] { width: 100%; padding: 10px 12px 10px 38px; border: 1px solid #2f4941; border-radius: 8px; background: rgba(20,50,40,0.8); color: #C7FFD8; }
.search-box i { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: rgba(199,255,216,0.65); }
.notes-list { display:flex; flex-direction:column; gap:8px; overflow-y:auto; flex:1; padding-right:6px; }
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
.notepad-container { background-color: rgba(16,29,26,0.95); border-radius: 12px; overflow: hidden; box-shadow: 0 18px 30px rgba(0, 0, 0, 0.35); display: flex; flex-direction: column; border: 1px solid rgba(255,255,255,0.08); }
.notepad-info{ display:none }
    /* Hide legacy toolbar to avoid duplicate top controls with ExplorerShell */
    .toolbar { display: none; }
    /* Legacy toolbar descendants no longer visible */
.notepad-editor-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; position: relative; }
.notepad { position: relative; padding: 24px 30px; background-color: rgba(24,33,30,0.9); flex: 1;  background-image: linear-gradient(rgba(255,255,255,0.06) .1em, transparent .1em); background-size: 100% 1.6em; background-position: 0 .6em; overflow-y: auto; }
#note-content { width: 100%; min-height: 100%; border: none; outline: none; background: transparent; font-size: 16px; line-height: 1.6em; color: #f5fff9; }
.recording-indicator { display:none; position:absolute; top:10px; right:12px; background:#ff4757; color:#fff; padding:6px 12px; border-radius:999px; font-size:12px; z-index:10; animation:pulse 1.5s infinite; letter-spacing:.05em; text-transform:uppercase }
@keyframes pulse { 0%{opacity:1} 50%{opacity:.5} 100%{opacity:1} }
.audio-playback{ padding:12px 24px 24px; background:#0d1412; border-top:1px solid rgba(255,255,255,0.08) }
::-webkit-scrollbar{ width:8px } ::-webkit-scrollbar-track{ background:#0b1613; border-radius:10px } ::-webkit-scrollbar-thumb{ background:#0d3b33; border-radius:10px } ::-webkit-scrollbar-thumb:hover{ background:#1a5c4d }

/* Responsive */
@media (max-width: 980px){
    .win-explorer__body{ grid-template-columns: 1fr; }
}
`;

    const [viewMode, setViewMode] = useState<'details'|'tiles'|'icons'>('details');
    const totalItems = filteredNotes.length;

    return (
        <>
            <style>{styles}</style>
            <ExplorerShell
              pathDisplay={drivePathDisplay}
              itemCount={totalItems}
              onNew={handleNewNote}
              onRename={() => {}}
              onDelete={() => {}}
              viewMode={viewMode}
              setViewMode={setViewMode}
            >
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
            </ExplorerShell>
        </>
    );
};

export default AgentNotepad;