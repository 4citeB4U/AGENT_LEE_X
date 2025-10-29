/* LEEWAY HEADER
TAG: LIB.OSCONTROL.ANDROID.WEB
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: smartphone
ICON_SIG: ANDR-WEB-001
5WH: WHAT=Android control via WebUSB ADB; WHY=no backend; WHO=Leeway; WHEN=2025-10-28; HOW=WebADB
SPDX-License-Identifier: MIT
*/
import { Adb, AdbDaemonTransport } from '@yume-chan/adb';
import AdbWebCredentialStore from '@yume-chan/adb-credential-web';
import { AdbDaemonWebUsbDeviceManager } from '@yume-chan/adb-daemon-webusb';

export class AndroidWebADB {
  private adb: Adb | null = null;

  async connect(): Promise<void> {
    const manager = AdbDaemonWebUsbDeviceManager.BROWSER;
    if (!manager) throw new Error('WebUSB is not supported or context not secure');
    const device = await manager.requestDevice();
    if (!device) throw new Error('No device selected');
    const connection = await device.connect();
    const credentialStore = new AdbWebCredentialStore('Agent Lee X');
    const transport = await AdbDaemonTransport.authenticate({
      serial: device.serial,
      connection,
      credentialStore,
    });
    this.adb = new Adb(transport);
  }

  isConnected(): boolean { return !!this.adb; }

  private async shellText(cmd: string): Promise<string> {
    if (!this.adb) throw new Error('Not connected');
    // Prefer shell protocol; fallback to none protocol if needed.
    if (this.adb.subprocess.shellProtocol) {
      const { stdout, exitCode } = await this.adb.subprocess.shellProtocol.spawnWaitText(cmd);
      if (exitCode !== 0) {
        // Some shell commands may still return 0 even on warnings; keep simple here.
      }
      return stdout.trim();
    }
    const out = await this.adb.subprocess.noneProtocol.spawnWaitText(cmd);
    return out.trim();
  }

  async listPackages(): Promise<string[]> {
  const txt = await this.shellText('pm list packages');
    return txt.split(/\r?\n/).map(l => l.replace(/^package:/, '').trim()).filter(Boolean);
  }

  async launch(pkg: string): Promise<void> {
  await this.shellText(`monkey -p ${pkg} -c android.intent.category.LAUNCHER 1`);
  }

  async tap(x: number, y: number): Promise<void> {
  await this.shellText(`input tap ${Math.floor(x)} ${Math.floor(y)}`);
  }

  async typeText(text: string): Promise<void> {
    const escaped = text.replace(/ /g, '%s');
  await this.shellText(`input text "${escaped}"`);
  }

  async findByTextAndTap(query: string): Promise<{ x: number; y: number } | null> {
  await this.shellText('uiautomator dump');
  const xml = await this.shellText('cat /sdcard/window_hierarchy.xml');
    const reNode = /<node\b[^>]*?>/g;
    let m: RegExpExecArray | null;
    let bounds: string | null = null;
    const q = query.toLowerCase();
    while ((m = reNode.exec(xml))) {
      const node = m[0];
      const textAttr = /text="([^"]*)"/.exec(node)?.[1] ?? '';
      const descAttr = /content-desc="([^"]*)"/.exec(node)?.[1] ?? '';
      if (textAttr.toLowerCase().includes(q) || descAttr.toLowerCase().includes(q)) {
        const b = /bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/.exec(node)?.[0] ?? null;
        if (b) { bounds = b; break; }
      }
    }
    if (!bounds) return null;
    const mm = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (!mm) return null;
    const [ , x1, y1, x2, y2 ] = mm.map(Number) as unknown as number[];
    const cx = Math.round((x1 + x2) / 2);
    const cy = Math.round((y1 + y2) / 2);
    await this.tap(cx, cy);
    return { x: cx, y: cy };
  }

  async screenshot(): Promise<Blob> {
    if (!this.adb) throw new Error('Not connected');
    await this.shellText('screencap -p /sdcard/agentlee_shot.png');
    const sync = await this.adb.sync();
    const reader = sync.read('/sdcard/agentlee_shot.png').getReader();
    const chunks: Uint8Array[] = [];
    // Read to end
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
  await sync.dispose();
  // Merge chunks to a single ArrayBuffer to satisfy strict BlobPart typing
  let total = 0;
  for (const c of chunks) total += c.byteLength;
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) { merged.set(c, offset); offset += c.byteLength; }
  return new Blob([merged.buffer], { type: 'image/png' });
  }

  async disconnect(): Promise<void> {
    await this.adb?.close();
    this.adb = null;
  }
}
