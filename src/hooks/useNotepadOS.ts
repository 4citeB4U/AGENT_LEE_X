/* LEEWAY HEADER
TAG: FRONTEND.NOTEPAD.HOOK
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: orbit
ICON_SIG: CD534113
5WH: WHAT=React adapter for Notepad OS; WHY=Keep UI in lockstep; WHO=Leeway Core; WHERE=src/hooks/useNotepadOS.ts; WHEN=2025-10-06; HOW=TypeScript + React useSyncExternalStore pattern
SPDX-License-Identifier: MIT
*/

import { useMemo, useSyncExternalStore } from 'react';
import memoryStore, { subscribe } from '../lib/memoryStore';

export function useNotepadOS() {
  const getSnapshot = () => ({
    working: memoryStore.list({ drive: 'R' }),
    authoritative: memoryStore.list({ drive: 'A' }),
    recycled: memoryStore.list({ includeRecycled: true }).filter(x => !!x.recycledAt),
    active: memoryStore.getActive(),
  });

  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const actions = useMemo(() => ({
    setActiveId: (id?: string) => memoryStore.setActive(id),
    create: (title: string, payload?: { utterance?: string; tags?: string[] }) => memoryStore.createTask(title, payload || {}),
    update: (id: string, patch: { title?: string; utterance?: string; tags?: string[]; drive?: any }) => memoryStore.update(id, patch),
    recycle: (id: string) => memoryStore.recycle(id),
    restore: (id: string) => memoryStore.restore(id),
    purge: (id: string) => memoryStore.purge(id),
    archive: (id: string) => memoryStore.archive(id),
    search: (q: string) => memoryStore.search(q),
  }), []);

  return {
    working: snap.working,
    authoritative: snap.authoritative,
    recycled: snap.recycled,
    active: snap.active,
    setActiveId: actions.setActiveId,
    actions,
    // expose raw store if needed for diagnostics
    store: memoryStore,
  };
}

export default useNotepadOS;
