import { useEffect, useState } from 'react';

interface Props { lastFlushAtISO: string | null; turnsCount: number; }

export default function TransmissionPuck({ lastFlushAtISO, turnsCount }: Props) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!lastFlushAtISO) return; setVisible(true); const id = setTimeout(()=>setVisible(false), 5000); return () => clearTimeout(id);
  }, [lastFlushAtISO]);
  if (!visible || !lastFlushAtISO) return null;
  const d = new Date(lastFlushAtISO); const time = isNaN(+d) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="tx-puck" role="status">
      <div className="tx-puck__dot" aria-hidden="true" />
      <div className="tx-puck__text">Saved {turnsCount} turn{turnsCount===1?'':'s'} • {time}</div>
      <button className="tx-puck__close" onClick={()=>setVisible(false)} aria-label="Dismiss save notice">×</button>
    </div>
  );
}
