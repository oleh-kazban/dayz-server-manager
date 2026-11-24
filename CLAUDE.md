# Aegis (DayZ Server Manager) — agent instructions

Aegis is a self-hosted web console for administering DayZ Dedicated Servers (Nx monorepo: React 19, Fastify, SQLite, TypeScript). This file is the single entry point for AI agents. The details live in [`docs/`](docs/README.md); read the relevant document before you change an area, and do not duplicate it here.

## 1. How we work

- **Roles.** The user is the product owner and reviewer. You are the main agent and the developer: you implement, the user reviews and tests.
- **Do not invent.** If a requirement, a product decision or a fact is missing, ask the user. Offer a recommendation with the trade-offs, not an open question. Mark anything unverified as undecided in the docs.
- **Four pillars.** Every decision is checked against security, consistency, comfort and modern UI/UX. See [vision and scope](docs/product/vision-and-scope.md).
- **Honest reports.** Say exactly what ran and what did not. A skipped step is reported as skipped.
- **Writing.** Plain, direct technical English: short sentences, present tense, concrete facts. Do not mention earlier AI agents or unrelated projects in docs, code or commit messages.

## 2. Delivery flow (the sdlc plugin)

Changes go through the **sdlc** plugin in `D:\Projects\sdlc`. Start a session with it loaded, then run the task:

```text
claude --plugin-dir D:\Projects\sdlc
/sdlc:sdlc <task>          # or /sdlc:sdlc resume
```

The orchestrator is the main conversation. Roles are subagents with restricted tools; only the orchestrator talks to the user.

| Role                  | Agent                  | Does                                                           | Status    |
| :-------------------- | :--------------------- | :------------------------------------------------------------- | :-------- |
| Investigator          | `sdlc:investigation`   | Reproduces a bug, finds the root cause, flags security needs   | Available |
| Feature analyst       | -                      | Turns a request into requirements and acceptance criteria      | Planned   |
| Architect             | -                      | Writes the architecture spec                                   | Planned   |
| UI/UX designer        | -                      | Writes the UI/UX spec                                          | Planned   |
| Developer             | `sdlc:development`     | Implements production code from a brief                        | Available |
| Tests writer          | `sdlc:unit-tests`      | Writes unit tests from the requirements, never production code | Available |
| Code reviewer         | `sdlc:code-review`     | Reviews the diff against the acceptance criteria               | Available |
| Architecture reviewer | -                      | Reviews the diff against the architecture spec                 | Planned   |
| Security engineer     | `sdlc:security-review` | Traces untrusted input to dangerous sinks                      | Available |
| UI/UX reviewer, QA    | -                      | Reviews and tests the running app                              | Planned   |

- **Lanes available:** small change, and bugfix. The feature lane (analysis, architecture and UI/UX specs, one approval gate) is not built yet. For feature work, follow the same order by hand: analysis and requirements, then design, then the lanes' implementation, tests and reviews, and ask the user before large decisions.
- **State:** run state lives in `.agents/runs/`, role reports in `.agents/sdlc/`. Both are ignored by git.
- **Plugin problems** are fixed in the sdlc repository, not worked around here.

## 3. Definition of done

A task is done when all of these hold:

1. It has been **analyzed** and its **requirements** are written down (acceptance criteria).
2. The feature or fix is **implemented**.
3. It has **unit tests**, and the tests pass.
4. It has been **reviewed** by the architect, the code reviewer and the security engineer, and every finding is resolved.
5. It **meets all the requirements**.

Supporting rules, with the commands in [testing](docs/engineering/testing.md):

- Coverage: 80% overall and 100% of changed lines. `pnpm typecheck`, `pnpm lint` and `pnpm format:check` pass. The checks gate is configured in `.agents/checks.json`.
- Changes a user can see or trigger get manual testing with Playwright, in the types and modes the task needs.
- `git status --short` shows no stray files.

## 4. Rules that apply everywhere

The full rules are in [conventions](docs/engineering/conventions.md). The ones you break most easily:

- **Boundaries.** `apps/web`, `libs/ui` and `libs/api-client` never import `better-sqlite3`, `fastify`, `node:child_process` or `node:fs`. `libs/api-contracts` stays pure TypeScript and Zod.
- **Contract-first.** Zod schema in `libs/api-contracts`, then `libs/api-client`, then the Fastify route.
- **User feedback.** Every mutation gives a green toast on success and a red toast on every failure, plus inline `fieldErrors` where a field is at fault. A missing toast is a blocking defect.
- **Forms** use `useEditableForm`. **Controls** are 36 px (`h-9`). **Colors** come from semantic CSS variables only.
- **TypeScript:** no `any`, no non-null `!`, `import type` for types.
- **Safety:** spawn processes with argument arrays, stop DayZ through RCON `#shutdown` first, write game files atomically with a backup, never put credentials in URLs or logs.

## 5. Nx and commands

- Run tasks through Nx and prefix with the package manager: `pnpm nx run <project>:test`, `pnpm nx run-many -t typecheck`. Do not use globally installed CLIs.
- Never guess CLI flags. Check `--help` or the Nx docs.
- Commands, environment variables and the Windows note about the uppercase drive letter are in [getting started](docs/engineering/getting-started.md).

## 6. Git

Rules in [git and releases](docs/engineering/git-and-releases.md). In short:

- Branches: `feature/`, `bugfix/` or `cr/` (change request). Create one before committing; never commit on `master`.
- Commits are granular and use Conventional Commit subjects with the backlog id (`fix(web): … (DSM-00349)`).
- Commits have one author, the user. Never add `Co-Authored-By` or tool attribution lines.
- Commit only after the user has approved the change. Never open pull requests.
- Never commit `.agents/`, `.archive/`, `.env*` (except `.env.example`) or `manager-data/`.
- `history.md` is generated by `pnpm docs:sync` from `docs/product/backlog.md`. Never edit it by hand.

## 7. Documentation

- Update the affected document in the same change as the code.
- A document built from code can copy a drift (web and server disagreeing, or code deviating from a product decision). Check the code against the decision and against the other side, state the decision in the document, and log the deviation in `docs/tech-debt.md`.
- The product backlog is [`docs/product/backlog.md`](docs/product/backlog.md). Ideas that are not decided stay in the private `.agents/incubator.md`, and anything commercial never goes into tracked files.
- `.archive/` holds outdated material for the user to review. Do not read from it as a source of truth, and do not delete it.
