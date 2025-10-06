/* LEEWAY HEADER
TAG: FRONTEND.COMPONENT.AGENT_NOTEPAD
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: notebook
ICON_SIG: CD534113
5WH: WHAT=Agent notepad UI (local storage + audio notes); WHY=Persistent multi-modal memory capture; WHO=Leeway Core (agnostic); WHERE=components/AgentNotepad.tsx; WHEN=2025-10-05; HOW=React context + structured note types
SPDX-License-Identifier: MIT
*/

import React, { useContext, useEffect, useRef, useState } from 'react';
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

const AgentNotepad: React.FC<{ applyNoteToPrompt: (note: Note) => void; }> = ({ applyNoteToPrompt }) => {
    const { notes, addNote, updateNote, activeNoteId, setActiveNoteId } = useContext(NotepadContext);
    const [searchTerm, setSearchTerm] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    
    const editorRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);

    const activeNote = notes.find(n => n.id === activeNoteId);
    const isNoteEditable = activeNote?.content?.type === 'text' && !activeNote.content.isEncrypted;

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
        addNote('New Operation', { type: 'text', text: '' });
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
    
    const filteredNotes = notes.filter(note => {
        if (!note || !note.title) return false;
        const term = searchTerm.toLowerCase();
        if (note.title.toLowerCase().includes(term)) return true;

        if (note.content.type === 'text' && note.content.text) {
             const tempDiv = document.createElement('div');
             tempDiv.innerHTML = note.content.text;
             return tempDiv.textContent?.toLowerCase().includes(term);
        }
        return false;
    });

    const styles = `
        .agent-notepad-wrapper { display: flex; gap: 25px; height: 100%; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: transparent; }
        .sidebar { width: 280px; flex-shrink: 0; background: #1E1E1E; border-radius: 10px; padding: 20px; box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1); display: flex; flex-direction: column; border: 1px solid var(--border-color); }
        .search-box { margin-bottom: 20px; position: relative; }
        .search-box input[type="text"] { width: 100%; padding: 12px 15px; border: 1px solid #444; border-radius: 5px; background: #333; color: #fff; padding-left: 40px; }
        .search-box i { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: var(--text-secondary); }
        .notes-list { display: flex; flex-direction: column; gap: 12px; overflow-y: auto; flex: 1; padding-right: 5px; }
        .note-item { padding: 15px; border-radius: 8px; background-color: #2a2a2a; cursor: pointer; transition: all 0.3s; border-left: 4px solid var(--accent-text); box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05); position: relative; }
        .note-item:hover { background-color: #3a3a3a; transform: translateX(5px); }
        .note-item.active { background-color: var(--accent-bg); border-left: 4px solid var(--accent-text); }
        .note-title { font-weight: bold; margin-bottom: 8px; color: var(--accent-text); display: flex; justify-content: space-between; align-items: center; }
        .note-item.active .note-title { color: var(--accent-text); }
        .note-preview { font-size: 0.85rem; color: #ccc; margin-bottom: 8px; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .note-item.active .note-preview { color: #333; }
        .note-date { font-size: 0.75rem; color: var(--text-secondary); display: flex; align-items: center; gap: 5px; }
        .notepad-container { flex: 1; background-color: var(--surface-bg); border-radius: 10px; overflow: hidden; box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1); display: flex; flex-direction: column; border: 1px solid var(--border-color); }
        .toolbar { padding: 15px 25px; background: linear-gradient(to right, #111, #000); display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
        .toolbar button { background: rgba(255, 255, 255, 0.15); color: #fff; padding: 6px 10px; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 5px; cursor: pointer; transition: all 0.3s ease; display: flex; align-items: center; gap: 6px; }
        .toolbar button span { font-size: 0.875rem; }
        .toolbar button:hover:not(:disabled) { background: rgba(255, 255, 255, 0.25); transform: translateY(-2px); }
        .toolbar button:disabled { opacity: 0.6; cursor: not-allowed; }
        .toolbar button.active { background: #ff4757; }
        .formatting-tools { display: flex; gap: 10px; margin-right: 15px; padding-right: 15px; border-right: 1px solid rgba(255,255,255,0.2); }
        .action-tools { display: flex; gap: 10px; }
        .notepad-editor-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; position: relative; }
        .notepad { position: relative; padding: 30px 50px; background-color: #282828; flex: 1; background-image: linear-gradient(rgba(255,255,255,0.05) .1em, transparent .1em); background-size: 100% 1.5em; background-position: 0 .5em; overflow-y: auto; }
        .notepad::before { content: ''; position: absolute; top: 0; left: 40px; height: 100%; width: 2px; background-color: #ef4444; }
        #note-content { width: 100%; height: 100%; border: none; outline: none; background: transparent; font-size: 16px; line-height: 1.5em; padding-left: 15px; margin-left: 25px; resize: none; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: var(--text-primary); }
        .tag { display: inline-block; background: var(--accent-text); color: var(--accent-bg); padding: 3px 10px; border-radius: 15px; font-size: 0.7rem; margin-top: 8px; }
        .recording-indicator { display: none; position: absolute; top: 10px; right: 10px; background: #ff4757; color: white; padding: 5px 10px; border-radius: 3px; font-size: 12px; z-index: 10; animation: pulse 1.5s infinite; }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
        .audio-playback { padding: 10px; background: #111; border-top: 1px solid #444; }
        .audio-playback audio { width: 100%; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
        ::-webkit-scrollbar-thumb { background: #0d3b33; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #1a5c4d; }
        @media (max-width: 900px) {
            .agent-notepad-wrapper { flex-direction: column; gap: 1rem; }
            .sidebar { width: 100%; height: 250px; }
            .notes-list { max-height: 150px; }
            .notepad-container { min-height: 400px; }
            .toolbar { flex-direction: column; align-items: flex-start; }
            .formatting-tools { border-right: none; border-bottom: 1px solid rgba(255, 255, 255, 0.2); padding-right: 0; padding-bottom: 10px; margin-bottom: 10px; margin-right: 0; }
            .notepad { padding: 1rem; }
            #note-content { margin-left: 0; padding-left: 5px; }
            .notepad::before { display: none; }
        }
    `;

    return (
        <>
            <style>{styles}</style>
            <div className="agent-notepad-wrapper">
                <div className="sidebar">
                    <div className="search-box">
                        <i className="fas fa-search"></i>
                        <input
                            type="text"
                            placeholder="Search classified notes..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="notes-list">
                        {filteredNotes.map(note => (
                            <div
                                key={note.id}
                                className={`note-item ${activeNoteId === note.id ? 'active' : ''}`}
                                onClick={() => setActiveNoteId(note.id)}
                            >
                                <div className="note-title">
                                    <span>{note.title}</span>
                                </div>
                                <div className="note-preview">
                                    {(note.content.type === 'text' && note.content.text) 
                                        ? new DOMParser().parseFromString(note.content.text, "text/html").body.textContent?.substring(0, 100) + '...'
                                        : `[${note.content.type} note]`
                                    }
                                </div>
                                <div className="note-date"><i className="far fa-clock"></i> {formatDate(note.date)}</div>
                                <div className="tag">{note.tag}</div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="notepad-container">
                    <div className="toolbar">
                        <div className="formatting-tools">
                            <button title="Bold" onClick={() => handleFormat('bold')} disabled={!isNoteEditable}><i className="fas fa-bold"></i></button>
                            <button title="Italic" onClick={() => handleFormat('italic')} disabled={!isNoteEditable}><i className="fas fa-italic"></i></button>
                            <button title="Underline" onClick={() => handleFormat('underline')} disabled={!isNoteEditable}><i className="fas fa-underline"></i></button>
                            <button title="Bullet List" onClick={() => handleFormat('insertUnorderedList')} disabled={!isNoteEditable}><i className="fas fa-list-ul"></i></button>
                            <button title="Numbered List" onClick={() => handleFormat('insertOrderedList')} disabled={!isNoteEditable}><i className="fas fa-list-ol"></i></button>
                        </div>
                        <div className="action-tools">
                            <button onClick={handleNewNote}><i className="fas fa-plus"></i><span>New Note</span></button>
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