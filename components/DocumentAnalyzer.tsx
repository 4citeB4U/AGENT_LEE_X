/* LEEWAY HEADER
TAG: FRONTEND.COMPONENT.DOCUMENT_ANALYZER
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: file-text
ICON_SIG: CD534113
5WH: WHAT=Drag-drop / picker based document ingestion & parsing; WHY=Transform files into analyzable text quickly; WHO=Leeway Core (agnostic); WHERE=components/DocumentAnalyzer.tsx; WHEN=2025-10-05; HOW=React + File System Access API fallback
SPDX-License-Identifier: MIT
*/

import React, { useCallback, useState } from 'react';
import { parseFile } from '../utils/fileParser';
import ErrorMessage from './ErrorMessage';
import LoadingSpinner from './LoadingSpinner';
import ResultContainer from './ResultContainer';

// For TypeScript, define the File System Access API structure
declare global {
    interface Window {
        // FIX: Updated the type definition to allow for an optional `options` parameter,
        // making it consistent with other declarations in the app and preventing type errors.
        showOpenFilePicker?: (options?: any) => Promise<any[]>;
    }
}

interface DocumentAnalyzerProps {
    result: string;
    loading: boolean;
    error: string;
    file: File | null;
    setFile: (file: File | null) => void;
    onStartNew: () => void;
}

const DocumentAnalyzer: React.FC<DocumentAnalyzerProps> = ({ result, loading, error, file, setFile, onStartNew }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState('');
  const [parsedContentPreview, setParsedContentPreview] = useState('');

  const isFileSystemApiSupported = 'showOpenFilePicker' in window;

  const handleFile = useCallback(async (selectedFile: File) => {
    if (!selectedFile) return;

    if (selectedFile.size > 20 * 1024 * 1024) { // 20MB limit
      setLocalError("File size exceeds 20MB.");
      setFile(null);
      setParsedContentPreview('');
      return;
    }
    
    setLocalError('');
    setFile(selectedFile);
    
    try {
        const { content } = await parseFile(selectedFile);
        setParsedContentPreview(content.substring(0, 500) + (content.length > 500 ? '...' : ''));
    } catch(err: any) {
        setLocalError(err.message || "Could not parse this file.");
        setFile(null);
        setParsedContentPreview('');
    }
  }, [setFile]);

  const handleOpenFilePicker = async () => {
    try {
        const [fileHandle] = await window.showOpenFilePicker!();
        const file = await fileHandle.getFile();
        handleFile(file);
    } catch (err) {
        console.log("File picker cancelled or failed.", err);
        setLocalError("File selection was cancelled.");
    }
  };
  
  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true); }, []);
  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(false); }, []);
  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
  };

  const hasContent = loading || error || result;

  return (
    <div className="h-full flex flex-col" onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
        {hasContent ? (
            <div className="flex-grow flex flex-col min-h-0">
                <div className="flex-grow overflow-y-auto">
                    {loading && <LoadingSpinner message="Analyzing document..." />}
                    {error && <ErrorMessage message={error} />}
                    {result && <ResultContainer markdownContent={result} />}
                </div>
                {result && !loading && (
                    <div className="mt-4 text-center flex-shrink-0">
                        <button
                            onClick={onStartNew}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                        >
                            Analyze Another Document
                        </button>
                    </div>
                )}
            </div>
        ) : (
             <div className={`flex-grow border-2 border-dashed rounded-lg flex flex-col justify-center items-center text-center p-8 transition-colors ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'}`}>
                {file ? (
                    <div className="w-full text-left">
                        <p className="text-gray-800 mb-2 font-semibold">{file.name}</p>
                        <div className="bg-gray-100 p-2 rounded-md max-h-48 overflow-y-auto border border-gray-200">
                           <pre className="text-xs text-gray-600 whitespace-pre-wrap">{parsedContentPreview || "No preview available for this file type."}</pre>
                        </div>
                        <p className="text-gray-600 mt-4 text-center">Now, enter a prompt below and click send.</p>
                        <div className="text-center">
                            <button onClick={() => { setFile(null); setParsedContentPreview(''); }} className="mt-4 bg-red-600 text-white px-4 py-1 rounded-md text-sm">Remove File</button>
                        </div>
                    </div>
                ) : (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 text-gray-400 mb-4" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" /><path d="M7 9l5 -5l5 5" /><path d="M12 4l0 12" /></svg>
                        <p className="text-gray-600 mb-2">Drag & drop a document here</p>
                        <p className="text-gray-500 text-sm mb-4">or</p>
                        <div className="flex gap-2">
                           {isFileSystemApiSupported && (
                                <button onClick={handleOpenFilePicker} className="bg-indigo-600 text-white px-4 py-2 rounded-md cursor-pointer hover:bg-indigo-700">
                                  Open From Device
                                </button>
                           )}
                            <label htmlFor="doc-upload-dnd" className="bg-gray-600 text-white px-4 py-2 rounded-md cursor-pointer hover:bg-gray-700">
                              Browse (Legacy)
                            </label>
                        </div>
                        <input id="doc-upload-dnd" type="file" onChange={onFileChange} className="hidden" />
                        <p className="text-xs text-gray-500 mt-4 max-w-sm">Supports: TXT, MD, Code, PDF, DOCX, XLSX, ZIP</p>
                    </>
                )}
                {localError && <p className="text-red-500 mt-4">{localError}</p>}
            </div>
        )}
    </div>
  );
};

export default DocumentAnalyzer;