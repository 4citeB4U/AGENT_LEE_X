import { useEffect, useRef } from "react";

type Props = {
  remainingMs: number;
  percentElapsed: number; // 0..100
  isFlushing: boolean;
  onManualSave: () => void;
};

export default function ConversationCountdown({ remainingMs, percentElapsed, isFlushing, onManualSave }: Props) {
  const fillRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (fillRef.current) {
      fillRef.current.style.width = percentElapsed + '%';
    }
  }, [percentElapsed]);
  const sec = Math.ceil(remainingMs / 1000);
  return (
    <div className="conv-countdown" aria-live="polite">
      <div className="conv-countdown__row">
        <span className="conv-countdown__label">
          Autosave in <strong>{sec}s</strong>
        </span>
        <button
          type="button"
          onClick={onManualSave}
          disabled={isFlushing}
          aria-label="Save conversation now"
          className="conv-countdown__btn"
        >
          {isFlushing ? "Saving…" : "Save now"}
        </button>
      </div>
      <div className="conv-countdown__bar" data-percent={percentElapsed}>
  <div ref={fillRef} className="conv-countdown__fill" data-fill />
      </div>
    </div>
  );
}
