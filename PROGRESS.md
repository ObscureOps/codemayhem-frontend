# CISCODE Frontend — Progress
Last updated: 2026-09-08

## Done

- Design tokens, layout shell, typography primitives, routing scaffold, page stubs, and route guarding — unchanged, previously verified working.
- **Authentication — current backend integration is working:**
  - Sign-in uses the native SurrealDB `/signin` endpoint with `ns: 'main'`, `db: 'main'`, `ac: 'users'`.
  - Signup uses the backend's custom OTP flow rather than native `/signup`.
  - OTP request: `POST https://code-api.dcism.org/api/main/main/otp`.
  - Account creation: `POST https://code-api.dcism.org/api/main/main/signup`.
  - Signup requires email, six-digit OTP, username, and password.
  - Successful OTP request returns `201 Created`.
  - Successful signup returns `201 Created` and redirects to `/login`; signup does not return a token.
  - Email is normalized before OTP and signup requests so the stored OTP lookup uses the same email value.
  - OTP error handling covers invalid email/domain (`400`) and rate limiting (`429`); signup handles invalid/expired OTP (`400`) and duplicate email/username (`409`).
  - Remember Me/session storage remains behind the typed client interface.
  - No Google OAuth, JWT verification, or direct component-level `fetch()`.
- Milestone 3 (Problems list + detail, mock submission flow, CodeMirror 6 editor) — unchanged, previously verified.
- **Milestone 4a (three-pane layout shell — draggable dividers, collapse controls)** — implemented; manual verification remains.
- **Milestone 4b (left panel content)** — implemented; tags, sample outputs, and hint/solution reveal are in place; manual verification remains.
- **Milestone 4c (center panel)** — complete:
  - `src/features/problems/useMultiFileEditor.ts` — manages a `files: {name, content}[]` array plus the active file. `addFile` validates `.c`/`.h` and rejects duplicate names; `closeFile` refuses to close `main.c`. Rename is intentionally out of scope.
  - `src/features/problems/FileTabs.tsx` — file tab bar with inline add-file input and per-file close button; `main.c` has no close control.
  - `src/features/problems/editorTheme.ts` — exports `buildEditorTheme(theme, fontSize)` plus Ink/Chalk highlight styles, using the existing design-token palette.
  - `src/features/problems/CodeEditor.tsx` — uses CodeMirror Compartments so theme, font size, and word-wrap reconfigure without remounting; file/language changes still remount deliberately.
  - `src/features/problems/EditorSettingsPopover.tsx` — Ink/Chalk toggle, font size 12/14/16/18, and word-wrap; IBM Plex Mono remains locked.
  - `src/api/types/problems.ts` — `ProblemSubmitRequest` now uses `files: ProblemSubmitFile[]` instead of `code: string`.
  - `src/api/mocks/problems.ts` — mock submission accepts `files[]`; an empty submission is detected when every file is blank.
  - `src/features/problems/useProblemSubmissionFlow.ts` — `submit()` now accepts `files`.
  - `src/pages/ProblemPage.tsx` — center pane now has static `c`/`java`/`sql` language tabs with only C enabled, file tabs, settings popover, and multi-file submission.
  - `CONTRACT.md` — updated to record the multi-file submission shape.
2. **PAUSED — 4d, Right panel Test Cases:** blocked on confirming with andrieee44
   whether Problems submissions will eventually return the general
   `CodeResult.tests[]` shape or stay at the narrower provisional
   `{stdout?, stderr?}`. Message drafted, waiting on their answer before
   any 4d code is written.
## In progress

- None — Milestone 4c is complete and ready for manual verification.

## Next up (in order)

1. **Manual verification:**
   - 4a: drag both dividers through min/max ranges; verify the editor never drops below its 360px floor; collapse/expand both side panes; Tab to each divider and resize with Arrow keys.
   - 4b: verify tags, sample outputs, and hint → solution reveal.
   - 4c: on a C problem, add/close files; try a bad extension, duplicate name, and closing `main.c`; switch Ink ↔ Chalk; change font size and word-wrap and confirm cursor/undo survive; verify C submission still runs queued → compiling → running → result.
   - Open Student Enrollment Query and Deadlock Detection and verify they show coming-soon instead of an editor.
2. **4d — Right panel / Test Cases:** resolve the provisional Problems result shape first. The current Problems result only exposes `stdout?`/`stderr?`, while the test-case UI needs per-test `tests[]` data. Do not guess this contract.
3. **4e — Diff view:** implement and test an LCS-based client-side diff in isolation before wiring it to “see what’s wrong.”
4. **4f — Executions tab:** save-on-check, View vs Restore, and confirmation before Restore. Depends on 4d.
5. **4g — Wrap-up:** consolidate `CONTRACT.md` and `PROGRESS.md` after 4d–4f.

## Decisions / notes

- Auth uses the current custom OTP + signup APIs; the stale native-signup description is not the source of truth.
- Custom auth API routing is namespaced: `/api/main/main/otp` and `/api/main/main/signup`; native signin remains `/signin`.
- Signup is intentionally not auto-login: the backend returns `201 Created` without a token, so the frontend redirects to `/login`.
- Auth backend is SurrealDB directly; Go is reserved for compile/sandbox work and remains a stub as of the current backend snapshot.
- Mobile is deferred for the current Problem workspace; the three-pane workspace is desktop-focused while the rest of the app remains responsive.
- Only `c` is enabled in the 4c editor; `java` and `sql` remain visible but disabled with “soon”. Student Enrollment Query (SQL-only) and Deadlock Detection (Java-only) therefore show coming-soon instead of the editor.
- Rename is intentionally not implemented for multi-file tabs.
- Editor settings are frontend-only, session-only `useState`, with no persistence and no contract entry.
- `ProblemSubmitRequest` now uses `files[]` rather than `code: string`; the contract records the change.
- Problems result shape remains provisional until backend confirmation; the richer general `CodeResult.tests[]` shape must not be silently assumed for Problems.
- Tailwind v4.3.3 is installed.
- **Next concrete step:** run the 4a–4c manual test pass, then resolve the Problems result-shape decision before implementing 4d.
