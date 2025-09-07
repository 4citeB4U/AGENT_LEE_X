"use client";
import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, CameraOff, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


export const CameraPanel: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [message, setMessage] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({video: true});
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to use this app.',
        });
      }
    };

    getCameraPermission();
    
    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [toast]);

  const handleSendMessage = () => {
    if (message.trim()) {
      console.log('Sending message:', message);
      setMessage('');
    }
  };

  return (
    <div className="glass-panel rounded-2xl overflow-hidden shadow-luxury h-full relative flex flex-col justify-center items-center">
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full animate-pulse ${
          hasCameraPermission ? 'bg-status-active' : 'bg-status-error'
        }`} />
        <span className="text-sm text-gold-primary font-medium">Camera</span>
      </div>

      <div className="absolute top-4 right-4 z-10">
        <Button variant="icon" size="icon-sm" className="glass-panel">
          {hasCameraPermission ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
        </Button>
      </div>

      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover bg-emerald-primary"
      />
      
      {hasCameraPermission === false && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center p-4">
            <Alert variant="destructive" className="max-w-md">
              <AlertTitle>Camera Access Required</AlertTitle>
              <AlertDescription>
                Please allow camera access in your browser to use this feature. You may need to refresh the page after granting permissions.
              </AlertDescription>
            </Alert>
        </div>
      )}


      <div className="absolute bottom-4 left-4 right-4 z-10">
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
          </div>
        </div>
        <div className="text-xs text-gold-muted mt-2 px-1">
          Tip: "look up … / find … / what is … / research … / search …" triggers a web search.
        </div>
      </div>
    </div>
  );
};
