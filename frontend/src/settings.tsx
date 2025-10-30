import React, { useState, useEffect, useMemo, createContext, useContext } from 'react';
import ReactDOM from 'react-dom/client';

// -----------------------------------------------------------------------------
// TYPES (from types.ts)
// -----------------------------------------------------------------------------
export interface Contact {
  id: number;
  name: string;
  phone: string;
}

export interface Note {
  id: number | string;
  title: string;
  date: string;
  tag: string;
  content: any;
}

export interface TransmissionLogEntry {
  id: number | string;
  speaker: 'USER' | 'AGENT' | 'SYSTEM';
  text: string;
  timestamp: number;
}


// -----------------------------------------------------------------------------
// ICONS (from components/settings/icons.tsx)
// -----------------------------------------------------------------------------
const iconProps = {
  className: "w-5 h-5 shrink-0",
  strokeWidth: 2,
};

const AppearanceIcon = () => (
  <svg {...iconProps} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0L12 2.69z"></path></svg>
);
const VoiceIcon = () => (
  <svg {...iconProps} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"></path><path d="M19 10v2a7 7 0 01-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line></svg>
);
const NetworkIcon = () => (
    <svg {...iconProps} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 8V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h8"></path><path d="M10 12H2"></path><path d="M17 12h-2a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1z"></path><path d="M22 12h-2a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1z"></path><path d="M14.5 19.5 12 22l-2.5-2.5"></path><path d="m12 15-2-2"></path><path d="m12 15 2-2"></path><path d="M12 15v7"></path></svg>
);
const DataIcon = () => (
  <svg {...iconProps} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
);
const PermissionsIcon = () => (
  <svg {...iconProps} viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
);
const KeysIcon = () => (
    <svg {...iconProps} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m21.73 18.27-1.42 1.42-2.83-2.83-1.42 1.42a2 2 0 1 1-2.83-2.83l1.42-1.42-2.83-2.83 1.42-1.42a2 2 0 1 1 2.83 2.83l-1.42 1.42 2.83 2.83 1.42-1.42a2 2 0 1 1 2.83 2.83z"></path><path d="M4 11.5 2 13.5a2 2 0 1 0 2.83 2.83L6.25 15"></path></svg>
);
const LogIcon = () => (
    <svg {...iconProps} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 6h16M4 12h16M4 18h16"></path></svg>
);
const ContactsIcon = () => (
    <svg {...iconProps} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 18a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2"></path><rect x="3" y="4" width="18" height="18" rx="2"></rect><circle cx="12" cy="10" r="2"></circle><line x1="8" y1="2" x2="8" y2="4"></line><line x1="16" y1="2" x2="16" y2="4"></line></svg>
);

// -----------------------------------------------------------------------------
// SERVICES (from services/ttsService.ts)
// -----------------------------------------------------------------------------
const ttsService = {
  async getAvailableVoices(): Promise<SpeechSynthesisVoice[]> {
    const synth = window.speechSynthesis;
    if (!synth) return [];
    
    const getVoicesPromise = (): Promise<SpeechSynthesisVoice[]> => {
      return new Promise(resolve => {
        const voices = synth.getVoices();
        if (voices.length) {
          resolve(voices);
          return;
        }
        synth.onvoiceschanged = () => resolve(synth.getVoices());
      });
    };

    try {
      const voices = await getVoicesPromise();
      return voices || [];
    } catch {
      return [];
    }
  },

  refreshSelectedVoice() {},

  cancel() {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  },

  testVoice(text: string, uri: string, rate = 1.0, pitch = 1.2, volume = 0.8) {
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      const u = new SpeechSynthesisUtterance(text);
      const voice = synth.getVoices().find(v => v.voiceURI === uri);
      if (voice) u.voice = voice;
      u.rate = rate;
      u.pitch = pitch;
      u.volume = volume;
      synth.cancel();
      synth.speak(u);
    } catch {}
  },
};

// -----------------------------------------------------------------------------
// CONTEXT (from contexts/NotepadContext.tsx)
// -----------------------------------------------------------------------------
interface NotepadContextType {
  notes: Note[];
  deleteAllNotes: () => void;
  importNotes: (notes: Note[]) => void;
}

const fakeNotes: Note[] = [
  { id: 1, title: "Quarterly Brief", date: new Date().toISOString(), tag: "analysis", content: { type: "analysis", text: "**Q3 Summary**\n\n- Revenue +14%\n- CAC down 8%" } },
  { id: 2, title: "Memory: Client Call", date: new Date().toISOString(), tag: "MEMORY", content: { type: "text", text: "Follow up on pricing by Friday." } },
];

const NotepadContext = createContext<NotepadContextType>({
  notes: fakeNotes,
  deleteAllNotes: () => alert("(stub) delete all notes"),
  importNotes: (arr) => alert(`(stub) imported ${Array.isArray(arr) ? arr.length : 0} notes`),
});

// -----------------------------------------------------------------------------
// REUSABLE COMPONENTS
// -----------------------------------------------------------------------------

// From: components/settings/Section.tsx
interface SectionProps {
    title: string;
    description: string;
    children: React.ReactNode;
}
const Section: React.FC<SectionProps> = ({ title, description, children }) => {
    return (
        <section className="mb-12">
            <div className="mb-4">
                <h2 className="text-2xl font-bold text-white">{title}</h2>
                <p className="text-gray-400 mt-1">{description}</p>
            </div>
            {children}
        </section>
    );
};
const Card: React.FC<{children: React.ReactNode, className?: string}> = ({ children, className }) => {
    return (
        <div className={`bg-gray-900/40 p-4 sm:p-6 rounded-lg border border-gray-800 ${className}`}>
            {children}
        </div>
    );
};

// From: components/settings/NoteViewerModal.tsx
interface NoteViewerModalProps {
    note: Note | null;
    onClose: () => void;
}
function mdToHtml(md: string = ''): string {
  return md
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-2 mb-1">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-2 mb-1">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-extrabold mt-2 mb-1">$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/^\s*-\s(.*?)(?=\n\s*-|$)/gims, (match, item) => `<li>${item.trim()}</li>`)
    .replace(/(\<li\>.*?\<\/li\>)/gs, '<ul class="list-disc pl-5 my-2">$1</ul>')
    .replace(/\n/g, '<br/>');
}
const NoteViewerModal: React.FC<NoteViewerModalProps> = ({ note, onClose }) => {
    if (!note) return null;

    const renderNoteContent = () => {
        const c = note.content || {};
        if (c.isEncrypted) return <div className="text-center p-4 bg-gray-900 rounded-md">Encrypted Content</div>;
        if (c.type === 'image') return (
            <div>
                <p className="mb-2 p-2 bg-gray-900 rounded-md"><strong>Prompt:</strong> {c.prompt || ''}</p>
                <img src={c.imageUrl || 'https://picsum.photos/500/300'} alt={c.prompt || ''} className="max-w-full rounded-md border border-white/10" />
            </div>
        );
        const html = mdToHtml(c.text || String(c || ''));
        return <div className="prose prose-invert max-w-none prose-p:text-gray-300 prose-strong:text-white" dangerouslySetInnerHTML={{ __html: html }} />;
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-black border border-yellow-400/20 rounded-xl w-full max-w-3xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 sm:p-6 border-b border-gray-800">
                    <h2 className="text-2xl font-bold text-white">{note.title}</h2>
                    <p className="text-sm text-gray-500">{new Date(note.date).toLocaleString()}</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 text-gray-300">
                    {renderNoteContent()}
                </div>
                <div className="p-4 text-right border-t border-gray-800">
                    <button onClick={onClose} className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors font-semibold">Close</button>
                </div>
            </div>
        </div>
    );
};


// From: components/settings/LocalOnlyToggle.tsx
function LocalOnlyToggle() {
    const [on, setOn] = useState(() => localStorage.getItem('local_only') === 'true');

    useEffect(() => {
        localStorage.setItem('local_only', String(on));
    }, [on]);

    return (
        <label className="inline-flex items-center gap-3 cursor-pointer p-2 rounded-md hover:bg-white/5 transition-colors">
            <div className="relative">
                <input type="checkbox" checked={on} onChange={e => setOn(e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </div>
            <span className={`font-semibold ${on ? 'text-emerald-400' : 'text-gray-400'}`}>{on ? 'Enabled' : 'Disabled'}</span>
        </label>
    );
}

// From: components/settings/ProxyHealthCard.tsx
type Metrics = { ok: boolean; rtt_ms?: number; active?: 'PRIMARY' | 'FALLBACK'; ts?: string };
function ProxyHealthCard() {
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchMetrics = async () => {
            setIsLoading(true);
            setError('');
            await new Promise(res => setTimeout(res, 1000));
            try {
                const data: Metrics = { ok: true, rtt_ms: 78, active: 'PRIMARY', ts: new Date().toISOString() };
                setMetrics(data);
            } catch (e: any) {
                setError(e.message || 'Failed to fetch metrics');
            } finally {
                setIsLoading(false);
            }
        };
        fetchMetrics();
    }, []);

    if (isLoading) return <p className="text-gray-400 text-sm">Sampling proxy health...</p>;
    if (error) return <p className="text-red-400 text-sm">{error}</p>;
    if (!metrics) return <p className="text-gray-500 text-sm">No metrics available.</p>;

    return (
        <div className="text-sm">
            <div className={`font-semibold ${metrics.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                Status: {metrics.ok ? 'Healthy' : 'Unhealthy'}
            </div>
            <div className="text-gray-400 mt-1">
                RTT: {metrics.rtt_ms ?? '—'} ms · Route: {metrics.active ?? 'PRIMARY'}
            </div>
            <div className="text-gray-500 text-xs mt-1">
                Updated: {metrics.ts ? new Date(metrics.ts).toLocaleTimeString() : 'N/A'}
            </div>
        </div>
    );
}

// From: components/settings/ModuleLoaderStatus.tsx
declare global {
    interface Window { __agentleeModules?: { loaded?: string[]; failed?: string[]; }; }
}
window.__agentleeModules = {
    loaded: ['/llm-modules/sentiment-analysis.js', '/models/text-embed-gecko.bin'],
    failed: ['/llm-modules/image-recognition-v2.js'],
};
function ModuleLoaderStatus() {
    const loaded = window.__agentleeModules?.loaded ?? [];
    const failed = window.__agentleeModules?.failed ?? [];
    
    return (
        <div className="text-sm space-y-2">
            <div><span className="font-semibold text-gray-200">Loaded:</span> <span className="text-emerald-400">{loaded.length}</span></div>
            {loaded.length > 0 && (
                <ul className="list-disc pl-5 text-gray-400 max-h-24 overflow-auto text-xs">
                    {loaded.map(u => <li key={u} className="break-all">{u}</li>)}
                </ul>
            )}
             <div><span className="font-semibold text-gray-200">Failed:</span> <span className="text-red-400">{failed.length}</span></div>
            {failed.length > 0 && (
                <ul className="list-disc pl-5 text-red-400 max-h-24 overflow-auto text-xs">
                    {failed.map(u => <li key={u} className="break-all">{u}</li>)}
                </ul>
            )}
             <a href="#/diagnostics/models" className="text-indigo-400 hover:underline text-sm font-semibold mt-2 block">Open Diagnostics</a>
        </div>
    );
}

// From: components/settings/ResearchPolicy.tsx
type Policy = 'FAST' | 'CHEAP' | 'LONG';
function ResearchPolicy() {
    const [policy, setPolicy] = useState<Policy>(() => (localStorage.getItem('research.policy') as Policy) || 'FAST');
    const [depth, setDepth] = useState(() => Number(localStorage.getItem('research.depth') || '6'));
    const [safety, setSafety] = useState(() => localStorage.getItem('research.safety') === 'true');
    const [validate, setValidate] = useState(() => localStorage.getItem('research.validate') !== 'false');

    useEffect(() => { localStorage.setItem('research.policy', policy); }, [policy]);
    useEffect(() => { localStorage.setItem('research.depth', String(depth)); }, [depth]);
    useEffect(() => { localStorage.setItem('research.safety', String(safety)); }, [safety]);
    useEffect(() => { localStorage.setItem('research.validate', String(validate)); }, [validate]);

    const inputClass = "ml-2 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white focus:ring-yellow-400 focus:border-yellow-400";

    return (
        <div className="space-y-4 text-sm">
            <label className="flex items-center justify-between">
                <span>Routing Policy</span>
                <select value={policy} onChange={e => setPolicy(e.target.value as Policy)} className={inputClass}>
                    <option>FAST</option>
                    <option>CHEAP</option>
                    <option>LONG</option>
                </select>
            </label>
            <label className="flex items-center justify-between">
                <span>Search Depth (# links)</span>
                <input type="number" min={1} max={20} value={depth} onChange={e => setDepth(Number(e.target.value))} className={`${inputClass} w-20 text-center`} />
            </label>
            <label className="flex items-center gap-3 p-2 rounded-md hover:bg-white/5 transition-colors cursor-pointer">
                <input type="checkbox" checked={safety} onChange={e => setSafety(e.target.checked)} className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500" />
                <span>Safe-mode filters</span>
            </label>
            <label className="flex items-center gap-3 p-2 rounded-md hover:bg-white/5 transition-colors cursor-pointer">
                <input type="checkbox" checked={validate} onChange={e => setValidate(e.target.checked)} className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500" />
                <span>Cross-source validation</span>
            </label>
        </div>
    );
}

// From: components/settings/DocEngines.tsx
function DocEngines() {
    const [pdfWorker, setPdfWorker] = useState(() => localStorage.getItem('pdf.worker') || '/pdf.worker.min.js');
    const [ocrOn, setOcrOn] = useState(() => localStorage.getItem('ocr.enabled') === 'true');
    const [ocrLang, setOcrLang] = useState(() => localStorage.getItem('ocr.lang') || 'eng');
    const [tables, setTables] = useState(() => localStorage.getItem('tables.extract') !== 'false');

    useEffect(() => { localStorage.setItem('pdf.worker', pdfWorker); }, [pdfWorker]);
    useEffect(() => { localStorage.setItem('ocr.enabled', String(ocrOn)); }, [ocrOn]);
    useEffect(() => { localStorage.setItem('ocr.lang', ocrLang); }, [ocrLang]);
    useEffect(() => { localStorage.setItem('tables.extract', String(tables)); }, [tables]);

    const inputClass = "w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-white focus:ring-yellow-400 focus:border-yellow-400";

    return (
        <div className="space-y-4 text-sm">
            <div>
                <label className="block mb-1">PDF.js Worker URL</label>
                <input value={pdfWorker} onChange={e => setPdfWorker(e.target.value)} className={inputClass} />
            </div>
            <div>
                 <label className="flex items-center gap-3 p-2 rounded-md hover:bg-white/5 transition-colors cursor-pointer">
                    <input type="checkbox" checked={ocrOn} onChange={e => setOcrOn(e.target.checked)} className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500" />
                    <span>Enable OCR (Tesseract)</span>
                </label>
            </div>
            <div>
                <label className="block mb-1">OCR Language</label>
                <input value={ocrLang} onChange={e => setOcrLang(e.target.value)} disabled={!ocrOn} className={`${inputClass} w-28 disabled:opacity-50`} />
            </div>
            <div>
                <label className="flex items-center gap-3 p-2 rounded-md hover:bg-white/5 transition-colors cursor-pointer">
                    <input type="checkbox" checked={tables} onChange={e => setTables(e.target.checked)} className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500" />
                    <span>Extract tables from PDFs</span>
                </label>
            </div>
        </div>
    );
}

// From: components/settings/ExportCenter.tsx
function ExportCenter() {
    const { notes } = useContext(NotepadContext);

    const download = (name: string, mime: string, data: string | Blob) => {
        const href = typeof data === 'string' ? `data:${mime};charset=utf-8,${encodeURIComponent(data)}` : URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = href;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        if (typeof data !== 'string') setTimeout(() => URL.revokeObjectURL(href), 100);
    }

    const exportMarkdown = () => {
        const md = notes.map(n => `# ${n.title}\n${new Date(n.date).toISOString()}\n\n${typeof n.content?.text === 'string' ? n.content.text : JSON.stringify(n.content)}`).join('\n\n---\n\n');
        download(`agent-lee-notes-${Date.now()}.md`, `text/markdown`, md);
    };

    const exportText = () => {
        const txt = notes.map(n => `${n.title}\n${new Date(n.date).toISOString()}\n\n${typeof n.content?.text === 'string' ? n.content.text : JSON.stringify(n.content)}`).join('\n\n---\n\n');
        download(`agent-lee-notes-${Date.now()}.txt`, `text/plain`, txt);
    };

    const exportCSV = () => {
        const rows = [['id', 'title', 'date', 'tag', 'content_type', 'content_text']];
        notes.forEach(n => rows.push([
            String(n.id),
            n.title,
            n.date,
            n.tag,
            n.content?.type || 'text',
            typeof n.content?.text === 'string' ? n.content.text : JSON.stringify(n.content)
        ]));
        const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        download(`agent-lee-notes-${Date.now()}.csv`, `text/csv`, csv);
    };

    const buttonClass = "w-full text-center px-3 py-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors font-medium";

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button onClick={exportMarkdown} className={buttonClass}>Download .md</button>
            <button onClick={exportText} className={buttonClass}>Download .txt</button>
            <button onClick={exportCSV} className={buttonClass}>Download .csv</button>
        </div>
    );
}

// -----------------------------------------------------------------------------
// SETTINGS PANEL COMPONENTS
// -----------------------------------------------------------------------------

// From: components/settings/AppearanceSettings.tsx
const themes = [
    { id: 'onyx-gold', name: 'Onyx & Gold', gradient: 'linear-gradient(135deg,#121212,#000)' },
    { id: 'midnight', name: 'Midnight', gradient: 'linear-gradient(135deg,#1a202c,#2d3748)' },
    { id: 'slate', name: 'Slate', gradient: 'linear-gradient(135deg,#334155,#475569)' },
    { id: 'nebula', name: 'Nebula', gradient: 'linear-gradient(135deg,#4c1d95,#5b21b6)' },
];
interface AppearanceSettingsProps {
    theme: string;
    setTheme: (theme: string) => void;
}
const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({ theme, setTheme }) => {
    return (
        <Section
            title="Appearance"
            description="Select a theme for the application."
        >
            <div className="flex flex-wrap gap-4">
                {themes.map(t => (
                    <div key={t.id} onClick={() => setTheme(t.id)} className="cursor-pointer group">
                        <div
                            className={`w-32 h-20 rounded-lg border-2 transition-all duration-200 group-hover:scale-105 ${
                                theme === t.id ? 'border-yellow-400 scale-105' : 'border-gray-700'
                            }`}
                            style={{ background: t.gradient }}
                        />
                        <p className={`text-center mt-2 font-medium transition-colors ${
                            theme === t.id ? 'text-white' : 'text-gray-400'
                        }`}>{t.name}</p>
                    </div>
                ))}
            </div>
        </Section>
    );
};

// From: components/settings/ContactsSettings.tsx
const ContactsSettings: React.FC = () => {
    const [contacts, setContacts] = useState<Contact[]>(() => {
        try { return JSON.parse(localStorage.getItem('agent-lee-contacts') || '[]'); } catch { return []; }
    });
    const [newContactName, setNewContactName] = useState('');
    const [newContactPhone, setNewContactPhone] = useState('');

    useEffect(() => {
        localStorage.setItem('agent-lee-contacts', JSON.stringify(contacts));
    }, [contacts]);

    const handleAddContact = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newContactName.trim() || !newContactPhone.trim()) return;
        setContacts(prev => [...prev, { id: Date.now(), name: newContactName.trim(), phone: newContactPhone.trim() }]);
        setNewContactName('');
        setNewContactPhone('');
    };

    const handleDeleteContact = (id: number) => {
        if (window.confirm("Are you sure you want to delete this contact?")) {
            setContacts(prev => prev.filter(c => c.id !== id));
        }
    };

    return (
        <Section
            title="Contacts"
            description="Manage your contacts for quick call actions."
        >
            <Card className="max-w-xl">
                <form onSubmit={handleAddContact} className="flex flex-col sm:flex-row gap-2 mb-4">
                    <input
                        className="flex-grow p-2 rounded-md bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:ring-yellow-400 focus:border-yellow-400"
                        placeholder="Name"
                        value={newContactName}
                        onChange={e => setNewContactName(e.target.value)}
                        required
                    />
                    <input
                        className="flex-grow p-2 rounded-md bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:ring-yellow-400 focus:border-yellow-400"
                        placeholder="Phone Number"
                        value={newContactPhone}
                        onChange={e => setNewContactPhone(e.target.value)}
                        required
                    />
                    <button className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors">Add</button>
                </form>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {contacts.length > 0 ? contacts.map(c => (
                        <div key={c.id} className="flex justify-between items-center p-3 bg-gray-900/60 rounded-md border border-gray-800">
                            <div>
                                <p className="font-semibold text-gray-100">{c.name}</p>
                                <p className="text-sm text-gray-400">{c.phone}</p>
                            </div>
                            <button onClick={() => handleDeleteContact(c.id)} className="px-2 py-1 rounded-md bg-red-900/40 hover:bg-red-900/60 text-red-300 text-xs font-semibold transition-colors">Delete</button>
                        </div>
                    )) : <p className="text-center text-sm text-gray-500 py-4">No contacts saved.</p>}
                </div>
            </Card>
        </Section>
    );
};

// From: components/settings/EnginesAndKeysSettings.tsx
const EnginesAndKeysSettings: React.FC = () => {
    const [localUrl, setLocalUrl] = useState(() => localStorage.getItem('local_llm_url') || 'http://127.0.0.1:11434/v1');
    const [localModel, setLocalModel] = useState(() => localStorage.getItem('local_llm_model') || '');
    const [geminiKey, setGeminiKey] = useState(() => sessionStorage.getItem('gemini_api_key') || '');
    const [openaiKey, setOpenaiKey] = useState(() => sessionStorage.getItem('openai_api_key') || '');
    const [cfToken, setCfToken] = useState(() => sessionStorage.getItem('cf_api_token') || '');
    const [keysSaved, setKeysSaved] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    const handleSave = () => {
        try {
            setKeysSaved('saving');
            localStorage.setItem("local_llm_url", localUrl);
            if (localModel) localStorage.setItem("local_llm_model", localModel);
            if (geminiKey) sessionStorage.setItem('gemini_api_key', geminiKey); else sessionStorage.removeItem('gemini_api_key');
            if (openaiKey) sessionStorage.setItem('openai_api_key', openaiKey); else sessionStorage.removeItem('openai_api_key');
            if (cfToken) sessionStorage.setItem('cf_api_token', cfToken); else sessionStorage.removeItem('cf_api_token');
            setTimeout(() => setKeysSaved('saved'), 300);
            setTimeout(() => setKeysSaved('idle'), 1500);
        } catch {
            setKeysSaved('error');
            setTimeout(() => setKeysSaved('idle'), 1500);
        }
    };

    const inputClass = "w-full p-2 rounded-md bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:ring-yellow-400 focus:border-yellow-400";
    const labelClass = "block text-sm font-medium text-gray-300 mb-1";

    return (
        <Section
            title="Engines & Keys"
            description="Configure your local LLM endpoint and optional cloud keys (stored in session only)."
        >
            <Card className="max-w-4xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <label className={labelClass}>Local LLM URL</label>
                        <input className={inputClass} value={localUrl} onChange={e => setLocalUrl(e.target.value)} placeholder="http://127.0.0.1:11434/v1" />
                    </div>
                    <div>
                        <label className={labelClass}>Local LLM Model</label>
                        <input className={inputClass} value={localModel} onChange={e => setLocalModel(e.target.value)} placeholder="llama3.1:8b-instruct" />
                    </div>
                     <div>
                        <label className={labelClass}>Gemini API Key (session)</label>
                        <input type="password" className={inputClass} value={geminiKey} onChange={e => setGeminiKey(e.target.value)} placeholder="AIza..." />
                    </div>
                    <div>
                        <label className={labelClass}>OpenAI API Key (session)</label>
                        <input type="password" className={inputClass} value={openaiKey} onChange={e => setOpenaiKey(e.target.value)} placeholder="sk-..." />
                    </div>
                    <div>
                        <label className={labelClass}>Cloudflare API Token (session)</label>
                        <input type="password" className={inputClass} value={cfToken} onChange={e => setCfToken(e.target.value)} placeholder="cf-..." />
                    </div>
                </div>
                <div className="flex items-center flex-wrap gap-3 mt-6 border-t border-gray-800 pt-6">
                    <button onClick={handleSave} className="px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors disabled:opacity-50" disabled={keysSaved !== 'idle'}>
                        {keysSaved === 'saving' ? 'Saving…' : keysSaved === 'saved' ? 'Saved!' : 'Save Config'}
                    </button>
                     <button onClick={() => alert('(stub) Open Diagnostics')} className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors">Diagnostics</button>
                    <button onClick={() => alert('(stub) Open Library')} className="px-4 py-2 rounded-md bg-emerald-700 hover:bg-emerald-600 text-white font-semibold transition-colors">Library</button>
                    <button onClick={() => alert('(stub) Re-seeded Docs → LEE')} className="px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600 text-white font-semibold transition-colors">Re-seed Docs</button>
                </div>
            </Card>
        </Section>
    );
};

// From: components/settings/AgentVoiceSettings.tsx
const AgentVoiceSettings: React.FC = () => {
    const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [isLoadingVoices, setIsLoadingVoices] = useState(true);
    const [favoriteVoices, setFavoriteVoices] = useState<string[]>([]);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    const [activeVoiceURI, setActiveVoiceURI] = useState(() => localStorage.getItem('agent-lee-voice-uri') || '');
    const [activeRate, setActiveRate] = useState(() => parseFloat(localStorage.getItem('agent-lee-voice-rate') || '1.0'));
    const [activePitch, setActivePitch] = useState(() => parseFloat(localStorage.getItem('agent-lee-voice-pitch') || '1.2'));
    const [activeVolume, setActiveVolume] = useState(() => parseFloat(localStorage.getItem('agent-lee-voice-volume') || '0.8'));
    
    const [pendingVoiceURI, setPendingVoiceURI] = useState(activeVoiceURI);
    const [pendingRate, setPendingRate] = useState(activeRate);
    const [pendingPitch, setPendingPitch] = useState(activePitch);
    const [pendingVolume, setPendingVolume] = useState(activeVolume);

    useEffect(() => {
        const savedFavorites = localStorage.getItem('agent-lee-favorite-voices');
        if (savedFavorites) {
            try {
                const parsed = JSON.parse(savedFavorites);
                if (Array.isArray(parsed)) setFavoriteVoices(parsed);
            } catch {}
        }
    }, []);

    useEffect(() => {
        (async () => {
            setIsLoadingVoices(true);
            try {
                const voices = await ttsService.getAvailableVoices();
                setAvailableVoices(voices || []);
                const savedVoiceURI = localStorage.getItem('agent-lee-voice-uri');
                if (savedVoiceURI && voices.some(v => v.voiceURI === savedVoiceURI)) {
                    setPendingVoiceURI(savedVoiceURI);
                } else if (voices.length > 0) {
                    setPendingVoiceURI(voices[0].voiceURI);
                }
            } finally {
                setIsLoadingVoices(false);
            }
        })();
    }, []);

    const areSettingsUnchanged = (
        pendingVoiceURI === activeVoiceURI &&
        pendingRate === activeRate &&
        pendingPitch === activePitch &&
        pendingVolume === activeVolume
    );

    const handleSaveVoice = async () => {
        if (areSettingsUnchanged) return;
        setSaveStatus('saving');
        localStorage.setItem('agent-lee-voice-uri', pendingVoiceURI || '');
        localStorage.setItem('agent-lee-voice-rate', String(pendingRate));
        localStorage.setItem('agent-lee-voice-pitch', String(pendingPitch));
        localStorage.setItem('agent-lee-voice-volume', String(pendingVolume));
        
        ttsService.refreshSelectedVoice();
        ttsService.cancel();
        
        setActiveVoiceURI(pendingVoiceURI || '');
        setActiveRate(pendingRate);
        setActivePitch(pendingPitch);
        setActiveVolume(pendingVolume);
        
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 1500);
    };

    const handleAddToFavorites = () => {
        if (pendingVoiceURI && !favoriteVoices.includes(pendingVoiceURI) && favoriteVoices.length < 6) {
            const next = [...favoriteVoices, pendingVoiceURI];
            setFavoriteVoices(next);
            localStorage.setItem('agent-lee-favorite-voices', JSON.stringify(next));
        }
    };

    const handleRemoveFromFavorites = (uri: string) => {
        const next = favoriteVoices.filter(v => v !== uri);
        setFavoriteVoices(next);
        localStorage.setItem('agent-lee-favorite-voices', JSON.stringify(next));
    };

    const groupedVoices = useMemo(() => {
        const groups: { [key: string]: SpeechSynthesisVoice[] } = { Apple: [], 'Google / Chrome': [], Microsoft: [], Other: [] };
        for (const v of availableVoices) {
            const n = (v.name || '').toLowerCase();
            if (n.includes('apple')) groups.Apple.push(v);
            else if (n.includes('google') || n.includes('chrome')) groups['Google / Chrome'].push(v);
            else if (n.includes('microsoft')) groups.Microsoft.push(v);
            else groups.Other.push(v);
        }
        Object.keys(groups).forEach(k => { if (groups[k].length === 0) delete groups[k]; });
        return groups;
    }, [availableVoices]);

    return (
        <Section
            title="Agent Voice"
            description="Choose the voice for Agent Lee's verbal transmissions."
        >
            <div className="space-y-8">
                <div>
                    <h4 className="text-lg font-semibold mb-2 text-gray-200">Favorite Voices (Max 6)</h4>
                    <Card>
                        {favoriteVoices.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {favoriteVoices.map(uri => {
                                    const voice = availableVoices.find(v => v.voiceURI === uri);
                                    return (
                                        <div key={uri} className={`pl-3 pr-2 py-1 border rounded-full flex items-center gap-2 transition-colors ${pendingVoiceURI === uri ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-gray-800 border-gray-700'}`}>
                                            <button onClick={() => setPendingVoiceURI(uri)} className="text-sm font-medium">{voice?.name || uri.split(':').pop()}</button>
                                            <button onClick={() => handleRemoveFromFavorites(uri)} className={`w-5 h-5 flex items-center justify-center rounded-full text-xs transition-colors ${pendingVoiceURI === uri ? 'text-indigo-200 hover:bg-indigo-700 hover:text-white' : 'text-gray-400 hover:bg-red-500 hover:text-white'}`}>×</button>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : <p className="text-sm text-center text-gray-500 py-2">Add voices from the dropdown to your favorites.</p>}
                    </Card>
                </div>
                
                <div>
                    <h4 className="text-lg font-semibold mb-2 text-gray-200">Voice Tuning</h4>
                    <Card>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300">Rate: <span className="font-bold text-white">{pendingRate.toFixed(1)}</span></label>
                                <input type="range" min="0.5" max="2" step="0.1" value={pendingRate} onChange={e => setPendingRate(parseFloat(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-400" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300">Pitch / Depth: <span className="font-bold text-white">{pendingPitch.toFixed(1)}</span></label>
                                <input type="range" min="0" max="2" step="0.1" value={pendingPitch} onChange={e => setPendingPitch(parseFloat(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-400" />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-300">Volume: <span className="font-bold text-white">{pendingVolume.toFixed(1)}</span></label>
                                <input type="range" min="0" max="1" step="0.1" value={pendingVolume} onChange={e => setPendingVolume(parseFloat(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-400" />
                            </div>
                        </div>
                    </Card>
                </div>

                <div>
                    <h4 className="text-lg font-semibold mb-2 text-gray-200">All Voices</h4>
                    {isLoadingVoices ? <Card><p className="text-gray-400">Loading available voices…</p></Card> : (
                        availableVoices.length > 0 ? (
                            <Card>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <select value={pendingVoiceURI} onChange={(e) => setPendingVoiceURI(e.target.value)} className="flex-grow p-3 bg-gray-800 border border-gray-700 text-white rounded-md min-w-[220px] focus:ring-yellow-400 focus:border-yellow-400">
                                        {Object.keys(groupedVoices).map((group) => (
                                            <optgroup key={group} label={group}>
                                                {groupedVoices[group].map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
                                            </optgroup>
                                        ))}
                                    </select>
                                    <button onClick={handleAddToFavorites} disabled={!pendingVoiceURI || favoriteVoices.includes(pendingVoiceURI) || favoriteVoices.length >= 6} className="p-3 bg-gray-700 text-gray-100 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors">Add to Favs</button>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap mt-4 pt-4 border-t border-gray-800">
                                    <button onClick={() => ttsService.testVoice("This is the selected voice for Agent Lee.", pendingVoiceURI, pendingRate, pendingPitch, pendingVolume)} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-semibold transition-colors">Test Voice</button>
                                    <button onClick={handleSaveVoice} disabled={saveStatus !== 'idle' || areSettingsUnchanged} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors">{saveStatus === 'saved' ? 'Saved!' : saveStatus === 'saving' ? 'Saving...' : 'Save Voice'}</button>
                                </div>
                            </Card>
                        ) : <Card><p className="text-gray-400">No voices available or speech synthesis is not supported by your browser.</p></Card>
                    )}
                </div>
            </div>
        </Section>
    );
};


// From: components/settings/PermissionsSettings.tsx
const ONBOARDING_KEY = 'lee.onboard.v11';
const PermissionsSettings: React.FC = () => {
    const getInitialPermission = (key: 'mic' | 'cam') => {
        try {
            return Boolean(JSON.parse(localStorage.getItem(ONBOARDING_KEY) || '{}')?.consent?.[key]);
        } catch {
            return false;
        }
    };

    const [allowMic, setAllowMic] = useState(() => getInitialPermission('mic'));
    const [allowCam, setAllowCam] = useState(() => getInitialPermission('cam'));

    const handlePermissionChange = (key: 'mic' | 'cam', isChecked: boolean) => {
        try {
            const record = JSON.parse(localStorage.getItem(ONBOARDING_KEY) || '{}');
            const next = { ...record, consent: { ...(record.consent || {}), [key]: isChecked } };
            localStorage.setItem(ONBOARDING_KEY, JSON.stringify(next));
            if (key === 'mic') setAllowMic(isChecked);
            if (key === 'cam') setAllowCam(isChecked);
        } catch (error) {
            console.error("Failed to update permissions in localStorage", error);
        }
    };
    
    return (
        <Section
            title="Permissions"
            description="Grant Agent Lee access to your microphone and camera (stored locally)."
        >
            <Card className="max-w-xl">
                <div className="space-y-4">
                    <label className="flex items-center gap-3 p-4 bg-gray-900/50 rounded-lg cursor-pointer hover:bg-gray-800/50 transition-colors">
                        <input
                            type="checkbox"
                            checked={allowMic}
                            onChange={(e) => handlePermissionChange('mic', e.target.checked)}
                            className="h-5 w-5 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-gray-200 font-medium">Allow Microphone (for voice conversations)</span>
                    </label>
                    <label className="flex items-center gap-3 p-4 bg-gray-900/50 rounded-lg cursor-pointer hover:bg-gray-800/50 transition-colors">
                        <input
                            type="checkbox"
                            checked={allowCam}
                            onChange={(e) => handlePermissionChange('cam', e.target.checked)}
                            className="h-5 w-5 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-gray-200 font-medium">Allow Camera (for vision tools)</span>
                    </label>
                </div>
                <p className="text-xs text-gray-500 mt-4">Tip: Click the mic once to start voice mode; speak continuously until you click again.</p>
            </Card>
        </Section>
    );
};


// From: components/settings/DataManagementSettings.tsx
const DataManagementSettings: React.FC = () => {
    const { notes, deleteAllNotes, importNotes } = useContext(NotepadContext);
    const [viewingNote, setViewingNote] = useState<Note | null>(null);

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = e.target?.result;
                    if (typeof content === 'string') {
                        const importedData = JSON.parse(content);
                        if (Array.isArray(importedData)) {
                           const validNotes = importedData.filter(n => n.id && n.title && n.date);
                           importNotes(validNotes);
                        } else {
                            alert("Invalid file format. Expected a JSON array of notes.");
                        }
                    }
                } catch (error) {
                    alert("Error reading or parsing file.");
                    console.error(error);
                }
            };
            reader.readAsText(file);
        }
    };
    
    return (
        <>
            <Section
                title="Data & Exports"
                description="Manage, export, and import your intelligence archive."
            >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-200 mb-3">Actions</h3>
                         <Card>
                             <div className="space-y-3">
                                <ExportCenter />
                                <label className="block w-full text-center px-3 py-2 bg-gray-700 rounded cursor-pointer hover:bg-gray-600 transition-colors">
                                    Import Notes from JSON
                                    <input type="file" accept=".json" onChange={handleFileImport} className="hidden" />
                                </label>
                                <button onClick={deleteAllNotes} className="w-full px-3 py-2 bg-red-900/60 hover:bg-red-900/80 rounded border border-red-800 text-red-200 transition-colors">
                                    Delete All Notes
                                </button>
                            </div>
                         </Card>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-200 mb-3">Intelligence Archive</h3>
                         <Card className="max-h-96 overflow-y-auto">
                             <div className="space-y-2">
                                {notes.length > 0 ? notes.map(n => (
                                    <button
                                        key={n.id}
                                        onClick={() => setViewingNote(n)}
                                        className="w-full text-left p-3 bg-gray-900/60 hover:bg-gray-800/80 rounded border border-gray-800 flex justify-between items-center transition-colors"
                                    >
                                        <div>
                                            <span className="font-semibold text-gray-100">{n.title}</span>
                                            <p className="text-xs text-gray-400">{new Date(n.date).toLocaleDateString()}</p>
                                        </div>
                                        <span className="text-xs text-gray-300 capitalize bg-gray-800 px-2 py-1 rounded-full">{n.tag}</span>
                                    </button>
                                )) : <p className="text-center text-gray-500 p-4">No intelligence saved yet.</p>}
                             </div>
                         </Card>
                    </div>
                </div>
            </Section>
            {viewingNote && <NoteViewerModal note={viewingNote} onClose={() => setViewingNote(null)} />}
        </>
    );
};

// From: components/settings/TransmissionLog.tsx
const transmissionLog: TransmissionLogEntry[] = [
    { id: 1, speaker: 'SYSTEM', text: 'Voice ready', timestamp: Date.now() - 60000 },
    { id: 2, speaker: 'USER', text: 'Summarize the brief', timestamp: Date.now() - 50000 },
    { id: 3, speaker: 'AGENT', text: 'On it. 5 bullets incoming.', timestamp: Date.now() - 45000 },
];
const getSpeakerStyle = (speaker: TransmissionLogEntry['speaker']) => {
    switch (speaker) {
        case 'USER': return 'text-sky-400';
        case 'AGENT': return 'text-green-400';
        case 'SYSTEM': return 'text-yellow-400';
        default: return 'text-white';
    }
};
const getSpeakerPrefix = (speaker: TransmissionLogEntry['speaker']) => {
    switch (speaker) {
        case 'USER': return 'YOU: ';
        case 'AGENT': return 'LEE: ';
        case 'SYSTEM': return 'SYS: ';
        default: return '';
    }
}
const TransmissionLog: React.FC = () => {
    return (
        <Section
            title="Transmission Log"
            description="A record of recent interactions with the agent."
        >
            <div className="max-w-4xl bg-black text-white font-mono text-sm p-4 rounded-lg border border-white/10">
                {transmissionLog.map(entry => (
                    <div key={entry.id} className="whitespace-pre-wrap mb-4 last:mb-0">
                        <div className="text-xs opacity-60">{new Date(entry.timestamp).toLocaleString()}</div>
                        <div className={getSpeakerStyle(entry.speaker)}>
                            <span className="font-bold">{getSpeakerPrefix(entry.speaker)}</span>
                            {entry.text}
                        </div>
                    </div>
                ))}
            </div>
        </Section>
    );
};


// From: components/settings/AdvancedNetworkSettings.tsx
const AdvancedNetworkSettings: React.FC = () => {
    return (
        <Section
            title="Advanced Network & Engines"
            description="Control network behavior and monitor system modules."
        >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                    <h4 className="font-semibold mb-2 text-gray-100">Local-only Egress</h4>
                    <p className="text-sm text-gray-400 mb-3">Block external requests at runtime to keep traffic on-device/LAN.</p>
                    <LocalOnlyToggle />
                </Card>
                <Card>
                    <h4 className="font-semibold mb-2 text-gray-100">Edge Proxy Health</h4>
                    <p className="text-sm text-gray-400 mb-3">Reads <code className="bg-black/40 px-1 rounded-sm text-xs">/ops/metrics</code> from the edge worker.</p>
                    <ProxyHealthCard />
                </Card>
                <Card>
                    <h4 className="font-semibold mb-2 text-gray-100">Browser Module Loader</h4>
                    <p className="text-sm text-gray-400 mb-3">Status of in-browser AI modules and models.</p>
                    <ModuleLoaderStatus />
                </Card>
            </div>
        </Section>
    );
};


// From: components/settings/ResearchAndDocsSettings.tsx
const ResearchAndDocsSettings: React.FC = () => {
    return (
        <Section
            title="Research & Documents"
            description="Configure defaults for research, document analysis, and data extraction."
        >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <h4 className="font-semibold mb-2 text-gray-100">Default Research Policy</h4>
                    <p className="text-sm text-gray-400 mb-4">Sets defaults for search depth, safety, and validation when Lee performs research.</p>
                    <ResearchPolicy />
                </Card>
                 <Card>
                    <h4 className="font-semibold mb-2 text-gray-100">Document Analysis Engines</h4>
                    <p className="text-sm text-gray-400 mb-4">Configure PDF.js worker, Tesseract OCR, and table extraction.</p>
                    <DocEngines />
                </Card>
            </div>
        </Section>
    );
};

// -----------------------------------------------------------------------------
// LAYOUT COMPONENT (from components/settings/SettingsLayout.tsx)
// -----------------------------------------------------------------------------
type SettingSection = 'appearance' | 'voice' | 'contacts' | 'engines' | 'network' | 'research' | 'data' | 'permissions' | 'log';

const navItems: { id: SettingSection; label: string; icon: React.ReactNode }[] = [
    { id: 'appearance', label: 'Appearance', icon: <AppearanceIcon /> },
    { id: 'voice', label: 'Agent Voice', icon: <VoiceIcon /> },
    { id: 'contacts', label: 'Contacts', icon: <ContactsIcon /> },
    { id: 'engines', label: 'Engines & Keys', icon: <KeysIcon /> },
    { id: 'network', label: 'Network', icon: <NetworkIcon /> },
    { id: 'research', label: 'Research & Docs', icon: <DataIcon /> },
    { id: 'data', label: 'Data & Exports', icon: <DataIcon /> },
    { id: 'permissions', label: 'Permissions', icon: <PermissionsIcon /> },
    { id: 'log', label: 'Transmission Log', icon: <LogIcon /> },
];

function SettingsLayout() {
    const [activeSection, setActiveSection] = useState<SettingSection>('appearance');
    const [theme, setTheme] = useState(() => localStorage.getItem('agent-lee-theme') || 'onyx-gold');

    useEffect(() => {
        document.body.className = `theme-${theme} bg-black`;
        localStorage.setItem('agent-lee-theme', theme);
    }, [theme]);

    const renderSection = () => {
        switch (activeSection) {
            case 'appearance': return <AppearanceSettings theme={theme} setTheme={setTheme} />;
            case 'voice': return <AgentVoiceSettings />;
            case 'contacts': return <ContactsSettings />;
            case 'engines': return <EnginesAndKeysSettings />;
            case 'network': return <AdvancedNetworkSettings />;
            case 'research': return <ResearchAndDocsSettings />;
            case 'data': return <DataManagementSettings />;
            case 'permissions': return <PermissionsSettings />;
            case 'log': return <TransmissionLog />;
            default: return null;
        }
    };

    return (
        <div className="min-h-screen w-full bg-gradient-to-b from-black via-slate-900 to-black text-gray-200 flex flex-col md:flex-row">
            <aside className="w-full md:w-64 bg-black/30 border-b md:border-b-0 md:border-r border-gray-800 p-4 shrink-0">
                <h1 className="text-xl font-bold text-white mb-6 px-2">Agent Settings</h1>
                <nav className="flex flex-row md:flex-col gap-1">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveSection(item.id)}
                            className={`flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg transition-colors text-sm font-medium
                                ${activeSection === item.id 
                                    ? 'bg-yellow-400/10 text-yellow-400' 
                                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                                }`}
                        >
                            {item.icon}
                            <span className="hidden md:inline">{item.label}</span>
                        </button>
                    ))}
                </nav>
            </aside>
            <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
                {renderSection()}
            </main>
        </div>
    );
}

// -----------------------------------------------------------------------------
// APP ROOT (from App.tsx)
// -----------------------------------------------------------------------------
function App() {
  const [notes, setNotes] = useState<Note[]>(fakeNotes);

  const deleteAllNotes = () => {
    if (window.confirm("Are you sure you want to delete all notes? This action cannot be undone.")) {
      setNotes([]);
      alert("All notes deleted.");
    }
  };

  const importNotes = (newNotes: Note[]) => {
    setNotes(prev => [...prev, ...newNotes]);
    alert(`Imported ${newNotes.length} notes.`);
  };

  return (
    <NotepadContext.Provider value={{ notes, deleteAllNotes, importNotes }}>
      <SettingsLayout />
    </NotepadContext.Provider>
  );
}

// -----------------------------------------------------------------------------
// RENDERER (from index.tsx)
// -----------------------------------------------------------------------------
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
