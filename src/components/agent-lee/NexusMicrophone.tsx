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
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result) => result.transcript)
          .join('');
        if (onVoiceCommand) {
          onVoiceCommand(transcript);
        }
      };
      
      recognition.onend = () => {
          if (isListening) {
              recognition.start();
          }
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
    } else {
      recognitionRef.current?.start();
    }
    setIsListening(!isListening);
  };

  const actionButtons = [
    { handler: onEmailClick, src: '/lovable-uploads/2a13531b-3f8c-4573-8991-a18a99477017.png', alt: "Email", hint: "email icon", pos: "-top-6 -left-20" },
    { handler: onSearchClick, src: '/lovable-uploads/d3d81b92-9118-4903-a15e-a6167812f2c8.png', alt: "Search", hint: "search icon", pos: "-top-6 -right-20" },
    { handler: onCallClick, src: '/lovable-uploads/df209772-8419-462a-8980-60b64d1f568f.png', alt: "Phone", hint: "phone icon", pos: "-bottom-6 -right-20" },
    { handler: onNotesClick, src: '/lovable-uploads/be1897d2-9a00-47b2-921c-5d6c8b417e29.png', alt: "Notes", hint: "document icon", pos: "-bottom-6 -left-20" }
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
              src="/lovable-uploads/e29a7386-302a-4363-959c-851996841269.png"
              alt="MACMILLION Microphone"
              width={96}
              height={96} 
              className="object-contain filter drop-shadow-lg"
              data-ai-hint="microphone logo"
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
              <Image src={btn.src} alt={btn.alt} width={48} height={48} className="object-contain" data-ai-hint={btn.hint} />
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
