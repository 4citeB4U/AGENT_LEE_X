// Simple microphone stream helper producing Float32Array frames at 16kHz
export interface MicStreamOptions { sampleRate?: number; frameSize?: number; onPermissionDenied?: () => void; }
export type AudioFrameCallback = (frame: Float32Array) => void;

export class MicStream {
  private ctx: AudioContext;
  private processor?: ScriptProcessorNode;
  private source?: MediaStreamAudioSourceNode;
  private frameSize: number;
  private targetRate: number;
  private onFrame: AudioFrameCallback[] = [];
  private recording = false;

  private constructor(ctx: AudioContext, targetRate: number, frameSize: number) {
    this.ctx = ctx;
    this.targetRate = targetRate;
    this.frameSize = frameSize;
  }

  static async create(opts: MicStreamOptions = {}): Promise<MicStream> {
    const targetRate = opts.sampleRate ?? 16000;
    const frameSize = opts.frameSize ?? 512;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 48000 });
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (e) {
      console.warn('Mic permission denied', e);
      opts.onPermissionDenied?.();
      throw e;
    }

    const ms = new MicStream(ctx, targetRate, frameSize);
    ms.source = ctx.createMediaStreamSource(stream);
    ms.processor = ctx.createScriptProcessor(frameSize, 1, 1);

    const resampleBuffer: number[] = [];
    ms.processor.onaudioprocess = ev => {
      if (!ms.recording) return;
      const input = ev.inputBuffer.getChannelData(0);
      // Simple linear down-sample to target rate
      const ratio = ctx.sampleRate / targetRate;
      for (let i = 0; i < input.length; i += ratio) {
        resampleBuffer.push(input[Math.floor(i)]);
      }
      // Emit in chunks of target frame size (~20ms: 320 samples at 16k)
      const targetFrame = 320; // 20ms @16k
      while (resampleBuffer.length >= targetFrame) {
        const slice = resampleBuffer.splice(0, targetFrame);
        const f32 = new Float32Array(slice);
        ms.onFrame.forEach(cb => cb(f32));
      }
    };
    ms.source.connect(ms.processor);
    ms.processor.connect(ctx.destination);
    ms.recording = true;
    return ms;
  }

  onAudioFrame(cb: AudioFrameCallback) { this.onFrame.push(cb); }
  stop() { this.recording = false; this.processor?.disconnect(); this.source?.disconnect(); }
}
