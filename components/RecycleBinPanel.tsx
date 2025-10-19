/* LEEWAY HEADER
TAG: FRONTEND.RECYCLE.BIN
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: trash-2
ICON_SIG: CD534113
5WH: WHAT=Recycle Bin UI for Notepad OS; WHY=Restore or purge deleted items; WHO=Leeway Core; WHERE=components/RecycleBinPanel.tsx; WHEN=2025-10-06; HOW=React functional component
SPDX-License-Identifier: MIT
*/

import React from 'react';
import useNotepadOS from '../src/hooks/useNotepadOS';

const RecycleBinPanel: React.FC = () => {
  const { recycled, actions } = useNotepadOS();
  if (!recycled.length) {
    return (
      <div className="p-3 text-xs text-gray-400">Recycle Bin is empty.</div>
    );
  }
  return (
    <div className="p-3 space-y-2">
      {recycled.map(item => (
        <div key={item.id} className="flex items-center justify-between rounded border border-gray-700 p-2 text-xs">
          <div className="truncate">
            <div className="font-medium text-gray-100 truncate">{item.title}</div>
            <div className="text-gray-400 truncate">{item.utterance}</div>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600" onClick={() => actions.restore(item.id)}>Restore</button>
            <button className="px-2 py-1 rounded bg-red-700 hover:bg-red-600" onClick={() => actions.purge(item.id)}>Purge</button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RecycleBinPanel;
