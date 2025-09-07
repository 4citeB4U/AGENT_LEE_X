"use client";
import React, { useState } from 'react';
import { CameraPanel } from './CameraPanel';
import { AgentPanel } from './AgentPanel';
import { SearchPanel } from './SearchPanel';
import { DocumentPanel } from './DocumentPanel';
import { NexusMicrophone } from './NexusMicrophone';
import { SettingsPanel } from './SettingsPanel';
import { FloatingNotepad } from './FloatingNotepad';
import { VoiceDialer } from './VoiceDialer';
import { RWDLogo } from './RWDLogo';

export const AgentLeeInterface: React.FC = () => {
  const [isNotepadOpen, setIsNotepadOpen] = useState(false);
  const [isDialerOpen, setIsDialerOpen] = useState(false);

  const handleEmailClick = () => {
    const body = 'Message from Agent Lee';
    const subject = 'Agent Lee Communication';
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleSearchClick = () => {
    console.log('Search clicked');
    // Could trigger a search in the search panel
  };

  const handleCallClick = () => {
    setIsDialerOpen(true);
  };

  const handleNotesClick = () => {
    setIsNotepadOpen(true);
  };

  const handleVoiceCommand = (command: string) => {
    console.log('Voice command:', command);
    // Process voice commands here
  };

  return (
    <div className="min-h-screen bg-luxury-gradient relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="w-full h-full" style={{
          backgroundImage: `
            linear-gradient(hsla(var(--gold-primary) / 0.1) 1px, transparent 1px),
            linear-gradient(90deg, hsla(var(--gold-primary) / 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="h-screen grid grid-cols-1 lg:grid-cols-2 grid-rows-2 gap-6 p-6 relative z-10">
        <CameraPanel />
        <AgentPanel />
        <SearchPanel />
        <DocumentPanel />
      </div>

      <NexusMicrophone
        onEmailClick={handleEmailClick}
        onSearchClick={handleSearchClick}
        onCallClick={handleCallClick}
        onNotesClick={handleNotesClick}
        onVoiceCommand={handleVoiceCommand}
      />

      <SettingsPanel />

      <FloatingNotepad 
        isOpen={isNotepadOpen} 
        onClose={() => setIsNotepadOpen(false)} 
      />

      <VoiceDialer 
        isOpen={isDialerOpen} 
        onClose={() => setIsDialerOpen(false)} 
      />

      <RWDLogo />

      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gold-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-emerald-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
    </div>
  );
};
