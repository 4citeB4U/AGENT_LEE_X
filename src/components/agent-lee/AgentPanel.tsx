"use client";
import React, { useState } from 'react';
import Image from 'next/image';

export const AgentPanel: React.FC = () => {
  const [isActive, setIsActive] = useState(true);

  return (
    <div className="glass-panel rounded-2xl overflow-hidden shadow-luxury h-full relative">
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-status-active animate-pulse" />
        <span className="text-sm text-gold-primary font-medium">Agent Lee</span>
      </div>

      <div className="absolute bottom-4 right-4 z-10">
        <div className="px-3 py-1 bg-emerald-accent/80 rounded-full text-xs text-gold-primary font-medium border border-glass-border">
          v8 • local+free
        </div>
      </div>

      <div className="w-full h-full relative overflow-hidden">
        <Image
          src="/lovable-uploads/2706e23b-2856-4941-9457-3a17e0892419.png"
          alt="Agent Lee"
          layout="fill"
          objectFit="cover"
          data-ai-hint="futuristic avatar"
        />
        
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-primary/20 via-transparent to-transparent" />
        
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full" style={{
            backgroundImage: `
              linear-gradient(hsla(var(--gold-primary)/0.1) 1px, transparent 1px),
              linear-gradient(90deg, hsla(var(--gold-primary)/0.1) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px'
          }} />
        </div>

        {isActive && (
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
        )}
      </div>
    </div>
  );
};
