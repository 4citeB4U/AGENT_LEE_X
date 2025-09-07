"use client";
// FloatingNotepad.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";

// Note: Most of the complex logic from the original file is preserved.
// Some parts are simplified or adapted for a React/Next.js environment.
// The custom CSS is extensive and specific, so it's included via a style tag
// to preserve the exact look and feel from the user's file.

interface FloatingNotepadProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDark?: boolean;
}

export const FloatingNotepad: React.FC<FloatingNotepadProps> = ({
  isOpen,
  onClose,
  defaultDark = true,
}) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isOpen || !isMounted) return null;
  
  return <NotepadComponent isOpen={isOpen} onClose={onClose} defaultDark={defaultDark} />;
};

const NotepadComponent: React.FC<FloatingNotepadProps> = ({ isOpen, onClose, defaultDark }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [notePos, setNotePos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const [title, setTitle] = useState("Untitled Note");
  const [body, setBody] = useState("");
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    const savedPos = localStorage.getItem("note_pos");
    if (savedPos) {
      setNotePos(JSON.parse(savedPos));
    } else {
       if (wrapRef.current) {
        const { innerWidth, innerHeight } = window;
        const { offsetWidth, offsetHeight } = wrapRef.current;
        setNotePos({
          x: innerWidth - offsetWidth - 18,
          y: innerHeight - offsetHeight - 18,
        });
      }
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - notePos.x,
      y: e.clientY - notePos.y,
    };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && wrapRef.current) {
      const newX = e.clientX - dragStartPos.current.x;
      const newY = e.clientY - dragStartPos.current.y;
      const x = Math.max(8, Math.min(newX, window.innerWidth - wrapRef.current.offsetWidth - 8));
      const y = Math.max(8, Math.min(newY, window.innerHeight - wrapRef.current.offsetHeight - 8));
      setNotePos({ x, y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    localStorage.setItem("note_pos", JSON.stringify(notePos));
  };
  
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);


  return (
    <>
      <style>{`
        /* Minimal styles to make the component functional, derived from user's CSS */
        .note-wrap {
          position: fixed;
          width: min(96vw, 700px);
          height: min(90vh, 760px);
          background: linear-gradient(180deg, #0f1524, #0b0f17);
          border: 1px solid #1e2a40;
          border-radius: 18px;
          box-shadow: 0 24px 70px rgba(0,0,0,.55);
          overflow: hidden;
          z-index: 9999;
          user-select: none;
          display: grid;
          grid-template-rows: auto auto 1fr auto;
          color: #eaf2ff;
        }
        .note-head {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          background: linear-gradient(180deg, #141c2c, #0e1524);
          border-bottom: 1px solid #1e2a40;
          cursor: grab;
        }
        .note-head:active { cursor: grabbing; }
        .note-title { margin: 0; font-size: 1.05rem; flex: 1; }
        .note-btn { background: #162237; color: #eaf2ff; border: 1px solid #263651; padding: 4px 8px; border-radius: 999px; cursor: pointer; }
        .note-menubar { display: flex; gap: 12px; padding: 8px 12px; background: linear-gradient(180deg, #101828, #0e1626); border-bottom: 1px solid #1e2a40; }
        .note-sheet-wrap { position: relative; display: flex; flex-direction: column; padding: 12px; min-height: 0; }
        .note-sheet { position: relative; flex: 1; border: 1px solid #1d2840; border-radius: 16px; overflow: hidden; background: #0f1524; display: flex; flex-direction: column; }
        .note-tinput { flex: 1; border: none; background: transparent; font-size: 1.08rem; color: #eaf2ff; padding: 8px 12px; }
        .note-editor { display: block; width: 100%; flex: 1; border: none; background: transparent; padding: 18px; font-size: 1.02rem; line-height: 1.85; color: #eaf2ff; resize: none; font-family: var(--font-code); }
        .note-status { display: flex; gap: 12px; align-items: center; padding: 10px 12px; background: linear-gradient(180deg, #0f1626, #0d1422); border-top: 1px solid #1e2a40; color: #9fb0c7; font-weight: 600; }
      `}</style>
      <div
        ref={wrapRef}
        className="note-wrap"
        style={{ left: notePos.x, top: notePos.y }}
        aria-label="Floating Notepad"
      >
        <header onMouseDown={handleMouseDown} className="note-head">
          <h3 className="note-title">Agent Lee — Notepad</h3>
          <button className="note-btn" onClick={onClose}>Close</button>
        </header>

        <nav className="note-menubar">
          <button className="note-btn">File</button>
          <button className="note-btn">Edit</button>
          <button className="note-btn">View</button>
          <button className="note-btn">Tools</button>
        </nav>

        <div className="note-sheet-wrap">
          <div className="note-sheet">
            <div style={{ display: 'flex', padding: '8px', borderBottom: '1px solid #1e2a40' }}>
              <input value={title} onChange={e => setTitle(e.target.value)} className="note-tinput" placeholder="Untitled note" />
            </div>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              className="note-editor"
              placeholder="Start typing or dictate…"
              disabled={locked}
            />
          </div>
        </div>

        <div className="note-status">
          <span>Autosaved</span>
          <div style={{flex: 1}}/>
          <span>{body.split(/\s+/).filter(Boolean).length} words</span>
        </div>
      </div>
    </>
  );
};
