"use client";
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

interface NexusMicrophoneProps {
  onVoiceCommand?: (command: string) => void;
  onEmailClick?: () => void;
  onSearchClick?: () => void;
  onCallClick?: () => void;
  onNotesClick?: () => void;
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

  const handleMicClick = () => {
    setIsListening(!isListening);
    if(onVoiceCommand) {
        onVoiceCommand(isListening ? 'stop' : 'start');
    }
  };

  const actionButtons = [
    { handler: onEmailClick, src: 'https://picsum.photos/48/48', alt: "Email", hint: "email icon", pos: "-top-6 -left-20" },
    { handler: onSearchClick, src: 'https://picsum.photos/48/48', alt: "Search", hint: "search icon", pos: "-top-6 -right-20" },
    { handler: onCallClick, src: 'https://picsum.photos/48/48', alt: "Phone", hint: "phone icon", pos: "-bottom-6 -right-20" },
    { handler: onNotesClick, src: 'https://picsum.photos/48/48', alt: "Notes", hint: "document icon", pos: "-bottom-6 -left-20" }
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
              src="https://picsum.photos/96/96"
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
