"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

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
  const [isHovered, setIsHovered] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (onVoiceCommand && finalTranscript) {
          onVoiceCommand(finalTranscript);
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
    { handler: onEmailClick, src: '/AGENT_LEE_X/lovable-uploads/5b829016-a661-4a5d-97c3-b0a6bc95ed24.png', alt: "Email", hint: "email icon", pos: "-top-6 -left-20" },
    { handler: onSearchClick, src: '/AGENT_LEE_X/lovable-uploads/3ef1b161-4910-4b78-a7ba-b0ce7bebdec5.png', alt: "Search", hint: "search icon", pos: "-top-6 -right-20" },
    { handler: onCallClick, src: '/AGENT_LEE_X/lovable-uploads/376c2c5c-5f76-43c2-a388-bfd6d663e9f6.png', alt: "Phone", hint: "phone icon", pos: "-bottom-6 -right-20" },
    { handler: onNotesClick, src: '/AGENT_LEE_X/lovable-uploads/e0b44e0c-5c77-4df7-a9d5-a2164441be9e.png', alt: "Notes", hint: "document icon", pos: "-bottom-6 -left-20" }
  ];

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
      <div 
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
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
            `}
          >
            <Image 
              src="/AGENT_LEE_X/lovable-uploads/8364747b-ed79-4640-b301-891588217f5e.png"
              alt="MACMILLION Microphone"
              width={96}
              height={96} 
              className="object-contain filter drop-shadow-lg"
              data-ai-hint="microphone logo"
              priority
            />
            <div className="absolute inset-0 nexus-ring opacity-60" />
            {isListening && (
              <div className="absolute inset-0 bg-gold-primary/20 rounded-full animate-ping" />
            )}
          </Button>
        </div>

        <div className={`
          absolute inset-0 transition-all duration-300 ease-out
          ${isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'}
        `}>
          {actionButtons.map((btn, i) => (
            <Button
              key={i}
              variant="icon"
              size="icon-lg"
              onClick={btn.handler}
              className={`absolute ${btn.pos} transform hover:scale-110 transition-all duration-200 bg-transparent border-0 p-0`}
              title={btn.alt}
            >
              <Image src={btn.src} alt={btn.alt} width={48} height={48} className="object-contain" data-ai-hint={btn.hint} priority />
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
