/**
 * Generates an architectural Pull Request summary following .github/copilot-instructions.md.
 *
 * @param {object} params
 * @param {import('@octokit/core').Octokit} params.github
 * @param {object} params.context
 */
module.exports = async function generatePrSummary({ github, context }) {
  const owner = context.repo.owner;
  const repo = context.repo.repo;
  const pull_number = context.payload.pull_request.number;
  const prTitle = context.payload.pull_request.title;
  const currentBody = context.payload.pull_request.body || '';

  // 1. Fetch commits and files
  const commits = await github.paginate(github.rest.pulls.listCommits, {
    owner,
    repo,
    pull_number,
    per_page: 100,
  });

  const files = await github.paginate(github.rest.pulls.listFiles, {
    owner,
    repo,
    pull_number,
    per_page: 100,
  });

  // 2. Analyze modified packages and domains
  const packages = new Map();
  let touchedContracts = false;
  let touchedProcessSafety = false;
  let testFilesCount = 0;

  for (const file of files) {
    const filename = file.filename;
    let pkg = 'Other';

    if (filename.startsWith('libs/ui/')) pkg = 'libs/ui';
    else if (filename.startsWith('apps/web/')) pkg = 'apps/web';
    else if (filename.startsWith('apps/server/')) pkg = 'apps/server';
    else if (filename.startsWith('libs/api-contracts/')) {
      pkg = 'libs/api-contracts';
      touchedContracts = true;
    } else if (filename.startsWith('libs/api-client/')) pkg = 'libs/api-client';
    else if (filename.startsWith('libs/database/')) pkg = 'libs/database';
    else if (filename.startsWith('libs/platform/')) {
      pkg = 'libs/platform';
      touchedProcessSafety = true;
    } else if (filename.startsWith('specs/')) pkg = 'specs';
    else if (filename.startsWith('.agents/')) pkg = '.agents';
    else if (filename.startsWith('.github/')) pkg = '.github';

    if (!packages.has(pkg)) packages.set(pkg, []);
    packages.get(pkg).push(file);

    if (filename.includes('.test.') || filename.includes('.spec.')) {
      testFilesCount++;
    }
  }

  // 3. Optional AI Synthesis if API Key is available
  let generatedSummary = '';
  const commitMessages = commits.map(c => `- ${c.commit.message.split('\n')[0]}`).join('\n');
  const fileList = files
    .map(f => `${f.status}: ${f.filename} (+${f.additions}/-${f.deletions})`)
    .join('\n');

  const prompt = [
    'You are a Principal Software Architect generating a PR summary for DayZ Server Manager based on .github/copilot-instructions.md.',
    `PR Title: ${prTitle}`,
    'Commits:',
    commitMessages,
    'Changed Files:',
    fileList,
    '',
    'Generate a PR summary following strictly this markdown template:',
    '### Architectural Intent & Overview',
    '(1-2 concise paragraphs explaining the rationale and specs)',
    '',
    '### Key Changes by Package',
    '(Grouped by package)',
    '',
    '### Safety, Contracts & Boundary Compliance',
    '(Analyze touched packages: module boundaries, process safety, file integrity, UI kit geometry; note that compliance is subject to CI verification)',
    '',
    '### Testing & Verification',
    '(Report test files added/modified in the diff; note coverage and quality gates as pending CI pipeline execution)',
    '',
    '### Breaking Changes & Migrations',
    '(List breaking changes or "None")',
  ].join('\n');

  if (process.env.GEMINI_API_KEY) {
    try {
      const res = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': process.env.GEMINI_API_KEY,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2 },
          }),
        },
      );

      if (res.ok) {
        const data = await res.json();
        generatedSummary = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
      } else {
        console.warn(`Gemini API returned HTTP ${res.status}; attempting next provider.`);
      }
    } catch (err) {
      console.warn('Gemini API call failed, attempting next provider:', err);
    }
  }

  if (!generatedSummary && process.env.OPENAI_API_KEY) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        generatedSummary = data.choices?.[0]?.message?.content?.trim() || '';
      } else {
        console.warn(
          `OpenAI API returned HTTP ${res.status}; falling back to deterministic template.`,
        );
      }
    } catch (err) {
      console.warn('OpenAI API call failed, falling back to deterministic template:', err);
    }
  }

  // 4. Deterministic Architectural Fallback
  if (!generatedSummary) {
    let packageBreakdown = '';
    for (const [pkg, pkgFiles] of packages.entries()) {
      const sampleFiles = pkgFiles
        .slice(0, 5)
        .map(f => `\`${f.filename.replace(pkg + '/', '')}\``)
        .join(', ');
      const extra = pkgFiles.length > 5 ? ` (+${pkgFiles.length - 5} more)` : '';
      packageBreakdown += `- **\`${pkg}\`** (${pkgFiles.length} file${pkgFiles.length > 1 ? 's' : ''}): ${sampleFiles}${extra}\n`;
    }

    generatedSummary = `### Architectural Intent & Overview
${prTitle}

**Commit Summary:**
${commitMessages}

### Key Changes by Package
${packageBreakdown}
### Safety, Contracts & Boundary Compliance
- **Module Boundaries:** Not verified by this workflow (enforced by Nx boundary rules in CI).
- **Process & Shutdown Safety:** ${touchedProcessSafety ? 'Modified platform/process supervisors. Requires argument array verification in review.' : 'No external process management touched.'}
- **File Integrity & Contracts:** ${touchedContracts ? 'API contracts modified. Requires Zod schema synchronization verification.' : 'Contracts untouched.'}
- **UI Kit Geometry:** ${packages.has('libs/ui') ? 'Requires manual/visual review against canonical 36px standard and design tokens.' : 'UI kit unaffected.'}

### Testing & Verification
- **Automated Tests:** ${testFilesCount > 0 ? `${testFilesCount} test file(s) included in this diff.` : 'None included in this diff.'}
- **Two-Level Coverage:** Not verified by this workflow (pending CI Vitest coverage run).
- **Quality Gates:** Not verified by this workflow (pending CI typecheck, lint, and SonarQube Cloud scan).

### Breaking Changes & Migrations
- None.`;
  }

  // 5. Construct updated PR description preserving template sections and user-authored notes
  const SUMMARY_START = '<!-- dsm-auto-summary:start -->';
  const SUMMARY_END = '<!-- dsm-auto-summary:end -->';
  const wrappedSummary = `${SUMMARY_START}\n${generatedSummary}\n${SUMMARY_END}`;
  const summaryBlockRegex = /<!-- dsm-auto-summary:start -->[\s\S]*?<!-- dsm-auto-summary:end -->/;

  let updatedBody = '';
  const descHeadingRegex = /^##\s+Description\b[^\n]*\n?/m;
  const descMatch = descHeadingRegex.exec(currentBody);

  if (summaryBlockRegex.test(currentBody)) {
    updatedBody = currentBody.replace(summaryBlockRegex, wrappedSummary);
  } else if (descMatch) {
    const beforeDesc = currentBody.slice(0, descMatch.index);
    const rest = currentBody.slice(descMatch.index + descMatch[0].length);
    const nextSectionMatch = /^##\s+/m.exec(rest);

    const existingDescRaw = nextSectionMatch ? rest.slice(0, nextSectionMatch.index) : rest;
    const afterDesc = nextSectionMatch ? rest.slice(nextSectionMatch.index) : '';
    const existingAuthorNotes = existingDescRaw.replace(/<!--[\s\S]*?-->/g, '').trim();

    const combinedDesc = existingAuthorNotes
      ? `${existingAuthorNotes}\n\n${wrappedSummary}`
      : wrappedSummary;

    updatedBody = afterDesc
      ? `${beforeDesc}## Description\n\n${combinedDesc}\n\n${afterDesc}`
      : `${beforeDesc}## Description\n\n${combinedDesc}`;
  } else {
    updatedBody = currentBody.trim()
      ? `## Description\n\n${wrappedSummary}\n\n${currentBody}`
      : `## Description\n\n${wrappedSummary}`;
  }

  // 6. Update the pull request
  await github.rest.pulls.update({
    owner,
    repo,
    pull_number,
    body: updatedBody.trim(),
  });

  console.log(`Successfully generated and updated PR #${pull_number} description.`);
};
