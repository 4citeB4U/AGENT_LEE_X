/* LEEWAY HEADER
TAG: UI.OSCONTROL.PANEL
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: app-window
ICON_SIG: CD534113
5WH: WHAT=UI to list/launch/control apps on Android/Windows; WHY=OS-level control;
WHO=Leeway Core; WHERE=components/OSControlPanel.tsx; WHEN=2025-10-28; HOW=React
SPDX-License-Identifier: MIT
*/
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AndroidWebADB } from '../src/lib/oscontrol/android-web';
import { osClient } from '../src/lib/oscontrol/client';
import type { Platform } from '../src/lib/oscontrol/types';

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = (p) => (
  <button {...p} className={`px-3 py-2 rounded-2xl shadow border border-gray-600 bg-gray-800 text-white hover:bg-gray-700 ${p.className ?? ''}`} />
);

export default function OSControlPanel() {
  const [platform, setPlatform] = useState<Platform>('android');
  const [query, setQuery] = useState('');
  const [apps, setApps] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [shotUrl, setShotUrl] = useState<string>('');
  const [findText, setFindText] = useState<string>('Login');
  const droid = useRef<AndroidWebADB | null>(null);
  const [androidReady, setAndroidReady] = useState(false);

  async function connectAndroid() {
    try {
      setStatus('Requesting USB device…');
      droid.current = new AndroidWebADB();
      await droid.current.connect();
      setAndroidReady(true);
      await refreshAndroid();
      setStatus('Android connected');
    } catch (e: any) {
      setStatus(`Android connect failed: ${e.message || e}`);
    }
  }

  async function refreshAndroid() {
    if (!droid.current?.isConnected()) return;
    setBusy(true);
    try {
      const pkgs = await droid.current.listPackages();
      setApps(pkgs);
    } catch (e: any) {
      setStatus(`Android refresh failed: ${e.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    setBusy(true);
    setStatus('');
    try {
      if (platform === 'android') {
        if (androidReady && droid.current?.isConnected()) {
          await refreshAndroid();
        } else {
          const list = await osClient.listAndroidApps();
          setApps(list.map((a) => a.package || '').filter(Boolean));
        }
      } else {
        const list = await osClient.listWindowsApps();
        setApps(list.map((a) => a.name));
      }
    } catch (e: any) {
      setStatus(`Error: ${e.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform]);

  // Bridge health probe on mount
  useEffect(() => {
    (async () => {
      try {
        const base = (window as any).__AGENTLEE_CFG?.MCP_BRIDGE_URL || (window as any).AGENTLEE_CONFIG?.MCP_BRIDGE_URL || 'http://127.0.0.1:5176';
        const r = await fetch(`${base}/healthz`);
        setStatus(r.ok ? 'Bridge: Online' : 'Bridge: Offline');
      } catch {
        setStatus('Bridge: Offline');
      }
    })();
  }, []);

  const filtered = useMemo(
    () => apps.filter((a) => a.toLowerCase().includes(query.toLowerCase())).slice(0, 200),
    [apps, query]
  );

  async function launch(name: string) {
    setBusy(true);
    setStatus('');
    try {
      if (platform === 'android') {
        if (androidReady && droid.current?.isConnected()) {
          await droid.current.launch(name);
        } else {
          await osClient.launchAndroidApp(name);
        }
      } else {
        await osClient.launchWindowsApp(name);
      }
      setStatus(`Launched ${name}`);
    } catch (e: any) {
      setStatus(`Launch failed: ${e.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-4 space-y-3 text-white">
      <div className="flex items-center gap-2">
        <Button onClick={() => setPlatform('android')} className={platform === 'android' ? 'bg-black text-white' : ''}>Android</Button>
        <Button onClick={() => setPlatform('windows')} className={platform === 'windows' ? 'bg-black text-white' : ''}>Windows</Button>
        <Button onClick={refresh} disabled={busy}>Refresh</Button>
        <input
          className="border border-gray-600 bg-gray-900 rounded-xl px-3 py-2 flex-1"
          placeholder="Filter apps…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {status && <div className="text-sm opacity-80">{status}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {filtered.map((name) => (
          <div key={name} className="border border-gray-700 rounded-2xl p-3 flex items-center justify-between bg-gray-900">
            <div className="truncate" title={name}>{name}</div>
            <Button onClick={() => launch(name)} className="bg-white text-black">Open</Button>
          </div>
        ))}
      </div>

      {platform === 'android' && (
        <div className="mt-4 border border-gray-700 rounded-2xl p-3 space-y-3 bg-gray-900">
          <div className="font-semibold">Android controls</div>
          <div className="flex flex-wrap gap-2 items-center">
            {!androidReady && (
              <Button onClick={connectAndroid}>Connect Android (WebUSB)</Button>
            )}
            <Button
              onClick={async () => {
                try {
                  if (androidReady && droid.current?.isConnected()) await droid.current.tap(540, 1800);
                  else await osClient.androidTap(540, 1800);
                } catch (e: any) {
                  setStatus(`Tap failed: ${e.message || e}`);
                }
              }}
            >
              Tap center-bottom
            </Button>
            <Button
              onClick={async () => {
                try {
                  if (androidReady && droid.current?.isConnected()) await droid.current.typeText('hello world');
                  else await osClient.androidType('hello world');
                } catch (e: any) {
                  setStatus(`Type failed: ${e.message || e}`);
                }
              }}
            >
              Type “hello world”
            </Button>
            <input
              className="border border-gray-600 bg-gray-900 rounded-xl px-2 py-1"
              placeholder="Find text…"
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
            />
            <Button
              onClick={async () => {
                setBusy(true);
                setStatus('');
                try {
                  if (androidReady && droid.current?.isConnected()) {
                    const r = await droid.current.findByTextAndTap(findText || 'Login');
                    setStatus(r ? `Tapped "${findText || 'Login'}" at (${r.x},${r.y})` : 'Not found');
                  } else {
                    await osClient.androidFindTap?.(findText || 'Login');
                    setStatus(`Tapped "${findText || 'Login'}"`);
                  }
                } catch (e: any) {
                  setStatus(`Find+Tap failed: ${e.message || e}`);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Find+Tap
            </Button>
            <Button
              onClick={async () => {
                setBusy(true);
                setStatus('');
                try {
                  if (androidReady && droid.current?.isConnected()) {
                    const blob = await droid.current.screenshot();
                    setShotUrl(URL.createObjectURL(blob));
                  } else {
                    const blob = await osClient.androidScreenshot?.();
                    if (blob) setShotUrl(URL.createObjectURL(blob));
                  }
                } catch (e: any) {
                  setStatus(`Screenshot failed: ${e.message || e}`);
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
            >
              Screenshot
            </Button>
          </div>
          {!!shotUrl && (
            <img
              alt="android screenshot"
              src={shotUrl}
              className="mt-2 rounded-xl w-full max-w-[480px] border border-gray-700"
            />
          )}
          <p className="text-xs opacity-70">HTTP MCP preferred automatically if configured; otherwise ADB fallback is used.</p>
        </div>
      )}

      {platform === 'windows' && (
        <div className="mt-4 border border-gray-700 rounded-2xl p-3 space-y-3 bg-gray-900">
          <div className="font-semibold">Windows controls</div>
          <div className="flex flex-wrap gap-2 items-center">
            <Button
              onClick={async () => {
                setBusy(true);
                setStatus('');
                try {
                  const blob = await osClient.windowsScreenshot?.();
                  if (blob) setShotUrl(URL.createObjectURL(blob));
                } catch (e: any) {
                  setStatus(`Screenshot failed: ${e.message || e}`);
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
            >
              Screenshot
            </Button>
          </div>
          {!!shotUrl && (
            <img
              alt="windows screenshot"
              src={shotUrl}
              className="mt-2 rounded-xl w-full max-w-[640px] border border-gray-700"
            />
          )}
          <p className="text-xs opacity-70">HTTP MCP used if available; otherwise CLI/PowerShell fallback is used.</p>
        </div>
      )}
    </div>
  );
}
