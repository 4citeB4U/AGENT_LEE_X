/*
LEEWAY HEADER — DO NOT REMOVE
REGION: UI.UNKNOWN
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_ASCII: family=lucide glyph=layout-dashboard ICON_SIG=CD534113
5WH: WHAT=Module: Settings.tsx; WHY=standardize; WHO=RapidWebDevelop; WHERE=F:\4leeway-multitool\components\Settings.tsx; WHEN=2025-10-05; HOW=React/Tailwind
SIG: 00000000
AGENTS: AZR, PHI3, GEMINI, QWEN, LLAMA, ECHO
SPDX-License-Identifier: MIT
*/

import React, { useState, useEffect, useContext } from 'react';
import { NotepadContext } from '../contexts/NotepadContext';
import type { Note, TransmissionLogEntry, Contact } from '../types';
import { mdToHtml } from '../utils/markdown';
import * as ttsService from '../services/ttsService';

interface SettingsProps {
    transmissionLog: TransmissionLogEntry[];
    userName: string | null;
}

const Settings: React.FC<SettingsProps> = ({ transmissionLog, userName }) => {
    const { notes, deleteAllNotes, importNotes } = useContext(NotepadContext);
    const [theme, setTheme] = useState(() => localStorage.getItem('agent-lee-theme') || 'onyx-gold');
    const [viewingNote, setViewingNote] = useState<Note | null>(null);
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    
    // Voice state management
    const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [isLoadingVoices, setIsLoadingVoices] = useState(true);
    const [favoriteVoices, setFavoriteVoices] = useState<string[]>([]);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    
    // NEW: State for Contacts
    const [contacts, setContacts] = useState<Contact[]>(() => {
        try {
            return JSON.parse(localStorage.getItem('agent-lee-contacts') || '[]');
        } catch { return []; }
    });
    const [newContactName, setNewContactName] = useState('');
    const [newContactPhone, setNewContactPhone] = useState('');


    // State for active (saved) voice settings
    const [activeVoiceURI, setActiveVoiceURI] = useState(() => localStorage.getItem('agent-lee-voice-uri') || '');
    const [activeRate, setActiveRate] = useState(() => parseFloat(localStorage.getItem('agent-lee-voice-rate') || '1.0'));
    const [activePitch, setActivePitch] = useState(() => parseFloat(localStorage.getItem('agent-lee-voice-pitch') || '1.3'));
    const [activeVolume, setActiveVolume] = useState(() => parseFloat(localStorage.getItem('agent-lee-voice-volume') || '0.8'));
    const [activeNaturalness, setActiveNaturalness] = useState(() => parseFloat(localStorage.getItem('agent-lee-voice-naturalness') || '0.5'));


    // State for pending (unsaved) voice settings in the UI
    const [pendingVoiceURI, setPendingVoiceURI] = useState(activeVoiceURI);
    const [pendingRate, setPendingRate] = useState(activeRate);
    const [pendingPitch, setPendingPitch] = useState(activePitch);
    const [pendingVolume, setPendingVolume] = useState(activeVolume);
    const [pendingNaturalness, setPendingNaturalness] = useState(activeNaturalness);



    useEffect(() => {
        const savedFavorites = localStorage.getItem('agent-lee-favorite-voices');
        if (savedFavorites) {
            try {
                const parsedFavorites = JSON.parse(savedFavorites);
                if (Array.isArray(parsedFavorites)) {
                    setFavoriteVoices(parsedFavorites);
                }
            } catch {
                console.error("Could not parse favorite voices from localStorage.");
            }
        }
    }, []);

    useEffect(() => {
        document.body.className = `theme-${theme}`;
        localStorage.setItem('agent-lee-theme', theme);
    }, [theme]);
    
    useEffect(() => {
        const loadAndSetVoices = async () => {
            setIsLoadingVoices(true);
            try {
                const voices = await ttsService.getAvailableVoices();
                setAvailableVoices(voices);

                const savedVoiceURI = localStorage.getItem('agent-lee-voice-uri');
                if (savedVoiceURI && voices.some(v => v.voiceURI === savedVoiceURI)) {
                    setActiveVoiceURI(savedVoiceURI);
                    setPendingVoiceURI(savedVoiceURI);
                } else if (voices.length > 0) {
                    // This will trigger the default voice logic in ttsService
                    const defaultVoiceURI = localStorage.getItem('agent-lee-voice-uri') || '';
                     if (defaultVoiceURI) {
                        setActiveVoiceURI(defaultVoiceURI);
                        setPendingVoiceURI(defaultVoiceURI);
                     }
                }
            } catch(e) {
                console.error("Could not load voices for settings panel", e);
            } finally {
                setIsLoadingVoices(false);
            }
        };
        loadAndSetVoices();
    }, []);

    const handlePendingVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setPendingVoiceURI(e.target.value);
    };
    
    const handleSaveVoice = async () => {
        if (areSettingsUnchanged) return;
        
        setSaveStatus('saving');
        localStorage.setItem('agent-lee-voice-uri', pendingVoiceURI);
        localStorage.setItem('agent-lee-voice-rate', String(pendingRate));
        localStorage.setItem('agent-lee-voice-pitch', String(pendingPitch));
        localStorage.setItem('agent-lee-voice-volume', String(pendingVolume));
        localStorage.setItem('agent-lee-voice-naturalness', String(pendingNaturalness));


        await ttsService.refreshSelectedVoice();
        
        // Interrupt current speech to apply the new voice immediately on the next utterance.
        ttsService.cancel();
        
        setActiveVoiceURI(pendingVoiceURI);
        setActiveRate(pendingRate);
        setActivePitch(pendingPitch);
        setActiveVolume(pendingVolume);
        setActiveNaturalness(pendingNaturalness);

        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
    };
    
    const handleSetFavoriteAsDefault = (voiceURI: string) => {
        setPendingVoiceURI(voiceURI);
    };

    const handleAddToFavorites = () => {
        if (pendingVoiceURI && !favoriteVoices.includes(pendingVoiceURI) && favoriteVoices.length < 6) {
            const newFavorites = [...favoriteVoices, pendingVoiceURI];
            setFavoriteVoices(newFavorites);
            localStorage.setItem('agent-lee-favorite-voices', JSON.stringify(newFavorites));
        }
    };

    const handleRemoveFromFavorites = (voiceURI: string) => {
        const newFavorites = favoriteVoices.filter(v => v !== voiceURI);
        setFavoriteVoices(newFavorites);
        localStorage.setItem('agent-lee-favorite-voices', JSON.stringify(newFavorites));
    };

    const getVoiceFromURI = (uri: string): SpeechSynthesisVoice | undefined => {
        return availableVoices.find(v => v.voiceURI === uri);
    };

    const handleTestVoice = () => {
        if (pendingVoiceURI) {
            ttsService.testVoice("This is the selected voice for Agent Lee.", pendingVoiceURI, pendingRate, pendingPitch, pendingVolume, pendingNaturalness);
        }
    };
    
    const handleResetUser = () => {
        if (window.confirm("This will reset your stored name and restart the application's onboarding process. Are you sure?")) {
            localStorage.removeItem('userName');
            localStorage.removeItem('agent-lee-transmission-log');
            localStorage.removeItem('onboardingComplete'); // Ensure full reset
            window.location.reload();
        }
    };

    const handleExport = () => {
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
            JSON.stringify(notes, null, 2)
        )}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = `agent-lee-notes-backup-${new Date().toISOString()}.json`;
        link.click();
    };
    
    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedNotes = JSON.parse(e.target?.result as string);
                if (Array.isArray(importedNotes)) { // Basic validation
                    importNotes(importedNotes);
                    alert(`${importedNotes.length} notes imported successfully!`);
                } else {
                     alert('Invalid notes file format.');
                }
            } catch (error) {
                 alert('Error reading or parsing the file.');
            }
        };
        reader.readAsText(file);
    };

    const themes = [
        { id: 'onyx-gold', name: 'Onyx & Gold', bg: 'linear-gradient(135deg, #121212 0%, #000000 100%)' },
        { id: 'midnight', name: 'Midnight', bg: 'linear-gradient(135deg, #1a202c 0%, #2d3748 100%)' },
        { id: 'slate', name: 'Slate', bg: 'linear-gradient(135deg, #334155 0%, #475569 100%)' },
        { id: 'nebula', name: 'Nebula', bg: 'linear-gradient(135deg, #4c1d95 0%, #5b21b6 100%)' },
    ];

    const groupVoices = (voices: SpeechSynthesisVoice[]) => {
        const groups: { [key: string]: SpeechSynthesisVoice[] } = {
            'Apple': [],
            'Google / Chrome': [],
            'Microsoft': [],
            'Other': [],
        };

        voices.forEach(voice => {
            const name = voice.name.toLowerCase();
            if (name.includes('apple')) {
                groups['Apple'].push(voice);
            } else if (name.includes('google') || name.includes('chrome')) {
                groups['Google / Chrome'].push(voice);
            } else if (name.includes('microsoft')) {
                groups['Microsoft'].push(voice);
            } else {
                groups['Other'].push(voice);
            }
        });

        for (const key in groups) {
            if (groups[key].length === 0) {
                delete groups[key];
            }
        }
        return groups;
    };

    const groupedVoices = groupVoices(availableVoices);

    const renderNoteContentForModal = (note: Note) => {
        switch (note.content.type) {
            case 'text':
            case 'analysis':
            case 'call':
                if (note.content.isEncrypted) {
                    return <div className="text-center p-4 bg-gray-100 rounded-md"><i className="fas fa-lock mr-2"></i>Encrypted Content</div>;
                }
                return <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: mdToHtml(note.content.text) }} />;
            case 'image':
                return (
                    <div>
                        <p className="mb-2 p-2 bg-gray-100 rounded-md"><strong>Prompt:</strong> {note.content.prompt}</p>
                        <img src={note.content.imageUrl} alt={note.content.prompt} className="max-w-full rounded-md border" />
                    </div>
                );
            case 'research':
                return (
                    <div>
                        <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: mdToHtml(note.content.text) }} />
                        {note.content.sources.length > 0 && (
                            <div className="mt-4 pt-4 border-t">
                                <h4 className="font-semibold mb-2">Sources</h4>
                                <ul className="list-none p-0 space-y-1">
                                    {note.content.sources.map((s, i) =>
                                        s.web?.uri ? (
                                        <li key={i}>
                                            <a href={s.web.uri} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline break-words">
                                                {s.web.title || s.web.uri}
                                            </a>
                                        </li>) : null
                                    )}
                                </ul>
                            </div>
                        )}
                    </div>
                );
             case 'memory':
                return (
                    <div className="space-y-4">
                        <div>
                            <h4 className="font-semibold text-gray-600">User Prompt:</h4>
                            <p className="p-2 bg-gray-100 rounded-md border">{note.content.userPrompt}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-600">Agent Response:</h4>
                             <div className="p-2 bg-blue-50 rounded-md border border-blue-200 prose max-w-none" dangerouslySetInnerHTML={{__html: mdToHtml(note.content.agentResponse)}} />
                        </div>
                    </div>
                );
            default:
                return <p>Unsupported note format.</p>;
        }
    };
    
    // NEW: Handlers for Contacts
    useEffect(() => {
        localStorage.setItem('agent-lee-contacts', JSON.stringify(contacts));
    }, [contacts]);

    const handleAddContact = (e: React.FormEvent) => {
        e.preventDefault();
        if (newContactName.trim() && newContactPhone.trim()) {
            const newContact: Contact = {
                id: Date.now(),
                name: newContactName.trim(),
                phone: newContactPhone.trim(),
            };
            setContacts(prev => [...prev, newContact]);
            setNewContactName('');
            setNewContactPhone('');
        }
    };

    const handleDeleteContact = (id: number) => {
        if (window.confirm("Are you sure you want to delete this contact?")) {
            setContacts(prev => prev.filter(c => c.id !== id));
        }
    };

    
    const canAddSelectedVoice = pendingVoiceURI && !favoriteVoices.includes(pendingVoiceURI) && favoriteVoices.length < 6;
    const areSettingsUnchanged = pendingVoiceURI === activeVoiceURI && pendingRate === activeRate && pendingPitch === activePitch && pendingVolume === activeVolume && pendingNaturalness === activeNaturalness;

    const getSpeakerStyle = (speaker: 'USER' | 'AGENT' | 'SYSTEM') => {
        switch (speaker) {
            case 'USER': return { color: '#63b3ed', prefix: 'YOU: ' };
            case 'AGENT': return { color: '#28a745', prefix: 'LEE: ' };
            case 'SYSTEM': return { color: '#d4af37', prefix: 'SYS: ' };
            default: return { color: '#fff', prefix: '' };
        }
    };

    return (
        <div className="p-4 sm:p-6 text-gray-200 h-full overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-white border-b border-gray-700 pb-2">Settings</h2>
            
            <div className="mb-8">
                <h3 className="text-xl font-semibold mb-3 text-gray-100">Appearance</h3>
                <p className="mb-4 text-gray-400">Select a theme for the application.</p>
                <div className="flex flex-wrap gap-4">
                    {themes.map(t => (
                        <div key={t.id} onClick={() => setTheme(t.id)} className="cursor-pointer">
                            <div
                                className="w-24 h-16 rounded-lg border-2 transition-all"
                                style={{ background: t.bg, borderColor: theme === t.id ? '#d4af37' : 'transparent', transform: theme === t.id ? 'scale(1.1)' : 'scale(1)' }}
                            />
                            <p className={`text-center mt-2 font-medium ${theme === t.id ? 'text-white' : 'text-gray-400'}`}>{t.name}</p>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="mb-8">
                <h3 className="text-xl font-semibold mb-3 text-gray-100">Contacts</h3>
                <p className="mb-4 text-gray-400">Manage your contacts for quick call actions.</p>
                <div className="max-w-md bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                    <form onSubmit={handleAddContact} className="flex gap-2 mb-4">
                        <input type="text" placeholder="Name" value={newContactName} onChange={e => setNewContactName(e.target.value)} required className="flex-grow p-2 border border-gray-600 rounded-md bg-gray-700 text-white" />
                        <input type="tel" placeholder="Phone Number" value={newContactPhone} onChange={e => setNewContactPhone(e.target.value)} required className="flex-grow p-2 border border-gray-600 rounded-md bg-gray-700 text-white" />
                        <button type="submit" className="p-2 px-4 bg-indigo-600 text-white rounded-md font-semibold hover:bg-indigo-700"><i className="fas fa-plus"></i></button>
                    </form>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {contacts.length > 0 ? contacts.map(contact => (
                            <div key={contact.id} className="flex justify-between items-center p-2 bg-gray-700/50 rounded-md border border-gray-600">
                                <div>
                                    <p className="font-semibold text-gray-100">{contact.name}</p>
                                    <p className="text-sm text-gray-400">{contact.phone}</p>
                                </div>
                                <button onClick={() => handleDeleteContact(contact.id)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-900/50 rounded-full">
                                    <i className="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        )) : <p className="text-center text-sm text-gray-500 py-2">No contacts saved.</p>}
                    </div>
                </div>
            </div>

            <div className="mb-8">
                <h3 className="text-xl font-semibold mb-3 text-gray-100">Agent Voice</h3>
                <p className="mb-4 text-gray-400">Choose the voice for Agent Lee's verbal transmissions. Voice quality depends on your browser and operating system.</p>
                
                <h4 className="text-lg font-semibold mt-6 mb-2 text-gray-200">Favorite Voices (Max 6)</h4>
                <div className="p-3 bg-gray-800/50 rounded-lg min-h-[60px] border border-gray-700">
                    {favoriteVoices.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {favoriteVoices.map(uri => {
                                const voice = getVoiceFromURI(uri);
                                if (!voice) return null; // Should not happen if data is clean
                                return (
                                    <div key={uri} className={`relative group pl-3 pr-2 py-1 border rounded-full flex items-center gap-2 transition-colors ${pendingVoiceURI === uri ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-700 border-gray-600'}`}>
                                        <button onClick={() => handleSetFavoriteAsDefault(uri)} className="flex-grow text-left">
                                            <span className="font-medium text-sm">{voice.name}</span>
                                        </button>
                                        <button onClick={() => handleRemoveFromFavorites(uri)} className={`w-5 h-5 flex items-center justify-center rounded-full text-xs ${pendingVoiceURI === uri ? 'text-indigo-200 hover:bg-indigo-700 hover:text-white' : 'text-gray-400 hover:bg-red-500 hover:text-white'}`}>
                                           <i className="fas fa-times"></i>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-center text-gray-500 py-2">Add voices from the dropdown to create a quick-access list.</p>
                    )}
                </div>

                <h4 className="text-lg font-semibold mt-6 mb-2 text-gray-200">Voice Tuning</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                    <div>
                        <label htmlFor="voice-rate" className="block text-sm font-medium text-gray-300">Rate: <span className="font-bold">{pendingRate.toFixed(1)}</span></label>
                        <input id="voice-rate" type="range" min="0.5" max="2" step="0.1" value={pendingRate} onChange={e => setPendingRate(parseFloat(e.target.value))} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer" />
                    </div>
                     <div>
                        <label htmlFor="voice-pitch" className="block text-sm font-medium text-gray-300">Pitch / Depth: <span className="font-bold">{pendingPitch.toFixed(1)}</span></label>
                        <input id="voice-pitch" type="range" min="0" max="2" step="0.1" value={pendingPitch} onChange={e => setPendingPitch(parseFloat(e.target.value))} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer" />
                    </div>
                    <div>
                        <label htmlFor="voice-volume" className="block text-sm font-medium text-gray-300">Volume: <span className="font-bold">{pendingVolume.toFixed(1)}</span></label>
                        <input id="voice-volume" type="range" min="0" max="1" step="0.1" value={pendingVolume} onChange={e => setPendingVolume(parseFloat(e.target.value))} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer" />
                    </div>
                    <div>
                        <label htmlFor="voice-naturalness" className="block text-sm font-medium text-gray-300">Naturalness: <span className="font-bold">{pendingNaturalness.toFixed(1)}</span></label>
                        <input id="voice-naturalness" type="range" min="0" max="1" step="0.1" value={pendingNaturalness} onChange={e => setPendingNaturalness(parseFloat(e.target.value))} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer" />
                    </div>
                </div>
                <p className="text-xs text-gray-500 -mt-2 mb-4">Note: Voice characteristics like pitch and rate are dependent on the selected voice and browser. Some voices may not support all adjustments.</p>


                <h4 className="text-lg font-semibold mt-6 mb-2 text-gray-200">All Voices</h4>
                {isLoadingVoices ? (
                     <p className="text-gray-400 bg-gray-800 p-3 rounded-md">Loading available voices...</p>
                ) : availableVoices.length > 0 ? (
                    <div className="flex items-center gap-2 flex-wrap">
                        <select
                            value={pendingVoiceURI}
                            onChange={handlePendingVoiceChange}
                            className="flex-grow p-3 bg-gray-700 border border-gray-600 text-white rounded-lg cursor-pointer min-w-[200px]"
                        >
                            {Object.entries(groupedVoices).map(([groupName, voices]) => (
                                <optgroup label={groupName} key={groupName}>
                                    {voices.map(voice => (
                                        <option key={voice.voiceURI} value={voice.voiceURI}>
                                            {voice.name} ({voice.lang})
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                        <button 
                            onClick={handleAddToFavorites}
                            disabled={!canAddSelectedVoice}
                            title={favoriteVoices.includes(pendingVoiceURI) ? "Voice is already a favorite" : (favoriteVoices.length >= 6 ? "Favorites list is full" : "Add to Favorites")}
                            className="p-3 bg-gray-600 text-gray-100 rounded-lg hover:bg-gray-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed whitespace-nowrap font-semibold"
                        >
                            <i className="far fa-star mr-2"></i> Add
                        </button>
                        <button onClick={handleTestVoice} className="p-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 whitespace-nowrap font-semibold">
                           Test
                        </button>
                        <button 
                            onClick={handleSaveVoice} 
                            disabled={saveStatus !== 'idle' || areSettingsUnchanged}
                            className="p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-800 disabled:text-gray-400 disabled:cursor-not-allowed whitespace-nowrap font-semibold min-w-[90px]"
                        >
                           {saveStatus === 'saved' ? 'Saved!' : 'Save'}
                        </button>
                    </div>
                ) : (
                    <p className="text-gray-400 bg-gray-800 p-3 rounded-md">No voices available or speech synthesis is not supported by your browser.</p>
                )}
            </div>
            
            <div className="mb-8">
                <h3 className="text-xl font-semibold mb-3 text-gray-100">User Profile</h3>
                 <p className="mb-4 text-gray-400">Manage your user identity within the application.</p>
                <div className="space-y-4 max-w-md">
                     <button onClick={handleResetUser} className="w-full text-left p-4 bg-yellow-900/50 hover:bg-yellow-900/70 rounded-lg transition-colors flex items-center gap-4 border border-yellow-700">
                        <i className="fas fa-user-slash text-xl text-yellow-400"></i>
                        <div>
                            <span className="font-semibold text-yellow-300">Reset User Profile</span>
                            <p className="text-sm text-yellow-400">Forget your stored name and restart the onboarding process.</p>
                        </div>
                    </button>
                </div>
            </div>

            <div className="mb-8">
                <h3 className="text-xl font-semibold mb-3 text-gray-100">Data Management</h3>
                 <p className="mb-4 text-gray-400">Export, import, or delete your saved notes.</p>
                <div className="space-y-4 max-w-md">
                    <button onClick={handleExport} className="w-full text-left p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-4 border border-gray-700">
                        <i className="fas fa-file-export text-xl text-gray-300"></i>
                        <div>
                            <span className="font-semibold">Export All Notes</span>
                            <p className="text-sm text-gray-400">Save all your notes to a local JSON file.</p>
                        </div>
                    </button>
                    
                    <label className="w-full text-left p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-4 cursor-pointer border border-gray-700">
                        <i className="fas fa-file-import text-xl text-gray-300"></i>
                         <div>
                            <span className="font-semibold">Import Notes</span>
                            <p className="text-sm text-gray-400">Load notes from a JSON backup file.</p>
                        </div>
                        <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                    </label>

                    <button onClick={deleteAllNotes} className="w-full text-left p-4 bg-red-900/50 hover:bg-red-900/70 rounded-lg transition-colors flex items-center gap-4 border border-red-700">
                        <i className="fas fa-trash-alt text-xl text-red-400"></i>
                         <div>
                            <span className="font-semibold text-red-300">Delete All Notes</span>
                            <p className="text-sm text-red-400">Permanently delete all notes. This cannot be undone.</p>
                        </div>
                    </button>
                </div>
            </div>

             <div className="mb-8">
                <h3 className="text-xl font-semibold mb-3 text-gray-100">Transmission Logs</h3>
                <p className="mb-4 text-gray-400">Review your persisted conversation history with Agent Lee.</p>
                 <button onClick={() => setIsLogModalOpen(true)} className="w-full max-w-md text-left p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-4 border border-gray-700">
                    <i className="fas fa-history text-xl text-gray-300"></i>
                    <div>
                        <span className="font-semibold">View Session Log</span>
                        <p className="text-sm text-gray-400">Open a log of the current session's transmissions.</p>
                    </div>
                </button>
            </div>

            <div className="mt-8">
                <h3 className="text-xl font-semibold mb-3 text-gray-100">Intelligence Archive</h3>
                <p className="mb-4 text-gray-400">Review, manage, and retrieve all saved intelligence briefs.</p>
                <div className="space-y-2 max-w-full bg-gray-800/50 p-3 rounded-lg border border-gray-700 max-h-96 overflow-y-auto">
                    {notes.length > 0 ? notes.map(note => (
                        <button key={note.id} onClick={() => setViewingNote(note)} className="w-full text-left p-3 bg-gray-700/50 hover:bg-gray-700 rounded-md transition-colors border border-gray-600 flex justify-between items-center shadow-sm">
                            <div>
                                <span className="font-semibold text-gray-100">{note.title}</span>
                                <p className="text-sm text-gray-400">{note.date}</p>
                            </div>
                            <span className="text-sm text-gray-300 capitalize bg-gray-600 px-2 py-1 rounded-full">{note.tag === 'MEMORY' ? 'Memory' : note.content.type}</span>
                        </button>
                    )) : (
                        <p className="text-center text-gray-500 p-4">No intelligence saved yet. Use the "Save Result" button to archive content here.</p>
                    )}
                </div>
            </div>

            {viewingNote && (
                 <div className="ai-modal-backdrop" onClick={() => setViewingNote(null)}>
                    <div className="ai-modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-2xl font-bold mb-4 text-white border-b border-gray-700 pb-2">{viewingNote.title}</h2>
                        <div className="max-h-[60vh] overflow-y-auto pr-2 text-gray-300">
                           {renderNoteContentForModal(viewingNote)}
                        </div>
                        <button onClick={() => setViewingNote(null)} className="mt-6 bg-gray-700 text-white px-4 py-2 rounded-md float-right hover:bg-gray-600 transition-colors">Close</button>
                    </div>
                </div>
            )}
            
            {isLogModalOpen && (
                 <div className="ai-modal-backdrop" onClick={() => setIsLogModalOpen(false)}>
                    <div className="ai-modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-2xl font-bold mb-4 text-white border-b pb-2 border-gray-700">Transmission Log</h2>
                        <div className="max-h-[60vh] overflow-y-auto pr-2 bg-black text-white font-mono p-4 rounded-md">
                            {transmissionLog.length > 0 ? transmissionLog.map(entry => {
                                const { color, prefix } = getSpeakerStyle(entry.speaker);
                                return (
                                    <div key={entry.id} className="whitespace-pre-wrap mb-2">
                                        <div className="text-xs opacity-60">{new Date(entry.timestamp).toLocaleString()}</div>
                                        <div style={{ color }}>
                                            <span className="font-bold">{prefix}</span>
                                            <span>{entry.text}</span>
                                        </div>
                                    </div>
                                );
                            }) : <p className="text-gray-400">No transmissions logged in this session yet.</p>}
                        </div>
                        <button onClick={() => setIsLogModalOpen(false)} className="mt-6 bg-gray-700 text-white px-4 py-2 rounded-md float-right hover:bg-gray-600 transition-colors">Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;