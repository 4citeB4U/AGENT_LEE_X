/*
LEEWAY HEADER — DO NOT REMOVE
REGION: UI.UNKNOWN
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_ASCII: family=lucide glyph=layout-dashboard ICON_SIG=CD534113
5WH: WHAT=Module: ResultContainer.tsx; WHY=standardize; WHO=RapidWebDevelop; WHERE=F:\4leeway-multitool\components\ResultContainer.tsx; WHEN=2025-10-05; HOW=React/Tailwind
SIG: 00000000
AGENTS: AZR, PHI3, GEMINI, QWEN, LLAMA, ECHO
SPDX-License-Identifier: MIT
*/

import React, { useState } from 'react';
import { mdToHtml } from '../utils/markdown';

interface ResultContainerProps {
  markdownContent: string;
}

const ResultContainer: React.FC<ResultContainerProps> = ({ markdownContent }) => {
  const [copyStatus, setCopyStatus] = useState('Copy');

  const handleCopy = () => {
    navigator.clipboard.writeText(markdownContent).then(() => {
      setCopyStatus('Copied!');
      setTimeout(() => setCopyStatus('Copy'), 2000);
    }, () => {
      setCopyStatus('Failed!');
      setTimeout(() => setCopyStatus('Copy'), 2000);
    });
  };

  const handleDownload = () => {
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gemini-result.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const handleShare = async () => {
    if ('share' in navigator && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'Gemini AI Result',
          text: markdownContent,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      alert('Web Share API is not supported in your browser.');
    }
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg min-h-[100px] flex flex-col">
      <div className="flex-shrink-0 p-2 border-b border-gray-200 flex items-center justify-end gap-2 bg-gray-100/50 rounded-t-lg">
        <button onClick={handleCopy} className="text-xs text-gray-600 hover:text-black px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 transition-colors">{copyStatus}</button>
        <button onClick={handleDownload} className="text-xs text-gray-600 hover:text-black px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 transition-colors">Download</button>
        {'share' in navigator && typeof navigator.share === 'function' && (
          <button onClick={handleShare} className="text-xs text-gray-600 hover:text-black px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 transition-colors">Share</button>
        )}
      </div>
      <div className="p-4 sm:p-6 overflow-y-auto flex-grow">
        <div
          className="prose max-w-none prose-p:text-gray-700 prose-strong:text-black prose-a:text-indigo-600"
          dangerouslySetInnerHTML={{ __html: mdToHtml(markdownContent) }}
        />
      </div>
    </div>
  );
};

export default ResultContainer;
