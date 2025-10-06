[CmdletBinding()]
param(
  # Where to write the universal test pack
  [string]$OutDir = 'D:\AGENT_LEE_X\LeeWay_Standards\LeeWay_Test',
  # Overwrite files if they already exist
  [switch]$Force
)

function Header($t){ Write-Host "`n=== $t ===" -ForegroundColor Cyan }
function EnsureDirectory($p){ if (-not (Test-Path $p)) { New-Item -ItemType Directory -Force -Path $p | Out-Null } }
function Write-File($path, [string]$content) {
  if ((-not (Test-Path $path)) -or $Force) {
    $dir = Split-Path -Parent $path
    EnsureDirectory $dir
    $content | Set-Content -LiteralPath $path -NoNewline -Encoding UTF8
    Write-Host "  + wrote $path"
  } else {
    Write-Host "  • exists $path (use -Force to overwrite)" -ForegroundColor DarkGray
  }
}

# --------------------------------------------------------------------------------
Header "Preparing folders"
EnsureDirectory $OutDir
$TestDir = Join-Path $OutDir 'test'
EnsureDirectory $TestDir

# --------------------------------------------------------------------------------
Header "Writing Vitest config"
Write-File (Join-Path $OutDir 'vitest.config.ts') @'
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    include: [
      "test/**/*.spec.ts",
      "test/**/*.spec.tsx",
      "src/**/*.test.ts",
      "src/**/*.test.tsx"
    ],
    exclude: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/build/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/out/**"
    ],
  },
});
'@

# --------------------------------------------------------------------------------
Header "Writing test/setup.ts"
Write-File (Join-Path $TestDir 'setup.ts') @'
import "@testing-library/jest-dom";

declare global {
  var fetch: typeof globalThis.fetch | undefined;
}
if (typeof globalThis.fetch === "undefined") {
  globalThis.fetch = async () => new Response("", { status: 200 });
}
'@

# --------------------------------------------------------------------------------
Header "Writing universal specs"

# 1) Headers
Write-File (Join-Path $TestDir 'leeway.headers.spec.ts') @'
/** @jest-environment node */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const EXT_RX = /\.(ts|tsx|js|jsx|mjs|css|html|md)$/i;
const HEADER_RX = /(LEEWAY HEADER|LEEWAY MICRO:)/;
const SPDX_RX = /SPDX-License-Identifier:/;

function* walk(dir: string) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (/(^|[\\/])(node_modules|\.next|dist|build|coverage|out|test)([\\/]|$)/.test(p)) continue;
      yield* walk(p);
    } else if (EXT_RX.test(e.name)) {
      yield p;
    }
  }
}

describe("LEEWAY headers present in first-party files", () => {
  for (const file of walk(ROOT)) {
    test(path.relative(ROOT, file), () => {
      const txt = fs.readFileSync(file, "utf8");
      const isFirstParty = !/(^|[\\/])(LICENSE|CHANGELOG|README)/i.test(file);
      if (isFirstParty) {
        expect(HEADER_RX.test(txt)).toBe(true);
        expect(SPDX_RX.test(txt)).toBe(true);
      }
    });
  }
});
'@

# 2) CSS webkit prefix
Write-File (Join-Path $TestDir 'css.prefix.backdrop.spec.ts') @'
/** @jest-environment node */
import fs from "node:fs";
import path from "node:path";

function* cssFiles(root: string) {
  for (const e of fs.readdirSync(root, { withFileTypes: true })) {
    const p = path.join(root, e.name);
    if (e.isDirectory()) {
      if (/(^|[\\/])(node_modules|\.next|dist|build|coverage|out)([\\/]|$)/.test(p)) continue;
      yield* cssFiles(p);
    } else if (/\.css$/i.test(e.name)) yield p;
  }
}

function ruleHasWebkit(rule: string) {
  const m = rule.match(/backdrop-filter\s*:\s*([^;]+);/i);
  if (!m) return true;
  const val = m[1].trim().replace(/\s+/g, " ");
  const web = new RegExp(`-webkit-backdrop-filter\\s*:\\s*${val}\\s*;`, "i");
  return web.test(rule);
}

describe("Safari compat: -webkit-backdrop-filter alongside backdrop-filter", () => {
  for (const file of cssFiles(process.cwd())) {
    test(path.relative(process.cwd(), file), () => {
      const css = fs.readFileSync(file, "utf8");
      if (/backdrop-filter\s*:/.test(css)) {
        const ok = css.split("}").every(ruleHasWebkit);
        expect(ok).toBe(true);
      }
    });
  }
});
'@

# 3) Inline styles ban
Write-File (Join-Path $TestDir 'inline.styles.spec.ts') @'
/** @jest-environment node */
import fs from "node:fs";
import path from "node:path";

function* tsxFiles(root: string) {
  for (const e of fs.readdirSync(root, { withFileTypes: true })) {
    const p = path.join(root, e.name);
    if (e.isDirectory()) {
      if (/(^|[\\/])(node_modules|\.next|dist|build|coverage|out|test)([\\/]|$)/.test(p)) continue;
      yield* tsxFiles(p);
    } else if (/\.(tsx|jsx)$/i.test(e.name)) yield p;
  }
}

describe("No inline styles in TSX/JSX (use Tailwind/utilities)", () => {
  const src = path.resolve(process.cwd(), "src");
  const roots = [fs.existsSync(src) ? src : process.cwd()];
  for (const root of roots) {
    for (const file of tsxFiles(root)) {
      test(path.relative(process.cwd(), file), () => {
        const txt = fs.readFileSync(file, "utf8");
        const hasInline = /style\s*=\s*\{\s*\{/.test(txt) && !/data-allow-inline/.test(txt);
        expect(hasInline).toBe(false);
      });
    }
  }
});
'@

# 4) A11y links + ARIA
Write-File (Join-Path $TestDir 'a11y.links-and-aria.spec.ts') @'
/** @jest-environment node */
import fs from "node:fs";
import path from "node:path";

const EMPTY_A = /<a\b((?:(?!aria-label|title).)*?)>(\s*)<\/a>/is;
const ARIA_BAD_BOOL = /(aria-hidden|aria-modal)=\{[^"'][^}]*\}/;

function* uiFiles(dir: string) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (/(^|[\\/])(node_modules|\.next|dist|build|coverage|out|test)([\\/]|$)/.test(p)) continue;
      yield* uiFiles(p);
    } else if (/\.(tsx|jsx|html)$/i.test(e.name)) yield p;
  }
}

describe("A11y: anchors have text/label; ARIA booleans are literal", () => {
  for (const file of uiFiles(process.cwd())) {
    test(path.relative(process.cwd(), file), () => {
      const s = fs.readFileSync(file, "utf8");
      expect(EMPTY_A.test(s)).toBe(false);
      expect(ARIA_BAD_BOOL.test(s)).toBe(false);
    });
  }
});
'@

# 5) Duplicate IDs
Write-File (Join-Path $TestDir 'duplicate-ids.spec.ts') @'
/** @jest-environment node */
import fs from "node:fs";
import path from "node:path";
const ID_RX = /id=["']([^"']+)["']/g;

function* domFiles(root: string) {
  for (const e of fs.readdirSync(root, { withFileTypes: true })) {
    const p = path.join(root, e.name);
    if (e.isDirectory()) {
      if (/(^|[\\/])(node_modules|\.next|dist|build|coverage|out|test)([\\/]|$)/.test(p)) continue;
      yield* domFiles(p);
    } else if (/\.(html|tsx|jsx)$/i.test(e.name)) yield p;
  }
}

describe("No duplicate DOM ids", () => {
  for (const file of domFiles(process.cwd())) {
    test(path.relative(process.cwd(), file), () => {
      const s = fs.readFileSync(file, "utf8");
      const counts: Record<string, number> = {};
      let m: RegExpExecArray | null;
      while ((m = ID_RX.exec(s))) counts[m[1]] = (counts[m[1]] ?? 0) + 1;
      const bad = Object.entries(counts).filter(([, n]) => n > 1);
      expect(bad).toEqual([]);
    });
  }
});
'@

# 6) Tailwind utilities (optional)
Write-File (Join-Path $TestDir 'tailwind.utilities.spec.ts') @'
/** @jest-environment node */
import fs from "node:fs";
import path from "node:path";

const FILE = path.resolve("src/styles/utilities.css");

describe("Tailwind utilities contract (if present)", () => {
  const exists = fs.existsSync(FILE);
  it("file existence is optional", () => expect(exists).toBeTypeOf("boolean"));
  if (!exists) return;

  const s = fs.readFileSync(FILE, "utf8");
  it("has @tailwind directives", () => {
    expect(s).toMatch(/@tailwind\s+base;/);
    expect(s).toMatch(/@tailwind\s+components;/);
    expect(s).toMatch(/@tailwind\s+utilities;/);
  });

  it("provides gradient & delay helpers", () => {
    expect(s).toMatch(/\.bg-agentlee\s*\{/);
    expect(s).toMatch(/\.animate-delay-1000\s*\{/);
    expect(s).toMatch(/\.animate-delay-1500\s*\{/);
    expect(s).toMatch(/\.animate-delay-2000\s*\{/);
  });
});
'@

# 7) tsconfig sanity (optional)
Write-File (Join-Path $TestDir 'config.tsconfigs.spec.ts') @'
/** @jest-environment node */
import fs from "node:fs";

function read(p: string){ return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p,"utf8")) : null }

describe("tsconfig.* sanity (if present)", () => {
  it("playwright", () => {
    const j = read("tsconfig.playwright.json"); if (!j) return;
    expect(j.extends).toBe("./tsconfig.json");
    expect(j.compilerOptions?.jsx).toBeDefined();
    expect(Array.isArray(j.include)).toBe(true);
  });
  it("vitest", () => {
    const j = read("tsconfig.vitest.json"); if (!j) return;
    expect(j.extends).toBe("./tsconfig.json");
    expect(j.compilerOptions?.jsx).toBeDefined();
    expect(Array.isArray(j.include)).toBe(true);
  });
});
'@

# 8) PostCSS + Tailwind smoke (optional)
Write-File (Join-Path $TestDir 'postcss.tailwind.spec.ts') @'
/** @jest-environment node */
import fs from "node:fs";

describe("PostCSS loads Tailwind (if config exists)", () => {
  for (const file of ["postcss.config.mjs","postcss.config.cjs","postcss.config.js"]) {
    if (!fs.existsSync(file)) continue;
    const s = fs.readFileSync(file, "utf8");
    test(file, () => { expect(s).toMatch(/tailwindcss/); });
  }
});
'@

# 9) Required assets via policy (optional)
Write-File (Join-Path $TestDir 'assets.exists.spec.ts') @'
/** @jest-environment node */
import fs from "node:fs";
import path from "node:path";

const POLICY_FILES = [".leewayrc.json","leeway.policy.json"];

function readPolicy() {
  for (const p of POLICY_FILES) if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p,"utf8"));
  return null;
}

describe("Required assets exist (if policy defines them)", () => {
  const policy = readPolicy();
  if (!policy || !Array.isArray(policy.requiredAssets)) {
    it("no required assets policy — skipping", () => {});
    return;
  }
  for (const rel of policy.requiredAssets) {
    test(rel, () => {
      const ok = fs.existsSync(path.resolve(rel)) || fs.existsSync(path.resolve("public", rel));
      expect(ok).toBe(true);
    });
  }
});
'@

# 10) Playwright smoke (optional)
Write-File (Join-Path $TestDir 'smoke.page.spec.ts') @'
import { test, expect } from "@playwright/test";

const CANDIDATES = [
  process.env.PW_BASE_URL || "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
];

test("home page loads and Tab focuses a control", async ({ page }) => {
  let url: string | null = null;
  for (const u of CANDIDATES) {
    try { await page.goto(u, { waitUntil: "domcontentloaded", timeout: 1500 }); url = u; break; } catch {}
  }
  test.skip(!url, "No dev server reachable — skipping");

  await expect(page.locator("body")).toBeVisible();
  await page.keyboard.press("Tab");
  const focusable = page.locator("button,a,input,select,textarea").first();
  await expect(focusable).toBeVisible();
});
'@

# --------------------------------------------------------------------------------
Header "Done"
Write-Host "Files created under: $OutDir"
Write-Host "Next:"
Write-Host "  1) Install dev deps (once): npm i -D vitest @testing-library/jest-dom @testing-library/react"
Write-Host "  2) Run all tests:        npx vitest run `"$OutDir\test\**\*.spec.ts*`""
Write-Host "  3) Or run in chunks:     npx vitest run `"$OutDir\test\leeway.headers.spec.ts`""
