/*
LEEWAY HEADER — DO NOT REMOVE
TAG: FRONTEND.UI.COMMUNICATION_CONTROL
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: layout-dashboard
ICON_SIG: CD534113
5WH: WHAT=Unified communication control (voice, dialing, transcripts, analysis);
     WHY=Provide agnostic front-end orchestration & user interaction hub and fix ARIA a11y;
     WHO=Leeway Core (agnostic);
     WHERE=components/CommunicationControl.tsx;
     WHEN=2025-10-05;
     HOW=React 19 + TypeScript + local-first patterns
SPDX-License-Identifier: MIT
*/

import React, { useContext, useEffect, useRef, useState } from 'react';
import { NotepadContext } from '../contexts/NotepadContext';
import * as geminiService from '../services/geminiService';
import type { CallQueueItem, Contact, NoteContent } from '../types';
import ErrorMessage from './ErrorMessage';
import LoadingSpinner from './LoadingSpinner';
import ResultContainer from './ResultContainer';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

/* ----------------------------- Helpers ----------------------------- */

const digitsOnly = (s = '') => s.replace(/[^0-9*#+]/g, '');
const telHref = (raw = '') => `tel:${digitsOnly(raw)}`;
const fmt = (n = '') => {
  const d = n.replace(/\D/g, '');
  if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
  if (d.length === 11 && d.startsWith('1')) return `+1 (${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7)}`;
  return n;
};

/* -------------------- Reimagined Voice Call Panel ------------------- */

const VoiceCallPanel: React.FC<{ numberToCall: string }> = ({ numberToCall }) => {
  const { addNote } = useContext(NotepadContext);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [activeDialerTab, setActiveDialerTab] = useState<'keypad' | 'contacts' | 'queue'>('keypad');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [callQueue, setCallQueue] = useState<CallQueueItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('agent-lee-call-queue') || '[]'); } catch { return []; }
  });
  const [showAddToQueueModal, setShowAddToQueueModal] = useState(false);
  const [queuePurpose, setQueuePurpose] = useState('');

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recognitionRef = useRef<any>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  /* Seed number from prop */
  useEffect(() => {
    if (numberToCall) {
      setPhoneNumber(digitsOnly(numberToCall));
      setActiveDialerTab('keypad');
    }
  }, [numberToCall]);

  /* Load contacts from storage (supports Contact.number or Contact.phone) */
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('agent-lee-contacts') || '[]');
      setContacts(stored);
    } catch (e) {
      console.error('Failed to load contacts', e);
    }
  }, []);

  /* Persist queue */
  useEffect(() => {
    localStorage.setItem('agent-lee-call-queue', JSON.stringify(callQueue));
  }, [callQueue]);

  /* Init speech recognition if available */
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    recognitionRef.current = r;
    return () => {
      try { r.stop(); } catch {}
    };
  }, []);

  /* Scroll transcript */
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  /* Recognition handlers */
  useEffect(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    let finalSegment = '';

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalSegment += event.results[i][0].transcript + ' ';
        else interim += event.results[i][0].transcript;
      }
      if (finalSegment) {
        setTranscript(prev => (prev + finalSegment).trim() + ' ');
        finalSegment = '';
      }
      const span = document.getElementById('interim-span-voice');
      if (span) span.textContent = interim;
    };

    recognition.onerror = (event: any) => {
      setError(`Speech recognition error: ${event.error}. Monitoring stopped.`);
      setIsMonitoring(false);
    };
    recognition.onend = () => setIsMonitoring(false);
  }, []);

  const handleToggleMonitoring = () => {
    const r = recognitionRef.current;
    if (!r) { setError('Speech recognition not available.'); return; }

    if (isMonitoring) {
      try { r.stop(); } catch {}
      setIsMonitoring(false);
      const finalTranscript = (transcript + ' ' + (document.getElementById('interim-span-voice')?.textContent || '')).trim();
      if (finalTranscript.length > 10) handleAnalyze(finalTranscript);
    } else {
      handleReset();
      try {
        r.start();
        setIsMonitoring(true);
      } catch {
        setError('Could not start microphone. Please allow mic access.');
      }
    }
  };

  const handleAnalyze = async (finalTranscript: string) => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await geminiService.summarizeCallTranscript(finalTranscript);
      setAnalysisResult(result);
    } catch (err: any) {
      setError(err?.message || 'Failed to analyze transcript.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveToNotepad = () => {
    if (!analysisResult) return;
    const noteContent: NoteContent = {
      type: 'call',
      text: `## Call Transcript\n\n${transcript}\n\n---\n\n## Call Analysis\n\n${analysisResult}`,
      callDetails: `Call logged on ${new Date().toLocaleString()}`
    };
    const title = `Call Summary: ${(transcript || '').substring(0, 40)}...`;
    addNote(title, noteContent);
    alert('Call analysis saved to Notepad.');
  };

  const handleReset = () => {
    setTranscript('');
    setAnalysisResult(null);
    setError(null);
    const span = document.getElementById('interim-span-voice');
    if (span) span.textContent = '';
    if (isMonitoring) {
      try { recognitionRef.current?.stop(); } catch {}
      setIsMonitoring(false);
    }
  };

  /* Dialer actions */
  const handleKeyClick = (key: string) => setPhoneNumber(prev => (prev + key).slice(0, 32));
  const handleDelete = () => setPhoneNumber(prev => prev.slice(0, -1));
  const handleLongPressDelete = () => setPhoneNumber('');
  const dialerKeys = ['1','2','3','4','5','6','7','8','9','*','0','#'];

  const handleAddToQueue = () => {
    const n = digitsOnly(phoneNumber);
    if (n && queuePurpose.trim()) {
      setCallQueue(prev => [...prev, { number: n, purpose: queuePurpose.trim() } as CallQueueItem]);
      setPhoneNumber('');
      setQueuePurpose('');
      setShowAddToQueueModal(false);
      setActiveDialerTab('queue');
    }
  };

  const handleRemoveFromQueue = (index: number) => {
    setCallQueue(prev => prev.filter((_, i) => i !== index));
  };

  /* ------------------- Small Presentational Pieces ------------------- */

  const DialerTabs = () => (
    <div className="dialer-tabs" role="tablist" aria-label="Dialer views">
      <button
        id="dialer-tab-keypad"
        role="tab"
        aria-controls="dialer-panel-keypad"
        {...(activeDialerTab === 'keypad' ? { 'aria-selected': 'true', tabIndex: 0 } : { tabIndex: -1 })}
        onClick={() => setActiveDialerTab('keypad')}
        className={activeDialerTab === 'keypad' ? 'active' : ''}
      >
        <i className="fas fa-keyboard" aria-hidden="true"></i> <span>Keypad</span>
      </button>
      <button
        id="dialer-tab-contacts"
        role="tab"
        aria-controls="dialer-panel-contacts"
        {...(activeDialerTab === 'contacts' ? { 'aria-selected': 'true', tabIndex: 0 } : { tabIndex: -1 })}
        onClick={() => setActiveDialerTab('contacts')}
        className={activeDialerTab === 'contacts' ? 'active' : ''}
      >
        <i className="fas fa-users" aria-hidden="true"></i> <span>Contacts</span>
      </button>
      <button
        id="dialer-tab-queue"
        role="tab"
        aria-controls="dialer-panel-queue"
        {...(activeDialerTab === 'queue' ? { 'aria-selected': 'true', tabIndex: 0 } : { tabIndex: -1 })}
        onClick={() => setActiveDialerTab('queue')}
        className={activeDialerTab === 'queue' ? 'active' : ''}
      >
        <i className="fas fa-list-ol" aria-hidden="true"></i> <span>Queue</span>
      </button>
    </div>
  );

  const KeypadView = () => (
    <div className="keypad">
      {dialerKeys.map(key => (
        <button key={key} onClick={() => handleKeyClick(key)} className="key" aria-label={`Digit ${key}`}>
          {key}
        </button>
      ))}
    </div>
  );

  const ContactsView = () => (
    <div className="contact-list">
      {contacts.length > 0 ? contacts.map((contact: any) => {
        const num = contact?.number || contact?.phone || '';
        return (
          <div
            key={contact.id || `${contact.name}-${num}`}
            className="contact-item"
            onClick={() => { setPhoneNumber(digitsOnly(num)); setActiveDialerTab('keypad'); }}
            role="button" tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setPhoneNumber(digitsOnly(num))}
          >
            <div className="contact-avatar" aria-hidden>{String(contact.name || '').charAt(0).toUpperCase()}</div>
            <div>
              <p className="contact-name">{contact.name || 'Unnamed'}</p>
              <p className="contact-phone">{fmt(num)}</p>
            </div>
          </div>
        );
      }) : <p className="empty-list-text">No contacts found. Add contacts in the Settings tab.</p>}
    </div>
  );

  const QueueView = () => (
    <div className="contact-list">
      {callQueue.length > 0 ? callQueue.map((item, index) => (
        <div key={`${item.number}-${index}`} className="contact-item queue-item">
          <div>
            <p className="contact-name">{item.purpose || 'Queued Call'}</p>
            <p className="contact-phone">{fmt(item.number)}</p>
          </div>
          <div className="queue-actions">
            <button
              onClick={() => { setPhoneNumber(item.number); setActiveDialerTab('keypad'); }}
              className="queue-btn-call"
              title="Load Number"
              aria-label="Load number into keypad">
              <i className="fas fa-phone-alt" aria-hidden="true"></i>
            </button>
            <button
              onClick={() => handleRemoveFromQueue(index)}
              className="queue-btn-remove"
              title="Remove from Queue"
              aria-label="Remove from queue">
              <i className="fas fa-trash" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      )) : <p className="empty-list-text">Call queue is empty. Add numbers from the keypad.</p>}
    </div>
  );

  /* ----------------------------- Render ------------------------------ */

  const canCall = Boolean(digitsOnly(phoneNumber));

  return (
    <div className="conference-panel voice-panel-reimagined">
      {showAddToQueueModal && (
        <div className="add-to-queue-modal-backdrop" onClick={() => setShowAddToQueueModal(false)}>
          <div className="add-to-queue-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="queue-modal-title">
            <h3 id="queue-modal-title">Add to Call Queue</h3>
            <p>Number: <strong>{fmt(phoneNumber)}</strong></p>
            <input
              type="text"
              value={queuePurpose}
              onChange={e => setQueuePurpose(e.target.value)}
              placeholder="Purpose of this call..."
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleAddToQueue()}
            />
            <div className="modal-actions">
              <button onClick={() => setShowAddToQueueModal(false)} className="modal-btn-cancel">Cancel</button>
              <button onClick={handleAddToQueue} disabled={!queuePurpose.trim()} className="modal-btn-confirm">Add</button>
            </div>
          </div>
        </div>
      )}

      <div className="dialer-column">
        <header className="panel-header"><h3>Phone Dialer</h3></header>
        <DialerTabs />

        <div className="phone-display-container">
          <input
            type="tel"
            className="phone-display"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(digitsOnly(e.target.value))}
            placeholder="Enter number..."
            aria-label="Phone number"
          />
          <button
            onClick={handleDelete}
            onMouseDown={() => { longPressTimer.current = setTimeout(handleLongPressDelete, 600); }}
            onMouseUp={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
            onMouseLeave={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
            className="delete-btn"
            aria-label="Delete last digit. Hold to clear.">
            <i className="fas fa-backspace" aria-hidden="true"></i>
          </button>
        </div>

        <div className="dialer-content" role="region" aria-live="polite">
          <div
            role="tabpanel"
            id="dialer-panel-keypad"
            aria-labelledby="dialer-tab-keypad"
            hidden={activeDialerTab !== 'keypad'}
          >
            {activeDialerTab === 'keypad' && <KeypadView />}
          </div>
          <div
            role="tabpanel"
            id="dialer-panel-contacts"
            aria-labelledby="dialer-tab-contacts"
            hidden={activeDialerTab !== 'contacts'}
          >
            {activeDialerTab === 'contacts' && <ContactsView />}
          </div>
          <div
            role="tabpanel"
            id="dialer-panel-queue"
            aria-labelledby="dialer-tab-queue"
            hidden={activeDialerTab !== 'queue'}
          >
            {activeDialerTab === 'queue' && <QueueView />}
          </div>
        </div>

        <div className="dialer-actions">
          <button
            onClick={() => setShowAddToQueueModal(true)}
            disabled={!canCall}
            className="action-btn-queue"
            title="Add to Call Queue">
            <i className="fas fa-plus" aria-hidden="true"></i> <span>Queue</span>
          </button>

          {/* Use programmatic handoff to guard against undefined href */}
          <button
            className={`call-btn ${!canCall ? 'disabled' : ''}`}
            disabled={!canCall}
            onClick={() => {
              if (!canCall) return;
              window.location.href = telHref(phoneNumber);
            }}>
            <i className="fas fa-phone-alt" aria-hidden="true"></i> <span>Call</span>
          </button>
        </div>
      </div>

      <div className="companion-column">
        <div className="main-panel">
          <header className="panel-header">
            <h3>Call Companion</h3>
            <div className="status-indicator" aria-live="polite">
              <div className={`dot ${isMonitoring ? 'monitoring' : ''}`}></div>
              <span>{isMonitoring ? 'TRANSCRIBING' : 'IDLE'}</span>
            </div>
          </header>

          <div className="transcript-window">
            {transcript || 'Awaiting audio...'}
            <span id="interim-span-voice" className="interim-transcript" />
            <div ref={transcriptEndRef} />
          </div>

          <div className="analysis-window">
            {isAnalyzing && <LoadingSpinner message="Agent Lee is analyzing..." />}
            {error && !isAnalyzing && <ErrorMessage message={error} />}
            {analysisResult && !isAnalyzing && <ResultContainer markdownContent={analysisResult} />}
            {!isAnalyzing && !analysisResult && !error && (
              <div className="placeholder-text">
                <i className="fas fa-headset" aria-hidden="true"></i>
                <p><strong>For All Calls:</strong> Once connected, put your call on speakerphone and tap “Transcribe Call” to begin live analysis.</p>
              </div>
            )}
          </div>

          <footer className="control-panel">
            <button
              onClick={handleToggleMonitoring}
              className={`control-btn primary ${isMonitoring ? 'monitoring' : ''}`}>
              {isMonitoring ? <><i className="fas fa-stop-circle" aria-hidden="true"></i>Stop</> : <><i className="fas fa-microphone-alt" aria-hidden="true"></i>Transcribe Call</>}
            </button>
            <button onClick={handleReset} className="control-btn"><i className="fas fa-sync-alt" aria-hidden="true"></i>Reset</button>
            <button onClick={handleSaveToNotepad} disabled={!analysisResult || isAnalyzing} className="control-btn save-btn">
              <i className="fas fa-save" aria-hidden="true"></i>Save
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
};

/* --------------------------- Video Call Panel --------------------------- */

const VideoCallPanel: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [transcript, setTranscript] = useState('');
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      const r = new SR();
      r.continuous = true;
      r.interimResults = true;
      recognitionRef.current = r;
      r.onresult = (event: any) => {
        let seg = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) seg += event.results[i][0].transcript + ' ';
        }
        if (seg) setTranscript(prev => prev + seg);
      };
    }
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const startStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setIsCameraOn(true);
      setIsMicOn(true);
      setTranscript('');
      try { recognitionRef.current?.start(); } catch {}
    } catch {
      alert('Could not access camera/microphone. Please check permissions.');
    }
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCameraOn(false);
    setIsMicOn(false);
    try { recognitionRef.current?.stop(); } catch {}
  };

  return (
    <div className="conference-panel video-panel">
      <div className="video-main">
        <div className="video-container">
          <div className="video-feed remote-feed"><i className="fas fa-user-secret" aria-hidden="true"></i><span>REMOTE FEED</span></div>
          <div className="video-feed local-feed">
            {isCameraOn ? <video ref={videoRef} autoPlay muted playsInline /> : <><i className="fas fa-video-slash" aria-hidden="true"></i><span>CAMERA OFF</span></>}
          </div>
        </div>
        <div className="video-controls">
          <button
            onClick={() => streamRef.current && setIsMicOn(!isMicOn)}
            disabled={!isCameraOn}
            className={`control-btn ${isMicOn ? 'mic-on' : ''}`}>
            {isMicOn ? <i className="fas fa-microphone" aria-hidden="true"></i> : <i className="fas fa-microphone-slash" aria-hidden="true"></i>}
          </button>
          {!isCameraOn
            ? <button onClick={startStream} className="control-btn call-btn"><i className="fas fa-video" aria-hidden="true"></i> Start Call</button>
            : <button onClick={stopStream} className="control-btn end-call-btn"><i className="fas fa-phone-slash" aria-hidden="true"></i> End Call</button>}
          <button className="control-btn" disabled aria-label="Settings (disabled)"><i className="fas fa-cog" aria-hidden="true"></i></button>
        </div>
      </div>
      <div className="video-sidebar">
        <h3><i className="fas fa-wave-square" aria-hidden="true"></i> Live Transcript</h3>
        <div className="transcript-window video-transcript">
          {transcript || 'Awaiting audio...'}
          <div ref={transcriptEndRef} />
        </div>
        <div className="ai-assist">
          <p>Agent Lee is on standby for analysis.</p>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------ SMS Panel ------------------------------ */

const SmsPanel: React.FC = () => {
  const { addNote } = useContext(NotepadContext);
  const [recipient, setRecipient] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [smsBody, setSmsBody] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAiDraft = async () => {
    if (!aiPrompt.trim()) return;
    setIsLoading(true);
    setError('');
    try {
      const draft = await geminiService.draftSms(aiPrompt, recipient);
      setSmsBody(draft);
    } catch (err: any) {
      setError(`AI Error: ${err?.message || 'Unknown'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDraft = () => {
    if (!recipient.trim() && !smsBody.trim()) {
      alert('Nothing to save.');
      return;
    }
    const title = `SMS Draft for: ${recipient.trim() || 'Untitled'}`;
    const noteText = `To: ${recipient}\n\n---\n\n${smsBody}`;
    const noteContent: NoteContent = { type: 'text', text: noteText };
    // third arg is optional; keep if your addNote supports a tag
    try {
      // @ts-ignore (supporting older signature)
      addNote(title, noteContent, 'SMS_DRAFT');
    } catch {
      addNote(title, noteContent);
    }
    alert('SMS draft saved to your Notepad.');
    setRecipient('');
    setSmsBody('');
    setAiPrompt('');
  };

  return (
    <div className="conference-panel sms-panel">
      <h3><i className="fas fa-sms" aria-hidden="true"></i> SMS / Text Composer</h3>
      <div className="form-group">
        <label htmlFor="sms-recipient">Recipient Phone Number</label>
        <input id="sms-recipient" type="tel" placeholder="Enter phone number" value={recipient} onChange={e => setRecipient(digitsOnly(e.target.value))} />
      </div>
      <div className="form-group">
        <label htmlFor="sms-ai-prompt">AI Assistant Prompt</label>
        <div className="ai-bar">
          <input
            id="sms-ai-prompt"
            type="text"
            placeholder="e.g., Ask Sarah if she's free for coffee tomorrow"
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAiDraft()}
          />
          <button onClick={handleAiDraft} disabled={isLoading || !aiPrompt.trim()} className="control-btn primary">
            {isLoading ? <i className="fas fa-spinner fa-spin" aria-hidden="true"></i> : <><i className="fas fa-robot" aria-hidden="true"></i> Draft</>}
          </button>
        </div>
        {error && <ErrorMessage message={error}/>}        
      </div>
      <div className="form-group body-group">
        <label htmlFor="sms-body">Message Body</label>
        <textarea id="sms-body" value={smsBody} onChange={e => setSmsBody(e.target.value)} />
      </div>
      <div className="sms-actions">
        <p className="disclaimer">Save the composed message to your Notepad.</p>
        <button onClick={handleSaveDraft} className="control-btn save-btn" disabled={!recipient && !smsBody}>
          <i className="fas fa-save" aria-hidden="true"></i> Save as Draft
        </button>
      </div>
    </div>
  );
};

/* --------------------------- Main Hub Component --------------------------- */

interface CommunicationControlProps {
  userName: string;
  numberToCall: string | null;
}

const CommunicationControl: React.FC<CommunicationControlProps> = ({ userName, numberToCall }) => {
  const [activeTab, setActiveTab] = useState<'voice' | 'video' | 'sms'>('voice');

  // Keyboard navigation for main tabs
  const tabRefs = {
    voice: useRef<HTMLButtonElement>(null),
    video: useRef<HTMLButtonElement>(null),
    sms: useRef<HTMLButtonElement>(null),
  } as const;

  const onTabsKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    const order: Array<'voice'|'video'|'sms'> = ['voice','video','sms'];
    const curIdx = order.indexOf(activeTab);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      const next = order[(curIdx + 1) % order.length];
      setActiveTab(next); tabRefs[next].current?.focus();
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      const prev = order[(curIdx - 1 + order.length) % order.length];
      setActiveTab(prev); tabRefs[prev].current?.focus();
      e.preventDefault();
    } else if (e.key === 'Home') {
      setActiveTab('voice'); tabRefs.voice.current?.focus(); e.preventDefault();
    } else if (e.key === 'End') {
      setActiveTab('sms'); tabRefs.sms.current?.focus(); e.preventDefault();
    }
  };

  const styles = `
    :root{
      --accent-bg:#6366F1;
      --accent-text:#FFFFFF;
      --border-color:#343a40;
      --text-primary:#E9ECEF;
      --text-secondary:#F8F9FA;
      --surface-bg:#0B1220;
    }
    .conference-center-wrapper { display:flex; flex-direction:column; height:100%; background:#000; border-radius:1rem; color:var(--text-primary); padding:1.5rem; }
    .conference-header { display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:1rem; margin-bottom:1rem; }
    .conference-header h2 { font-size:1.5rem; font-weight:700; color:var(--text-secondary); }
    .conference-header .tabs { display:flex; gap:0.5rem; background:#111; border-radius:0.5rem; padding:0.25rem; }
    .conference-header .tabs button { padding:0.5rem 1rem; border:none; background:transparent; color:#ced4da; font-weight:600; border-radius:0.375rem; cursor:pointer; transition:all .2s; }
    .conference-header .tabs button:hover { background:#495057; }
    .conference-header .tabs button.active { background:var(--accent-bg); color:var(--accent-text); }
    .conference-content { flex-grow:1; min-height:0; }
    .conference-panel { display:flex; height:100%; gap:1.5rem; }

    .voice-panel-reimagined { display:flex; height:100%; gap:1.5rem; }
    .dialer-column { flex:1; max-width:380px; min-width:300px; display:flex; flex-direction:column; background:#111; border-radius:0.5rem; padding:1rem; border:1px solid #343a40; }
    .companion-column { flex:2; min-width:0; display:flex; flex-direction:column; }
    .companion-column .main-panel { height:100%; display:flex; flex-direction:column; }

    .dialer-tabs { display:flex; border-radius:0.5rem; background:#000; padding:4px; margin-bottom:1rem; }
    .dialer-tabs button { flex:1; padding:0.5rem; border:none; background:transparent; color:#ced4da; font-weight:600; border-radius:0.375rem; cursor:pointer; transition:all .2s; display:flex; align-items:center; justify-content:center; gap:0.5rem; }
    .dialer-tabs button:hover { background:#495057; }
    .dialer-tabs button.active { background:var(--accent-bg); color:var(--accent-text); }

    .dialer-content { flex-grow:1; overflow-y:auto; margin:1rem 0; padding-right:5px; }
    .contact-list { display:flex; flex-direction:column; gap:0.5rem; }
    .empty-list-text { text-align:center; color:#888; padding:2rem 1rem; }
    .contact-item { display:flex; align-items:center; gap:1rem; padding:0.75rem; background:#212529; border-radius:0.5rem; cursor:pointer; transition:background-color .2s; border:1px solid #343a40; }
    .contact-item:hover { background:#343a40; }
    .contact-avatar { width:40px; height:40px; border-radius:50%; background:var(--accent-bg); color:var(--accent-text); display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:1.2rem; flex-shrink:0; }
    .contact-name { font-weight:600; color:#f8f9fa; }
    .contact-phone { color:#adb5bd; font-size:0.9rem; }
    .queue-item { cursor:default; justify-content:space-between; }
    .queue-actions { display:flex; gap:0.5rem; }
    .queue-actions button { width:36px; height:36px; border-radius:50%; border:none; color:#fff; cursor:pointer; transition:background-color .2s; display:flex; align-items:center; justify-content:center; }
    .queue-btn-call { background:#28a745; } .queue-btn-call:hover { background:#218838; }
    .queue-btn-remove { background:#dc3545; } .queue-btn-remove:hover { background:#c82333; }

    .dialer-actions { display:flex; gap:1rem; margin-top:auto; padding-top:1rem; border-top:1px solid #343a40; }
    .action-btn-queue { flex:1; padding:1rem; border-radius:0.75rem; border:1px solid var(--border-color); background:transparent; color:var(--text-secondary); font-size:1rem; font-weight:600; cursor:pointer; transition:all .2s; }
    .action-btn-queue:hover:not(:disabled){ background:rgba(99,102,241,.15); }
    .action-btn-queue:disabled { opacity:.5; cursor:not-allowed; }

    .add-to-queue-modal-backdrop { position:fixed; inset:0; background:rgba(0,0,0,.7); display:flex; align-items:center; justify-content:center; z-index:50; }
    .add-to-queue-modal { background:#212529; color:#f8f9fa; border-radius:10px; padding:1.5rem; width:90%; max-width:400px; border:2px solid var(--border-color); }
    .add-to-queue-modal h3 { font-size:1.25rem; font-weight:bold; margin-bottom:1rem; }
    .add-to-queue-modal p { margin-bottom:1rem; color:#adb5bd; }
    .add-to-queue-modal input { width:100%; padding:0.75rem; border:1px solid #495057; border-radius:0.5rem; background:#343a40; color:#f8f9fa; margin-bottom:1rem; }
    .modal-actions { display:flex; justify-content:flex-end; gap:0.5rem; }
    .modal-actions button { padding:0.5rem 1rem; border-radius:0.5rem; border:none; font-weight:600; cursor:pointer; }
    .modal-btn-cancel { background:#6c757d; color:white; }
    .modal-btn-confirm { background:var(--accent-bg); color:var(--accent-text); }
    .modal-btn-confirm:disabled { opacity:.5; cursor:not-allowed; }

    .main-panel { flex-grow:1; display:flex; flex-direction:column; min-width:0; }
    .panel-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; padding-bottom:0.5rem; border-bottom:1px solid #343a40; }
    .panel-header h3 { font-size:1.25rem; font-weight:600; }
    .status-indicator { display:flex; align-items:center; gap:0.5rem; font-weight:600; color:#adb5bd; }
    .status-indicator .dot { width:10px; height:10px; border-radius:50%; background-color:#6c757d; }
    .status-indicator .dot.monitoring { background-color:#dc3545; animation:pulse-red 1.5s infinite; }

    .transcript-window { background:#000; color:#f8f9fa; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono","Courier New", monospace; padding:1rem; border-radius:0.5rem; flex:1; overflow-y:auto; white-space:pre-wrap; word-break:break-word; font-size:0.9rem; }
    .analysis-window { background:var(--surface-bg); border-radius:0.5rem; flex:1.5; overflow-y:auto; padding:0.5rem; display:flex; flex-direction:column; }
    .analysis-window .placeholder-text { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; text-align:center; color:#999; padding:1rem; font-size:0.9rem; line-height:1.5; }
    .analysis-window .placeholder-text i { font-size:2.0rem; opacity:.3; margin-bottom:1rem; }

    .control-panel { display:flex; gap:0.75rem; flex-wrap:wrap; padding-top:1rem; border-top:1px solid #343a40; margin-top:auto; }
    .control-btn { padding:0.6rem 1rem; border-radius:0.5rem; border:none; font-weight:600; cursor:pointer; transition:all .2s; display:flex; align-items:center; gap:0.5rem; background:#495057; color:white; }
    .control-btn.primary { background:var(--accent-bg); color:var(--accent-text); }
    .control-btn.primary.monitoring { background:#dc3545; color:white; }
    .control-btn:hover:not(:disabled) { opacity:.85; }
    .control-btn.save-btn { background:var(--accent-bg); color:var(--accent-text); margin-left:auto; }
    .control-btn:disabled { opacity:.5; cursor:not-allowed; }

    .phone-display-container { width:100%; display:flex; align-items:center; background:#000; border-radius:0.5rem; padding:0.5rem; }
    .phone-display { flex-grow:1; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono","Courier New", monospace; font-size:1.5rem; letter-spacing:2px; border:none; background:transparent; text-align:center; color:#f8f9fa; }
    .delete-btn { background:transparent; border:none; color:#6c757d; cursor:pointer; padding:0.5rem; }
    .delete-btn:active { transform:scale(0.95); }

    .keypad { display:grid; grid-template-columns: repeat(3, 1fr); gap:1rem; margin:1.5rem 0; }
    .key { aspect-ratio:1/1; border-radius:50%; border:1px solid #495057; background:#212529; color:#f8f9fa; cursor:pointer; transition:all .1s; font-size:1.5rem; }
    .key:active { transform:scale(0.95); background:#495057; }

    .call-btn { flex:2; display:flex; align-items:center; justify-content:center; width:100%; padding:1rem; border-radius:0.75rem; border:none; background:#28a745; color:white; font-size:1.1rem; font-weight:600; cursor:pointer; text-decoration:none; }
    .call-btn.disabled { opacity:.6; pointer-events:none; }

    .video-panel { align-items:stretch; }
    .video-main { flex:3; }
    .video-container { display:flex; flex-direction:column; gap:1rem; flex-grow:1; }
    .video-feed { background:#000; border-radius:0.5rem; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#6c757d; font-weight:bold; position:relative; overflow:hidden; }
    .video-feed i { font-size:3rem; margin-bottom:0.5rem; }
    .remote-feed { flex-grow:1; }
    .local-feed { height:150px; flex-shrink:0; border:2px solid #495057; }
    .local-feed video { width:100%; height:100%; object-fit:cover; transform:scaleX(-1); }
    .video-controls { display:flex; justify-content:center; gap:1rem; padding-top:1rem; margin-top:auto; border-top:1px solid #343a40; }
    .video-controls .control-btn.end-call-btn { background:#dc3545; }
    .video-controls .control-btn.mic-on { background:var(--accent-bg); color:var(--accent-text); }
    .video-sidebar { flex:1.5; }
    .video-transcript { height:100%; flex-grow:1; }
    .ai-assist { margin-top:1rem; padding-top:1rem; border-top:1px solid #343a40; text-align:center; color:#adb5bd; }

    .sms-panel { flex-direction:column; }
    .form-group { display:flex; flex-direction:column; margin-bottom:1rem; }
    .form-group label { font-weight:600; margin-bottom:0.5rem; color:#adb5bd; }
    .form-group input, .form-group textarea { width:100%; padding:0.75rem; border:1px solid #495057; border-radius:0.5rem; font-size:1rem; background:#343a40; color:#f8f9fa; }
    .form-group.body-group { flex-grow:1; }
    .form-group textarea { min-height:120px; flex-grow:1; resize:vertical; }
    .ai-bar { display:flex; gap:0.5rem; }
    .ai-bar input { flex-grow:1; }
    .sms-actions { display:flex; justify-content:flex-end; align-items:center; gap:1rem; margin-top:auto; padding-top:1rem; border-top:1px solid #495057; }
    .sms-actions .disclaimer { font-size:0.8rem; color:#6c757d; flex-grow:1; }

    @keyframes pulse-red { 0% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.7); } 70% { box-shadow: 0 0 0 8px rgba(220, 53, 69, 0); } 100% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0); }
    }

    @media (max-width: 960px) {
      .conference-panel, .voice-panel-reimagined { flex-direction:column; }
      .dialer-column, .video-sidebar { order:-1; }
      .video-container { flex-direction:column-reverse; }
      .local-feed { height:200px; }
    }
  `;

  return (
    <div className="h-full">
      <style>{styles}</style>
      <div className="conference-center-wrapper">
        <header className="conference-header">
          <h2>Communications Hub</h2>
          <div
            className="tabs"
            role="tablist"
            aria-label="Communication modes"
            onKeyDown={onTabsKeyDown}
          >
            <button
              id="tab-voice"
              ref={tabRefs.voice}
              role="tab"
              aria-controls="panel-voice"
              {...(activeTab === 'voice' ? { 'aria-selected': 'true', tabIndex: 0 } : { tabIndex: -1 })}
              onClick={() => setActiveTab('voice')}
              className={activeTab === 'voice' ? 'active' : ''}
            >
              <i className="fas fa-phone-alt mr-2" aria-hidden="true"></i><span>Voice</span>
            </button>
            <button
              id="tab-video"
              ref={tabRefs.video}
              role="tab"
              aria-controls="panel-video"
              {...(activeTab === 'video' ? { 'aria-selected': 'true', tabIndex: 0 } : { tabIndex: -1 })}
              onClick={() => setActiveTab('video')}
              className={activeTab === 'video' ? 'active' : ''}
            >
              <i className="fas fa-video mr-2" aria-hidden="true"></i><span>Video</span>
            </button>
            <button
              id="tab-sms"
              ref={tabRefs.sms}
              role="tab"
              aria-controls="panel-sms"
              {...(activeTab === 'sms' ? { 'aria-selected': 'true', tabIndex: 0 } : { tabIndex: -1 })}
              onClick={() => setActiveTab('sms')}
              className={activeTab === 'sms' ? 'active' : ''}
            >
              <i className="fas fa-sms mr-2" aria-hidden="true"></i><span>SMS/Text</span>
            </button>
          </div>
        </header>
        <main className="conference-content">
          <section
            id="panel-voice"
            role="tabpanel"
            aria-labelledby="tab-voice"
            hidden={activeTab !== 'voice'}
          >
            {activeTab === 'voice' && <VoiceCallPanel numberToCall={numberToCall || ''} />}
          </section>
          <section
            id="panel-video"
            role="tabpanel"
            aria-labelledby="tab-video"
            hidden={activeTab !== 'video'}
          >
            {activeTab === 'video' && <VideoCallPanel />}
          </section>
          <section
            id="panel-sms"
            role="tabpanel"
            aria-labelledby="tab-sms"
            hidden={activeTab !== 'sms'}
          >
            {activeTab === 'sms' && <SmsPanel />}
          </section>
        </main>
      </div>
    </div>
  );
};

export default CommunicationControl;
