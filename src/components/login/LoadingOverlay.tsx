"use client";

import React, { useEffect, useState } from 'react';

interface LoadingOverlayProps {
  isLoading: boolean;
  onFinished: () => void;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isLoading, onFinished }) => {
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
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setProgress(0);
      setIsFading(false);
      return;
    }

    const phases = { vortex: 2200, trace: 1600, fade: 700 };
    const totalDuration = phases.vortex + phases.trace;
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

    setTimeout(() => {
      setIsFading(true);
    }, totalDuration);
    
    setTimeout(() => {
        onFinished();
    }, totalDuration + phases.fade);


    return () => {
      clearInterval(progressInterval);
      clearInterval(rowInterval);
    };
  }, [isLoading, onFinished]);

  if (!isLoading) {
    return null;
  }

  return (
    <div className={`loading-layer ${isFading ? 'fade-out' : ''}`} aria-hidden={!isLoading}>
      <div className="loading-card">
        <div className="loading-head">
          <div className="loading-title">Preparing Agent Lee…</div>
          <div className="small muted">initializing modules</div>
        </div>
        <div className="progress" aria-label="overall progress">
            <i style={{ width: `${progress}%` }}></i>
        </div>
        <div className="load-rows small">
          {loadRows.map((row, i) => (
            <React.Fragment key={i}>
              <div>{row.label}</div>
              <div className={row.status}>{row.status === 'ok' ? '✓' : '…'}</div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
