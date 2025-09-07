// Minimal BaseLLM interface all stubs extend
export class BaseLLM {
  name = 'LLM (stub)';
  ready = false;

  async initialize() { this.ready = true; return { ok: true, name: this.name }; }

  // Generic “smart-ish” summarizer/answerer that stays offline
  _clean(s='') {
    return s.replace(/```[\s\S]*?```/g, ' ')
            .replace(/[^\S\r\n]+/g, ' ')
            .replace(/\s{2,}/g, ' ')
            .trim();
  }

  _keyPoints(text, max=5) {
    const lines = this._clean(text).split(/[.?!]\s+/).filter(Boolean);
    const uniq = [];
    for (const l of lines) {
      const t = l.slice(0, 180);
      if (!uniq.some(x => x.includes(t) || t.includes(x))) uniq.push(t);
      if (uniq.length >= max) break;
    }
    return uniq.map(x => '• ' + x.replace(/^[-•\s]+/, ''));
  }

  _answerFromPrompt(prompt) {
    const p = this._clean(typeof prompt === 'string' ? prompt : (prompt?.prompt || ''));
    if (!p) return 'I’m ready.';
    // Very small intent hints for nicer UX
    if (/summarize|summary/i.test(p)) {
      const body = p.replace(/.*summary[:\-]?\s*/i, '');
      const bullets = this._keyPoints(body, 4);
      return (bullets.length ? bullets.join('\n') : body.slice(0, 400));
    }
    if (/search results:/i.test(p)) {
      const body = p.split(/search results:/i)[1] || p;
      const bullets = this._keyPoints(body, 5);
      return `Here’s a quick take:\n${bullets.join('\n')}`;
    }
    // Default: short friendly reply
    const first = p.split(/[.?!]\s+/)[0];
    return `${first}.\n\n${this._keyPoints(p, 3).join('\n')}`;
  }

  async chat(prompt) { return { text: this._answerFromPrompt(prompt) }; }

  getStatus() { return { name: this.name, ready: this.ready }; }
}
if (typeof window !== 'undefined') window.BaseLLM = BaseLLM;
export default BaseLLM;
