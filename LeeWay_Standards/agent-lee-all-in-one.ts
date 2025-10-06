/* LEEWAY HEADER — DO NOT REMOVE
region: ui.lib.memory.v2
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_ASCII: family=lucide glyph=hard-drive ICON_SIG=CD534113
5WH: WHAT=Agent Lee Unified PC Store v2 (TypeScript, All-in-One); WHY=single-file autonomous FS: journal+snapshots, recycle bin, OPFS heavies, global search index, encryption+HMAC chain, learning loop, Base64 demo loader; WHO=RapidWebDevelop; WHERE:D:\agentleegeminialmost\frontend\src\lib\memory\agent-lee-all-in-one.ts; WHEN=2025-10-04; HOW=IndexedDB+OPFS+locks+BroadcastChannel+WebCrypto
SIG: 00000000
AGENTS: AZR, PHI3, GEMINI, QWEN, LLAMA, ECHO
SPDX-License-Identifier: MIT
*/

// region types ----------------------------------------------------------------

type DriveKey = "L" | "E" | "O" | "N" | "A" | "R" | "D" | "LEE";
type Stage = "ui" | "heavy" | "short" | "mid" | "forever" | "security" | "system" | "general";

interface Retention {
  policy: "short" | "mid" | "forever";
  ttl_days?: number;
}

interface EncField<T=unknown> {
  clear?: T;            // when encryption is not enabled
  gcm?: true;
  iv?: number[];
  data?: number[];
}

interface FileRec<T=unknown> {
  id: string;
  type: "task" | "file";
  human_name: string;
  coded_name: string | null;
  stage: Stage;
  priority: "low" | "normal" | "high";
  created_at: string;
  updated_at: string;
  retention: Retention;
  drive_label: string;
  drive_key: DriveKey;
  path: string;
  content: EncField<T>;
  tags: string[];
  security: {
    critical: boolean;
    classification: "restricted" | "standard";
    approvals: string[];
  };
  next_fire_at: string | null;
  sig?: string | null;
  checksum?: string | null;
  deleted_at?: string | null;
}

interface LinkRec {
  id: string;
  file_id: string;
  target: string;      // "<DRIVE>:<id>"
  relation: string;
  ts: string;
}

interface JournalOp {
  op: "put" | "update" | "link";
  store: keyof typeof STORES;
  payload: any;
}

interface JournalRec {
  id: string;
  state: "prepared" | "committed";
  ops: JournalOp[];
  ts: string;
}

interface SnapshotRec {
  id: string;
  ts: string;
  merkle: string;
}

type AnyRecord = FileRec | LinkRec | JournalRec | SnapshotRec;

// region constants ------------------------------------------------------------

export const DRIVE_LABELS: Record<DriveKey, string> = {
  L: "Drive L", E: "Drive E", O: "Drive O", N: "Drive N",
  A: "Drive A", R: "Drive R", D: "Drive D", LEE: "Drive Lee",
};
export const DRIVE_ORDER: DriveKey[] = ["L","E","O","N","A","R","D","LEE"];

const DB_NAME = "AgentLee_PC_v2_ts_allinone";
const STORES = {
  FILES: "files",
  LINKS: "links",
  LOGS: "logs",
  JOURNAL: "journal",
  SNAP: "snapshots",
  INDEX: "gindex"
} as const;

const OPFS_DIR = "agentlee-opfs";
const JOURNAL_SNAPSHOT_EVERY = 50;
const RECYCLE_GRACE_DAYS = 7;

// region utils ----------------------------------------------------------------

const enc = new TextEncoder();
const dec = new TextDecoder();

const nowISO = () => new Date().toISOString();
const uid = (p = "F") => `${p}_${crypto.randomUUID()}` ;
async function sha256(s: string): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", enc.encode(s));
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2,"0")).join("");
}
function tokenize(s: string): string[] {
  return (s || "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}
const bc = ("BroadcastChannel" in self) ? new BroadcastChannel("agentlee-fs-v2") : null;
async function withLock<T>(name: string, fn: () => Promise<T>): Promise<T> {
  if ("locks" in navigator) {
    // @ts-ignore: lib.dom locking not always in TS lib
    return navigator.locks.request(name, { mode: "exclusive" }, fn);
  }
  return fn();
}
function defaultStage(k: DriveKey): Stage {
  return ({R:"short",A:"mid",N:"forever",E:"heavy",O:"heavy",L:"ui",D:"security",LEE:"system"} as Record<DriveKey, Stage>)[k] || "general";
}

// region crypto ---------------------------------------------------------------

let _cryptoCtx: null | { key: CryptoKey; hmack: CryptoKey } = null;

export async function deriveKey(passphrase: string) {
  const salt = enc.encode("AgentLee:Salt:v2");
  const base = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name:"PBKDF2", salt, iterations:150_000, hash:"SHA-256" },
    base, { name:"AES-GCM", length:256 }, false, ["encrypt","decrypt"]
  );
  const hmack = await crypto.subtle.deriveKey(
    { name:"PBKDF2", salt: enc.encode("AgentLee:HMAC:v2"), iterations:150_000, hash:"SHA-256" },
    base, { name:"HMAC", hash:"SHA-256", length:256 }, false, ["sign","verify"]
  );
  _cryptoCtx = { key, hmack };
  return _cryptoCtx;
}

async function encField<T>(obj: T): Promise<EncField<T>> {
  if (!_cryptoCtx) return { clear: obj };
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const pt = enc.encode(JSON.stringify(obj));
  const ct = await crypto.subtle.encrypt({ name:"AES-GCM", iv }, _cryptoCtx.key, pt);
  return { gcm:true, iv: Array.from(iv), data: Array.from(new Uint8Array(ct)) };
}

async function decField<T = unknown>(blob?: EncField<T> | null): Promise<T | null> {
  if (!blob) return null;
  if (blob.clear !== undefined) return blob.clear as T;
  if (!_cryptoCtx) throw new Error("Passphrase required to decrypt content.");
  const iv = new Uint8Array(blob.iv || []);
  const data = new Uint8Array(blob.data || []);
  const pt = await crypto.subtle.decrypt({ name:"AES-GCM", iv }, _cryptoCtx.key, data);
  return JSON.parse(dec.decode(pt));
}

async function hmac(text: string): Promise<string | null> {
  if(!_cryptoCtx) return null;
  const sig = await crypto.subtle.sign("HMAC", _cryptoCtx.hmack, enc.encode(text));
  return Array.from(new Uint8Array(sig)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

// region idb ------------------------------------------------------------------

let DB: IDBDatabase;

function openDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if(!db.objectStoreNames.contains(STORES.FILES)){
        const s = db.createObjectStore(STORES.FILES, { keyPath: "id" });
        s.createIndex("byDrive","drive_key");
        s.createIndex("byStage","stage");
        s.createIndex("byPath","path");
        s.createIndex("byCreated","created_at");
        s.createIndex("byNextFire","next_fire_at");
        s.createIndex("byDeleted","deleted_at");
      }
      if(!db.objectStoreNames.contains(STORES.LINKS)){
        const l = db.createObjectStore(STORES.LINKS, { keyPath:"id" });
        l.createIndex("byFile","file_id");
        l.createIndex("byTarget","target");
      }
      if(!db.objectStoreNames.contains(STORES.LOGS)){
        const g = db.createObjectStore(STORES.LOGS, { keyPath:"id" });
        g.createIndex("byWhen","ts");
        g.createIndex("byKind","kind");
      }
      if(!db.objectStoreNames.contains(STORES.JOURNAL)){
        const j = db.createObjectStore(STORES.JOURNAL, { keyPath:"id" });
        j.createIndex("byState","state");
      }
      if(!db.objectStoreNames.contains(STORES.SNAP)){
        db.createObjectStore(STORES.SNAP, { keyPath:"id" });
      }
      if(!db.objectStoreNames.contains(STORES.INDEX)){
        db.createObjectStore(STORES.INDEX, { keyPath:"term" });
      }
    };
    req.onsuccess = () => { DB = req.result; res(DB); };
    req.onerror = () => rej(req.error);
  });
}

function tx(store: keyof typeof STORES, mode: IDBTransactionMode = "readwrite") {
  const t = DB.transaction([store], mode);
  const s = t.objectStore(store);
  const done = new Promise<void>((rs, rj) => { t.oncomplete = () => rs(); t.onerror = () => rj(t.error as any); });
  return { s, done };
}

// region OPFS (heavies) ------------------------------------------------------

async function opfsRoot(): Promise<FileSystemDirectoryHandle> {
  // @ts-ignore: OPFS types live in lib.dom
  const root: FileSystemDirectoryHandle = await (navigator as any).storage.getDirectory();
  // @ts-ignore
  return await root.getDirectoryHandle(OPFS_DIR, { create:true });
}

async function writeOPFS(name: string, blob: Blob): Promise<string> {
  const dir = await opfsRoot();
  // @ts-ignore
  const fh: FileSystemFileHandle = await dir.getFileHandle(name, { create:true });
  // @ts-ignore
  const w = await fh.createWritable(); await w.write(blob); await w.close();
  return `opfs://${OPFS_DIR}/${name}` ;
}

// region logs -----------------------------------------------------------------

async function log(kind: string, note: string, extra: Record<string, unknown> = {}) {
  const rec = { id: uid("LOG"), ts: nowISO(), kind, note, ...extra };
  const { s, done } = tx("LOGS");
  s.put(rec);
  await done;
}

// region journal + snapshots --------------------------------------------------

let _opsSinceSnap = 0;

async function journalStart(ops: JournalOp[]): Promise<string> {
  const rec: JournalRec = { id: uid("J"), state:"prepared", ops, ts: nowISO() };
  const { s, done } = tx("JOURNAL");
  s.put(rec);
  await done;
  return rec.id;
}

async function journalCommit(jid: string): Promise<boolean> {
  const { s, done } = tx("JOURNAL");
  const j: JournalRec | null = await new Promise(rs => { const q = s.get(jid); q.onsuccess = () => rs(q.result || null); });
  await done;
  if(!j) return false;

  for (const op of j.ops) {
    const { s:store } = tx(op.store as keyof typeof STORES);
    if (op.op === "put" || op.op === "update" || op.op === "link") store.put(op.payload);
  }
  j.state = "committed";
  const { s:sw, done:dw } = tx("JOURNAL");
  sw.put(j);
  await dw;

  _opsSinceSnap++;
  if (_opsSinceSnap >= JOURNAL_SNAPSHOT_EVERY) {
    await snapshot();
    _opsSinceSnap = 0;
  }
  return true;
}

async function journalReplay(): Promise<void> {
  const { s, done } = tx("JOURNAL", "readonly");
  const pending: JournalRec[] = await new Promise(rs => { const q = s.index("byState").getAll("prepared"); q.onsuccess = () => rs(q.result || []); });
  await done;
  for (const j of pending) await journalCommit(j.id);
}

async function snapshot(): Promise<void> {
  await withLock("agentlee-snapshot", async () => {
    const snap: SnapshotRec = { id: uid("SNP"), ts: nowISO(), merkle: await merkleRoot() };
    const { s, done } = tx("SNAP");
    s.put(snap); await done;
    await log("snapshot", "created", { id: snap.id });
  });
}

async function merkleRoot(): Promise<string> {
  const { s, done } = tx("FILES", "readonly");
  const all: FileRec[] = await new Promise(rs => { const q = s.getAll(); q.onsuccess = () => rs(q.result || []); });
  await done;
  const hashes = await Promise.all(all.map(r => sha256(JSON.stringify({ id: r.id, chk: r.checksum })) ));
  return await sha256(hashes.join(""));
}

// region search index ---------------------------------------------------------

async function indexFile(rec: FileRec & { content: any }): Promise<void> {
  const { s, done } = tx("INDEX");
  const fields = {
    title: new Set(tokenize(rec.human_name)),
    tag: new Set((rec.tags || []).map(t => t.toLowerCase())),
    path: new Set(tokenize(rec.path || "")),
  };
  const contentTokens = tokenize(JSON.stringify(rec.content ?? {})).slice(0, 40);
  for (const term of new Set<string>([...fields.title, ...fields.tag, ...fields.path, ...contentTokens])) {
    const row = await new Promise<any>(rs => { const q = s.get(term); q.onsuccess = () => rs(q.result || { term, ids: [] }); });
    if (!row.ids.includes(rec.id)) row.ids.push(rec.id);
    s.put(row);
  }
  await done;
}

// region core api -------------------------------------------------------------

export async function init({ passphrase }: { passphrase?: string } = {}) {
  await openDB();
  if (passphrase) await deriveKey(passphrase);
  await journalReplay();
  setTimeout(() => retentionSweep(), 5_000);
  setInterval(retentionSweep, 5 * 60 * 1000);
  return API;
}

async function putFile<T = any>(args: {
  drive_key: DriveKey;
  human_name: string;
  path?: string;
  type?: "task" | "file";
  stage?: Stage;
  content?: T;
  tags?: string[];
  priority?: "low" | "normal" | "high";
  retention?: Retention;
  critical?: boolean;
  next_fire_at?: string | null;
}): Promise<FileRec<T>> {
  const {
    drive_key, human_name, path, type = "task", stage, content = {} as T, tags = [],
    priority = "normal", retention, critical = false, next_fire_at = null
  } = args;

  const base: FileRec<T> = {
    id: uid("F"),
    type,
    human_name,
    coded_name: critical ? (await sha256(human_name)).slice(0, 12) : null,
    stage: stage || defaultStage(drive_key),
    priority,
    created_at: nowISO(),
    updated_at: nowISO(),
    retention: retention || {
      policy: stage === "short" ? "short" : stage === "mid" ? "mid" : "forever",
      ttl_days: stage === "short" ? 14 : stage === "mid" ? 120 : undefined
    },
    drive_label: DRIVE_LABELS[drive_key],
    drive_key,
    path: path || `/${DRIVE_LABELS[drive_key]}/${new Date().toISOString().slice(0, 10)}/${human_name}`,
    content: await encField(content),
    tags,
    security: {
      critical,
      classification: critical ? "restricted" : "standard",
      approvals: []
    },
    next_fire_at
  };

  const head = JSON.stringify({ ...base, content: undefined });
  base.sig = await hmac(head);
  base.checksum = await sha256(head);

  const jid = await journalStart([{
    op: "put",
    store: "FILES",
    payload: base
  }]);

  await journalCommit(jid);
  await indexFile({ ...base, content: _cryptoCtx ? await decField(base.content) : base.content });
  await log("put", `Saved ${type} ${human_name}`, { drive: drive_key, id: base.id });
  
  return base;
}

async function linkFile(ownerId: string, toDrive: string, targetId: string, relation: string): Promise<LinkRec> {
  const link: LinkRec = {
    id: uid("LNK"),
    file_id: ownerId,
    target: `${toDrive}:${targetId}`,
    relation,
    ts: nowISO()
  };
  
  const jid = await journalStart([{
    op: "link",
    store: "LINKS",
    payload: link
  }]);
  
  await journalCommit(jid);
  return link;
}

// region examples: 100 Base64 in flashes -------------------------------------

function b64(s: string): string {
  return btoa(unescape(encodeURIComponent(s)));
}

function b64json(obj: any): string {
  return b64(JSON.stringify(obj));
}

function generateExamples() {
  const cats = [
    "Scheduling & Events", "Home & Family", "Office & Projects", "Finance & Bills",
    "Health & Fitness", "Holidays & Celebrations", "Travel & Logistics",
    "Learning & Skills", "Maintenance & Repairs", "Misc & Multi-User"
  ];
  
  const styles = ["Basic", "Composite", "Contextual", "Collaborative"];
  const today = new Date("2025-10-04T00:00:00-05:00");
  const ex = [];
  let id = 1;
  
  for (const c of cats) {
    for (let i = 1; i <= 10; i++) {
      const style = styles[(i - 1) % 4];
      let utter = "";
      let meta: Record<string, any> = {};
      
      if (c === "Scheduling & Events") {
        utter = `Schedule reminder for event #${i} with notes and confirm attendees.`;
        meta = {
          date: new Date(today.getTime() + i * 864e5).toISOString().slice(0, 10),
          location: "home",
          attendees: (i % 5) + 1
        };
      } else if (c === "Home & Family") {
        utter = `Plan weekly groceries and chores run #${i} under $120.`;
        meta = {
          budget: 120,
          household: (i % 4) + 1,
          list: ["milk", "eggs", "bread"]
        };
      } else if (c === "Office & Projects") {
        utter = `Prepare sprint tasks list #${i} and code review slots.`;
        meta = {
          sprint_day: new Date(today.getTime() + (7 + i) * 864e5).toISOString().slice(0, 10),
          repo: "agent-lee",
          reviewers: 2
        };
      } else if (c === "Finance & Bills") {
        utter = `Pay monthly bills batch #${i} and track receipts.`;
        meta = {
          accounts: ["rent", "utilities", "internet"],
          budget: 2000
        };
      } else if (c === "Health & Fitness") {
        utter = `Set workout and meds reminders #${i}.`;
        meta = {
          workout: "run 5k",
          meds: ["vitamin D"],
          time: "07:00"
        };
      } else if (c === "Holidays & Celebrations") {
        utter = `Plan holiday gifts and dinner #${i} within $300.`;
        meta = {
          budget: 300,
          guests: 6,
          theme: "cozy"
        };
      } else if (c === "Travel & Logistics") {
        utter = `Book trip logistics #${i}: flights, hotel, car.`;
        meta = {
          from: "ORD",
          to: "LAX",
          nights: 3
        };
      } else if (c === "Learning & Skills") {
        utter = `Create study plan #${i} for a new skill.`;
        meta = {
          skill: "spanish",
          duration_weeks: 8
        };
      } else if (c === "Maintenance & Repairs") {
        utter = `Schedule maintenance task #${i} and parts ordering.`;
        meta = {
          asset: "car",
          service: "oil change",
          parts: ["filter", "oil"]
        };
      } else {
        utter = `Organize group activity #${i} with shared budget.`;
        meta = {
          participants: 4,
          budget: 80,
          activity: "movie night"
        };
      }
      
      const title = `${c} — ${style} #${i}`;
      const payload = { title, utterance: utter, meta };
      ex.push({
        id: `EX${String(id).padStart(3, "0")}`,
        category: c,
        style,
        b64: b64json(payload)
      });
      id++;
    }
  }
  
  return ex;
}

export async function loadAllExamples({ passphrase }: { passphrase?: string } = {}) {
  if (passphrase) await init({ passphrase });
  const examples = generateExamples();
  const batchSize = 10;
  
  for (let i = 0; i < examples.length; i += batchSize) {
    const slice = examples.slice(i, i + batchSize);
    await Promise.all(slice.map(async ex => {
      const payload = JSON.parse(decodeURIComponent(escape(atob(ex.b64))));
      return ingestTask({
        human_name: payload.title,
        content: {
          utterance: payload.utterance,
          meta: payload.meta,
          category: ex.category,
          style: ex.style,
          id: ex.id
        },
        tags: [
          "demo",
          "b64",
          ex.category.replace(/\W+/g, "_").toLowerCase(),
          ex.style.toLowerCase()
        ],
        priority: "normal"
      });
    }));
    
    await new Promise(r => setTimeout(r, 20)); // yield
  }
  
  return examples.length;
}

// region task management -----------------------------------------------------

export async function ingestTask({
  human_name,
  content,
  tags = [],
  priority = "normal",
  critical = false,
  schedule = null
}: {
  human_name: string;
  content: any;
  tags?: string[];
  priority?: "low" | "normal" | "high";
  critical?: boolean;
  schedule?: string | null;
}) {
  const R = await putFile({
    drive_key: "R",
    human_name,
    type: "task",
    stage: "short",
    content,
    tags,
    priority,
    next_fire_at: schedule
  });
  
  const A = await putFile({
    drive_key: "A",
    human_name,
    type: "task",
    stage: "mid",
    content: { ...content, plan: true },
    tags: [...tags, "plan"],
    priority
  });
  
  await linkFile(R.id, "A", A.id, "plan_mirror");
  
  const L = await putFile({
    drive_key: "L",
    human_name,
    type: "file",
    stage: "ui",
    content: { ...content, ui_hint: "render:task_card" },
    tags: [...tags, "ui"]
  });
  
  await linkFile(R.id, "L", L.id, "ui_artifact");
  
  const SYS = await putFile({
    drive_key: "LEE",
    human_name,
    type: "file",
    stage: "system",
    content: { registry: "task" },
    tags: [...tags, "system"],
    critical
  });
  
  await linkFile(R.id, "LEE", SYS.id, "system_registry");
  
  const D = await putFile({
    drive_key: "D",
    human_name: `Task Created: ${human_name}`,
    type: "file",
    stage: "security",
    content: { event: "ingest_task", src: "R", human_name },
    tags: [...tags, "security"]
  });
  
  await linkFile(R.id, "D", D.id, "security_event");
  
  return { R, A, L, LEE: SYS, D };
}

// region heavy artifacts ------------------------------------------------------

let _heavyToggle = 0;

export async function persistHeavyArtifacts(
  ownerDriveKey: DriveKey,
  ownerId: string,
  artifacts: Array<{ name?: string; blob?: Blob; text?: string; kind?: string }>
) {
  const out = [];
  
  for (const art of artifacts) {
    const drive: "E" | "O" = _heavyToggle++ % 2 === 0 ? "E" : "O";
    const name = `${Date.now()}-${(art.name || "blob").replace(/[^a-z0-9_.-]/gi, "_")}`;
    
    const ref = typeof art.blob !== "undefined"
      ? await writeOPFS(name, art.blob)
      : await writeOPFS(name, new Blob([art.text ?? ""], { type: "application/json" }));
    
    const rec = await putFile({
      drive_key: drive,
      human_name: art.name || "Artifact",
      type: "file",
      stage: "heavy",
      content: { pointer: ref, kind: art.kind || "blob" },
      tags: ["heavy", "artifact"]
    });
    
    await linkFile(ownerId, drive, rec.id, "has_artifact");
    out.push({ drive, rec });
  }
  
  return out;
}

// region archive & retention -------------------------------------------------

export async function archiveForever(fromId: string) {
  const { s, done } = tx("FILES", "readonly");
  const rec = await new Promise<FileRec | null>(rs => {
    const q = s.get(fromId);
    q.onsuccess = () => rs(q.result || null);
  });
  await done;
  
  if (!rec) throw new Error("Record not found");
  
  const N = await putFile({
    drive_key: "N",
    human_name: rec.human_name,
    type: rec.type as "task" | "file",
    stage: "forever",
    content: _cryptoCtx ? await decField(rec.content) : rec.content,
    tags: [...(rec.tags || []), "archived"],
    retention: { policy: "forever" }
  });
  
  await linkFile(fromId, "N", N.id, "archived");
  return N;
}

async function retentionSweep() {
  await withLock("agentlee-retention", async () => {
    const { s, done } = tx("FILES", "readonly");
    const all: FileRec[] = await new Promise(rs => {
      const q = s.getAll();
      q.onsuccess = () => rs(q.result || []);
    });
    await done;
    
    const now = Date.now();
    const recycle: string[] = [];
    const hard: string[] = [];
    
    for (const r of all) {
      if (r.deleted_at) {
        const t = new Date(r.deleted_at).getTime();
        if (now - t > RECYCLE_GRACE_DAYS * 864e5) hard.push(r.id);
        continue;
      }
      
      if (r.retention?.policy === "short" && r.retention.ttl_days) {
        const born = new Date(r.created_at).getTime();
        if (now - born > r.retention.ttl_days * 864e5) {
          recycle.push(r.id);
        }
      }
    }
    
    if (recycle.length) {
      const { s: sw } = tx("FILES");
      for (const id of recycle) {
        const r = await new Promise<FileRec | null>(rs => {
          const q = sw.get(id);
          q.onsuccess = () => rs(q.result || null);
        });
        
        if (r) {
          r.deleted_at = nowISO();
          r.updated_at = nowISO();
          sw.put(r);
        }
      }
    }
    
    if (hard.length) {
      const { s: sd } = tx("FILES");
      for (const id of hard) {
        sd.delete(id);
      }
    }
    
    await log("retention", "sweep complete", {
      recycle: recycle.length,
      hard: hard.length
    });
    
    if (bc) {
      bc.postMessage({
        kind: "retention",
        recycle: recycle.length,
        hard: hard.length
      });
    }
  });
}

// region outcomes & learning -------------------------------------------------

export async function reportOutcome({
  ownerId,
  success,
  cost,
  notes,
  tags = []
}: {
  ownerId: string;
  success: boolean;
  cost?: number;
  notes?: string;
  tags?: string[];
}) {
  await putFile({
    drive_key: "D",
    human_name: `Outcome:${ownerId}`,
    type: "file",
    stage: "security",
    content: { ownerId, success, cost, notes },
    tags: ["outcome", ...tags]
  });
  
  if (success === false) {
    await putFile({
      drive_key: "A",
      human_name: `PlanFix:${ownerId}`,
      type: "task",
      stage: "mid",
      content: {
        ownerId,
        fix: "tighten_budget_match",
        apply: ["vendor_filter", "price_cap", "finger_food_only"]
      },
      tags: ["learning", "correction"]
    });
  }
}

// region API export ----------------------------------------------------------

const API = {
  // Core
  init,
  
  // File operations
  putFile,
  linkFile,
  
  // Task management
  ingestTask,
  
  // Heavy artifacts
  persistHeavyArtifacts,
  
  // Archive & retention
  archiveForever,
  
  // Learning & outcomes
  reportOutcome,
  
  // Examples
  loadAllExamples
};

export default API;

// For debugging in browser console
declare global {
  interface Window {
    AgentLeeFS: typeof API;
    AgentLeeLabels: typeof DRIVE_LABELS;
  }
}

if (typeof window !== 'undefined') {
  window.AgentLeeFS = API;
  window.AgentLeeLabels = DRIVE_LABELS;
}
