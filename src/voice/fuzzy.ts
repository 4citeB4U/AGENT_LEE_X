// Fuzzy + phonetic wake phrase guard
// NOTE: lightweight metaphone implementation (primary only)

function simpleDoubleMetaphonePrimary(word: string): string {
  // Extremely trimmed metaphone-like hashing for wake phrase resilience
  return word
    .toLowerCase()
    .replace(/agent/gi, 'AJNT')
    .replace(/lee/gi, 'L')
    .replace(/[^A-Z]/gi, '')
    .substring(0, 12);
}

export const WAKE_PHRASES = ["agent lee", "hey agent lee", "hi agent lee"];

function norm(s: string) { return s.toLowerCase().replace(/[^a-z\s]/g, '').trim(); }

export function levenshtein(a: string, b: string) {
  const dp: number[][] = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j++) dp[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      dp[i][j] = b[i - 1] === a[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[b.length][a.length];
}

export function isWake(transcript: string): boolean {
  const t = norm(transcript);
  if (/\bagent\s+lee\b/.test(t)) return true;
  const tm = simpleDoubleMetaphonePrimary(t);
  return WAKE_PHRASES.some(p => {
    const pm = simpleDoubleMetaphonePrimary(p);
    const d = levenshtein(tm, pm);
    return d <= 2;
  });
}

export function stripWake(transcript: string): string {
  return transcript.replace(/^(hey|hi)?\s*agent\s+lee[,:]?\s*/i, '').trim();
}
