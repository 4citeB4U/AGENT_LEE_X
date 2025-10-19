# LEEWAY MASTER DIRECTIVE — NOTEPAD OS (Unified Memory + UI Sync)

TAG: LEEWAY.NOTEPAD.MASTER.V1
ICON: database
WHO: RapidWebDevelop (Agent Lee)
WHEN: 2025-10-12
WHAT: Canonical operating rules and API contracts for Notepad OS as the single memory store, with UI/agents bound by LEEWAY guardrails.
WHY: Keep one source of truth, consistent UX, safe writes, reversible deletes, durable archives, and fast search.
HOW: React + TypeScript + IndexedDB/OPFS; schema clamps; retention worker; journal; global mini-index; event bus; accessibility & performance constraints.
SPDX: MIT
AGENTS: ANY (model & system agnostic)

---

## 0) PRIME OBJECTIVE

- Notepad OS is the single memory store. All reads/writes/search/cleanup flow through Notepad OS APIs — never talk to IndexedDB or OPFS directly from UI or agents.
- UI stays in lockstep with store state via a thin adapter (`useNotepadOS`) and a small event bus.
- LEEWAY guardrails apply to every write (schema clamp, journaling, retention, audit receipts, archive semantics, accessibility, and performance budgets).

---

## 1) CANONICAL TRUTHS

1. One Physical Store, Eight Logical Drives (must always exist and keep these labels):
   - `R` = Drive R (Working)
   - `A` = Drive A (Authoritative)
   - `L` = Drive L (UI Artifacts)
   - `LEE` = Drive Lee (System/Registry)
   - `D` = Drive D (Security/Receipts)
   - `E` = Drive E (Heavy Artifacts A)
   - `O` = Drive O (Heavy Artifacts B)
   - `N` = Drive N (Forever Archive)
2. Task ingest is file-first: creating a task yields coordinated records in R/A/L/LEE/D and links among them.
3. No direct DB pokes from UI or agents. Only call the Notepad OS facade or the Memory Store facade built on top of it.
4. Everything is timestamped, signed (when passphrase is set), and retention-aware.

---

## 2) PUBLIC FACADES (These are the only things callers use)

### 2.1 Notepad OS API (core)

- `init({ passphrase? })` → boot DB/OPFS, derive crypto if passphrase set, start retention worker.
- `ingestTask(title, payload, opts?)` → creates R/A/L/LEE/D + links.
- `putFile({ drive_key, human_name, content, type?, stage?, tags?, priority?, retention?, next_fire_at?, critical? })`
- `persistHeavyArtifacts(ownerId, [{ name, blob|text, kind? }...])` → alternates between `E` and `O`, stores OPFS pointers.
- `archiveForever(id)` → writes immutable copy to `N`, backfills a `LEE` registry record, links both.
- `softDelete(id)` / `restore(id)` / `hardDelete(id)` → recycle flow.
- `listByDrive(driveKey, includeDeleted=false)` / `getFile(id)`
- `searchTerms(q)` → mini-index across `R/A/N` (name/tags/path/content).
- `runRetentionOnce(policy?)` / `startRetentionWorker(policy?)` / `stopRetentionWorker()`
- `scheduleTick(handler)` → fires items with `next_fire_at <= now`.
- `DRIVE_LABELS` → UI display.

### 2.2 Memory Store Facade (thin, preferred by UI & agents)

- `init({ passphrase?, retention? })`
- `createTask(title, rawPayload, opts?)` → internally clamps payload.
- `saveFile(drive, name, content, tags?)`
- `attachArtifacts(ownerId, items[])`
- `archive(id)` / `remove(id)` / `restore(id)` / `purge(id)` / `getById(id)`
- `listByDrive(drive, includeDeleted?)` / `search(q)`
- `outcome(ownerId, success, notes?, cost?)`
- `onChange(listener)` → event bus

MANDATE: If a caller is UI or an agent, prefer the Memory Store. Core Notepad OS is for platform code.

---

## 3) SCHEMA CLAMPS (LEEWAY “Inputs/Outputs” Guardrails)

- All writes clamp first. Use `clampTaskPayload(raw)` for task/JSON; use `clampFile()` when constructing file-shaped objects.
- Strip functions and exotic objects. Keep strings/numbers/booleans; shallow-copy plain objects; trim arrays (≤200 items).
- On clamp failure, reject fast with a human-readable reason; do not write partials.

---

## 4) JOURNAL & CRYPTO (Reliability/Safety)

- Two-phase journal: `prepared → committed`, idempotent commit, TTL marks stale; stale beyond 24h is purged.
- Optional AES-GCM envelope and HMAC signing when passphrase is provided to `init`.
- Every record has `created_at`, `updated_at`, optional `deleted_at`, `checksum`, optional `sig`.

---

## 5) RETENTION & RECYCLE (Data Lifecycle)

- Defaults:
  - `short` → soft-delete after ~14 days
  - `mid` → ~120 days
  - `forever` → no expiry
- Retention worker: soft-deletes on TTL, hard-deletes items past the recycle window (`recycleDays`, default 7).
- Recycle Bin UI lists soft-deleted items across all drives; actions: Restore or Purge.

---

## 6) ARCHIVE RULES

- `archiveForever(id)` creates an immutable copy on `N`, tags it `archived`, then writes a LEE registry pointer for traceability.
- Linking:
  - `source → N` (`relation: archived`)
  - `N → LEE` (`relation: registry_archive`)

---

## 7) INDEX & SEARCH

- Mini inverted index covers `R/A/N` for speed; includes tokens from `human_name`, `path`, `tags`, and truncated `content`.
- Query via `searchTerms(q)` or Memory Store `search(q)`.
- Index updates occur after successful commits.

---

## 8) RECEIPTS & AUDIT

- Major actions (ingest, archive, purge, retention sweep, outcomes) may emit human-readable receipts to Drive `D`.
- Standard receipt tags: `["receipt","audit","leeway"]`.

---

## 9) UI CONTRACT (React)

- Use `useNotepadOS()` (adapter) or the Memory Store facade.
- Present three columns:
  1. Working (R) list; create/archive/delete; keyboard submit on Enter.
  2. Authoritative (A) list + Search (R/A/N).
  3. Details of the active item + Recycle Bin panel.
- Active selection determines detail panel; provide `Archive / Delete` in detail.
- Accessibility:
  - Every actionable element has discernible text; use `aria-label` for inputs.
  - Focus states visible; list rows use `button` semantics; `aria-pressed` reflects selection.
  - Keyboard: Enter to submit; Esc never destroys data.
- Performance:
  - Poll or subscribe (event bus) at ~1.5s cadence for list refresh.
  - Avoid heavy serialization in render; memoize derived meta; cap list heights with virtual/scroll regions.
- Never read/write IndexedDB/OPFS directly from UI.

---

## 10) ERROR HANDLING & MESSAGING

- On clamp error → toast/dialog: “Invalid task: <reason>.”
- On write failure → “Couldn’t save. Your data is untouched.”
- On archive/restore/purge → reflect immediately in UI (refresh after action).
- On search with empty query → clear results.

---

## 11) SECURITY & CLASSIFICATION

- `critical: true` marks record classification as `"restricted"`; default is `"standard"`.
- `LEE` drive is system/registry; user cannot delete `LEE` entries through UI.
- Never log secrets in receipts; keep receipts human-readable, minimal, and non-sensitive.

---

## 12) SCHEDULING

- `next_fire_at` timestamps trigger `scheduleTick(handler)`; handler must be idempotent and must clear `next_fire_at` on success.
- Use `MemoryStore.outcome(ownerId, success, notes?, cost?)` to record result status for learning loops.

---

## 13) “DO / DON’T” (Golden Rules)

DO

- Clamp → Journal → Commit → Index → Refresh UI.
- Emit receipts for important events to `D`.
- Keep all Notepad semantics inside the OS/facade, not in UI.

DON’T

- Don’t touch IndexedDB/OPFS directly from UI/agents.
- Don’t bypass archive with a direct copy to `N`.
- Don’t store giant blobs in `R/A/N`; use `persistHeavyArtifacts` to `E/O`.

---

## 14) ACCEPTANCE CHECKLIST (Ship Criteria)

- [ ] App boots `NotepadOS.init({ passphrase })` once; retention worker running.
- [ ] Creating a task writes to R/A/L/LEE/D and links them; UI lists it in R; details show correct meta.
- [ ] Search finds the task by name/tag/content across R/A/N.
- [ ] Delete moves to Recycle Bin; Restore brings it back; Purge removes permanently.
- [ ] Archive writes immutable copy to N and a registry entry to LEE.
- [ ] Heavy artifacts alternate E/O with OPFS pointers and links to owner.
- [ ] Accessibility: focus rings, `aria-pressed`, labels on inputs/buttons.
- [ ] Performance: list updates ≤1.5s; no direct DB calls from UI; memory stable under long sessions.
- [ ] Receipts appear on D for key events (optional but recommended).

---

## 15) CANONICAL CALL PATTERNS (Examples)

Boot once

```ts
import memoryStore from "@/lib/memoryStore";
await memoryStore.init({ passphrase: "Agent-Lee@Device-Key", retention:{ sweepMs:360000, recycleDays:7 }});
```

Create a task (clamped)

```ts
await memoryStore.createTask("Grocery run", { utterance:"milk eggs", budgetUSD: 40 }, { priority:"high" });
```

Search (R/A/N)

```ts
const hits = await memoryStore.search("milk budget");
```

Recycle & Archive

```ts
await memoryStore.remove(id);   // soft delete → Recycle Bin
await memoryStore.restore(id);  // bring back
await memoryStore.archive(id);  // immutable copy to N + LEE registry
```

Attach heavy artifacts

```ts
await memoryStore.attachArtifacts(ownerId, [{ name:"prices.json", text:"{}" }]);
```

Outcome logging

```ts
await memoryStore.outcome(ownerId, true, "Ordered items", 38.42);
```

UI adapter (lists + detail + actions)

```ts
const { working, authoritative, active, setActiveId, actions } = useNotepadOS();
```

---

## 16) ENFORCEMENT

- Any component or agent attempting to bypass this directive (direct DB, missing clamp, skipping archive rules) must be rejected and corrected to use the Memory Store/Notepad OS APIs.

---

Use this directive as your single source of truth. It matches your code upgrades (screen, recycle bin, hook, schema clamps, receipts, OS core) and ensures Notepad OS remains the brain, with the UI and agents speaking one clean, safe language.
