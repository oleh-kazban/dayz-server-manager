import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let mockAccessFailPath: string | null = null;

vi.mock('node:fs', async importOriginal => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    default: {
      ...actual,
      accessSync: (p: fs.PathLike, mode?: number) => {
        if (mockAccessFailPath && String(p) === mockAccessFailPath) {
          throw new Error('EACCES: permission denied');
        }
        return actual.accessSync(p, mode);
      },
    },
    accessSync: (p: fs.PathLike, mode?: number) => {
      if (mockAccessFailPath && String(p) === mockAccessFailPath) {
        throw new Error('EACCES: permission denied');
      }
      return actual.accessSync(p, mode);
    },
  };
});

import {
  generateReleaseHistory,
  parseDoneBacklogItems,
  PreconditionFailedError,
  runSync,
  verifySourcesExist,
} from '../sync-static-content';

describe('sync-static-content pipeline', () => {
  let tempDir: string;

  beforeEach(() => {
    mockAccessFailPath = null;
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsm-sync-test-'));
  });

  afterEach(() => {
    mockAccessFailPath = null;
    vi.restoreAllMocks();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('verifySourcesExist (GUARD-01 Precondition Guard)', () => {
    it('succeeds silently when both source files exist and are readable', () => {
      const faqPath = path.join(tempDir, 'faq.md');
      const backlogPath = path.join(tempDir, 'BACKLOG.md');
      fs.writeFileSync(faqPath, '# FAQ content', 'utf-8');
      fs.writeFileSync(backlogPath, '# Backlog content', 'utf-8');

      expect(() => verifySourcesExist(faqPath, backlogPath)).not.toThrow();
    });

    it('throws PreconditionFailedError when faq.md does not exist', () => {
      const faqPath = path.join(tempDir, 'missing-faq.md');
      const backlogPath = path.join(tempDir, 'BACKLOG.md');
      fs.writeFileSync(backlogPath, '# Backlog', 'utf-8');

      expect(() => verifySourcesExist(faqPath, backlogPath)).toThrow(PreconditionFailedError);
      expect(() => verifySourcesExist(faqPath, backlogPath)).toThrow(
        /Source FAQ file does not exist at/,
      );
    });

    it('throws PreconditionFailedError when faq.md is not readable', () => {
      const faqPath = path.join(tempDir, 'faq.md');
      const backlogPath = path.join(tempDir, 'BACKLOG.md');
      fs.writeFileSync(faqPath, '# FAQ', 'utf-8');
      fs.writeFileSync(backlogPath, '# Backlog', 'utf-8');

      mockAccessFailPath = faqPath;

      expect(() => verifySourcesExist(faqPath, backlogPath)).toThrow(PreconditionFailedError);
      expect(() => verifySourcesExist(faqPath, backlogPath)).toThrow(
        /Source FAQ file is not readable at/,
      );
    });

    it('succeeds when BACKLOG.md is missing but fallback history.md exists and is readable (CI mode)', () => {
      const faqPath = path.join(tempDir, 'faq.md');
      const backlogPath = path.join(tempDir, 'missing-backlog.md');
      const historyPath = path.join(tempDir, 'history.md');
      fs.writeFileSync(faqPath, '# FAQ', 'utf-8');
      fs.writeFileSync(historyPath, '# Pre-existing History', 'utf-8');

      expect(() => verifySourcesExist(faqPath, backlogPath, historyPath)).not.toThrow();
    });

    it('throws PreconditionFailedError when neither BACKLOG.md nor history.md exists', () => {
      const faqPath = path.join(tempDir, 'faq.md');
      const backlogPath = path.join(tempDir, 'missing-backlog.md');
      const historyPath = path.join(tempDir, 'missing-history.md');
      fs.writeFileSync(faqPath, '# FAQ', 'utf-8');

      expect(() => verifySourcesExist(faqPath, backlogPath, historyPath)).toThrow(
        PreconditionFailedError,
      );
      expect(() => verifySourcesExist(faqPath, backlogPath, historyPath)).toThrow(
        /Neither source Backlog file .* nor fallback history file .* exists/,
      );
    });

    it('throws PreconditionFailedError when BACKLOG.md is not readable', () => {
      const faqPath = path.join(tempDir, 'faq.md');
      const backlogPath = path.join(tempDir, 'BACKLOG.md');
      fs.writeFileSync(faqPath, '# FAQ', 'utf-8');
      fs.writeFileSync(backlogPath, '# Backlog', 'utf-8');

      mockAccessFailPath = backlogPath;

      expect(() => verifySourcesExist(faqPath, backlogPath)).toThrow(PreconditionFailedError);
      expect(() => verifySourcesExist(faqPath, backlogPath)).toThrow(
        /Source Backlog file is not readable at/,
      );
    });
  });

  describe('parseDoneBacklogItems', () => {
    const sampleBacklog = `
# Backlog Header

### [DSM-00101] Server Lifecycle Management Engine
- **Type**: \`Core Platform\`
- **Priority**: \`High\`
- **Status**: \`DONE\`
- **Depends On**: \`None\`
- **High-Level Requirements**:
  Implement graceful process lifecycle manager for DayZ server binaries.
  Support signal dispatch and state inspection.
- **Scope Boundaries**:
  - **Included**: Process spawn, exit code observation.
  - **Excluded / Deferred**: Remote clustering.

### [DSM-00105] Workshop Mod Synchronizer
- **Type**: \`Integration\`
- **Priority**: \`High\`
- **Status**: \`IN_PROGRESS\`
- **High-Level Requirements**: Mod syncing logic.

### [DSM-00110] RCON Console Integration
- **Type**: \`Feature\`
- **Priority**: \`Critical\`
- **Status**: \`DONE\`
- **Depends On**: \`DSM-00101\`
- **High-Level Requirements**:
  Full-duplex BattlEye RCON console with keepalive heartbeats.
- **Scope Boundaries**:
  - **Included**: Commands execution, player kick, shutdown commands.
  - **Excluded / Deferred**: Chat bots.

### [DSM-00099] Initial Skeleton Setup
- **Type**: \`Chore\`
- **Priority**: \`Normal\`
- **Status**: \`DONE\`
- **High-Level Requirements**: Monorepo scaffolding with Nx and Vite.

### [INVALID-NON-PBI] Ignored Header
- **Status**: \`DONE\`
`;

    it('filters only items with Status: DONE and ignores IN_PROGRESS or invalid headers', () => {
      const items = parseDoneBacklogItems(sampleBacklog);

      expect(items).toHaveLength(3);
      const ids = items.map(it => it.id);
      expect(ids).not.toContain('DSM-00105');
      expect(ids).not.toContain('INVALID-NON-PBI');
    });

    it('sorts DONE items in reverse-chronological order (highest PBI ID first)', () => {
      const items = parseDoneBacklogItems(sampleBacklog);

      expect(items.map(it => it.id)).toEqual(['DSM-00110', 'DSM-00101', 'DSM-00099']);
    });

    it('correctly parses metadata, cleaned backticks, summary, and delivered capabilities', () => {
      const items = parseDoneBacklogItems(sampleBacklog);
      const dsm110 = items.find(it => it.id === 'DSM-00110');

      expect(dsm110).toBeDefined();
      expect(dsm110?.title).toBe('RCON Console Integration');
      expect(dsm110?.type).toBe('Feature');
      expect(dsm110?.priority).toBe('Critical');
      expect(dsm110?.status).toBe('DONE');
      expect(dsm110?.dependsOn).toBe('DSM-00101');
      expect(dsm110?.requirements).toBe(
        'Full-duplex BattlEye RCON console with keepalive heartbeats.',
      );
      expect(dsm110?.scopeIncluded).toBe('Commands execution, player kick, shutdown commands.');
    });

    it('extracts multi-line 4-space indented Included and Excluded / Deferred bullet lists (REQ-01)', () => {
      const multilineBacklog = `
### [DSM-00126] Steam Integration Workbench
- **Type**: \`Feature\`
- **Priority**: \`High\`
- **Status**: \`DONE\`
- **High-Level Requirements**:
  Manage SteamCMD paths and credentials.
- **Scope Boundaries**:
  - **Included**:
    - AES-256-GCM credential vault
    - Dual-scope navigation (server vs appliance)
    - SteamCMD diagnostic runner
  - **Excluded / Deferred**:
    - Automated mod conflict resolution
    - Scheduled workshop polling
---
`;
      const items = parseDoneBacklogItems(multilineBacklog);
      expect(items).toHaveLength(1);
      expect(items[0].scopeIncluded).toBe(
        [
          '- AES-256-GCM credential vault',
          '- Dual-scope navigation (server vs appliance)',
          '- SteamCMD diagnostic runner',
        ].join('\n'),
      );
      expect(items[0].scopeExcluded).toBe(
        ['- Automated mod conflict resolution', '- Scheduled workshop polling'].join('\n'),
      );
    });

    it('preserves relative indentation for 6-space nested sub-bullets and internal blank lines (REQ-01)', () => {
      const nestedBacklog = `
### [DSM-00126] Steam Integration
- **Status**: \`DONE\`
- **Scope Boundaries**:
  - **Included**:
    - Primary capability

      - Sub-capability alpha
      - Sub-capability beta
    - Secondary capability

  - **Excluded / Deferred**:
    - Deferred item
`;
      const items = parseDoneBacklogItems(nestedBacklog);
      expect(items).toHaveLength(1);
      expect(items[0].scopeIncluded).toBe(
        [
          '- Primary capability',
          '',
          '  - Sub-capability alpha',
          '  - Sub-capability beta',
          '- Secondary capability',
        ].join('\n'),
      );
      expect(items[0].scopeExcluded).toBe('- Deferred item');
    });

    it('parses CRLF line endings and inline + continuation hybrid blocks accurately (REQ-01)', () => {
      const crlfHybridBacklog = [
        '# Backlog',
        '',
        '### [DSM-00126] Hybrid Scope',
        '- **Status**: `DONE`',
        '- **Scope Boundaries**:',
        '  - **Included**: Core SteamCMD integration:',
        '    - Diagnostic probe',
        '    - Interactive 2FA challenge',
        '  - **Excluded / Deferred**: Legacy FTP',
        '    - WebDAV sync',
        '---',
      ].join('\r\n');

      const items = parseDoneBacklogItems(crlfHybridBacklog);
      expect(items).toHaveLength(1);
      expect(items[0].scopeIncluded).toBe(
        'Core SteamCMD integration:\n- Diagnostic probe\n- Interactive 2FA challenge',
      );
      expect(items[0].scopeExcluded).toBe('Legacy FTP\n- WebDAV sync');
    });

    it('returns undefined when Included has only trailing whitespace before sibling field or separator (REQ-01 refusal)', () => {
      const emptyIncludedBeforeSibling = `
### [DSM-00130] Empty Scope Before Sibling
- **Status**: \`DONE\`
- **Scope Boundaries**:
  - **Included**:   
  - **Excluded / Deferred**: Everything deferred.
`;
      const emptyIncludedBeforeRule = `
### [DSM-00131] Empty Scope Before Rule
- **Status**: \`DONE\`
- **Scope Boundaries**:
  - **Included**:\t  
---
`;
      const items = parseDoneBacklogItems(
        `${emptyIncludedBeforeSibling}\n${emptyIncludedBeforeRule}`,
      );
      expect(items).toHaveLength(2);
      expect(items.find(it => it.id === 'DSM-00130')?.scopeIncluded).toBeUndefined();
      expect(items.find(it => it.id === 'DSM-00130')?.scopeExcluded).toBe('Everything deferred.');
      expect(items.find(it => it.id === 'DSM-00131')?.scopeIncluded).toBeUndefined();
    });

    it('preserves legacy single-line Included prose verbatim without splitting or bulletizing (REQ-03)', () => {
      const legacyBacklog = `
### [DSM-00121] Legacy Single-Line Entry
- **Status**: \`DONE\`
- **High-Level Requirements**: Support legacy RCON bindings.
- **Scope Boundaries**:
  - **Included**: Process lifecycle, RCON console, server health polling.
  - **Excluded / Deferred**: Multi-node failover.
`;
      const items = parseDoneBacklogItems(legacyBacklog);
      expect(items).toHaveLength(1);
      expect(items[0].scopeIncluded).toBe(
        'Process lifecycle, RCON console, server health polling.',
      );
    });
  });

  describe('generateReleaseHistory', () => {
    it('compiles backlog items into formatted markdown document', () => {
      const backlogPath = path.join(tempDir, 'BACKLOG.md');
      const historyDest = path.join(tempDir, 'history.md');

      const backlogContent = `
# Backlog

### [DSM-00101] Server Process Supervisor
- **Type**: \`Engine\`
- **Priority**: \`High\`
- **Status**: \`DONE\`
- **High-Level Requirements**:
  Supervise DayZ dedicated server instances.
- **Scope Boundaries**:
  - **Included**: Process spawn and supervision.
`;
      fs.writeFileSync(backlogPath, backlogContent, 'utf-8');
      generateReleaseHistory(backlogPath, historyDest);

      expect(fs.existsSync(historyDest)).toBe(true);
      const content = fs.readFileSync(historyDest, 'utf-8');

      expect(content).toContain('# Release History & Changelog');
      expect(content).toContain('## [DSM-00101] Server Process Supervisor');
      expect(content).toContain('- **Type**: `Engine`');
      expect(content).toContain('- **Status**: `DONE`');
      expect(content).toContain('### Summary\n\nSupervise DayZ dedicated server instances.');
      expect(content).toContain('### Delivered Capabilities\n\nProcess spawn and supervision.');
    });

    it('emits LF-only markdown ending with a single trailing newline and renders multi-line capabilities (REQ-01, REQ-02, REQ-03)', () => {
      const backlogPath = path.join(tempDir, 'BACKLOG.md');
      const historyDest = path.join(tempDir, 'history.md');

      const backlogContent = [
        '# Backlog',
        '',
        '### [DSM-00126] Steam Integration',
        '- **Type**: `Feature`',
        '- **Priority**: `High`',
        '- **Status**: `DONE`',
        '- **High-Level Requirements**:',
        '  SteamCMD integration.',
        '- **Scope Boundaries**:',
        '  - **Included**:',
        '    - AES-256-GCM vault',
        '      - Hybrid .vault.key resolution',
        '    - Dynamic storage ProgressBar',
        '  - **Excluded / Deferred**:',
        '    - Workshop scheduling',
        '',
        '### [DSM-00101] Legacy Entry',
        '- **Type**: `Core`',
        '- **Priority**: `Normal`',
        '- **Status**: `DONE`',
        '- **High-Level Requirements**:',
        '  Core setup.',
        '- **Scope Boundaries**:',
        '  - **Included**: Single-line legacy prose.',
        '',
        '### [DSM-00127] Planned Entry',
        '- **Status**: `BACKLOG`',
        '- **Scope Boundaries**:',
        '  - **Included**:',
        '    - Should not be emitted',
      ].join('\r\n');

      fs.writeFileSync(backlogPath, backlogContent, 'utf-8');
      generateReleaseHistory(backlogPath, historyDest);

      const content = fs.readFileSync(historyDest, 'utf-8');

      // REQ-02: LF-only and exact single trailing newline after final ---
      expect(/\r\n/.test(content)).toBe(false);
      expect(content.endsWith('---\n')).toBe(true);
      expect(content.endsWith('\n\n')).toBe(false);

      // REQ-01 & REQ-03: Multi-line bullets preserved + legacy prose preserved
      expect(content).toContain(
        '### Delivered Capabilities\n\n- AES-256-GCM vault\n  - Hybrid .vault.key resolution\n- Dynamic storage ProgressBar',
      );
      expect(content).toContain('### Delivered Capabilities\n\nSingle-line legacy prose.');

      // REQ-04 refusal path: non-DONE items are omitted
      expect(content).not.toContain('DSM-00127');
      expect(content).not.toContain('Should not be emitted');
    });

    it('omits Delivered Capabilities section when Included block is empty (REQ-01 refusal)', () => {
      const backlogPath = path.join(tempDir, 'BACKLOG.md');
      const historyDest = path.join(tempDir, 'history.md');

      const backlogContent = `
# Backlog

### [DSM-00130] Empty Scope Item
- **Type**: \`Chore\`
- **Priority**: \`Low\`
- **Status**: \`DONE\`
- **High-Level Requirements**:
  Internal cleanup.
- **Scope Boundaries**:
  - **Included**:   
  - **Excluded / Deferred**: None.
`;
      fs.writeFileSync(backlogPath, backlogContent, 'utf-8');
      generateReleaseHistory(backlogPath, historyDest);

      const content = fs.readFileSync(historyDest, 'utf-8');
      expect(content).toContain('## [DSM-00130] Empty Scope Item');
      expect(content).toContain('### Summary\n\nInternal cleanup.');
      expect(content).not.toContain('### Delivered Capabilities');
      expect(content.endsWith('---\n')).toBe(true);
    });

    it('emits header and intro ending with single newline and no dangling separator when zero DONE items exist (REQ-02 refusal)', () => {
      const backlogPath = path.join(tempDir, 'BACKLOG.md');
      const historyDest = path.join(tempDir, 'history.md');

      const backlogContent = `
# Backlog

### [DSM-00200] Upcoming Feature
- **Status**: \`BACKLOG\`
- **High-Level Requirements**: Future work.
`;
      fs.writeFileSync(backlogPath, backlogContent, 'utf-8');
      generateReleaseHistory(backlogPath, historyDest);

      const content = fs.readFileSync(historyDest, 'utf-8');
      expect(content).toContain('# Release History & Changelog');
      expect(content).toContain('This document records all completed product backlog items');
      expect(content).not.toContain('---');
      expect(content.endsWith('\n')).toBe(true);
      expect(content.endsWith('\n\n')).toBe(false);
    });
  });

  describe('runSync (Full Pipeline Execution)', () => {
    it('happy path: generates root history.md and copies both faq.md and history.md into public assets', () => {
      const faqPath = path.join(tempDir, 'faq.md');
      const backlogDir = path.join(tempDir, '.agents');
      const backlogPath = path.join(backlogDir, 'BACKLOG.md');

      fs.mkdirSync(backlogDir, { recursive: true });
      fs.writeFileSync(
        faqPath,
        '# DayZ Operator FAQ\n\n## Network Ports\nUDP 2302 Game Port\n',
        'utf-8',
      );
      fs.writeFileSync(
        backlogPath,
        `# Project Backlog\n\n### [DSM-00101] First PBI\n- **Status**: \`DONE\`\n- **Type**: \`Core\`\n- **Priority**: \`High\`\n- **High-Level Requirements**: Scaffolding\n`,
        'utf-8',
      );

      runSync({ workspaceRoot: tempDir });

      const rootHistory = path.join(tempDir, 'history.md');
      const assetFaq = path.join(tempDir, 'apps/web/public/assets/content/faq.md');
      const assetHistory = path.join(tempDir, 'apps/web/public/assets/content/history.md');

      expect(fs.existsSync(rootHistory)).toBe(true);
      expect(fs.existsSync(assetFaq)).toBe(true);
      expect(fs.existsSync(assetHistory)).toBe(true);

      expect(fs.readFileSync(assetFaq, 'utf-8')).toBe(fs.readFileSync(faqPath, 'utf-8'));
      expect(fs.readFileSync(assetHistory, 'utf-8')).toBe(fs.readFileSync(rootHistory, 'utf-8'));
      expect(fs.readFileSync(assetHistory, 'utf-8')).toContain('## [DSM-00101] First PBI');
    });

    it('GUARD-01 refusal: terminates with exit code 1 and mutates zero destination files on missing source', () => {
      const exitSpy = vi
        .spyOn(process, 'exit')
        .mockImplementation((code?: string | number | null | undefined) => {
          throw new Error(`process.exit called with ${code}`);
        });
      const errorLogSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Temp dir has no faq.md or .agents/BACKLOG.md
      const targetDir = path.join(tempDir, 'apps/web/public/assets/content');
      const rootHistory = path.join(tempDir, 'history.md');

      expect(() => runSync({ workspaceRoot: tempDir })).toThrow('process.exit called with 1');
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(errorLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[GUARD-01] Precondition Check Failed'),
      );

      // Mutation guarantee: zero destination files were created or modified
      expect(fs.existsSync(targetDir)).toBe(false);
      expect(fs.existsSync(rootHistory)).toBe(false);
    });

    it('CI mode: uses pre-existing root history.md when .agents/BACKLOG.md is missing', () => {
      const faqPath = path.join(tempDir, 'faq.md');
      const rootHistory = path.join(tempDir, 'history.md');

      fs.writeFileSync(faqPath, '# FAQ\n', 'utf-8');
      fs.writeFileSync(rootHistory, '# Committed History\n\n## [DSM-00100] Setup\n', 'utf-8');

      runSync({ workspaceRoot: tempDir });

      const assetFaq = path.join(tempDir, 'apps/web/public/assets/content/faq.md');
      const assetHistory = path.join(tempDir, 'apps/web/public/assets/content/history.md');

      expect(fs.existsSync(assetFaq)).toBe(true);
      expect(fs.existsSync(assetHistory)).toBe(true);
      expect(fs.readFileSync(assetHistory, 'utf-8')).toBe(
        '# Committed History\n\n## [DSM-00100] Setup\n',
      );
    });

    it('idempotency: consecutive runSync executions produce byte-identical output with multi-line scopes (ARCH-01, REQ-02)', () => {
      const faqPath = path.join(tempDir, 'faq.md');
      const backlogDir = path.join(tempDir, '.agents');
      const backlogPath = path.join(backlogDir, 'BACKLOG.md');

      fs.mkdirSync(backlogDir, { recursive: true });
      fs.writeFileSync(faqPath, '# FAQ\n', 'utf-8');
      fs.writeFileSync(
        backlogPath,
        `# Backlog\n\n### [DSM-00126] Multi-Line Sync\n- **Status**: \`DONE\`\n- **Type**: \`Feature\`\n- **Priority**: \`High\`\n- **High-Level Requirements**: Sync multi-line scopes.\n- **Scope Boundaries**:\n  - **Included**:\n    - Capability one\n    - Capability two\n  - **Excluded / Deferred**: None.\n`,
        'utf-8',
      );

      runSync({ workspaceRoot: tempDir });
      const firstRoot = fs.readFileSync(path.join(tempDir, 'history.md'), 'utf-8');
      const firstAsset = fs.readFileSync(
        path.join(tempDir, 'apps/web/public/assets/content/history.md'),
        'utf-8',
      );

      runSync({ workspaceRoot: tempDir });
      const secondRoot = fs.readFileSync(path.join(tempDir, 'history.md'), 'utf-8');
      const secondAsset = fs.readFileSync(
        path.join(tempDir, 'apps/web/public/assets/content/history.md'),
        'utf-8',
      );

      expect(secondRoot).toBe(firstRoot);
      expect(secondAsset).toBe(firstAsset);
      expect(firstRoot).toContain(
        '### Delivered Capabilities\n\n- Capability one\n- Capability two',
      );
      expect(firstRoot.endsWith('---\n')).toBe(true);
      expect(firstRoot.endsWith('\n\n')).toBe(false);
    });
  });
});
