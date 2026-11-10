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

export function verifySourcesExist(
  faqPath: string,
  backlogPath: string,
  fallbackHistoryPath?: string,
): void {
  // GUARD-01: Content Source Integrity Guard
  // Verify that faq.md exists and is readable ahead of any filesystem mutation
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

  // Check if .agents/BACKLOG.md exists and is readable
  const hasBacklog = fs.existsSync(backlogPath);
  if (hasBacklog) {
    try {
      fs.accessSync(backlogPath, fs.constants.R_OK);
    } catch (err) {
      throw new PreconditionFailedError(
        `Source Backlog file is not readable at: ${backlogPath} (${(err as Error).message})`,
      );
    }
    return;
  }

  // If BACKLOG.md is not present (e.g. CI environments where .agents/ is git-excluded),
  // fallback to the committed root history.md
  if (!fallbackHistoryPath || !fs.existsSync(fallbackHistoryPath)) {
    throw new PreconditionFailedError(
      `Neither source Backlog file (${backlogPath}) nor fallback history file (${fallbackHistoryPath ?? 'undefined'}) exists`,
    );
  }
  try {
    fs.accessSync(fallbackHistoryPath, fs.constants.R_OK);
  } catch (err) {
    throw new PreconditionFailedError(
      `Fallback history file is not readable at: ${fallbackHistoryPath} (${(err as Error).message})`,
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

function extractContinuationLines(
  lines: string[],
  startIndex: number,
  fieldIndent: number,
): string[] {
  const collected: string[] = [];
  for (let i = startIndex; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() === '') {
      collected.push('');
      continue;
    }
    const indent = line.search(/\S/);
    if (
      indent <= fieldIndent ||
      /^\s*(?:---+|#{1,6}\s|-\s+\*\*(?:Included|Excluded \/ Deferred)\*\*:)/.test(line)
    ) {
      break;
    }
    collected.push(line);
  }
  while (collected.length > 0 && collected[0] === '') {
    collected.shift();
  }
  while (collected.length > 0 && collected[collected.length - 1] === '') {
    collected.pop();
  }
  return collected;
}

function dedentBlockLines(lines: string[]): string {
  const nonEmptyIndents = lines.filter(line => line !== '').map(line => line.search(/\S/));
  const minIndent = nonEmptyIndents.length > 0 ? Math.min(...nonEmptyIndents) : 0;
  return lines.map(line => (line === '' ? '' : line.slice(minIndent))).join('\n');
}

function parseScopeField(body: string, fieldLabel: string): string | undefined {
  const lines = body.split(/\r?\n/);
  const escapedLabel = fieldLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const fieldPattern = new RegExp(`^(\\s*)-\\s+\\*\\*${escapedLabel}\\*\\*:\\s*(.*)$`);

  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(fieldPattern);
    if (!match) {
      continue;
    }
    const fieldIndent = match[1].length;
    const inlineContent = match[2].trim();
    const continuationLines = extractContinuationLines(lines, i + 1, fieldIndent);

    if (continuationLines.length === 0) {
      return inlineContent || undefined;
    }

    const block = dedentBlockLines(continuationLines);
    return inlineContent ? `${inlineContent}\n${block}` : block;
  }

  return undefined;
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

  return {
    id,
    title,
    type: cleanField(typeMatch?.[1]) || 'Story',
    priority: cleanField(priorityMatch?.[1]) || 'Normal',
    status,
    dependsOn: cleanField(dependsOnMatch?.[1]) || undefined,
    requirements: parseRequirements(body),
    scopeIncluded: parseScopeField(body, 'Included'),
    scopeExcluded: parseScopeField(body, 'Excluded / Deferred'),
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

  if (doneItems.length > 0) {
    md += '---\n\n';
  }

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

  const normalizedMd = `${md.replace(/\r\n/g, '\n').trimEnd()}\n`;
  fs.writeFileSync(destination, normalizedMd, 'utf-8');
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
    verifySourcesExist(faqPath, backlogPath, rootHistoryPath);
  } catch (err) {
    console.error(`[GUARD-01] Precondition Check Failed: ${(err as Error).message}`);
    process.exit(1);
  }

  // If source backlog exists, regenerate root history.md; otherwise use existing committed history.md
  if (fs.existsSync(backlogPath)) {
    generateReleaseHistory(backlogPath, rootHistoryPath);
  }

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
