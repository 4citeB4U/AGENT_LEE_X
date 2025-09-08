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
    // In a static export, localStorage is only available on the client.
    // This effect will run after the component mounts on the client.
    try {
      const user = localStorage.getItem("agentlee_user");
      if (user) {
        setIsLoggedIn(true);
      } else {
        // Redirect to the login page if no user data is found.
        router.replace("/login");
      }
    } catch (e) {
      // If localStorage is not available or any other error occurs, redirect to login.
      console.error("Could not access localStorage, redirecting to login.", e);
      router.replace("/login");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  // While checking the login status, show a skeleton loader.
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

  // If logged in, show the main interface.
  if (isLoggedIn) {
    return <AgentLeeInterface />;
  }

  // If not logged in and not loading, this will be briefly rendered before the redirect happens.
  // Returning null is appropriate here.
  return null;
}
