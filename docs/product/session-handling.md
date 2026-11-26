# Session Handling: Requirements

|              |                                                                                                                                     |
| :----------- | :---------------------------------------------------------------------------------------------------------------------------------- |
| **Status**   | Draft, waiting for approval by the product owner                                                                                    |
| **Audience** | Maintainers and AI agents                                                                                                           |
| **Covers**   | Sign-out, refresh tokens, live event streams and the client address recorded for a session (part of roadmap package R1)             |
| **Related**  | [Identity and first-run setup](identity-and-first-run.md), [Fix roadmap](../engineering/fix-roadmap.md), `TD-SRV-006`, `TD-SRV-007` |

## 1. Goal

A session ends when the operator ends it, and it ends everywhere: in the browser, on the server and on every open event stream. A copied token is of no use after that. The address that Aegis records for a session is the address of the client, not a value the client chose.

## 2. Decisions

| Id  | Decision                                                                                                                                                                                                                                                |
| :-- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | Refresh tokens rotate. Every refresh returns a new refresh token and invalidates the previous one. Reuse of an old refresh token ends the whole session.                                                                                                |
| D2  | The previous refresh token stays valid for a grace window of 60 seconds. Two browser tabs share one stored token and refresh without coordination, so the second tab is not treated as an attack inside this window.                                    |
| D3  | A refresh token without an identifier (`jti`) and an access token without a session id (`sid`) are rejected. The first start of the identity version already ended every earlier session, so no valid token of that kind exists.                        |
| D4  | Sign-out is `POST /api/v1/auth/logout`. It deletes the session of the access token that calls it and answers `204`. It is idempotent: a session that is already gone also gives `204`. A failure never blocks the local sign-out in the browser.        |
| D5  | Each open event stream is tied to the user and session that opened it. Ending a session closes its streams. A periodic check closes the streams of an expired session.                                                                                  |
| D6  | The client address comes from `request.ip` only. The new variable `TRUST_PROXY` decides whether Fastify reads forwarded headers. It is off by default. It accepts `false`, `true`, a hop count, or a comma-separated list of addresses and CIDR ranges. |
| D7  | Expired session rows are deleted at start and whenever a sign-in creates a session (closes `TD-SRV-006`).                                                                                                                                               |
| D8  | The event stream still sends every event to every client. Events are not scoped to a user today, and this package does not change that.                                                                                                                 |

## 3. Requirements

### 3.1 Sign-out

- **R-OUT-1.** `POST /api/v1/auth/logout` requires a valid access token and deletes the session named by its `sid`. The response is `204` with no body.
- **R-OUT-2.** The route is idempotent. A valid access token whose session row is gone gives `204`. An invalid or missing token gives `401`, as on every other route.
- **R-OUT-3.** The web app calls the route before it clears local state. If the call fails (network, `401`), it still clears local state and shows no error. The call is not retried after a token refresh.
- **R-OUT-4.** After sign-out, the access token and the refresh token of that session are rejected, and the session no longer appears in the sessions list.
- **R-OUT-5.** Signing out also closes the event streams of that session (D5).

### 3.2 Refresh tokens

- **R-REF-1.** A session stores the identifier of its current refresh token, the identifier of the previous one, and the time of the last rotation. A migration adds these columns. Existing rows start empty and are never matched, because no valid token for them exists (D3).
- **R-REF-2.** `POST /api/v1/auth/refresh` returns a new access token and a new refresh token. The new refresh token has a fresh identifier and the same expiry as the session.
- **R-REF-3.** A refresh token that matches the current identifier is accepted and rotated.
- **R-REF-4.** A refresh token that matches the previous identifier, within 60 seconds of the rotation, is accepted and rotated again (D2). After the window it counts as reuse.
- **R-REF-5.** Reuse of a refresh token (it matches neither identifier, or it matches the previous one after the window) deletes the session and answers `401` with `AUTH_SESSION_EXPIRED`. The session's event streams close (D5).
- **R-REF-6.** An access token without `sid`, and a refresh token without `jti`, are rejected with `401` on every route that checks them, including `authenticate`, the stream ticket and `/refresh`.
- **R-REF-7.** The web app stores the new refresh token after every refresh, in the storage that holds the current one (`localStorage` or `sessionStorage`).
- **R-REF-8.** A refresh that fails because of a network error does not sign the operator out. A refresh that the server rejects (`401`) does.

### 3.3 Event streams

- **R-SSE-1.** The stream hub stores the user id and the session id of every client.
- **R-SSE-2.** The hub closes the streams of a session when the session is deleted by sign-out, revoke, revoke-others (all sessions except the current one), password change, or refresh-token reuse.
- **R-SSE-3.** At each heartbeat (15 seconds) the hub checks every client's session without updating its last-active time. It closes the streams whose session is missing or expired.
- **R-SSE-4.** The web app treats a closed stream as it does today: it reconnects with a new ticket, and a rejected ticket signs the operator out.

### 3.4 Client address

- **R-IP-1.** The address stored for a session and the key of the sign-in rate limit come from `request.ip`.
- **R-IP-2.** The `X-Forwarded-For` header is never read by Aegis code itself.
- **R-IP-3.** `TRUST_PROXY` is validated at start (D6). An invalid value stops the start with a clear error. When it is unset, forwarded headers are ignored.
- **R-IP-4.** The documentation tells operators who run Aegis behind a reverse proxy to set `TRUST_PROXY` to the number of proxies, or to the proxy's address, and says what happens if it is left off (all clients share the proxy's address).

### 3.5 Session cleanup

- **R-CLN-1.** At start, and whenever a sign-in creates a session, the server deletes session rows whose expiry has passed.

## 4. Acceptance criteria

| Id    | Criterion                                                                                                                                     | Requirements       |
| :---- | :-------------------------------------------------------------------------------------------------------------------------------------------- | :----------------- |
| AC-1  | After `POST /auth/logout`, the same access token and the same refresh token both get `401`, and the session is absent from the sessions list. | R-OUT-1, R-OUT-4   |
| AC-2  | A second `POST /auth/logout` with a token whose session is gone gives `204`. A request with no token gives `401`.                             | R-OUT-2            |
| AC-3  | The web app sign-out calls the route, clears local state, and still clears it when the call fails. It shows no error toast in that case.      | R-OUT-3            |
| AC-4  | A refresh returns a different refresh token, and the new one works.                                                                           | R-REF-2, R-REF-3   |
| AC-5  | The previous refresh token works once more within 60 seconds and fails after that. Its failure deletes the session.                           | R-REF-4, R-REF-5   |
| AC-6  | A refresh token that was never issued for the session deletes the session and answers `401`.                                                  | R-REF-5            |
| AC-7  | Tokens without `sid` or `jti` are rejected on `authenticate`, on the stream ticket route and on `/refresh`.                                   | R-REF-6            |
| AC-8  | The web app stores the rotated refresh token. A network error during refresh keeps the operator signed in.                                    | R-REF-7, R-REF-8   |
| AC-9  | An open stream closes after sign-out, revoke, revoke-others, password change and refresh-token reuse, and when its session expires.           | R-SSE-1 to R-SSE-3 |
| AC-10 | A stream check does not change the session's last-active time.                                                                                | R-SSE-3            |
| AC-11 | A request with `X-Forwarded-For` and no `TRUST_PROXY` records `request.ip`. With `TRUST_PROXY=1` it records the forwarded client address.     | R-IP-1 to R-IP-3   |
| AC-12 | An invalid `TRUST_PROXY` value stops the start with a message that names the variable.                                                        | R-IP-3             |
| AC-13 | Expired session rows are removed at start and at sign-in.                                                                                     | R-CLN-1            |
| AC-14 | No new text mentions a weakness of an earlier version. Docs describe behaviour only.                                                          | all                |

## 5. Out of scope

- Scoping events to a user (D8).
- Sign-in timing, per-account backoff, unique email and the change-password rate limit (package B).
- Security response headers, the JSON parser and the log redaction list (package C).
- A UI that lists why a session ended.

## 6. Documentation to update

[Backend](../architecture/backend.md) (auth routes, token model, event hub), [Persistence](../architecture/persistence.md) (sessions columns), [Getting started](../engineering/getting-started.md) (`TRUST_PROXY`, behind a reverse proxy), `.env.example`, [Tech debt](../tech-debt.md) (`TD-SRV-006`, `TD-SRV-007` resolved), [README](../README.md) (index entry).
