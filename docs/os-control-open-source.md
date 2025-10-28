# Open-Source Solutions for Cross-Platform App Control by an AI Agent

> Status: Added as reference for Agent Lee routing and device-control roadmap. This document is auto-seeded into Drive LEE at boot.

## Overview

There are open-source projects on GitHub that let an AI agent (like Agent Lee) act like the operating system: enumerate installed apps and automate them on Android and Windows. Many expose tools via MCP (Model Context Protocol) so an agent can discover and call them safely.

Below are two prominent, practical building blocks we can integrate without reinventing the wheel.

---

## Android: UIAutomator2 MCP Server

A UIAutomator2-based MCP server lets an agent list apps and control them via Android's native automation stack (UI Automator + ADB).

Key capabilities:
- List and manage apps: retrieve all installed apps (package, version), start/stop by package.
- UI interaction: tap by text/resource-id/content-desc; long‑press, swipe, scroll; enter text fields.
- Device control: screen on/off, unlock, screenshots, retrieve UI hierarchy.

Why this matters for Lee:
- "Open YouTube and search for…" becomes a single tool call chain.
- The UI tree enables robust selectors instead of brittle screen coords.

Implementation notes:
- Runs as an MCP server (Python). The agent connects, discovers tools (e.g., `get_installed_apps`, `start_app`, `tap`, `type`), and invokes them.
- Secure by default: allowlist tools, add rate limits, and redact logs.

---

## Windows: Desktop Automation MCP (AutoIt-based)

A Windows Desktop Automation MCP server provides GUI automation through an AutoIt wrapper and MCP JSON‑RPC tools.

Key capabilities:
- Launch/manage apps: run processes, switch/activate windows, terminate tasks.
- UI control: controlClick, controlGetText/controlSetText, sendKeyStrokes (shortcuts), even when not foregrounded.
- Window/system ops: find/bring‑to‑front, resize, screenshots, shutdown.

Why this matters for Lee:
- "Open Notepad, paste the summary, and save to Desktop" is fully automatable.
- Works across most legacy Windows apps without per‑app plugins.

Implementation notes:
- MIT‑licensed MCP server; agent discovers tools and calls them with parameters (window title, control id, text, etc.).
- Combine with policy guards to avoid dangerous actions and require user confirmation for destructive ops.

---

## Integration pattern for Agent Lee

1) Run the platform MCP server alongside Lee (Android or Windows).
2) Register its endpoint in Lee's provider registry (local or LAN URL).
3) Extend the routing matrix to include device-control intents, e.g.:

```ts
// Pseudocode – see src/agentlee.behavior.ts
// Add new categories
const TOKENS = {
  // ...existing…
  openApp: ["open app", "launch", "start"],
  click: ["click", "tap", "press"],
  type: ["type", "enter", "fill"],
};

// Example plan
function planOpenApp(label: string): AssistPlan {
  return {
    label,
    steps: [
      { studio: "diagnostics", intent: "mcp.discover", say: "Connecting to device tools…" },
      { studio: "research", intent: "apps.enumerate", say: "Listing installed apps…" },
      { studio: "showcase", intent: "apps.launch", say: "Launching the requested app." },
    ],
    confirmations: ["Is this the right device?", "Proceed to control the app now?"],
    saveAs: { drive: "LEE", kind: "plan", tags: ["device", "automation"] },
  };
}
```

4) Tool calls are executed via the MCP transport. Keep LOCAL_ONLY networking guard in place; present a consent sheet the first time a device is controlled.

---

## Safety & UX recommendations

- Gated actions: require confirmation for destructive operations (delete, shutdown, install).
- Dry‑run mode: show the next intended click/keypress before executing.
- Session timebox: auto‑disable control after N minutes of inactivity.
- Audit trail: log each tool call into Drive LEE with parameters and screenshots.

---

## Sources (for reference)

- Android UIAutomator2 MCP server – documentation and feature list (nim444)
- Windows Desktop Automation MCP server – overview and capabilities (AutoIt‑based)
- CursorTouch Windows‑MCP – README and usage examples
- Skywork AI blog posts – backgrounders on both MCP servers

(Exact links can be added here as permalinks when we pin the chosen forks.)
