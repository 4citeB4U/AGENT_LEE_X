"use client";
import React from 'react';
import Image from 'next/image';

interface AgentPanelProps {
  transcript: string;
}

export const AgentPanel: React.FC<AgentPanelProps> = ({ transcript }) => {

  return (
    <div className="glass-panel rounded-2xl overflow-hidden shadow-luxury h-full relative flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-glass-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-status-active animate-pulse" />
          <span className="text-sm text-gold-primary font-medium">Agent Lee</span>
        </div>
        <div className="px-3 py-1 bg-emerald-accent/80 rounded-full text-xs text-gold-primary font-medium border border-glass-border">
          v8 • local+free
        </div>
      </div>
      
      <div className="flex-1 min-h-0 flex items-center justify-center p-4">
        {transcript ? (
            <div className="text-center">
                <p className="text-2xl font-headline text-gold-primary">Transcript:</p>
                <p className="text-lg text-foreground mt-2 font-body">{transcript}</p>
            </div>
        ) : (
             <Image
              src="/lovable-uploads/2706e23b-2856-4941-9457-3a17e0892419.png"
              alt="Agent Lee"
              width={350}
              height={525}
              className="object-contain max-w-full max-h-full"
              data-ai-hint="futuristic avatar"
            />
        )}
      </div>

       <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2">
            <div className="flex space-x-1">
                {[0, 1, 2].map((i) => (
                <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-gold-primary animate-pulse"
                    style={{
                    animationDelay: `${i * 0.2}s`,
                    animationDuration: '1.5s'
                    }}
                />
                ))}
            </div>
        </div>
    </div>
  );
};
