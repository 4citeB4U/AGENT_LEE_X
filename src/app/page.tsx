"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AgentLeeInterface } from "@/components/agent-lee/AgentLeeInterface";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const user = localStorage.getItem("agentlee_user");
      if (!user) {
        router.replace("/login");
      } else {
        setIsLoggedIn(true);
      }
    } catch (e) {
      router.replace("/login");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background p-8">
        <div className="w-full max-w-4xl space-y-8">
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-2 gap-8">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (isLoggedIn) {
    return <AgentLeeInterface />;
  }

  return null;
}
