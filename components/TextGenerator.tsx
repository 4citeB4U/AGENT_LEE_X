import {
  AlertTriangle,
  BookOpen,
  Bot,
  Brain,
  CalendarClock,
  Download,
  FileDown,
  FileText,
  Lightbulb,
  /* NOTE: lucide-react does not export BookTemplate in some versions. */
  ListTree,
  Loader2,
  Map,
  Mic,
  PenLine,
  Plus,
  RefreshCw,
  Save,
  Search,
  Share2,
  ShieldQuestion,
  Sparkles,
  Trash2,
  User2,
  Volume2,
  Wand2
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * LEEWAY HEADER — DO NOT REMOVE
 * TAG: FRONTEND.COMPONENT.AGENT_WRITER_STUDIO
 * COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
 * ICON_FAMILY: lucide
 * ICON_GLYPH: notebook-pen
 * ICON_SIG: WSX-0192
 * 5WH: WHAT=Agent Lee Writer's Studio (research+ideation+draft+preview+publish); WHY=Give users an AI-powered studio to craft stories & business docs; WHO=RapidWebDevelop; WHERE=components/AgentLeeWritersStudio.tsx; WHEN=2025-10-26; HOW=React+Tailwind (streaming-ready)
 * SPDX-License-Identifier: MIT
 */

// -----------------------------------------------------------------------------
// Types & Schemas
// -----------------------------------------------------------------------------
type Stage = "Brainstorm" | "Outline" | "Draft" | "Edit" | "Preview" | "Publish";

export type Character = {
  id: string;
  name: string;
  role: string; // Protagonist, Antagonist, Mentor, etc.
  goal: string;
  flaw: string;
  voice: string; // speech patterns
  bio: string;
};

export type Location = {
  id: string;
  name: string;
  type: string; // city, forest, ship, etc.
  notes: string;
};

export type TimelineBeat = {
  id: string;
  label: string;
  when: string; // free text or ISO date
  summary: string;
};

type ResearchItem = {
  id: string;
  query: string;
  status: "queued" | "running" | "done" | "error";
  notes?: string;
  citations?: { title: string; url: string }[];
};

export type SceneCard = {
  id: string;
  title: string;
  pov?: string;
  locationId?: string;
  summary: string;
};

export type StudioProject = {
  id: string;
  title: string;
  genre: string;
  tone: string;
  targetWords: number;
  idea: string;
  instruction: string;
  outline: string;
  draft: string;
  characters: Character[];
  locations: Location[];
  scenes: SceneCard[];
  timeline: TimelineBeat[];
  research: ResearchItem[];
  snapshots: { id: string; label: string; createdAt: string; data: string }[]; // JSON string of project at save time
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
const uid = () => Math.random().toString(36).slice(2, 10);
const nowIso = () => new Date().toISOString();

const defaultGenres = [
  "Fantasy",
  "Sci‑Fi",
  "Mystery",
  "Romance",
  "Thriller",
  "Historical",
  "Lit‑Fic",
  "YA",
];

const defaultTones = [
  "Whimsical",
  "Dark",
  "Epic",
  "Cozy",
  "Gritty",
  "Playful",
  "Formal",
  "Wry",
];

const PROMPT_TEMPLATES: Record<string, string> = {
  "Fantasy Story": `You are Agent Lee, a world-class story architect.\nGoal: help me craft an epic fantasy chapter.\nConstraints: coherent magic rules, vivid sensory detail, active prose.\nAsk 5 clarifying questions, then propose 3 hooks.`,
  "Detective Noir": `Agent Lee, write in a smoky, laconic voice. Give me a tight noir outline with red herrings and a gut-punch twist. Ask for clues you still need.`,
  "Business Proposal": `Agent Lee, format as an executive proposal with value prop, ROI, timeline, risks, and CTA. Maintain confident, concise tone.`,
};

// Download helpers
function downloadText(filename: string, text: string, mime = "text/plain") {
  const blob = new Blob([text], { type: mime + ";charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Very light markdown → HTML (for preview). Replace with a real renderer if desired.
function simpleMarkdownToHtml(md: string) {
  return md
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/gim, "<em>$1</em>")
    // FIX: properly replace newlines (the previous regex was unterminated)
    .replace(/\n\n+/g, "<br/><br/>");
}

const STORAGE_KEY = "AGENT_LEE_WRITER_STUDIO_PROJECT";

function saveProjectToLocal(p: StudioProject) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}
function loadProjectFromLocal(): StudioProject | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StudioProject;
  } catch {
    return null;
  }
}

// Extract lightweight fact-check queries from text: numbers, years, percentages,
// currency, and simple proper-noun phrases. Returns up to 8 deduped queries.
function extractFactCheckQueries(text: string): string[] {
  const out = new Set<string>();
  if (!text) return [];
  const numberRe = /(\$?\b\d[\d,]*(?:\.\d+)?%?\b)/g;
  for (const m of text.matchAll(numberRe)) {
    const raw = (m[0] || '').trim();
    if (raw) out.add(`Verify statistic "${raw}"`);
  }
  const properRe = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g;
  for (const m of text.matchAll(properRe)) {
    const phrase = (m[1] || '').trim();
    if (phrase) out.add(`Find reliable source for "${phrase}"`);
  }
  const triggers = ["according to", "study", "report", "data", "survey", "FDA", "WHO", "UN"];
  if (triggers.some(t => text.toLowerCase().includes(t))) {
    out.add("Locate primary source mentioned in draft");
  }
  return Array.from(out).slice(0, 8);
}

// -----------------------------------------------------------------------------
// Dev-only tests (since we don't have a separate test runner here)
// ALWAYS add tests if none exist
// -----------------------------------------------------------------------------
function assertEqual(name: string, a: string, b: string) {
  if (a !== b) {
    // eslint-disable-next-line no-console
    console.error("[simpleMarkdownToHtml test failed]", name, "↯", { got: a, expected: b });
  } else {
    // eslint-disable-next-line no-console
    console.log("[simpleMarkdownToHtml test ok]", name);
  }
}

function runSimpleMarkdownToHtmlTests() {
  const h1 = simpleMarkdownToHtml("# Title");
  assertEqual("h1", h1.includes("<h1>Title</h1>") ? "ok" : "bad", "ok");

  const bold = simpleMarkdownToHtml("**bold**");
  assertEqual("bold", bold, "<strong>bold</strong>");

  const ital = simpleMarkdownToHtml("*it*");
  assertEqual("italic", ital, "<em>it</em>");

  const nl = simpleMarkdownToHtml("line1\n\nline2");
  assertEqual("newlines", nl, "line1<br/><br/>line2");
}

if (typeof process !== "undefined" && process.env && process.env.NODE_ENV !== "production") {
  try { runSimpleMarkdownToHtmlTests(); } catch { /* ignore in prod */ }
}

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------
export default function AgentLeeWritersStudio() {
  // Project state
  const [project, setProject] = useState<StudioProject>(() =>
    loadProjectFromLocal() || {
      id: uid(),
      title: "Untitled Project",
      genre: "Fantasy",
      tone: "Epic",
      targetWords: 1200,
      idea: "",
      instruction: "",
      outline: "",
      draft: "",
      characters: [],
      locations: [],
      scenes: [],
      timeline: [],
      research: [],
      snapshots: [],
    }
  );

  const [stage, setStage] = useState<Stage>("Brainstorm");
  const [assistant, setAssistant] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // Streaming buffer (demo-only). Replace with real SSE/websocket.
  const streamTimer = useRef<number | null>(null);

  // Persist to localStorage on change
  useEffect(() => {
    saveProjectToLocal(project);
  }, [project]);

  // ---------------------------------------------------------------------------
  // Actions (hook these to your backend endpoints)
  // ---------------------------------------------------------------------------
  async function runAgentAsk(question: string) {
    setLoading(true);
    setError("");
    try {
      setAssistant("");
      const chunks = [
        "Let's clarify your premise → ",
        "Who is the protagonist, what do they want, and what blocks them? ",
        "I'll propose 3 hooks and a mini-lore pass.\n",
      ];
      let i = 0;
      if (streamTimer.current) window.clearInterval(streamTimer.current);
      streamTimer.current = window.setInterval(() => {
        setAssistant((prev) => prev + chunks[i]);
        i++;
        if (i >= chunks.length && streamTimer.current) {
          window.clearInterval(streamTimer.current);
          streamTimer.current = null;
        }
      }, 500);
    } catch (e: any) {
      setError(e.message || "Ask failed");
    } finally {
      setLoading(false);
    }
  }

  async function generateOutline() {
    setLoading(true);
    setError("");
    try {
      const sample = `# Outline\n\n1. **Hook** — A mysterious comet cracks the sky.\n2. **Inciting** — The farm girl discovers a speaking shard.\n3. **Choice** — Leave the village or surrender the shard.\n4. **Trials** — Lessons with the archivist; a rival emerges.\n5. **Midpoint** — She hears the comet's true name.\n6. **Fall** — The archivist betrays her; the shard dims.\n7. **Climax** — She sings the name; the comet bows.\n8. **Resolution** — A new sky, a chosen steward.`;
      setProject((p) => ({ ...p, outline: sample }));
      setStage("Draft");
      setProject((p) => ({
        ...p,
        scenes: [
          { id: uid(), title: "Hook", summary: "Comet splits the stars; lights over the fields." },
          { id: uid(), title: "Inciting", summary: "Shard whispers; only she can hear it." },
          { id: uid(), title: "Choice", summary: "Leave home vs. protect family." },
        ],
      }));
    } catch (e: any) {
      setError(e.message || "Outline failed");
    } finally {
      setLoading(false);
    }
  }

  async function draftChapter() {
    setLoading(true);
    setError("");
    try {
      const md = `# Chapter 1 — Shardsong\n\nThe night the sky cracked, wheat bowed like worshippers. *Comet-light* unstitched the black, and the girl with mud on her knees lifted her face to the seam.\n\nA glint fell. It sang her name.`;
      setProject((p) => ({ ...p, draft: "" }));
      const parts = md.split(" ");
      let i = 0;
      if (streamTimer.current) window.clearInterval(streamTimer.current);
      streamTimer.current = window.setInterval(() => {
        setProject((p) => ({ ...p, draft: (p.draft ? p.draft + " " : "") + parts[i] }));
        i++;
        if (i >= parts.length && streamTimer.current) {
          window.clearInterval(streamTimer.current);
          streamTimer.current = null;
        }
      }, 25);
    } catch (e: any) {
      setError(e.message || "Draft failed");
    } finally {
      setLoading(false);
    }
  }

  function queueResearch(query: string) {
    const item: ResearchItem = { id: uid(), query, status: "queued" };
    setProject((p) => ({ ...p, research: [item, ...p.research] }));
    // TODO wire to backend deep-search with citations
  }

  // Snapshots (versioning)
  function snapshot(label = "Snapshot") {
    const snap = { id: uid(), label, createdAt: nowIso(), data: JSON.stringify(project) };
    setProject((p) => ({ ...p, snapshots: [snap, ...p.snapshots] }));
  }
  function restoreSnapshot(id: string) {
    const s = project.snapshots.find((x) => x.id === id);
    if (!s) return;
    const restored = JSON.parse(s.data) as StudioProject;
    setProject(restored);
  }

  // Exporters
  function exportMarkdown() {
    const { title, genre, tone, targetWords, idea, outline, draft } = project;
    const doc = `# ${title}\n\n**${genre} / ${tone} — Target ${targetWords} words**\n\n## Idea\n${idea}\n\n## Outline\n${outline}\n\n## Draft\n${draft}`;
    downloadText("agent-lee_draft.md", doc, "text/markdown");
  }
  function exportHtmlBook() {
    const { title, idea, outline, draft, characters, locations } = project;
    const html = `<!doctype html><html><head><meta charset=\"utf-8\"/><title>${title}</title>
<style>body{margin:0;background:#0b0b0b;color:#f7fff9;font-family:ui-serif,Georgia,Times,serif}
  .book{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:24px;padding:32px}
  .page{background:#111;border:1px solid #1c2a24;border-radius:16px;box-shadow:0 10px 28px rgba(0,0,0,.35);padding:28px}
  h1,h2{color:#39FF14}</style></head><body>
<div class="book">
  <section class="page">${simpleMarkdownToHtml(`# Idea\n\n${idea || "—"}`)}</section>
  <section class="page">${simpleMarkdownToHtml(outline || "# Outline\n—")}</section>
  <section class="page">${simpleMarkdownToHtml(draft || "# Draft\n—")}</section>
  <section class="page"><h2>Characters</h2><ul>${characters.map((c) => `<li><strong>${c.name}</strong> — ${c.role}</li>`).join("")}</ul></section>
  <section class="page"><h2>Locations</h2><ul>${locations.map((l) => `<li><strong>${l.name}</strong> — ${l.type}</li>`).join("")}</ul></section>
</div></body></html>`;
    downloadText("agent-lee_book.html", html, "text/html");
  }

  // (stubs) future exporters — wire appropriate libs
  function exportEPUB_stub() {
    alert("EPUB exporter: wire epub-gen or similar.");
  }
  function exportDOCX_stub() {
    alert("DOCX exporter: wire docx library.");
  }

  // TTS stub
  function readAloud() {
    alert("Read‑aloud: wire to TTS (Piper/ElevenLabs).");
  }
  // Dictation stub
  function startDictation() {
    alert("Dictation: hook Web Speech API / custom ASR.");
  }

  // Quick Fact Check: extract candidate queries from idea/outline/draft
  function runQuickFactCheck() {
    const bundle = `${project.idea}\n\n${project.outline}\n\n${project.draft}`;
    const qs = extractFactCheckQueries(bundle);
    if (qs.length === 0) {
      alert("No obvious facts to check were detected. Try adding numbers or citations.");
      return;
    }
    setProject((p) => ({
      ...p,
      research: [
        ...qs.map((q) => ({ id: uid(), query: q, status: "queued" as const, notes: "auto: fact-check" })),
        ...p.research,
      ],
    }));
  }

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------
  return (
    <div className="w-full h-full grid grid-cols-12 gap-4 p-4 bg-[rgb(10,15,13)] text-[#C7FFD8]">
      {/* LEFT: Controls / Persona / Library */}
      <aside className="col-span-12 md:col-span-3 bg-[#0f1714] border border-[rgba(57,255,20,.25)] rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-[#39FF14]" />
            <h2 className="font-semibold">Agent Lee — Writer's Studio</h2>
          </div>
          <button
            onClick={() => snapshot("Quick Save")}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg border border-white/10 hover:border-[rgba(57,255,20,.35)]"
          >
            <Save className="w-3 h-3" /> Save
          </button>
        </div>

        {/* AI disclaimer */}
        <div className="flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3">
          <AlertTriangle className="w-4 h-4 text-amber-300 mt-0.5" aria-hidden="true" />
          <div className="text-xs">
            <p className="leading-relaxed">AI can make mistakes. Verify important information before sharing or publishing.</p>
            <div className="mt-2 flex gap-2">
              <button onClick={runQuickFactCheck} className="px-2 py-1 rounded-lg border border-white/10 hover:border-white/30 inline-flex items-center gap-1" aria-label="Run quick fact check">
                <ShieldQuestion className="w-3 h-3" /> Quick Fact Check
              </button>
            </div>
          </div>
        </div>

        {/* Stage selector */}
        <div className="grid grid-cols-6 gap-2">
          {(["Brainstorm", "Outline", "Draft", "Edit", "Preview", "Publish"] as Stage[]).map((s) => (
            <button
              key={s}
              onClick={() => setStage(s)}
              className={`flex items-center justify-center gap-1 px-2 py-2 rounded-xl border text-xs transition ${
                stage === s
                  ? "bg-[rgba(57,255,20,.2)] border-[rgba(57,255,20,.5)] text-black"
                  : "border-white/10 hover:border-[rgba(57,255,20,.35)]"
              }`}
            >
              {s === "Brainstorm" && <Lightbulb className="w-4 h-4" />}
              {s === "Outline" && <ListTree className="w-4 h-4" />}
              {s === "Draft" && <PenLine className="w-4 h-4" />}
              {s === "Edit" && <Wand2 className="w-4 h-4" />}
              {s === "Preview" && <BookOpen className="w-4 h-4" />}
              {s === "Publish" && <Share2 className="w-4 h-4" />}
              <span>{s}</span>
            </button>
          ))}
        </div>

        {/* Project meta */}
        <div className="space-y-2">
          <label htmlFor="project-title" className="text-xs opacity-80">Project Title</label>
          <input
            id="project-title"
            value={project.title}
            onChange={(e) => setProject((p) => ({ ...p, title: e.target.value }))}
            placeholder="Shardsong"
            className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm outline-none focus:border-[rgba(57,255,20,.6)]"
          />
        </div>

        {/* Persona / instruction */}
        <div className="space-y-2">
          <label htmlFor="instruction" className="text-xs opacity-80">System Instruction (optional)</label>
          <input
            id="instruction"
            value={project.instruction}
            onChange={(e) => setProject((p) => ({ ...p, instruction: e.target.value }))}
            placeholder="e.g., Act as a myth‑weaver historian"
            className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm outline-none focus:border-[rgba(57,255,20,.6)]"
          />
        </div>

        {/* Story knobs */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="genre" className="text-xs opacity-80">Genre</label>
            <select
              id="genre"
              value={project.genre}
              onChange={(e) => setProject((p) => ({ ...p, genre: e.target.value }))}
              className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm"
            >
              {defaultGenres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="tone" className="text-xs opacity-80">Tone</label>
            <select
              id="tone"
              value={project.tone}
              onChange={(e) => setProject((p) => ({ ...p, tone: e.target.value }))}
              className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm"
            >
              {defaultTones.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label htmlFor="target-words" className="text-xs opacity-80">Target Words</label>
            <input
              id="target-words"
              type="number"
              min={200}
              step={100}
              value={project.targetWords}
              onChange={(e) => setProject((p) => ({ ...p, targetWords: parseInt(e.target.value || "0") }))}
              className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Research quick-add */}
        <div className="space-y-2">
          <label htmlFor="rq" className="text-xs opacity-80">Quick Research</label>
          <div className="flex gap-2">
            <input id="rq" placeholder="e.g., medieval comet omens" className="flex-1 rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm" />
            <button
              onClick={() => {
                const el = document.getElementById("rq") as HTMLInputElement | null;
                if (!el?.value.trim()) return;
                queueResearch(el.value.trim());
                el.value = "";
              }}
              aria-label="Add research query"
              className="px-3 rounded-xl border border-white/10 hover:border-[rgba(57,255,20,.35)]"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Snapshots list */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs opacity-80">Snapshots</span>
            <div className="flex gap-1">
              <button
                onClick={() => snapshot("Snapshot")}
                aria-label="Save snapshot"
                className="px-2 py-1 text-xs rounded-lg border border-white/10 hover:border-[rgba(57,255,20,.35)]"
              >
                <Save className="w-3 h-3" />
              </button>
              <button
                onClick={() => setProject((p) => ({ ...p, snapshots: [] }))}
                aria-label="Clear snapshots"
                className="px-2 py-1 text-xs rounded-lg border border-white/10 hover:border-[rgba(57,255,20,.35)]"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div className="max-h-36 overflow-auto pr-1 space-y-1">
            {project.snapshots.length === 0 && <p className="text-xs opacity-60">No snapshots yet.</p>}
            {project.snapshots.map((s) => (
              <button
                key={s.id}
                onClick={() => restoreSnapshot(s.id)}
                className="w-full text-left text-xs px-2 py-1 rounded-lg bg-black/30 border border-white/10 hover:border-[rgba(57,255,20,.35)]"
              >
                {new Date(s.createdAt).toLocaleString()} — {s.label}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* CENTER: Workspace */}
      <main className="col-span-12 md:col-span-6 space-y-4">
        {/* Idea / prompt */}
        <section className="bg-[#0f1714] border border-[rgba(57,255,20,.25)] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-[#39FF14]" />
            <h3 className="font-semibold">Your Idea</h3>
          </div>
          <textarea
            value={project.idea}
            onChange={(e) => setProject((p) => ({ ...p, idea: e.target.value }))}
            placeholder="A farm girl finds a comet shard that sings her name…"
            rows={3}
            className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm resize-y"
          />

          {/* Quick templates */}
          <div className="flex flex-wrap gap-2 mt-2">
            {Object.keys(PROMPT_TEMPLATES).map((key) => (
              <button
                key={key}
                onClick={() => setProject((p) => ({ ...p, instruction: PROMPT_TEMPLATES[key] }))}
                className="px-2 py-1 text-xs rounded-lg border border-white/10 hover:border-[rgba(57,255,20,.35)]"
              >
                {key}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={() => runAgentAsk("Interrogate this idea; ask 5 questions; propose 3 hooks.")}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 hover:border-[rgba(57,255,20,.35)]"
            >
              <Brain className="w-4 h-4" /> Ask Agent Lee
            </button>
            <button
              onClick={generateOutline}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 hover:border-[rgba(57,255,20,.35)]"
            >
              <ListTree className="w-4 h-4" /> Generate Outline
            </button>
            <button
              onClick={draftChapter}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 hover:border-[rgba(57,255,20,.35)]"
            >
              <PenLine className="w-4 h-4" /> Draft Chapter
            </button>
            <button
              onClick={startDictation}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 hover:border-[rgba(57,255,20,.35)]"
            >
              <Mic className="w-4 h-4" /> Dictate
            </button>
          </div>
          {loading && (
            <div className="mt-3 inline-flex items-center gap-2 text-xs text-white/70">
              <Loader2 className="w-4 h-4 animate-spin" /> Working…
            </div>
          )}
          {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
        </section>

        {/* Assistant reasoning / chat */}
        <section className="bg-[#0f1714] border border-[rgba(57,255,20,.25)] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="w-4 h-4 text-[#39FF14]" />
            <h3 className="font-semibold">Agent Lee — Questions & Suggestions</h3>
          </div>
          <div className="min-h-[96px] rounded-xl bg-black/30 border border-white/10 p-3 text-sm whitespace-pre-wrap">
            {assistant || "Agent Lee will ask clarifying questions and propose variations here."}
          </div>
          <div className="flex gap-2 mt-2">
            <input id="ask" aria-label="Ask Agent Lee" placeholder="Ask something specific (e.g., stakes, world rules)" className="flex-1 rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm" />
            <button
              onClick={() => {
                const el = document.getElementById("ask") as HTMLInputElement | null;
                if (!el?.value.trim()) return;
                runAgentAsk(el.value.trim());
                el.value = "";
              }}
              aria-label="Submit question"
              className="px-3 rounded-xl border border-white/10 hover:border-[rgba(57,255,20,.35)]"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button onClick={readAloud} aria-label="Read aloud" className="px-3 rounded-xl border border-white/10 hover:border-[rgba(57,255,20,.35)]">
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* Outline / Scenes */}
        <section className="bg-[#0f1714] border border-[rgba(57,255,20,.25)] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <ListTree className="w-4 h-4 text-[#39FF14]" />
            <h3 className="font-semibold">Outline & Scenes</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <textarea
              value={project.outline}
              onChange={(e) => setProject((p) => ({ ...p, outline: e.target.value }))}
              placeholder="# Outline\n1. …"
              rows={10}
              className="rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-1 gap-3">
              {project.scenes.map((s) => (
                <div key={s.id} className="rounded-xl bg-black/30 border border-white/10 p-3">
                  <div className="text-sm font-semibold">{s.title}</div>
                  <div className="text-xs opacity-80">{s.summary}</div>
                </div>
              ))}
              <button
                onClick={() =>
                  setProject((p) => ({ ...p, scenes: [{ id: uid(), title: "New Scene", summary: "Describe the beat…" }, ...p.scenes] }))
                }
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 hover:border-[rgba(57,255,20,.35)] w-fit"
              >
                <Plus className="w-4 h-4" /> Add Scene
              </button>
            </div>
          </div>
        </section>

        {/* Draft */}
        <section className="bg-[#0f1714] border border-[rgba(57,255,20,.25)] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-[#39FF14]" />
            <h3 className="font-semibold">Draft</h3>
          </div>
          <textarea
            value={project.draft}
            onChange={(e) => setProject((p) => ({ ...p, draft: e.target.value }))}
            placeholder="# Chapter 1\n…"
            rows={12}
            className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-2 mt-3">
            <button onClick={exportMarkdown} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 hover:border-[rgba(57,255,20,.35)]">
              <FileDown className="w-4 h-4" /> Export Markdown
            </button>
            <button onClick={exportHtmlBook} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 hover:border-[rgba(57,255,20,.35)]">
              <Download className="w-4 h-4" /> Export Digital Book (HTML)
            </button>
            <button onClick={exportEPUB_stub} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 hover:border-[rgba(57,255,20,.35)]">EPUB</button>
            <button onClick={exportDOCX_stub} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 hover:border-[rgba(57,255,20,.35)]">DOCX</button>
          </div>
        </section>
      </main>

      {/* RIGHT: Cast / World / Timeline / Research / Preview */}
      <aside className="col-span-12 md:col-span-3 space-y-4">
        {/* Characters */}
        <section className="bg-[#0f1714] border border-[rgba(57,255,20,.25)] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <User2 className="w-4 h-4 text-[#39FF14]" />
            <h3 className="font-semibold">Characters</h3>
          </div>
          <div className="space-y-2 max-h-[200px] overflow-auto pr-1">
            {project.characters.map((c) => (
              <div key={c.id} className="rounded-xl bg-black/30 border border-white/10 p-3 text-xs">
                <div className="font-semibold">
                  {c.name} <span className="opacity-70">— {c.role}</span>
                </div>
                <div className="opacity-80">Goal: {c.goal} · Flaw: {c.flaw}</div>
              </div>
            ))}
          </div>
          <button
            onClick={() =>
              setProject((p) => ({
                ...p,
                characters: [
                  ...p.characters,
                  { id: uid(), name: "New Character", role: "", goal: "", flaw: "", voice: "", bio: "" },
                ],
              }))
            }
            className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 hover:border-[rgba(57,255,20,.35)]"
          >
            <Plus className="w-4 h-4" /> Add Character
          </button>
        </section>

        {/* Locations */}
        <section className="bg-[#0f1714] border border-[rgba(57,255,20,.25)] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Map className="w-4 h-4 text-[#39FF14]" />
            <h3 className="font-semibold">Locations</h3>
          </div>
          <div className="space-y-2 max-h-[160px] overflow-auto pr-1">
            {project.locations.map((l) => (
              <div key={l.id} className="rounded-xl bg-black/30 border border-white/10 p-3 text-xs">
                <div className="font-semibold">
                  {l.name} <span className="opacity-70">— {l.type}</span>
                </div>
                <div className="opacity-80">{l.notes}</div>
              </div>
            ))}
          </div>
          <button
            onClick={() =>
              setProject((p) => ({ ...p, locations: [...p.locations, { id: uid(), name: "New Place", type: "", notes: "" }] }))
            }
            className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 hover:border-[rgba(57,255,20,.35)]"
          >
            <Plus className="w-4 h-4" /> Add Location
          </button>
        </section>

        {/* Timeline */}
        <section className="bg-[#0f1714] border border-[rgba(57,255,20,.25)] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CalendarClock className="w-4 h-4 text-[#39FF14]" />
            <h3 className="font-semibold">Timeline</h3>
          </div>
          <div className="space-y-2 max-h-[160px] overflow-auto pr-1">
            {project.timeline.map((t) => (
              <div key={t.id} className="rounded-xl bg-black/30 border border-white/10 p-3 text-xs">
                <div className="font-semibold">
                  {t.label} <span className="opacity-70">— {t.when}</span>
                </div>
                <div className="opacity-80">{t.summary}</div>
              </div>
            ))}
          </div>
          <button
            onClick={() =>
              setProject((p) => ({ ...p, timeline: [...p.timeline, { id: uid(), label: "New Beat", when: "", summary: "" }] }))
            }
            className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 hover:border-[rgba(57,255,20,.35)]"
          >
            <Plus className="w-4 h-4" /> Add Beat
          </button>
        </section>

        {/* Research */}
        <section className="bg-[#0f1714] border border-[rgba(57,255,20,.25)] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Search className="w-4 h-4 text-[#39FF14]" />
            <h3 className="font-semibold">Research Queue</h3>
          </div>
          <div className="space-y-2 max-h-[200px] overflow-auto pr-1">
            {project.research.length === 0 && <p className="text-xs opacity-70">No research yet. Add queries from the left.</p>}
            {project.research.map((r) => (
              <div key={r.id} className="rounded-xl bg-black/30 border border-white/10 p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{r.query}</span>
                  <span className={`px-2 py-0.5 rounded-full border ${r.status === "done" ? "border-emerald-400/40" : "border-white/10"}`}>
                    {r.status}
                  </span>
                </div>
                {r.notes && <p className="mt-1 opacity-80 whitespace-pre-wrap">{r.notes}</p>}
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={runQuickFactCheck} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 hover:border-[rgba(57,255,20,.35)]">
              <ShieldQuestion className="w-4 h-4" /> Quick Fact Check
            </button>
            <button
              onClick={() =>
                setProject((p) => ({
                  ...p,
                  research: p.research.map((x) => (x.status === "queued" ? { ...x, status: "running" } : x)),
                }))
              }
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 hover:border-[rgba(57,255,20,.35)]"
            >
              <RefreshCw className="w-4 h-4" /> Run All
            </button>
            <button
              onClick={() => setProject((p) => ({ ...p, research: [] }))}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 hover:border-[rgba(57,255,20,.35)]"
            >
              Clear
            </button>
          </div>
        </section>

        {/* Live Preview */}
        <section className="bg-[#0f1714] border border-[rgba(57,255,20,.25)] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            {/* Fallback to BookOpen for preview title icon */}
            <BookOpen className="w-4 h-4 text-[#39FF14]" />
            <h3 className="font-semibold">Live Digital Book</h3>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-3 max-h-[420px] overflow-auto">
            <div className="grid grid-cols-1 gap-3">
              <article
                className="rounded-xl bg-[#111] p-4 border border-white/10"
                dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(`# Idea\n\n${project.idea || "—"}`) }}
              />
              <article
                className="rounded-xl bg-[#111] p-4 border border-white/10"
                dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(project.outline || "# Outline\n—") }}
              />
              <article
                className="rounded-xl bg-[#111] p-4 border border-white/10"
                dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(project.draft || "# Draft\n—") }}
              />
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
}
