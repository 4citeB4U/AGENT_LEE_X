/*
LEEWAY HEADER — DO NOT REMOVE
REGION: UI.UNKNOWN
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_ASCII: family=lucide glyph=layout-dashboard ICON_SIG=CD534113
5WH: WHAT=Module: TextGenerator.tsx; WHY=standardize; WHO=RapidWebDevelop; WHERE=F:\4leeway-multitool\components\TextGenerator.tsx; WHEN=2025-10-05; HOW=React/Tailwind
SIG: 00000000
AGENTS: AZR, PHI3, GEMINI, QWEN, LLAMA, ECHO
SPDX-License-Identifier: MIT
*/

import React from 'react';
import ResultContainer from './ResultContainer';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

interface TextGeneratorProps {
  result: string;
  loading: boolean;
  error: string;
  systemInstruction: string;
  setSystemInstruction: (value: string) => void;
}

const TextGenerator: React.FC<TextGeneratorProps> = ({ result, loading, error, systemInstruction, setSystemInstruction }) => {
  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <label htmlFor="system-instruction" className="block text-sm font-medium text-gray-700 mb-1">System Instruction (Optional)</label>
        <input
          id="system-instruction"
          type="text"
          value={systemInstruction}
          onChange={(e) => setSystemInstruction(e.target.value)}
          placeholder="e.g., Act as a world-class chef"
          className="w-full bg-gray-50 border border-gray-300 rounded-md p-2 text-gray-900 placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>
      <div className="flex-grow">
        {loading && <LoadingSpinner message="Thinking..." />}
        {error && <ErrorMessage message={error} />}
        {result && <ResultContainer markdownContent={result} />}
        {!loading && !error && !result && (
            <div className="text-center text-gray-500 h-full flex items-center justify-center">
                <p>Enter a prompt and an optional instruction, then click send.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default TextGenerator;
