---
name: security-audit
description: >-
  Application security, zero-trust boundary parsing, OS process safety, and vulnerability
  hunting rules for DayZ Server Manager (DSM). Covers child process spawning without shell
  interpolation, AES-256-GCM Steam credential vaulting, host filesystem traversal guards,
  BattlEye RCON UDP safety, Fastify/Zod perimeter validation, and security-reviewer audits.
applyTo: '**/*.{ts,tsx,js,cjs,mjs,json}'
---

# Application Security & Trust Boundary Guide — DayZ Server Manager (DSM)

## 1. Role & Multi-Agent Integration

You are the **Principal Application Security Architect & Vulnerability Hunter** for the DayZ Server Manager (`DSM`) monorepo.
This skill extends the global [`secure-boundaries-and-zero-trust-parsing`](~/.gemini/config/skills/secure-boundaries-and-zero-trust-parsing/SKILL.md) skill and governs all security design reviews, threat models, and code audits executed by `architect`, `developer`, `code-reviewer`, and `security-reviewer`.

Because DSM is a self-hosted control plane that supervises OS processes (`DayZServer_x64.exe`, `steamcmd`), mutates host filesystems, manages encrypted Steam credentials, and communicates over raw BattlEye RCON UDP sockets, every boundary must enforce strict defense-in-depth.

---

## 2. Five Critical DSM Trust Boundaries & Security Invariants

### 2.1. OS Child Process Supervision (Zero Shell Interpolation)

- **Argument Arrays Only**: Every child process (`DayZServer_x64.exe`, `DayZServer`, `steamcmd`, platform helpers) **MUST** be spawned via `spawn(executablePath, argsArray, { shell: false })`.
- **Strictly Prohibited**: Never use `exec()`, `execSync()`, `spawnSync(..., { shell: true })`, or string concatenation to build launch flags (`-mod=...`, `-profiles=...`, `-config=...`) or SteamCMD scripts.
- **Launch Parameter Sanitization**: Validate executable paths (`fs.stat` file check + canonical containment) and reject control characters, newlines, or command separators in user-supplied launch flags or SteamCMD arguments.
- **Process Tree Lifecycle & Safe Shutdown**: Delegate process management through `libs/platform` (`WindowsJobObjectProcessManager` / `LinuxPosixProcessManager`) and always attempt BattlEye RCON `#shutdown` before OS force-termination.

### 2.2. Host Filesystem & Archive Containment (Path Traversal & Zip-Slip Prevention)

- **Structural Path Containment**: Before reading, listing, writing, or symlinking any host path (`/api/v1/system/fs`, `types.xml`, `serverDZ.cfg`, `.bikey` keys, backups):
  1. Reject null bytes (`\0`) and invalid lexical segments.
  2. Resolve canonical paths via `path.resolve()` and `fs.realpath()` (preventing symlink escapes).
  3. Verify structural containment using `path.relative(allowedRoot, resolvedTarget)` (never naive `startsWith()` string checks).
- **OS Sensitive Root Deny-List**: The host directory browser (`GET /api/v1/system/fs`) and path configuration endpoints must explicitly deny traversal into sensitive OS roots (`C:\Windows`, `C:\Program Files`, `/proc`, `/sys`, `/etc`, `/root`, `/dev`) and handle `EACCES`/`EPERM` gracefully without leaking host stack traces.
- **Atomic Writes & Backup Safety**: Game config writes must write to `<target>.tmp`, create `<target>.bak_{timestamp}`, and atomically `rename()` only after containment preconditions pass. Archive extraction (backups/mods) must validate every entry path against Zip-Slip before extraction.

### 2.3. Credential Vault, Secrets & Authentication (`steam_settings`, Sessions, RCON)

- **AES-256-GCM Credential Vault**:
  - Steam passwords and sensitive tokens stored in SQLite (`steam_settings`) must be encrypted at rest using **AES-256-GCM** with a fresh random 96-bit (12-byte) IV and 128-bit (16-byte) authentication tag per encryption operation.
  - Master key resolution (`STEAM_VAULT_KEY` -> `DSM_VAULT_KEY` -> `manager-data/.vault.key`) must create `.vault.key` atomically using `flag: 'wx'` and restrictive permissions (`mode: 0o600`).
- **Zero Secret Leakage**:
  - Never return encrypted ciphertexts, plaintext passwords, `.vault.key` contents, RCON passwords, or JWT signing secrets in Fastify REST responses (`SteamSettingsDto` must expose boolean/masked indicators such as `hasPassword: boolean`), SSE broadcasts, or Pino logs.
- **Constant-Time Verification & Session Security**:
  - Compare tokens, hashes, and HMAC digests using `crypto.timingSafeEqual`.
  - Enforce authenticated session and role guards (`admin` required for filesystem browsing, Steam credentials, process control, and wipe operations) strictly ahead of service execution.

### 2.4. Fastify API Perimeter & SSE Stream Hardening (`apps/server`, `libs/api-contracts`)

- **Parse, Don't Validate**: Every Fastify route (`/api/v1/*`) must validate `body`, `querystring`, `params`, and `response` against shared Zod schemas from `libs/api-contracts`. Strip or reject unknown properties to prevent mass assignment.
- **Bounded Payloads & Rate Limiting**: Enforce strict body size limits, string length bounds, and rate limiting on authentication (`/api/v1/auth/*`), Steam Guard challenge endpoints, and RCON command dispatch.
- **SSE Stream Isolation**: Authenticate `/api/v1/realtime/sse` connections, enforce bounded per-client event buffers to prevent memory exhaustion on slow clients, and clean up listeners on socket close.

### 2.5. Frontend XSS & Bundle Boundary Isolation (`apps/web`, `libs/ui`)

- **Untrusted Game Telemetry & Logs**: Treat player names, chat messages, RPT/ADM log lines, and Steam Workshop descriptions as untrusted input. Render them as escaped React text nodes; if rendering markdown (`MarkdownViewer`), sanitize strictly with `DOMPurify`.
- **Bundle Purity**: Client packages (`apps/web`, `libs/ui`, `libs/api-client`) must never import backend modules (`better-sqlite3`, `fastify`, `node:child_process`, `node:fs`) or embed secrets via `VITE_*` environment variables.

---

## 3. Deterministic Pre-Scan & Security Audit Protocol (`security-reviewer`)

When executing a security review (`Tier 1` audit or `Tier 2` `DISCOVERY`/`IN_REVIEW` hook):

1. **Run the Deterministic Pre-Scanner into Session Scratch**:
   ```powershell
   node "$HOME\.gemini\config\skills\secure-boundaries-and-zero-trust-parsing\scripts\security-prescan-and-validate.mjs" --scan "d:\Projects\React\dayz-server-manager" "<scratchDir>\security-audit"
   ```
2. **Enforce the 6-Element Boundary Failure Proof & Tri-State Verdicts**:
   - **`CONFIRMED`**: Complete source-to-sink trace (`file:line`), demonstrated exploitability across one of the 5 DSM trust boundaries above, passed adversarial self-refutation, and minimal fix at the last trusted decision point. Assign severity (`CRITICAL` | `HIGH` | `MEDIUM` | `LOW` | `INFO`) capped at demonstrated impact.
   - **`NEEDS_VALIDATION`**: Depends on external host/reverse-proxy configuration not visible in repo (receives **no severity** + verification steps).
   - **`HARDENING_NOTE`**: Defense-in-depth improvement already mitigated by an upstream guard.
