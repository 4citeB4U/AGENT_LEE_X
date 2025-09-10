export class BaseLLM {
  name = 'LLM (stub)';
  ready = false;

  async initialize() {
    this.ready = true;
    return { ok: true, name: this.name };
  }

  private _clean(s = '') {
    return s
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/[^\S\r\n]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  private _keyPoints(text: string, max = 5) {
    const lines = this._clean(text).split(/[.?!]\s+/).filter(Boolean);
    const uniq: string[] = [];
    for (const l of lines) {
      const t = l.slice(0, 180);
      if (!uniq.some((x) => x.includes(t) || t.includes(x))) uniq.push(t);
      if (uniq.length >= max) break;
    }
    return uniq.map((x) => '• ' + x.replace(/^[-•\s]+/, ''));
  }

  private _answerFromPrompt(prompt: string | { prompt?: string }) {
    const p = this._clean(typeof prompt === 'string' ? prompt : prompt?.prompt || '');
    if (!p) return 'I\u2019m ready.';
    if (/summarize|summary/i.test(p)) {
      const body = p.replace(/.*summary[:\-]?\s*/i, '');
      const bullets = this._keyPoints(body, 4);
      return bullets.length ? bullets.join('\n') : body.slice(0, 400);
    }
    if (/search results:/i.test(p)) {
      const body = p.split(/search results:/i)[1] || p;
      const bullets = this._keyPoints(body, 5);
      return `Here\u2019s a quick take:\n${bullets.join('\n')}`;
    }
    const first = p.split(/[.?!]\s+/)[0];
    return `${first}.\n\n${this._keyPoints(p, 3).join('\n')}`;
  }

  async chat(prompt: string | { prompt?: string }) {
    return { text: this._answerFromPrompt(prompt) };
  }
  getStatus() {
    return { name: this.name, ready: this.ready };
  }
}
export default BaseLLM;
