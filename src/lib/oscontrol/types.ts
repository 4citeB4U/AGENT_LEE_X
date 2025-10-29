export type Platform = 'android' | 'windows';

export interface AndroidApp { id?: string; package?: string; label?: string; }
export interface WindowsApp { name: string; }

export interface OSControlClient {
  listAndroidApps(): Promise<AndroidApp[]>;
  launchAndroidApp(pkgOrName: string): Promise<{ ok: boolean }>;
  androidTap(x: number, y: number): Promise<{ ok: boolean }>;
  androidType(text: string): Promise<{ ok: boolean }>;
  androidFindTap?(text: string): Promise<{ ok: boolean }>;
  androidScreenshot?(): Promise<Blob>;

  listWindowsApps(): Promise<WindowsApp[]>;
  launchWindowsApp(name: string): Promise<{ ok: boolean }>;
  windowsScreenshot?(): Promise<Blob>;
}
