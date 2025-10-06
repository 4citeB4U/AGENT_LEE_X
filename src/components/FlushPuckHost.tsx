import React from 'react';
import { getLastFlushInfo, onConversationFlushed } from '../lib/conversation/flush';
import TransmissionPuck from './TransmissionPuck';

const FlushPuckHost: React.FC = () => {
  const [info, setInfo] = React.useState(() => getLastFlushInfo());
  React.useEffect(() => {
    const off = onConversationFlushed(setInfo);
    return () => { off(); };
  }, []);
  return <TransmissionPuck lastFlushAtISO={info.at} turnsCount={info.count} />;
};
export default FlushPuckHost;
