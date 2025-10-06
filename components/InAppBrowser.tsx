/* LEEWAY HEADER
TAG: FRONTEND.UI.IN_APP_BROWSER
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: layout-dashboard
ICON_SIG: CD534113
5WH: WHAT=Ephemeral in-app overlay web viewer; WHY=Allow contextual browsing without losing workspace focus; WHO=Leeway Core (agnostic); WHERE=components/InAppBrowser.tsx; WHEN=2025-10-05; HOW=React portal-style overlay + iframe isolation
SPDX-License-Identifier: MIT
*/

import React, { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface InAppBrowserProps {
  url: string;
  onClose: () => void;
}

const InAppBrowser: React.FC<InAppBrowserProps> = ({ url, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);

  const styles = `
    .in-app-browser-backdrop {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.8);
      display: flex; align-items: center; justify-content: center;
      z-index: 100;
      padding: 1rem;
    }
    .in-app-browser-container {
      background: #f0f0f0; /* Light background for content readability */
      color: #111;
      width: 100%;
      height: 100%;
      max-width: 1200px;
      max-height: 90vh;
      border-radius: 1rem;
      border: 2px solid var(--border-color);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .in-app-browser-header {
      display: flex;
      align-items: center;
      padding: 0.75rem 1rem;
      background: var(--bg-gradient);
      color: var(--text-primary);
      flex-shrink: 0;
    }
    .url-display {
      background: rgba(0,0,0,0.3);
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      font-family: 'Roboto Mono', monospace;
      font-size: 0.875rem;
      color: var(--text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex-grow: 1;
    }
    .header-actions {
      display: flex;
      gap: 0.75rem;
      margin-left: 1rem;
    }
    .header-actions a, .header-actions button {
      background: var(--accent-bg);
      color: var(--accent-text);
      border: none;
      border-radius: 0.5rem;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s ease;
    }
    .header-actions a:hover, .header-actions button:hover {
      background: #b8860b;
    }
    .iframe-wrapper {
      flex-grow: 1;
      position: relative;
    }
    .in-app-iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
    .in-app-iframe.is-loading { display: none; }
    .in-app-iframe.is-visible { display: block; }
  `;

  return (
    <>
      <style>{styles}</style>
      <div className="in-app-browser-backdrop" onClick={onClose}>
        <div className="in-app-browser-container" onClick={(e) => e.stopPropagation()}>
          <header className="in-app-browser-header">
            <div className="url-display" title={url}>
              {url}
            </div>
            <div className="header-actions">
              <a href={url} target="_blank" rel="noopener noreferrer" title="Open in New Tab">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M11 7h-5a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2 -2v-5" /><path d="M10 14l10 -10" /><path d="M15 4l5 0l0 5" /></svg>
              </a>
              <button onClick={onClose} title="Close">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg>
              </button>
            </div>
          </header>
          <div className="iframe-wrapper">
            {isLoading && <LoadingSpinner message={`Loading content...`} />}
            <iframe
              src={url}
              className={`in-app-iframe ${isLoading ? 'is-loading' : 'is-visible'}`}
              title="In-App Browser"
              sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-presentation allow-same-origin allow-scripts"
              onLoad={() => setIsLoading(false)}
            ></iframe>
          </div>
        </div>
      </div>
    </>
  );
};

export default InAppBrowser;