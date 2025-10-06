/* LEEWAY HEADER
TAG: FRONTEND.COMPONENT.EMAIL_CLIENT
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: mail
ICON_SIG: CD534113
5WH: WHAT=AI-assisted email drafting + notepad capture; WHY=Streamline outbound communication; WHO=Leeway Core (agnostic); WHERE=components/EmailClient.tsx; WHEN=2025-10-05; HOW=React state + Gemini draft helpers
SPDX-License-Identifier: MIT
*/

import React, { useContext, useState } from 'react';
import { NotepadContext } from '../contexts/NotepadContext';
import * as geminiService from '../services/geminiService';
import type { NoteContent } from '../types';


const EmailClient: React.FC = () => {
    const { addNote } = useContext(NotepadContext);
    const [composeTo, setComposeTo] = useState('');
    const [composeSubject, setComposeSubject] = useState('');
    const [composeBody, setComposeBody] = useState('');
    const [composeAiPrompt, setComposeAiPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [aiError, setAiError] = useState('');

    const handleSaveAsDraft = () => {
        if (!composeTo.trim() && !composeSubject.trim() && !composeBody.trim()) {
            alert("There is nothing to save.");
            return;
        }
        const title = `Email Draft: ${composeSubject.trim() || composeTo.trim() || 'Untitled'}`;
        const noteText = `To: ${composeTo}\nSubject: ${composeSubject}\n\n---\n\n${composeBody}`;
        const noteContent: NoteContent = { type: 'text', text: noteText };
        addNote(title, noteContent, "EMAIL_DRAFT");
        alert("Email saved as a draft in your Notepad.");

        // Clear the form
        setComposeTo('');
        setComposeSubject('');
        setComposeBody('');
        setComposeAiPrompt('');
    };


    const handleAiDraft = async () => {
        if (!composeAiPrompt.trim()) return;

        setIsLoading(true);
        setAiError('');
        try {
            const draft = await geminiService.draftEmail(composeAiPrompt, {
                recipient: composeTo,
                subject: composeSubject,
            });
            setComposeBody(draft);
        } catch (error: any) {
            setAiError(`AI Error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const styles = `
        .email-composer-wrapper {
            display: flex;
            flex-direction: column;
            height: 100%;
            background-color: var(--surface-bg);
            color: var(--text-primary);
            border-radius: 1rem;
            overflow: hidden;
            padding: 1.5rem;
            gap: 1rem;
        }
        .composer-header {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid #444;
        }
        .composer-header i {
            font-size: 1.5rem;
            color: var(--text-secondary);
        }
        .composer-header h2 {
            font-size: 1.5rem;
            font-weight: 700;
        }
        .form-group {
            display: flex;
            flex-direction: column;
        }
        .form-group label {
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: #aaa;
        }
        .form-group input, .form-group textarea {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #495057;
            border-radius: 0.5rem;
            font-size: 1rem;
            background: #343a40;
            color: #f8f9fa;
        }
        .form-group textarea {
            min-height: 150px;
            flex-grow: 1;
            resize: vertical;
        }
        .ai-composer-bar {
            display: flex;
            gap: 0.5rem;
            margin-top: 0.5rem;
        }
        .ai-composer-bar input {
            flex-grow: 1;
        }
        .ai-draft-btn {
            padding: 0.75rem 1rem;
            border: none;
            border-radius: 0.5rem;
            background-color: var(--accent-bg);
            color: var(--accent-text);
            font-weight: 600;
            cursor: pointer;
            transition: background-color 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 100px;
        }
        .ai-draft-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        .ai-draft-btn:hover:not(:disabled) {
            background-color: #b8860b;
        }
        .composer-actions {
            margin-top: auto;
            display: flex;
            justify-content: flex-end;
            align-items: center;
            gap: 1rem;
            padding-top: 1rem;
            border-top: 1px solid #444;
        }
        .send-btn {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 0.5rem;
            background: var(--accent-bg);
            color: var(--accent-text);
            font-weight: 600;
            cursor: pointer;
            transition: background-color 0.2s;
            font-size: 1.1rem;
        }
        .send-btn:hover {
            background-color: #c89c37;
        }
        .disclaimer {
            font-size: 0.8rem;
            color: #888;
            text-align: right;
            flex-grow: 1;
        }
    `;

    return (
        <div className="h-full">
            <style>{styles}</style>
            <div className="email-composer-wrapper">
                <div className="composer-header">
                    <i className="fas fa-envelope-open-text"></i>
                    <h2>Email Composer</h2>
                </div>

                <div className="form-group">
                    <label htmlFor="compose-to">To:</label>
                    <input id="compose-to" type="email" placeholder="recipient@example.com" value={composeTo} onChange={e => setComposeTo(e.target.value)} />
                </div>
                 <div className="form-group">
                    <label htmlFor="compose-subject">Subject:</label>
                    <input id="compose-subject" type="text" placeholder="Email subject" value={composeSubject} onChange={e => setComposeSubject(e.target.value)} />
                </div>

                <div className="form-group">
                    <label htmlFor="ai-prompt">AI Assistant</label>
                    <div className="ai-composer-bar">
                        <input id="ai-prompt" type="text" placeholder="Tell the AI what to write..." value={composeAiPrompt} onChange={e => setComposeAiPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAiDraft(); }} />
                        <button onClick={handleAiDraft} disabled={isLoading || !composeAiPrompt} className="ai-draft-btn">
                            {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-robot mr-2"></i> Draft</>}
                        </button>
                    </div>
                    {aiError && <p className="text-red-600 text-sm mt-1">{aiError}</p>}
                </div>
                
                 <div className="form-group flex-grow">
                    <label htmlFor="compose-body">Body:</label>
                    <textarea id="compose-body" placeholder="Your message..." value={composeBody} onChange={e => setComposeBody(e.target.value)}></textarea>
                </div>
                
                <div className="composer-actions">
                    <p className="disclaimer">Saves the composed message to your Notepad.</p>
                    <button onClick={handleSaveAsDraft} className="send-btn">
                        <i className="fas fa-save mr-2"></i> Save as Draft
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmailClient;