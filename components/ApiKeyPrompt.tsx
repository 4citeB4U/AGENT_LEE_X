/* LEEWAY HEADER
TAG: FRONTEND.COMPONENT.API_KEY_PROMPT
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: key
ICON_SIG: CD534113
5WH: WHAT=API key input prompt component; WHY=Handle missing API key gracefully; WHO=Leeway Core (agnostic); WHERE=components/ApiKeyPrompt.tsx; WHEN=2025-10-09; HOW=React + input field + validation
SPDX-License-Identifier: MIT
*/

import React, { useState } from 'react';

interface ApiKeyPromptProps {
  onApiKeySet: (apiKey: string) => void;
}

const ApiKeyPrompt: React.FC<ApiKeyPromptProps> = ({ onApiKeySet }) => {
  const [apiKey, setApiKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      setIsSubmitting(true);
      onApiKeySet(apiKey.trim());
    }
  };

  return (
    <div className="api-key-prompt-overlay">
      <div className="api-key-prompt-modal">
        <div className="api-key-header">
          <h2>🔑 API Key Required</h2>
          <p>Please enter your Google Gemini API key to use Agent Lee.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="api-key-form">
          <div className="input-group">
            <label htmlFor="api-key-input">Gemini API Key:</label>
            <input
              id="api-key-input"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key..."
              className="api-key-input"
              disabled={isSubmitting}
              autoFocus
            />
          </div>
          
          <button 
            type="submit" 
            disabled={!apiKey.trim() || isSubmitting}
            className="api-key-submit"
          >
            {isSubmitting ? 'Setting up...' : 'Continue'}
          </button>
        </form>
        
        <div className="api-key-help">
          <p>
            <strong>How to get an API key:</strong>
          </p>
          <ol>
            <li>Visit <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a></li>
            <li>Sign in with your Google account</li>
            <li>Click "Create API Key"</li>
            <li>Copy and paste the key above</li>
          </ol>
          <p className="api-key-note">
            💡 Your API key will be stored locally in your browser and never shared.
          </p>
        </div>
      </div>
      
      <style>{`
        .api-key-prompt-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 20px;
        }
        
        .api-key-prompt-modal {
          background: #1e293b;
          border-radius: 12px;
          padding: 30px;
          max-width: 500px;
          width: 100%;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          border: 1px solid #334155;
        }
        
        .api-key-header h2 {
          color: #f1f5f9;
          margin: 0 0 10px 0;
          font-size: 24px;
        }
        
        .api-key-header p {
          color: #cbd5e1;
          margin: 0 0 25px 0;
          line-height: 1.5;
        }
        
        .api-key-form {
          margin-bottom: 25px;
        }
        
        .input-group {
          margin-bottom: 20px;
        }
        
        .input-group label {
          display: block;
          color: #f1f5f9;
          margin-bottom: 8px;
          font-weight: 500;
        }
        
        .api-key-input {
          width: 100%;
          padding: 12px 15px;
          background: #0f172a;
          border: 2px solid #334155;
          border-radius: 8px;
          color: #f1f5f9;
          font-size: 16px;
          transition: border-color 0.3s ease;
        }
        
        .api-key-input:focus {
          outline: none;
          border-color: #3b82f6;
        }
        
        .api-key-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .api-key-submit {
          width: 100%;
          padding: 12px 20px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.3s ease;
        }
        
        .api-key-submit:hover:not(:disabled) {
          background: #2563eb;
        }
        
        .api-key-submit:disabled {
          background: #64748b;
          cursor: not-allowed;
        }
        
        .api-key-help {
          color: #cbd5e1;
          font-size: 14px;
          line-height: 1.5;
        }
        
        .api-key-help strong {
          color: #f1f5f9;
        }
        
        .api-key-help ol {
          margin: 10px 0;
          padding-left: 20px;
        }
        
        .api-key-help li {
          margin-bottom: 5px;
        }
        
        .api-key-help a {
          color: #3b82f6;
          text-decoration: none;
        }
        
        .api-key-help a:hover {
          text-decoration: underline;
        }
        
        .api-key-note {
          margin-top: 15px;
          padding: 10px;
          background: #0f172a;
          border-radius: 6px;
          border-left: 3px solid #3b82f6;
        }
        
        @media (max-width: 600px) {
          .api-key-prompt-modal {
            margin: 20px;
            padding: 20px;
          }
          
          .api-key-header h2 {
            font-size: 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default ApiKeyPrompt;