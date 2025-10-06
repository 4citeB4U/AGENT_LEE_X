import React from 'react';
import { onConversationFlushed } from '../lib/conversation/flush';
import '../styles/saved-badge.css';

const SavedBadge: React.FC = () => {
  const [visible, setVisible] = React.useState(false);
  const timeoutRef = React.useRef<number | null>(null);
  React.useEffect(() => {
    const off = onConversationFlushed(() => {
      setVisible(true);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(()=>setVisible(false), 2500);
    });
    return () => { off(); };
  }, []);
  return (
    <span className={`saved-badge ${visible ? '' : 'saved-badge--hidden'}`} role="status">
      <span className="saved-badge__dot" aria-hidden="true" />
      Saved just now
    </span>
  );
};
export default SavedBadge;
