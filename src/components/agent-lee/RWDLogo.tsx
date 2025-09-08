"use client";
import React from 'react';
import Image from 'next/image';

export const RWDLogo: React.FC = () => {
  return (
    <a href="https://rapidwebdevelop.com" target="_blank" rel="noopener noreferrer" className="fixed bottom-4 right-4 z-30">
      <Image 
        src="/AGENT_LEE_X/lovable-uploads/a0346b12-b829-4d31-9619-69caf97bb57c.png" 
        alt="RWD Logo"
        width={64}
        height={64}
        data-ai-hint="corporate logo"
        className="opacity-80 hover:opacity-100 transition-opacity duration-300 filter drop-shadow-lg" 
        priority
      />
    </a>
  );
};
