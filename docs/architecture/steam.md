# Steam

|              |                                                                                             |
| :----------- | :------------------------------------------------------------------------------------------ |
| **Status**   | Implemented for settings, the SteamCMD session and Workshop lookup. _Planned_ for downloads |
| **Verified** | Against commit `8e0af32` (`apps/server`, `apps/web`, `libs/api-contracts`)                  |
| **Audience** | Maintainers and AI agents                                                                   |

How Aegis uses Steam. Two things are involved: **SteamCMD**, the command-line client that installs and updates DayZ and Workshop content, and the **Steam Web API**, which answers questions about Workshop items. The mod rules that build on this are in the [DayZ domain](dayz-domain.md#5-mods).

## 1. What works and what does not

| Capability                                        | State                                         |
| :------------------------------------------------ | :-------------------------------------------- |
| Steam settings (paths, account mode, credentials) | Built, page `/settings/steam`                 |
| SteamCMD probe (diagnostics)                      | Built                                         |
| Account sign-in with a Steam Guard challenge      | Built                                         |
| Clear the stored session                          | Built                                         |
| Workshop item and collection lookup, text search  | Built (search needs the Web API key)          |
| Install or update the DayZ server with SteamCMD   | _Planned_ (`DSM-00146`, clean-install wizard) |
| Download Workshop mods with progress              | _Planned_ (`DSM-00133`)                       |
| SteamCMD health check and guided install          | _Planned_ (`DSM-00159`)                       |

So SteamCMD is only run to check that it works and to sign in. No code runs `+app_update` or `+workshop_download_item` yet.

## 2. Settings

One row in `steam_settings` (`id = 'default'`), created on first read. The API never returns a secret: it returns `hasPassword`, `hasBranchPassword` and `hasSteamWebApiKey` instead.

| Setting             | Default           | Notes                                                                                  |
| :------------------ | :---------------- | :------------------------------------------------------------------------------------- |
| `steamCmdPath`      | none              | The binary, or a folder that contains `steamcmd.exe` or `steamcmd.sh`                  |
| `steamWorkshopPath` | none              | Where Workshop content will be stored                                                  |
| `steamMetaPath`     | none              | Working directory of SteamCMD runs and where session files are looked for              |
| `authMode`          | `anonymous`       | `anonymous` or `account` (a dedicated Steam account for Workshop and private branches) |
| `steamUsername`     | none              | Used in `account` mode                                                                 |
| Steam password      | none              | Encrypted with the vault                                                               |
| `gameServerAppId`   | `223350`          | The contract also names the experimental server (`1042420`)                            |
| `workshopAppId`     | `221100`          | The DayZ game, whose Workshop is used                                                  |
| `branch`            | `public`          | Letters, digits, `.`, `_` and `-` only                                                 |
| Branch password     | none              | Encrypted with the vault                                                               |
| Steam Web API key   | none              | Encrypted with the vault, up to 128 characters                                         |
| `sessionStatus`     | `UNAUTHENTICATED` | `UNAUTHENTICATED`, `AUTHENTICATED`, `CHALLENGE_REQUIRED` or `EXPIRED`                  |

The vault and the key are described in [persistence](persistence.md#4-secrets-and-hashes).

### Path checks

Each path must be absolute, at most 512 characters, without `..`, null bytes or the characters `<>"|?*`. A storage path must also be writable (a temporary probe file is created and removed) and its volume must have at least 1 GB free (`INSUFFICIENT_STORAGE_SPACE`). The settings page shows the free space of the Workshop volume as a bar: red below 10 GB, amber up to 20 GB, green above (these two limits are written in the page, and the daemon has its own 20 GB warning constant). On Linux the SteamCMD binary must be executable.

## 3. The SteamCMD runner

`SteamRunnerService` starts SteamCMD with an argument array, without a shell and with a hidden window on Windows.

- **One job at a time.** While a probe, a login or a challenge is active, a new request fails with `TASK_CONCURRENCY_CONFLICT`.
- **Probe (diagnostics).** `POST /settings/steam/diagnostics` checks the three paths, then runs SteamCMD with `+login` and `+quit` and measures the time. In `anonymous` mode it logs in as `anonymous`. In `account` mode it logs in as the stored user: with a cached session ticket when one exists (`ssfn*` files in the meta path, or a stored `AUTHENTICATED` status), otherwise with the stored password. When the meta path exists it also passes `+@ShutdownOnFailedCommand 1` and `+@NoPromptForPassword 1`. The probe times out after 30 s, or 90 s once a Steam Guard challenge appears. The result lists the checks, the SteamCMD output lines and the latency.
- **Sign-in.** `POST /settings/steam/session/login` runs the same login without the diagnostics and keeps the process alive while a challenge is open.
- **Clear session.** `POST /settings/steam/session/clear` deletes the `ssfn*` files and `config/config.vdf` (and its `.bak`) from the meta path and sets the status to `UNAUTHENTICATED`.

Not verified on a running host: whether SteamCMD really keeps its session files in the configured meta path.

## 4. Steam Guard challenge

```text
Browser                         Daemon                              SteamCMD
  │ POST session/login            │                                    │
  │ ─────────────────────────────►│ spawn +login user pass +quit       │
  │                               │◄── "Enter your Steam Guard code:" ─│
  │◄─ SSE steam.auth.challenge ───│  (challengeId, type, 90 s)         │
  │ POST challenge/respond        │                                    │
  │ ─────────────────────────────►│ write the code to stdin ──────────►│
  │                               │◄── "Logged in OK" ─────────────────│
  │◄─ SSE steam.auth.status ──────│  status AUTHENTICATED              │
```

- **Detection.** The runner matches SteamCMD's output: a Steam Guard code prompt gives the type `OTP_CODE`, a mobile confirmation wait gives `MOBILE_PUSH`. "Logged in OK" gives success.
- **Answer.** The code is five uppercase letters or digits (the contract checks it, and the web field removes anything else). It is written to SteamCMD's standard input.
- **End.** Abort (`challenge/abort`) stops the process and sends `steam.auth.challenge.expired`. After 90 s without an answer the challenge expires, the status becomes `EXPIRED`, and both events are sent.
- **Who sees it.** The events go to every connected operator through the broadcast hub, and any signed-in operator can answer.
- **In the browser.** `useSteamAuthChallenge` opens its own `EventSource` (with its own ticket) on the Steam settings page and shows `SteamGuardChallengeModal`, which counts down the 90 s ([frontend](frontend.md#8-realtime)).

| Event                          | Payload                                            |
| :----------------------------- | :------------------------------------------------- |
| `steam.auth.status`            | `{ status }`                                       |
| `steam.auth.challenge`         | `{ challengeId, type, timeoutSeconds, createdAt }` |
| `steam.auth.challenge.expired` | `{ challengeId }`                                  |

## 5. Workshop through the Steam Web API

`SteamWorkshopService` calls three endpoints on `api.steampowered.com`, each with a 10 s timeout:

| Endpoint                                      | Used for                             | Key needed |
| :-------------------------------------------- | :----------------------------------- | :--------- |
| `ISteamRemoteStorage/GetPublishedFileDetails` | Details of items, 50 per request     | No         |
| `ISteamRemoteStorage/GetCollectionDetails`    | The items of a collection, up to 200 | No         |
| `IPublishedFileService/QueryFiles`            | Text search in the DayZ Workshop     | Yes        |

- **Lookup** (`POST /workshop/lookup`) takes a Workshop id or a URL. A URL is accepted only on `steamcommunity.com`. An id is 1 to 20 digits. A collection is expanded to its items.
- **Search** (`GET /workshop/search`) needs the Web API key and fails with `STEAM_WEB_API_KEY_REQUIRED` without it. The key is decrypted for the request and sent to Steam as the `key` query parameter, as the Steam API requires.
- **Update check** compares the item's last update time at Steam with the time stored for the mod ([mods](dayz-domain.md#5-mods)).
- **Errors** are `STEAM_WORKSHOP_INVALID_INPUT`, `STEAM_WORKSHOP_NOT_FOUND` and `STEAM_WORKSHOP_API_ERROR`, each with an HTTP status.

## 6. Settings page (`/settings/steam`)

`SteamSettingsView` is one form on `useEditableForm`: the SteamCMD, Workshop and meta paths, the auth mode (anonymous, or an account with user name and password), custom branch and branch password, the app ids, and the Web API key. A password or key field left empty keeps the stored value, and the page has explicit actions to change a password or to clear the key on save. The page also shows the session status tag (`Authenticated (Token Cached)`, `Steam Guard 2FA Pending`, `Session Expired`, `Unauthenticated`), the storage bar, the diagnostics modal and the Steam Guard modal.

## 7. Web and server drift check

Compared on 2026-11-24:

- **Consistent:** the session statuses, the challenge types, the code format (5 uppercase letters or digits), the events and the settings fields all come from `libs/api-contracts`. The web status labels cover all four statuses.
- **Written more than once:** the 90 s challenge timeout (contract default, daemon constant, web fallback), and the path rules (TD-13).
- **App ids:** the contract names the stable and experimental server ids, but the page offers free numeric inputs.

## 8. Known gaps

- No install, update or download through SteamCMD yet (section 1).
- Path validation exists in several copies (TD-13), and the free-space check falls back to a fixed 100 GB when the platform cannot report it (TD-14).
- The location of SteamCMD's session files is unverified (section 3).
- Steam features that do not exist yet in the backlog: `DSM-00133`, `DSM-00146`, `DSM-00159`.
