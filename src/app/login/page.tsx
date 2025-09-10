"use client";

import AgentLeeLogin from "@/components/login/AgentLeeLogin";

export default function LoginPage() {
  const basePath = process.env.NODE_ENV === 'production' ? '/AGENT_LEE_X' : '';
  return (
    <AgentLeeLogin
      agentLeeSrc={`${basePath}/image/image/AgentLeeavatar.jpeg`}
      logoSrc={`${basePath}/image/image/logo.jpg`}
      onContinueRoute="/app"
    />
  );
}
