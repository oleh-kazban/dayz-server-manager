# Identity and First-Run Setup: Requirements

|              |                                                                                                                                              |
| :----------- | :------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**   | Approved by the product owner. Slice 3a (server and library) is implemented                                                                  |
| **Audience** | Maintainers and AI agents                                                                                                                    |
| **Covers**   | Start-up defaults (first item of roadmap package R1), roadmap package R7, `TD-01`, `TD-07`, `TD-LIB-005`                                     |
| **Related**  | [Vision and scope](vision-and-scope.md#4-users), [Fix roadmap](../engineering/fix-roadmap.md), [Persistence](../architecture/persistence.md) |

## 1. Goal

A person downloads Aegis, starts it on a server and opens it by IP address or domain name. From the first start, the installation must be safe:

- It contains no built-in secret and no built-in account.
- The first operator, **root**, is created by the person who controls the host.
- An upgrade of an older installation reaches the same state.

The roadmap listed this as two packages (R1 and R7). They are one problem, so they are delivered as one package in slices (section 8).

## 2. Decisions

| #   | Decision                                                                                                                                                                                               |
| :-- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | The session secret is generated per installation and stored in a key file. An environment variable can override it. A corrupt key file stops the start with a clear error                              |
| D2  | No account or password is built into the code, and none can be preset by configuration. On first start, Aegis generates a random **setup account** (username and password)                             |
| D3  | The setup pair is written to a file with owner-only permissions in the data directory. The console prints the path, never the content. The log never contains the pair                                 |
| D4  | The operator signs in with the setup pair and creates root. Then Aegis deletes the setup account and the file. There is no unauthenticated "claim this server" endpoint                                |
| D5  | An upgraded installation is treated the same way: the old seeded account, if it still has its default password, is locked and later deleted                                                            |
| D6  | `HOST` keeps the default `0.0.0.0`, because operators reach Aegis over the network                                                                                                                     |
| D7  | HTTPS is the operator's job (for example a reverse proxy). Aegis does not manage certificates. It logs a warning when it listens on a non-loopback address, and the docs describe the production setup |
| D8  | The setup account is valid for 60 minutes, enough for an installation or an update. A restart creates a new one                                                                                        |

## 3. What the code does today

- The user role has one value, `admin`. There is no root. The role check exists five times and cannot fail (`TD-01`).
- `initDatabase` reads the environment and creates a built-in `admin` account when the table is empty (`TD-07`, `TD-LIB-005`).
- The session secret has a built-in default value, and the strength check runs only when `NODE_ENV` is `production`.
- `HOST` defaults to `0.0.0.0`.
- `users.username` is unique. `users.email` is not unique. There is no flag to disable an account.

## 4. Requirements

Each requirement is written to be testable. The numbering is stable and is used by the tests.

### 4.1 Session secret

- **R-SEC-1.** If `SESSION_SECRET` is set, it must be at least 32 characters and must not be the former built-in value. This applies in every environment. Otherwise the start fails with an error that names the variable.
- **R-SEC-2.** If `SESSION_SECRET` is not set, Aegis reads `.session.key` from the data directory (the directory that holds `.vault.key`).
- **R-SEC-3.** If the file does not exist, Aegis creates it with 32 random bytes from a cryptographic source, with owner-only permissions where the platform supports them, and writes it atomically.
- **R-SEC-4.** If the file exists but is unreadable, empty or too short, the start fails with a clear error that names the file and tells the operator what to do. Aegis never silently replaces an existing key.
- **R-SEC-5.** The built-in secret is no longer used as a default. The former value stays in the code only as a deny-list entry that is rejected, and it is removed from the examples and docs.
- **R-SEC-6.** The secret is never logged.

### 4.2 Network exposure

- **R-NET-1.** `HOST` keeps its default of `0.0.0.0`.
- **R-NET-2.** When the daemon listens on a non-loopback address, it logs one warning at start that production use needs HTTPS in front of Aegis. It does not refuse to start.
- **R-NET-3.** `getting-started.md` and the operator FAQ describe the production setup in plain steps.

### 4.3 Roles

- **R-ROLE-1.** The user role has the values `root`, `admin` and `setup`. Exactly one `root` exists after setup. Root cannot be deleted or demoted.
- **R-ROLE-2.** Two shared guards exist on the server: `requireAdmin` (allows `root` and `admin`, rejects `setup`) and `requireRoot` (allows only `root`). The five duplicated helpers and the inline check are replaced by the one `requireAdmin` (`TD-01`). `AUTH_FORBIDDEN_ADMIN_REQUIRED` is emitted by it (`TD-10`), and `AUTH_FORBIDDEN_ROOT_REQUIRED` is new. `TD-01` names only `requireRoot`. It needs this clarification, because every admin-guarded route may be used by both roles. `authenticate` denies `setup`, missing and unknown roles on every route except an explicit allowlist (initially `GET /api/v1/auth/me`).
- **R-ROLE-3.** Every admin-guarded route uses `requireAdmin` and keeps working for `root` and `admin`. Operator management endpoints are out of scope here (section 7), so `requireRoot` is covered by its own tests until the operators page uses it.
- **R-ROLE-4.** The role set is defined once in `libs/api-contracts`, and the database column, the server and the web app all use it.

### 4.4 Setup account

- **R-SETUP-1.** After start-up migrations, if no `root` exists, Aegis ensures that exactly one valid setup account exists. If none exists, or the existing one has expired, it creates a new one and replaces the file.
- **R-SETUP-2.** The setup account has a random username and a random password of at least 24 characters from a cryptographic source. The password is stored only as a hash. The only copy in clear text is the file.
- **R-SETUP-3.** The file is written atomically with owner-only permissions where the platform supports them. The docs say that Windows permissions are weaker, as for `.vault.key` today.
- **R-SETUP-4.** The console prints the path of the file once at start. The pair never appears in the console, the log, an API response or an error.
- **R-SETUP-5.** The setup account has the role `setup`. It can reach only the setup endpoints and its own sign-out. Every other endpoint, including every route behind `requireRoot` and the admin routes, rejects it.
- **R-SETUP-6.** The setup account expires 60 minutes after it is created (D8). A restart after expiry creates a new one (R-SETUP-1).
- **R-SETUP-7.** The setup account cannot change its own password or profile.
- **R-SETUP-8.** The built-in `admin` password and the `DSM_ADMIN_PASSWORD` variable are removed. No password can be preset by configuration.
- **R-SETUP-9.** A setup session ends when the setup account expires. It cannot be refreshed past that time, and the setup account never gets a longer "remember me" lifetime.

### 4.5 Creating root

- **R-ROOT-1.** A setup-account session that signs in is taken to the setup screen described in section 4.9. The screen asks for a username, a password and a password confirmation.
- **R-ROOT-2.** The server endpoint follows the contract-first rule: a Zod schema in `libs/api-contracts`, then `libs/api-client`, then the route.
- **R-ROOT-3.** On success, in one database transaction: root is created, the setup account is deleted with its sessions, and any locked seeded account (section 4.6) is deleted with its sessions.
- **R-ROOT-4.** After the transaction, Aegis deletes the setup file. The response signs the new root in, so the operator does not sign in twice.
- **R-ROOT-5.** The endpoint works only when no root exists and only for a setup-account session. A second call fails and changes nothing.
- **R-ROOT-6.** The password rule is the one rule used everywhere (`TD-09`). The username must be unique, 3 to 32 characters long, and use only letters, digits, `.`, `_` and `-`. The rule is defined once in `libs/api-contracts` and the later operators page reuses it.
- **R-ROOT-7.** If the transaction fails, nothing changes: the setup account and the file stay valid.

### 4.6 Upgrade of an existing installation

- **R-UPG-1.** The seeded account is recognized by username `admin` and email `admin@dsm.local` together.
- **R-UPG-2.** At start, if the seeded account's password still verifies against the former default password, Aegis locks the account. Locking replaces its password hash with an unusable value, so it cannot sign in. This check runs once per start and never prints the password.
- **R-UPG-3.** If the seeded account's password was changed, it is a real account. It is kept, and it stays an `admin`.
- **R-UPG-4.** Existing accounts are never promoted to root automatically. An installation with no root enters the setup state (R-SETUP-1), and the other admins keep working while it waits.
- **R-UPG-5.** Sessions signed with the former secret stop working after the upgrade, because the secret changes. Everyone signs in again. The upgrade note says so.
- **R-UPG-6.** Deleting a user removes its sessions and its config edit locks (cascade). Config revisions it authored are kept and lose their author (`set null`). The seeded account is deleted only when root is created, so a revision history keeps its content and loses only the name. These rules are in `libs/database/src/lib/schema.ts` (`sessions`, `config_edit_locks`, `server_config_revisions`).

### 4.7 The database library

- **R-LIB-1.** `initDatabase` no longer reads `process.env` and no longer creates any account. The seed is removed (`TD-LIB-005`).
- **R-LIB-2.** Account bootstrapping lives in the server, in a service that the start-up calls. It uses the validated configuration.
- **R-LIB-3.** Tests that need a signed-in user create one through a shared test helper. No production code path creates a known password.

### 4.8 Documentation and register

- **R-DOC-1.** Update in the same change: [vision and scope](vision-and-scope.md#4-users), [getting started](../engineering/getting-started.md), [backend](../architecture/backend.md), [persistence](../architecture/persistence.md), the `README.md` mention of the seeded account, and `.env.example`.
- **R-DOC-2.** Update the [tech debt register](../tech-debt.md): `TD-01`, `TD-07`, `TD-10` (the part about the role error code) and `TD-LIB-005` get their status.
- **R-DOC-3.** Public documents describe the new behavior only. They do not describe how the earlier behavior could be misused.

### 4.9 Setup screen (UI/UX)

The design follows the existing sign-in screen and its components. It was written with the `ui-ux-design` method of the delivery plugin.

**Flow.** The operator opens Aegis and sees the sign-in page. They sign in with the setup pair from the file. The web app sees the role `setup` and opens `/setup`. After success, root is signed in and lands on `/dashboard`.

- A setup session that opens any other route is redirected to `/setup`.
- A non-setup session that opens `/setup` is redirected to `/dashboard`. A signed-out visitor is redirected to the sign-in page.
- The sign-in page footer ("Trouble signing in?") gains one static line: on a first start, sign in with the setup credentials from the file named in the server console. It needs no new public endpoint and reveals nothing about the installation.

**Layout.** One card in the same shell as the sign-in page (`apps/web/src/features/auth/SignIn.tsx`), with the same hero panel on wide screens (`SignInHero`). There is no sidebar and no navigation, because a setup session can reach nothing else. From top to bottom:

1. Eyebrow `FIRST-TIME SETUP` and heading `Create the root account` (an `h2`; the page shell owns the `h1`).
2. One sentence: `This account owns this Aegis installation. You can add other administrators later.`
3. A `Notice` (info): `You are signed in with a temporary setup account. It is deleted when you finish.`
4. Fields: `Username`, `Password`, `Confirm password`, with the password rule shown as a hint under the password field.
5. Primary button `Create root account`, full width.
6. A quiet `Sign out` button.
7. A footer line: `Setup session expired? Restart Aegis. It creates new setup credentials and prints where it saved them.`

**Reused components.**

| Element                   | Component                                                          |
| :------------------------ | :----------------------------------------------------------------- |
| Fields                    | `Input` and `PasswordInput` from `@aegis/ui` (`libs/ui/src/input`) |
| Buttons                   | `Button` (`libs/ui/src/button`)                                    |
| Notice                    | `Notice` (`libs/ui/src/notice`)                                    |
| Toasts and error messages | `notifyApiError`, `resolveApiErrorMessage` from `@aegis/web/core`  |
| Shell, hero, form pattern | `SignIn.tsx`, `SignInHero`, `SignInForm`                           |

No new shared component is needed. The new feature component is `SetupForm` next to `SignInForm`. `SetupForm` is a create form, so it uses `useEditableForm` with `baseline: null`, like `CreateServerModal`. `PasswordRotationCard` is the model for the password and confirmation fields. After a successful submit the form releases the unsaved-changes guard before it navigates to `/dashboard`. `SignInForm` is not a create or update form and does not use `useEditableForm`.

**States.**

| State                  | Behavior                                                                                                                                                                                                           |
| :--------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Default                | Empty form, focus on `Username`                                                                                                                                                                                    |
| Submitting             | The button shows its spinner, all fields are disabled, a second submit is ignored                                                                                                                                  |
| Field error            | Inline message under the field, focus moves to the first invalid field. Examples: `Username is required`, `This username is already taken`, `Passwords do not match`, and the messages of the shared password rule |
| Server error           | Red toast through `notifyApiError`, plus the inline alert as in the sign-in form                                                                                                                                   |
| Success                | Green toast `Root account created. You are signed in as root.`, then `/dashboard`                                                                                                                                  |
| Setup session expired  | Red toast `The setup session expired. Restart Aegis to create new setup credentials.`, the session is cleared, the sign-in page opens                                                                              |
| Setup already complete | Red toast `Setup is already complete.`, the sign-in page opens                                                                                                                                                     |
| Network error          | Red toast with the existing network message                                                                                                                                                                        |

**Accessibility.** Every control is reachable and operable with the keyboard in the visual order. Enter submits. Labels and errors use the linkage the shared inputs already provide. The error alert has `role="alert"`. Password fields use `autocomplete="new-password"` and the username uses `autocomplete="username"`, so a password manager can save the new root login. Text uses the existing tokens, so contrast follows the design system. Controls are 36 px high.

**Responsive.** Same behavior as the sign-in page at 360, 768 and 1280 px. Nothing scrolls horizontally.

**Browser title.** `Create root account - Aegis`.

**UX items.**

| id    | Rule                                                                                                                          | Requirement          |
| :---- | :---------------------------------------------------------------------------------------------------------------------------- | :------------------- |
| UX-1  | After signing in with the setup pair, the browser is on `/setup`, and every other route redirects there                       | R-SETUP-5, R-ROOT-1  |
| UX-2  | The page has one `h2`, the Notice about the temporary account, three labelled fields and one primary button                   | R-ROOT-1             |
| UX-3  | Submitting with an invalid or empty field shows an inline message under that field and moves focus to the first invalid field | R-ROOT-1, R-ROOT-6   |
| UX-4  | While the request runs, the button shows a spinner and the fields are disabled                                                | R-ROOT-1             |
| UX-5  | A taken username shows `This username is already taken` under the username field and a red toast                              | R-ROOT-6             |
| UX-6  | Success shows a green toast and opens `/dashboard` signed in as root. The setup file and account no longer exist              | R-ROOT-3, R-ROOT-4   |
| UX-7  | An expired setup session shows the red toast, clears the session and opens the sign-in page                                   | R-SETUP-6, R-SETUP-9 |
| UX-8  | A second visit to `/setup` after success redirects away, and the endpoint changes nothing                                     | R-ROOT-5             |
| UX-9  | Every control can be used with the keyboard alone, and the focus ring is visible                                              | R-ROOT-1             |
| UX-10 | The screen has no horizontal scroll at 360, 768 and 1280 px in both themes                                                    | R-ROOT-1             |
| UX-11 | The sign-in footer names the setup file for a first start, and the page makes no extra request to say so                      | R-SETUP-4            |

**Username rule.** It did not exist before, because accounts were created only by the seed. It is set in R-ROOT-6.

## 5. Data model and API (proposed)

These are proposals for approval. They are not decisions.

- `users.role` becomes `root | admin | setup`. The column has no SQL constraint, so the change is in the shared contract and the schema type. Existing rows stay `admin`.
- No new column is needed for the setup state. The role `setup` marks the account, and its `createdAt` plus the lifetime gives the expiry.
- A new route group `/setup` with one `POST /setup/root` that creates root (R-ROOT-2 to R-ROOT-5). Its contract returns the same sign-in response as `/auth/login`.
- Migrations run through the existing declarative migration mechanism.

## 6. Verification

Following the [testing](../engineering/testing.md) strategy:

- **Unit tests first, one group per requirement id.** They cover each success and each failure path, including a corrupt key file, an expired setup account, a second root call, a failed transaction, and every route rejecting the `setup` role.
- **Coverage:** 80% overall and 100% of changed lines.
- **Manual test with Playwright** of the setup flow on a fresh database and on a copy of an upgraded one, in both themes.
- **Reviews:** the code reviewer and the security engineer, with every finding resolved.
- **Evidence for the product owner:** the red test run before each slice, the green run after, and the file permissions of the key file and the setup file on the test host.

## 7. Out of scope

- The operators page (create, disable and delete admins, reset passwords, revoke sessions). It is a separate feature.
- The host command that resets the root password. It belongs to the appliance epic `DSM-00144`. Until then, recovery from a lost root password means editing the database by hand, as the vision document already says.
- TLS. Aegis does not terminate TLS or manage certificates.
- The other sign-in and session findings of roadmap package R1. They are delivered as a separate "auth hardening" package after this one.
- A per-account disabled flag. Locking an account uses an unusable password hash, which is enough for this package.

## 8. Delivery slices

One branch. Each slice is committed on its own, builds, passes its tests, and is approved before the next one starts.

| Slice | Content                                                                                                 | Requirements                         |
| :---- | :------------------------------------------------------------------------------------------------------ | :----------------------------------- |
| 1     | Session secret, key file, `HOST` warning, docs for production setup                                     | R-SEC-1 to 6, R-NET-1 to 3           |
| 2     | Role model: `root`, `admin`, `setup`, one `requireRoot`, the contract and the migration                 | R-ROLE-1 to 4                        |
| 3     | Setup account, file, `/setup/root`, setup screen, upgrade handling, seed removed from the library, docs | R-SETUP, R-ROOT, R-UPG, R-LIB, R-DOC |

Slice 1 is safe to ship alone. Slice 3 depends on slice 2.

## 9. Checks during implementation

- The way to restrict file permissions on Windows, and what the docs say about it (R-SETUP-3).
- The data directory is being unified in package R4. Until then the key and setup files live next to `.vault.key`.
