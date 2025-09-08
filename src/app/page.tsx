"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AgentLeeInterface } from "@/components/agent-lee/AgentLeeInterface";
import LoginPage from "./login/page";

export default function Home() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const user = localStorage.getItem("agentlee_user");
      if (user) {
        setIsLoggedIn(true);
      }
    } catch (e) {
      // localStorage not available
    } finally {
      setIsLoading(false);
    }
  }, []);

  if (isLoading) {
    return null; // Or a loading skeleton if you prefer
  }

  if (isLoggedIn) {
    return <AgentLeeInterface />;
  }

  return <LoginPage />;
}
