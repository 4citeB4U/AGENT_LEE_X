/*
LEEWAY HEADER — DO NOT REMOVE
REGION: UI.UNKNOWN
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_ASCII: family=lucide glyph=layout-dashboard ICON_SIG=CD534113
5WH: WHAT=Module: MediaAnalyzer.tsx; WHY=standardize; WHO=RapidWebDevelop; WHERE=F:\4leeway-multitool\components\MediaAnalyzer.tsx; WHEN=2025-10-05; HOW=React/Tailwind
SIG: 00000000
AGENTS: AZR, PHI3, GEMINI, QWEN, LLAMA, ECHO
SPDX-License-Identifier: MIT
*/

import React, { useState, useCallback } from 'react';
import ResultContainer from './ResultContainer';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

interface MediaAnalyzerProps {
    result: string;
    loading: boolean;
    error: string;
    file: File | null;
    setFile: (file: File | null) => void;
    onStartNew: () => void;
}

const MediaAnalyzer: React.FC<MediaAnalyzerProps> = ({ result, loading, error, file, setFile, onStartNew }) => {
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleFile = useCallback((selectedFile: File) => {
    if (!selectedFile) return;

    if (selectedFile.size > 20 * 1024 * 1024) { // 20MB limit
      setLocalError("File size exceeds 20MB. Please choose a smaller file.");
      setFile(null);
      setMediaPreviewUrl(null);
      return;
    }
    
    setLocalError('');
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onloadend = () => {
      const url = reader.result as string;
      setMediaPreviewUrl(url);
      if (selectedFile.type.startsWith('image/')) setMediaType('image');
      else if (selectedFile.type.startsWith('video/')) setMediaType('video');
      else {
        setMediaType(null);
        setLocalError('Unsupported file type. Please select an image or video.');
      }
    };
    reader.readAsDataURL(selectedFile);
  }, [setFile]);

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleFile(e.dataTransfer.files[0]);
      }
  }, [handleFile]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          handleFile(e.target.files[0]);
      }
  };

  const hasContent = loading || error || result;

  return (
    <div className="h-full flex flex-col" onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
        {hasContent ? (
            <div className="flex-grow flex flex-col min-h-0">
                <div className="flex-grow overflow-y-auto">
                    {loading && <LoadingSpinner message="Analyzing media..." />}
                    {error && <ErrorMessage message={error} />}
                    {result && <ResultContainer markdownContent={result} />}
                </div>
                {result && !loading && (
                    <div className="mt-4 text-center flex-shrink-0">
                        <button
                            onClick={onStartNew}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                        >
                            Analyze Another Media File
                        </button>
                    </div>
                )}
            </div>
        ) : (
             <div className={`flex-grow border-2 border-dashed rounded-lg flex flex-col justify-center items-center text-center p-8 transition-colors ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'}`}>
                {mediaPreviewUrl && file ? (
                    <div className="flex flex-col items-center">
                        {mediaType === 'image' && <img src={mediaPreviewUrl} alt="Preview" className="max-w-full max-h-[40vh] rounded-md mb-4" />}
                        {mediaType === 'video' && <video src={mediaPreviewUrl} controls className="max-w-full max-h-[40vh] rounded-md mb-4" />}
                        <p className="text-gray-800 mb-2">{file.name}</p>
                        <p className="text-gray-600">Now, enter a prompt below and click send.</p>
                        <button onClick={() => { setFile(null); setMediaPreviewUrl(null); }} className="mt-4 bg-red-600 text-white px-4 py-1 rounded-md text-sm">Remove File</button>
                    </div>
                ) : (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 text-gray-400 mb-4" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" /><path d="M7 9l5 -5l5 5" /><path d="M12 4l0 12" /></svg>
                        <p className="text-gray-600 mb-2">Drag & drop an image or video file here</p>
                        <p className="text-gray-500 text-sm mb-4">or</p>
                        <label htmlFor="media-upload-dnd" className="bg-indigo-600 text-white px-4 py-2 rounded-md cursor-pointer hover:bg-indigo-700">
                          Browse File
                        </label>
                        <input id="media-upload-dnd" type="file" onChange={onFileChange} accept="image/*,video/*" className="hidden" />
                    </>
                )}
                {localError && <p className="text-red-500 mt-4">{localError}</p>}
            </div>
        )}
    </div>
  );
};

export default MediaAnalyzer;
