// A prioritized list of upstream base URLs to try when proxying asset paths
export const UPSTREAM_CANDIDATES: string[] = [
  'https://cdn.jsdelivr.net/npm/',
  'https://unpkg.com/',
  'https://cdn.jsdelivr.net/',
  'https://cdn.jsdelivr.net/gh/',
];

// A mapping of hostname -> preferred base URL for proxying.
// Add your production CDNs or self-hosted origins here.
export const EXTERNAL_UPSTREAMS: Record<string, string> = {
  // kokoro-js and onnxruntime-web often referenced via jsdelivr in this repo
  'cdn.jsdelivr.net': 'https://cdn.jsdelivr.net/',
  'cdn.jsdelivr.com': 'https://cdn.jsdelivr.net/',
  'cdn.jsdelivr': 'https://cdn.jsdelivr.net/',
  'unpkg.com': 'https://unpkg.com/',
  // common CDNs you may want to self-host or proxy
  'cdn.jsdelivr.net/npm': 'https://cdn.jsdelivr.net/npm/',
  'cdn.jsdelivr.net/gh': 'https://cdn.jsdelivr.net/gh/',
  'huggingface.co': 'https://huggingface.co/',
  'api-inference.huggingface.co': 'https://api-inference.huggingface.co/',
  'raw.githubusercontent.com': 'https://raw.githubusercontent.com/',
  'jsdelivr.net': 'https://cdn.jsdelivr.net/',
};

export default EXTERNAL_UPSTREAMS;
