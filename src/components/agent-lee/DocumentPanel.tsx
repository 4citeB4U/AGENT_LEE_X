"use client";
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Share, Download, Upload, File, Video, Image as ImageIcon, Music } from 'lucide-react';

export const DocumentPanel: React.FC = () => {
  const [document, setDocument] = useState<{
    name: string;
    type: string;
    content: string | null;
    url: string | null;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setDocument({
      name: file.name,
      type: file.type,
      content: null,
      url
    });

    if (file.type.startsWith('text/') || file.name.endsWith('.md')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setDocument(prev => prev ? {
          ...prev,
          content: e.target?.result as string
        } : null);
      };
      reader.readAsText(file);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('video/')) return Video;
    if (type.startsWith('image/')) return ImageIcon;
    if (type.startsWith('audio/')) return Music;
    return File;
  };

  const renderDocument = () => {
    if (!document) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gold-muted">
          <FileText className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-sm text-center">No document or video loaded yet.</p>
          <p className="text-xs text-center mt-1">Upload a file to get started</p>
        </div>
      );
    }

    if (document.type.startsWith('video/') && document.url) {
      return (
        <video 
          src={document.url} 
          controls 
          className="w-full h-auto max-h-full object-contain"
        />
      );
    }

    if (document.type.startsWith('image/') && document.url) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-white">
          <img src={document.url} alt={document.name} className="max-w-full max-h-full object-contain" />
        </div>
      );
    }

    if (document.type.startsWith('audio/') && document.url) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-4">
          <Music className="w-12 h-12 mb-4 text-gold-primary" />
          <audio 
            src={document.url} 
            controls 
            className="w-full max-w-md"
          />
        </div>
      );
    }

    if (document.type === 'application/pdf' && document.url) {
      return (
        <iframe 
          src={document.url} 
          className="w-full h-full border-0"
          title={document.name}
        />
      );
    }

    if (document.content) {
      return (
        <ScrollArea className="h-full bg-white">
          <pre className="text-xs text-gold-primary whitespace-pre-wrap p-4 font-code bg-white">
            {document.content}
          </pre>
        </ScrollArea>
      );
    }

    const IconComponent = getFileIcon(document.type);
    return (
      <div className="flex flex-col items-center justify-center h-full text-gold-muted p-4">
        <IconComponent className="w-12 h-12 mb-4 text-gold-primary" />
        <p className="text-sm font-medium text-gold-primary text-center">{document.name}</p>
        <p className="text-xs text-center">File loaded successfully</p>
      </div>
    );
  };

  return (
    <div className="glass-panel rounded-2xl overflow-hidden shadow-luxury h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-glass-border flex-shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <FileText className="w-5 h-5 text-gold-primary flex-shrink-0" />
          <h3 className="font-semibold text-gold-primary truncate">
            {document ? document.name : 'Document'}
          </h3>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button 
            variant="ghost" 
            size="icon-sm" 
            title="Share"
            disabled={!document}
          >
            <Share className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon-sm" 
            title="Download"
            disabled={!document}
            onClick={() => {
              if (document?.url) {
                const a = window.document.createElement('a');
                a.href = document.url;
                a.download = document.name;
                a.click();
              }
            }}
          >
            <Download className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon-sm" 
            title="Upload"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto bg-white">
        {renderDocument()}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileUpload}
        accept=".txt,.md,.pdf,.html,.json,.mp4,.webm,.wav,.mp3,.png,.jpg,.jpeg"
        className="hidden"
      />
    </div>
  );
};
