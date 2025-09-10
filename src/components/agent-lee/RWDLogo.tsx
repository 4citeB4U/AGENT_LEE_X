"use client";
import React from 'react';

export const RWDLogo: React.FC = () => {
  const basePath = process.env.NODE_ENV === 'production' ? '/AGENT_LEE_X' : '';
  return (
    <a href="https://rapidwebdevelop.com" target="_blank" rel="noopener noreferrer" className="fixed bottom-4 right-4 z-30">
      <img 
        src={`${basePath}/image/image/logo.jpg`} 
        alt="RWD Logo"
        width={64}
        height={64}
        data-ai-hint="corporate logo"
        className="opacity-80 hover:opacity-100 transition-opacity duration-300 filter drop-shadow-lg" 
        loading="eager"
      />
    </a>
  );
};
