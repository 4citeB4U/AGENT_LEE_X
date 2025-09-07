"use client";

import React, { useEffect, useState } from 'react';

interface LoadingOverlayProps {
  isLoading: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isLoading }) => {
  const [progress, setProgress] = useState(0);
  const [loadRows, setLoadRows] = useState([
    { label: "LMS engine", status: "wait" },
    { label: "Voice & mic bridge", status: "wait" },
    { label: "Camera & media", status: "wait" },
    { label: "Apps & browser control", status: "wait" },
    { label: "Contacts & calendar", status: "wait" },
    { label: "Files & RAG", status: "wait" },
    { label: "Notifications", status: "wait" },
  ]);

  useEffect(() => {
    if (!isLoading) {
      setProgress(0);
      return;
    }
    
    const totalDuration = 3500;
    const startTime = Date.now();

    const progressInterval = setInterval(() => {
      const elapsedTime = Date.now() - startTime;
      const p = Math.min(100, (elapsedTime / totalDuration) * 100);
      setProgress(p);
      if (p >= 100) {
        clearInterval(progressInterval);
      }
    }, 50);

    const rowInterval = setInterval(() => {
        setLoadRows(prevRows => {
            const nextIndex = prevRows.findIndex(row => row.status === 'wait');
            if (nextIndex !== -1) {
                const newRows = [...prevRows];
                newRows[nextIndex].status = 'ok';
                return newRows;
            }
            clearInterval(rowInterval);
            return prevRows;
        });
    }, 280);

    return () => {
      clearInterval(progressInterval);
      clearInterval(rowInterval);
    };
  }, [isLoading]);

  if (!isLoading) {
    return null;
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[1200] pointer-events-none bg-black/50" aria-hidden={!isLoading}>
      <div className="pointer-events-auto w-full max-w-2xl bg-[rgba(11,16,24,0.45)] border border-[rgba(26,35,51,0.65)] rounded-2xl p-5 backdrop-blur-lg shadow-2xl">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="font-bold text-lg text-foreground font-headline">Preparing Agent Lee…</div>
          <div className="text-sm text-muted-foreground">initializing modules</div>
        </div>
        <div className="h-2 bg-[rgba(34,48,71,0.5)] rounded-full overflow-hidden my-2.5">
          <div className="h-full bg-gradient-to-r from-gold-primary to-gold-secondary transition-all duration-150" style={{ width: `${progress}%` }} />
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 mt-2.5 text-sm">
          {loadRows.map((row, i) => (
            <React.Fragment key={i}>
              <div>{row.label}</div>
              <div className={row.status === 'ok' ? 'text-green-400' : 'text-yellow-400'}>
                {row.status === 'ok' ? '✓' : '…'}
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
