# Security Policy

## Overview

The DayZ Server Manager (DSM) team takes the security of our application, server supervisors, and users seriously. As a self-hosted control plane interacting directly with operating system processes, local filesystems, raw network sockets, and persistence databases, maintaining robust defense-in-depth is essential.

---

## Supported Versions

Security patches and vulnerability remediation are prioritized for the active development line:

| Version / Branch | Supported          | Security Maintenance Status |
| ---------------- | ------------------ | --------------------------- |
| `master` / trunk | :white_check_mark: | Actively supported          |
| `< 0.1.0`        | :x:                | Deprecated / unsupported    |

We recommend all administrators run the latest release tag or trunk build to receive critical patches.

---

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues, discussions, or pull requests.**

### Preferred Method: GitHub Private Vulnerability Reporting

The most secure and direct channel to report an issue is through GitHub's encrypted advisory workflow:

1. Navigate to the [Security Advisories](https://github.com/oleh-kazban/dayz-server-manager/security/advisories) tab of this repository.
2. Click **Report a vulnerability** to open an encrypted advisory draft.
3. Provide a detailed report including:
   - A clear description of the vulnerability and its potential impact.
   - Exact steps to reproduce (proof-of-concept scripts or payload examples are appreciated).
   - The affected subsystem (e.g., Fastify API, OS Process Supervisor, RCON client, SQLite storage, Web UI).
   - Any proposed mitigations or patch suggestions.

---

## Response & Disclosure SLA

When a report is received through our private reporting channel, the engineering team commits to the following timeline:

- **Initial Acknowledgment:** Within **48 hours** of submission.
- **Triage & Severity Assessment:** Within **7 business days** (using CVSS v3.1 scoring).
- **Fix & Release:** Critical vulnerabilities (RCE, privilege escalation, credential theft) will be expedited in a dedicated hotfix release.
- **Coordinated Disclosure:** A public security advisory will be published only after a patch has been validated and released, with full attribution provided to the reporter (unless anonymity is requested).

---

## Scope Guidelines

### In-Scope Subsystems

- **Remote Code Execution (RCE) / Command Injection:** Flaws in how DayZ server processes, steamcmd, or workshop tools are spawned or supervised.
- **Arbitrary File Access & Path Traversal:** Vulnerabilities in file manager routes, mission unpacking, or mod staging.
- **Authentication & Authorization Bypass:** Bypassing console authentication or session token integrity.
- **Network & Protocol Flaws:** Sockets, BattlEye RCON protocol handling, and SSE stream hijack.
- **Data Persistence Integrity:** SQL injection against SQLite/Drizzle or sensitive data leakage in database snapshots.
- **Client-Side Security:** Stored Cross-Site Scripting (XSS) or sensitive local storage leakage in `apps/web`.

### Out-of-Scope

- Direct DDoS or volumetric packet flooding targeting underlying DayZ dedicated game ports (UDP 2302+).
- Vulnerabilities requiring pre-existing physical access, root/administrator OS compromise, or malware already present on the host machine.
- Issues in upstream DayZ dedicated server binaries (`DayZServer_x64.exe`) or SteamCMD itself.
