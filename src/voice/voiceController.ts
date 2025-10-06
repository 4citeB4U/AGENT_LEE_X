// High-level front-end voice pipeline controller (scaffold)
// NOTE: Whisper + wake word model loading are stubbed; plug in your chosen libs.
import { isWake, stripWake } from './fuzzy';
import * as LeeTTS from './leeTTS';
import { MicStream } from './micStream';

export interface VoiceControllerConfig {
  wakeEnabled?: boolean;
  pushToTalk?: boolean;
  onState?: (s: string) => void;
  onTranscript?: (raw: string, cleaned: string) => void;
  onWake?: () => void;
  geminiSend?: (text: string) => Promise<string>; // integrate existing sendTranscriptToGemini logic
}

export class VoiceController {
  private cfg: VoiceControllerConfig;
  private mic?: MicStream;
  private capturingPhrase = false;
  private phraseBuffer: Float32Array[] = [];
  private disposed = false;

  constructor(cfg: VoiceControllerConfig) { this.cfg = cfg; }

  async init() {
    this.setState('initializing');
    this.mic = await MicStream.create({ sampleRate: 16000 });
    this.mic.onAudioFrame(f => this.handleFrame(f));
    this.setState('idle');
  }

  private setState(s: string) { this.cfg.onState?.(s); }

  private handleFrame(frame: Float32Array) {
    if (this.disposed) return;
    if (this.capturingPhrase) {
      this.phraseBuffer.push(frame);
      return;
    }
    // Wake detection stub: pass frame to wake model or simple energy gate first (TODO)
    // For now, we treat any non-trivial energy + existing transcription path as placeholder
    const energy = frame.reduce((a, v) => a + Math.abs(v), 0) / frame.length;
    if (this.cfg.wakeEnabled && energy > 0.08) {
      // Start phrase capture window
      this.startPhraseCapture();
    }
  }

  private startPhraseCapture() {
    if (this.capturingPhrase) return;
    this.capturingPhrase = true;
    this.phraseBuffer = [];
    this.setState('capturing');
    setTimeout(() => this.finishPhraseCapture(), 2200); // collect ~2.2s
  }

  private async finishPhraseCapture() {
    if (!this.capturingPhrase) return;
    this.capturingPhrase = false;
    const rawText = await this.fakeTranscribe(this.phraseBuffer); // Replace with real Whisper call
    const wake = isWake(rawText);
    if (wake) {
      this.cfg.onWake?.();
    }
    const cleaned = wake ? stripWake(rawText) : rawText;
    this.cfg.onTranscript?.(rawText, cleaned);
    if (cleaned) {
      this.setState('thinking');
      if (this.cfg.geminiSend) {
        try {
          const reply = await this.cfg.geminiSend(cleaned);
          this.setState('speaking');
          await LeeTTS.say(reply);
        } catch (e) { console.warn('Gemini send failed', e); }
      }
    }
    this.setState('idle');
  }

  // TEMP: stub transcription (just placeholder text)
  private async fakeTranscribe(_buf: Float32Array[]): Promise<string> {
    return 'agent lee hello there';
  }

  dispose() { this.disposed = true; this.mic?.stop(); }
}

export async function startVoiceSystem(cfg: VoiceControllerConfig) {
  const vc = new VoiceController(cfg);
  await vc.init();
  (window as any).voice = vc; // expose for debugging
  return vc;
}
