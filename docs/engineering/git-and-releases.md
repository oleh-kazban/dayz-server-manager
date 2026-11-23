# Git and Releases

|              |                                                  |
| :----------- | :----------------------------------------------- |
| **Status**   | Implemented                                      |
| **Verified** | Against commit `49b09cc` and `.github/workflows` |
| **Audience** | Maintainers and AI agents                        |

## 1. Branches

- Work happens on `feature/<kebab-name>`, `bugfix/<kebab-name>` or `cr/<kebab-name>` (`cr` is a change request: a refactor, a documentation change or another change that is neither a feature nor a bug fix).
- The repository ruleset on GitHub must allow all three prefixes.
- Create the branch before committing. Do not commit on `master`.

## 2. Commits

- Conventional Commit subjects with the backlog item id when there is one: `fix(web): keep focus on Cancel (DSM-00349)`.
- Commits are granular: one logical change each, so that every commit builds, passes its tests and can be reviewed or reverted alone. Split a task into several commits instead of one large one.
- The author is the maintainer. Commits carry no `Co-Authored-By` trailer and no tool attribution, whether a human or an AI agent prepared them.
- Commit only after the change is reviewed and approved.
- Never commit `.agents/`, `.archive/`, `.env*` (except `.env.example`) or `manager-data/`.

## 3. Hooks

| Hook         | Runs                                                               |
| :----------- | :----------------------------------------------------------------- |
| `pre-commit` | `lint-staged`: ESLint (zero warnings) and Prettier on staged files |
| `pre-push`   | `pnpm check:cycles`                                                |

Do not skip hooks. Fix the cause when a hook fails.

## 4. Pull requests

The maintainer opens and merges pull requests. The body follows the template in `.github/pull_request_template.md` and these sections, filled with results that were actually run:

1. Architectural intent and overview
2. Key changes by package
3. Safety, contracts and boundary compliance
4. Testing and verification
5. Breaking changes and migrations

## 5. Continuous integration

| Workflow                | Trigger                    | Purpose                                                                                                    |
| :---------------------- | :------------------------- | :--------------------------------------------------------------------------------------------------------- |
| `ci.yaml`               | push, pull request         | Four parallel jobs: format, cycles, lint and typecheck; web and UI tests; server and database tests; build |
| `pr-validation.yaml`    | pull request               | The same four jobs as `ci.yaml`, run on affected projects only (`nx affected`)                             |
| `sonar.yaml`            | push, pull request         | SonarQube Cloud analysis and quality gate (coverage and duplication)                                       |
| `codeql.yaml`           | push, pull request, weekly | CodeQL security analysis                                                                                   |
| `deploy-storybook.yaml` | push to `master`           | Publishes Storybook to GitHub Pages                                                                        |
| `auto-pr-summary.yaml`  | pull request               | Generates a pull request summary                                                                           |

The shared setup lives in `.github/actions/setup-workspace` (Node and pnpm).

## 6. Backlog and release history

- The product backlog is [`docs/product/backlog.md`](../product/backlog.md). Each item has an id (`DSM-00xxx`), type, priority and status.
- `history.md` at the repository root is generated from the items marked `DONE`. Run `pnpm docs:sync`. Never edit `history.md` by hand. Keep unrelated formatting changes out of item commits.
- `pnpm docs:sync` also copies `faq.md` and `history.md` into the web app, where the help modal shows them.

## 7. Dependencies

- All versions are pinned exactly in `package.json` (no `^` or `~`).
- `pnpm-workspace.yaml` overrides a transitive `undici` to a patched version.
- Dependabot opens updates. Check each one against Nx, the type checker and the native `better-sqlite3` build before merging.
- Holds recorded on 2026-11-10 (re-verify before changing):
  - `typescript` stays on 5.9.x. TypeScript 7 removed the JavaScript compiler API that Nx project-graph creation uses and conflicts with the `typescript-eslint` peer range.
  - `better-sqlite3` stays on 12.x. Version 13 prebuilds crashed on the Node version used then.
  - `@types/dompurify` stays on 3.0.5. Later releases are deprecated stubs, because `dompurify` ships its own types.
