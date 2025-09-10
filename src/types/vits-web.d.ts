declare module '@diffusionstudio/vits-web' {
  export function download(
    voiceId: string,
    onProgress?: (progress: { url: string; loaded: number; total: number }) => void
  ): Promise<void>;

  export function predict(opts: { text: string; voiceId: string }): Promise<Blob>;
}
