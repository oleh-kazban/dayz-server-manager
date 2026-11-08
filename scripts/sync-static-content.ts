import * as fs from 'node:fs';
import * as path from 'node:path';

export class PreconditionFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PreconditionFailedError';
  }
}

export interface BacklogItem {
  id: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  dependsOn?: string;
  requirements?: string;
  scopeIncluded?: string;
  scopeExcluded?: string;
}

export function verifySourcesExist(faqPath: string, backlogPath: string): void {
  // GUARD-01: Content Source Integrity Guard
  // Verify that faq.md and .agents/BACKLOG.md exist and are readable ahead of any filesystem mutation
  if (!fs.existsSync(faqPath)) {
    throw new PreconditionFailedError(`Source FAQ file does not exist at: ${faqPath}`);
  }
  try {
    fs.accessSync(faqPath, fs.constants.R_OK);
  } catch (err) {
    throw new PreconditionFailedError(
      `Source FAQ file is not readable at: ${faqPath} (${(err as Error).message})`,
    );
  }

  if (!fs.existsSync(backlogPath)) {
    throw new PreconditionFailedError(`Source Backlog file does not exist at: ${backlogPath}`);
  }
  try {
    fs.accessSync(backlogPath, fs.constants.R_OK);
  } catch (err) {
    throw new PreconditionFailedError(
      `Source Backlog file is not readable at: ${backlogPath} (${(err as Error).message})`,
    );
  }
}

function parseRequirements(body: string): string | undefined {
  const reqMarker = '- **High-Level Requirements**:';
  const reqIndex = body.indexOf(reqMarker);
  if (reqIndex === -1) {
    return undefined;
  }
  const afterReq = body.slice(reqIndex + reqMarker.length);
  const scopeIndex = afterReq.indexOf('- **Scope Boundaries**:');
  const rawReq = scopeIndex !== -1 ? afterReq.slice(0, scopeIndex) : afterReq;
  return rawReq.trim().replace(/\r?\n\s*/g, ' ');
}

function parseBacklogSection(section: string): BacklogItem | null {
  const headerEnd = section.indexOf(']');
  if (headerEnd === -1) {
    return null;
  }
  const id = section.slice(0, headerEnd).trim();
  if (!/^DSM-\d+$/.test(id)) {
    return null;
  }

  const firstLineEnd = section.indexOf('\n');
  const title = (
    firstLineEnd !== -1 ? section.slice(headerEnd + 1, firstLineEnd) : section.slice(headerEnd + 1)
  ).trim();
  const body = firstLineEnd !== -1 ? section.slice(firstLineEnd + 1) : '';

  const cleanField = (raw?: string) => raw?.replace(/`/g, '').trim() ?? '';
  const statusMatch = body.match(/-\s+\*\*Status\*\*:\s*([^\r\n]+)/);
  const status = cleanField(statusMatch?.[1]);
  if (status !== 'DONE') {
    return null;
  }

  const priorityMatch = body.match(/-\s+\*\*Priority\*\*:\s*([^\r\n]+)/);
  const typeMatch = body.match(/-\s+\*\*Type\*\*:\s*([^\r\n]+)/);
  const dependsOnMatch = body.match(/-\s+\*\*Depends On\*\*:\s*([^\r\n]+)/);
  const incMatch = body.match(/-\s+\*\*Included\*\*:\s*([^\r\n]+)/);
  const excMatch = body.match(/-\s+\*\*Excluded \/ Deferred\*\*:\s*([^\r\n]+)/);

  return {
    id,
    title,
    type: cleanField(typeMatch?.[1]) || 'Story',
    priority: cleanField(priorityMatch?.[1]) || 'Normal',
    status,
    dependsOn: cleanField(dependsOnMatch?.[1]) || undefined,
    requirements: parseRequirements(body),
    scopeIncluded: incMatch ? incMatch[1].trim() : undefined,
    scopeExcluded: excMatch ? excMatch[1].trim() : undefined,
  };
}

export function parseDoneBacklogItems(backlogMarkdown: string): BacklogItem[] {
  const items: BacklogItem[] = [];
  const sections = backlogMarkdown.split(/\r?\n###\s+\[/);

  for (let i = 1; i < sections.length; i += 1) {
    const item = parseBacklogSection(sections[i]);
    if (item) {
      items.push(item);
    }
  }

  // Sort reverse-chronologically by PBI ID (highest first)
  items.sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }));
  return items;
}

export function copyFile(source: string, destination: string): void {
  const content = fs.readFileSync(source, 'utf-8');
  fs.writeFileSync(destination, content, 'utf-8');
}

export function syncFaq(source: string, destination: string): void {
  copyFile(source, destination);
}

export function generateReleaseHistory(backlogSource: string, destination: string): void {
  const content = fs.readFileSync(backlogSource, 'utf-8');
  const doneItems = parseDoneBacklogItems(content);

  let md = '# Release History & Changelog\n\n';
  md +=
    'This document records all completed product backlog items and operational features deployed to the DayZ Server Manager (DSM) platform.\n\n';
  md += '---\n\n';

  for (const item of doneItems) {
    md += `## [${item.id}] ${item.title}\n\n`;
    md += `- **Type**: \`${item.type}\`\n`;
    md += `- **Priority**: \`${item.priority}\`\n`;
    md += `- **Status**: \`${item.status}\`\n`;
    if (item.dependsOn) {
      md += `- **Dependencies**: \`${item.dependsOn}\`\n`;
    }
    md += '\n';

    if (item.requirements) {
      md += `### Summary\n\n${item.requirements}\n\n`;
    }

    if (item.scopeIncluded) {
      md += `### Delivered Capabilities\n\n${item.scopeIncluded}\n\n`;
    }

    md += '---\n\n';
  }

  fs.writeFileSync(destination, md, 'utf-8');
}

export function runSync(options?: { workspaceRoot?: string }): void {
  const root = options?.workspaceRoot ?? process.cwd();
  const faqPath = path.resolve(root, 'faq.md');
  const backlogPath = path.resolve(root, '.agents/BACKLOG.md');
  const rootHistoryPath = path.resolve(root, 'history.md');
  const targetDir = path.resolve(root, 'apps/web/public/assets/content');
  const targetFaq = path.resolve(targetDir, 'faq.md');
  const targetHistory = path.resolve(targetDir, 'history.md');

  // Precondition guard GUARD-01: verify before any file system write
  try {
    verifySourcesExist(faqPath, backlogPath);
  } catch (err) {
    console.error(`[GUARD-01] Precondition Check Failed: ${(err as Error).message}`);
    process.exit(1);
  }

  // Generate root history.md from .agents/BACKLOG.md
  generateReleaseHistory(backlogPath, rootHistoryPath);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Copy both root faq.md and root history.md into web content directory
  copyFile(faqPath, targetFaq);
  copyFile(rootHistoryPath, targetHistory);
  console.log(
    `[docs:sync] Synchronized faq.md and history.md (root and web assets in ${targetDir})`,
  );
}

const isDirectExecution =
  Boolean(process.argv[1]) &&
  (process.argv[1].endsWith('sync-static-content.ts') ||
    process.argv[1].endsWith('sync-static-content'));

if (isDirectExecution) {
  runSync();
}
