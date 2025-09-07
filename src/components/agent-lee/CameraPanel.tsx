"use client";
import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, CameraOff, Send, Mic } from 'lucide-react';

export const CameraPanel: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: false 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsStreaming(true);
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
      }
    };

    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleSendMessage = () => {
    if (message.trim()) {
      console.log('Sending message:', message);
      setMessage('');
    }
  };

  return (
    <div className="glass-panel rounded-2xl overflow-hidden shadow-luxury h-full relative">
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full animate-pulse ${
          isStreaming ? 'bg-status-error' : 'bg-gold-muted'
        }`} />
        <span className="text-sm text-gold-primary font-medium">Camera</span>
      </div>

      <div className="absolute top-4 right-4 z-10">
        <Button variant="icon" size="icon-sm" className="glass-panel">
          {isStreaming ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
        </Button>
      </div>

      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover bg-emerald-primary"
      />

      <div className="absolute bottom-4 left-4 right-4">
        <div className="glass-panel rounded-xl border border-glass-border backdrop-blur-lg">
          <div className="flex items-center gap-2 p-3">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Say or type anything (e.g., 'look up Chicago lakefront events')"
              className="flex-1 bg-transparent border-0 text-gold-primary placeholder:text-gold-muted focus:ring-0"
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <Button 
              variant="action" 
              size="icon-sm"
              onClick={handleSendMessage}
              disabled={!message.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
            <Button variant="action" size="icon-sm">
              <Mic className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="text-xs text-gold-muted mt-2 px-1">
          Tip: "look up … / find … / what is … / research … / search …" triggers a web search.
        </div>
      </div>
    </div>
  );
};
