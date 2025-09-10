"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';

interface NexusMicrophoneProps {
  onVoiceCommand?: (command: string) => void;
  onEmailClick?: () => void;
  onSearchClick?: () => void;
  onCallClick?: () => void;
  onNotesClick?: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export const NexusMicrophone: React.FC<NexusMicrophoneProps> = ({
  onVoiceCommand,
  onEmailClick,
  onSearchClick,
  onCallClick,
  onNotesClick,
}) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const basePath = process.env.NODE_ENV === 'production' ? '/AGENT_LEE_X' : '';

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let interim = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          const text = res[0]?.transcript || '';
          if (res.isFinal) finalTranscript += text; else interim += text;
        }
        if (interim) {
          try { window.dispatchEvent(new CustomEvent('agentlee:voice-interim', { detail: { text: interim } })); } catch {}
        }
        if (finalTranscript) {
          if (onVoiceCommand) onVoiceCommand(finalTranscript);
          try { window.dispatchEvent(new CustomEvent('agentlee:voice-transcript', { detail: { text: finalTranscript } })); } catch {}
        }
      };
      
      recognition.onend = () => {
          if (isListening) {
              try {
                recognition.start();
              } catch(e) {
                console.error("Speech recognition restart failed", e)
                setIsListening(false);
              }
          }
      }
      
      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      }

      recognitionRef.current = recognition;
    }

    return () => {
        if(recognitionRef.current) {
            recognitionRef.current.stop();
        }
    }
  }, [onVoiceCommand, isListening]);

  const handleMicClick = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        console.error("Could not start speech recognition", e);
        setIsListening(false);
      }
    }
  };

  const actionButtons = [
    { handler: onEmailClick, src: `${basePath}/image/image/email.png`, alt: "Email", hint: "email icon", pos: "-top-6 -left-20" },
    { handler: onSearchClick, src: `${basePath}/image/image/Search.png`, alt: "Search", hint: "search icon", pos: "-top-6 -right-20" },
    { handler: onCallClick, src: `${basePath}/image/image/callandvideo.png`, alt: "Phone", hint: "phone icon", pos: "-bottom-6 -right-20" },
    { handler: onNotesClick, src: `${basePath}/image/image/quicknotes.png`, alt: "Notes", hint: "document icon", pos: "-bottom-6 -left-20" }
  ];

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[100] pointer-events-none">
      <div 
        className="relative pointer-events-none"
      >
        <div className="relative">
          <Button
            variant="nexus"
            size="nexus"
            onClick={handleMicClick}
            className={`
              relative overflow-hidden
              ${isListening ? 'nexus-pulse animate-pulse' : ''}
              hover:nexus-glow transition-all duration-500
              pointer-events-auto
            `}
          >
            <img
              src={`${basePath}/image/image/macmillionmic.png`}
              alt="MACMILLION Microphone"
              width={96}
              height={96}
              className="object-contain filter drop-shadow-lg"
              style={{ width: 'auto', height: 'auto' }}
              data-ai-hint="microphone logo"
              loading="eager"
            />
            <div className="absolute inset-0 nexus-ring opacity-60" />
            {isListening && (
              <div className="absolute inset-0 bg-gold-primary/20 rounded-full animate-ping" />
            )}
          </Button>
        </div>

        <div className="absolute inset-0 pointer-events-none">
          {actionButtons.map((btn, i) => (
            <Button
              key={i}
              variant="icon"
              size="icon-lg"
              onClick={btn.handler}
              className={`absolute ${btn.pos} transform hover:scale-110 transition-all duration-200 bg-transparent border-0 p-0 pointer-events-auto`}
              title={btn.alt}
            >
              <img src={btn.src} alt={btn.alt} width={48} height={48} className="object-contain" style={{ width: 'auto', height: 'auto' }} data-ai-hint={btn.hint} loading="eager" />
            </Button>
          ))}
        </div>

        {isListening && (
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
            <div className="bg-status-active text-emerald-primary px-3 py-1 rounded-full text-xs font-medium">
              Listening...
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
