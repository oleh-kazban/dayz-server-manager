/**
 * Normalizes LCOV coverage files across all monorepo projects for SonarQube Cloud.
 *
 * Vitest projects with root set to the project directory generate LCOV records with
 * relative paths like `SF:src/file.ts`. This script prefixes them with the project's
 * workspace relative path (e.g. `SF:apps/server/src/file.ts`) so SonarQube resolves them
 * from the monorepo root.
 */
const fs = require('fs');
const path = require('path');

function normalizeLcov(coverageDir) {
  if (!fs.existsSync(coverageDir)) {
    console.warn(`Coverage directory not found: ${coverageDir}`);
    return;
  }

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name === 'lcov.info') {
        processLcov(fullPath);
      }
    }
  }

  function processLcov(filePath) {
    const projectDir = path.relative(coverageDir, path.dirname(filePath)).replace(/\\/g, '/');
    let content = fs.readFileSync(filePath, 'utf8');

    // Convert Windows backslashes to POSIX slashes
    content = content.replace(/\\/g, '/');

    // Replace SF:src/ with SF:<projectDir>/src/
    content = content.replace(/^SF:src\//gm, `SF:${projectDir}/src/`);

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Normalized ${filePath} -> project prefix '${projectDir}'`);
  }

  walk(coverageDir);
}

const targetDir = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(process.cwd(), 'coverage');
normalizeLcov(targetDir);
