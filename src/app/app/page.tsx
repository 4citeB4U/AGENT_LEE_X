"use client";

import { useEffect } from "react";
import { AgentLeeInterface } from "@/components/agent-lee/AgentLeeInterface";
import { AppProvider, useAppState } from "@/contexts/AppContext";

// System initialization loading screen after login
const SystemInitializingScreen: React.FC = () => {
  const { loadingMessage } = useAppState();
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground text-center p-4">
      <div className="text-3xl font-bold mb-4 text-gold-primary animate-pulse">
        Agent Lee — Boot Sequence Initiated
      </div>
      <p className="text-lg text-emerald-primary mb-2">{loadingMessage.replace('%','')}</p>
      <div className="w-64 h-2 bg-emerald-secondary rounded-full overflow-hidden mt-4">
        <div className="h-full bg-gold-primary animate-pulse" style={{ width: '100%' }} />
      </div>
      <p className="text-sm text-muted-foreground mt-4">Please wait while Agent Lee brings all systems online.</p>
    </div>
  );
};

// Orchestrates showing the system init screen until AppProvider completes init
const AgentLeeInterfaceOrchestrator: React.FC = () => {
  const { isInitializing, allModelsInitialized } = useAppState();
  if (isInitializing && !allModelsInitialized) {
    return <SystemInitializingScreen />;
  }
  return <AgentLeeInterface />;
};

export default function AppHome() {
  // Force this page to always render the initialized UI. Login happens at /login
  useEffect(() => {}, []);
  return (
    <AppProvider>
      <AgentLeeInterfaceOrchestrator />
    </AppProvider>
  );
}
