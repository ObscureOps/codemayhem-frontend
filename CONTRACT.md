# CISCODE — Backend Contract

Single source of truth for API request/response shapes. Add new endpoints
here, in this exact style, before writing any component that calls them.

---

## Submissions

```ts
// POST /api/submissions
interface SubmitRequest {
  problemId: string;
  language: 'c' | 'java' | 'sql';
  code: string;
}
interface SubmitResponse {
  submissionId: string;
  status: 'queued';
}

// GET /api/submissions/:id
interface SubmissionStatusResponse {
  id: string;
  status: 'queued' | 'compiling' | 'running' | 'result';
  result?: CodeResult | SqlResult;
}
interface CodeResult {
  kind: 'code';
  passed: boolean;
  tests: {
    name: string;
    passed: boolean;
    stdout?: string;
    stderr?: string;
    timeMs: number;
  }[];
  compileError?: string;
}
interface SqlResult {
  kind: 'sql';
  passed: boolean;
  columns: string[];
  rows: unknown[][];
  error?: string;
}
```

**Open question for backend:** Code Battle needs live opponent state.
Polling vs. WebSocket/SSE is not yet specified.

**Open question for backend:** `problems` and `problems_variants` are
separate tables. A `problems` row has `title`/`difficulty`/`author`, while
each `problems_variants` row belongs to one problem and carries its own
`language`/`boilerplate`/`harness`/`body`. It is not yet confirmed whether
the eventual submission endpoint takes a `problems` id plus language or a
`problems_variants` id. Do not guess before the real endpoint is available.

**Owner:** Go sandbox/compile service. As of the current backend snapshot,
the judge/compile side is still a stub, so Problems submissions remain
mock-only on the frontend.

---

## Authentication (v7 — OTP custom APIs)

**Owner:** SurrealDB directly.

**Important correction:** the previous authentication contract described
the older native SurrealDB `SIGNUP` access-method flow. The current backend
uses custom `DEFINE API` endpoints for email verification and account
creation. Sign-in remains the native `/signin` endpoint using the `users`
record access method.

### Email verification / OTP

Backend source: `database/schema/api/otp.surql`.

```ts
// POST /api/main/main/otp
interface OtpRequest {
  email: string;
}

// Successful response:
// HTTP 201
// body: "Created"
interface OtpResponse {
  status: 201;
  body: 'Created';
}
```

The frontend sends the email as JSON:

```json
{
  "email": "student@university.edu"
}
```

The frontend normalizes the email with trim + lowercase before sending it.
This keeps the OTP request consistent with the subsequent signup request.

Known backend outcomes:

- `201` — verification code generated/sent and stored.
- `400` — invalid email or email-domain validation failed.
- `429` — OTP request rate limit was exceeded.

The OTP is a six-digit verification code. The actual mail delivery is
handled by the backend's configured mail service; the frontend never
handles or stores the generated code.

### Account creation

Backend source: `database/schema/api/signup.surql`.

```ts
// POST /api/main/main/signup
interface SignupRequest {
  email: string;
  otp: string;
  pass: string;
  username: string;
}

// Successful response:
// HTTP 201
// body: "Created"
interface SignupResponse {
  status: 201;
  body: 'Created';
}
```

The frontend sends:

```json
{
  "email": "student@university.edu",
  "otp": "123456",
  "pass": "plain-text-password",
  "username": "student_handle"
}
```

Known backend outcomes:

- `201` — account created.
- `400` — invalid or expired OTP / invalid signup request.
- `409` — email or username already exists.

Signup does **not** return an authentication token. After `201`, the
frontend redirects the user to `/login`.

### Sign-in

Sign-in continues to use SurrealDB's built-in endpoint:

```ts
// POST /signin
interface SigninRequest {
  ns: 'main';
  db: 'main';
  ac: 'users';
  email: string;
  pass: string;
}

interface SigninResponse {
  code: number;
  details: string;
  token?: string;
  description?: string;
  information?: string;
}
```

The frontend sends:

```json
{
  "ns": "main",
  "db": "main",
  "ac": "users",
  "email": "student@university.edu",
  "pass": "plain-text-password"
}
```

Confirmed successful response shape:

```json
{
  "code": 200,
  "details": "Authentication succeeded",
  "token": "..."
}
```

A failed sign-in currently returns a generic `404`; the backend does not
provide a frontend-distinguishable "wrong password" vs. "account not found"
result.

The current access method has a 12-hour token duration and 12-hour session
duration.

### Authentication architecture

- Go is not involved in authentication.
- No Google OAuth is used.
- No JWT verification is performed by the frontend.
- OTP request and signup use custom SurrealDB APIs.
- Sign-in uses the native `/signin` endpoint.
- Components do not call `fetch()` directly; authentication calls go
  through the typed API client.
- The client exposes `getSession()`, `setSession()`, and `clearSession()` so
  components do not access session storage directly.

### Custom API routing note

The `DEFINE API` statements name the endpoint itself, but the deployed
custom API URL is namespaced by SurrealDB:

```text
https://code-api.dcism.org/api/main/main/otp
https://code-api.dcism.org/api/main/main/signup
```

Do not use the bare `/otp` or `/signup` paths for these custom APIs.

The native signin endpoint remains:

```text
https://code-api.dcism.org/signin
```

---

## Profile

`code-api` defines this directly through SurrealDB's `DEFINE API` feature.

```ts
// GET /profile/:id
interface ProfileResponse {
  created_at: string;   // ISO datetime
  updated_at: string;   // ISO datetime
  username: string;
}
```

Known failure:

```json
{
  "error": "Not found"
}
```

No frontend screen calls this yet.

---

## Problems (provisional — mock-only, Milestone 3/4)

**Status: nothing here is a real endpoint yet.** The judge/compile service
is still a stub, so the Problems workspace currently uses frontend mocks.
Treat the shapes below as unconfirmed until the dedicated backend routes
exist.

```ts
type Difficulty = 'Easy' | 'Medium' | 'Hard';
type Language = 'c' | 'java' | 'sql';

interface Problem {
  id: string;
  title: string;
  difficulty: Difficulty;
  author: string;
}

interface ProblemVariant {
  id: string;
  problemId: string;
  language: Language;
  body: string;         // problem statement — may differ per variant (SQL especially)
  boilerplate: string;  // starter code shown in the editor
  // `harness` intentionally omitted — backend-internal, never sent to the frontend.
}
```

**UNCONFIRMED ASSUMPTION:** `ProblemSubmitRequest.problemId` is currently
assumed to be a `problems_variants` id because a submission is always for
one specific language. If the eventual backend endpoint takes a `problems`
id plus a separate language field, only the submission call needs to change.

```ts
// POST /api/submissions — PROVISIONAL
interface ProblemSubmitFile {
  name: string;
  content: string;
}

interface ProblemSubmitRequest {
  problemId: string; // == ProblemVariant.id under the current assumption
  language: Language;
  files: ProblemSubmitFile[];
}
interface ProblemSubmitResponse {
  submissionId: string;
  status: 'queued';
}

// GET /api/submissions/:id — PROVISIONAL
type ProblemSubmissionStatus =
  | 'queued'
  | 'compiling'
  | 'running'
  | 'result';

interface ProblemResult {
  stdout?: string;
  stderr?: string;
}

interface ProblemSubmissionStatusResponse {
  id: string;
  status: ProblemSubmissionStatus;
  result?: ProblemResult;
}
```

**Frontend implementation notes:**

- All Problems data and submission behavior is mocked in
  `src/api/mocks/problems.ts`.
- `ProblemPage.tsx` currently assumes one `Problem` can have multiple
  `ProblemVariant`s, one per language.
- Routes:
  - `/problems` — problem list
  - `/problems/:id` — problem detail/workspace
- Milestone 4a adds the three-pane workspace layout around the existing
  mock problem/editor/submission experience.
- The richer per-test result shape in the general Submissions section
  should not be assumed to be available to the Problems mock until the
  backend confirms it.

### Not yet contracted

The database schema contains these concepts, but there is no frontend API
contract for them yet:

- `problems` — `title`, `difficulty: 'Easy'|'Medium'|'Hard'`, `author`
- `problems_variants` — per-problem, per-language `body`/`boilerplate`/`harness`
- Relations:
  `bookmarked`, `liked`, `solved`, `attempted`
  (all `users -> problems` / `problems_variants`)

Do not build real frontend calls against these until their API surface is
documented here.

---

## Contract change log

### v8 — 2026-09-08

Problems Milestone 4c contract alignment:

- Changed provisional `ProblemSubmitRequest.code: string` to `files: ProblemSubmitFile[]`.
- Added the frontend-owned `ProblemSubmitFile { name, content }` shape for multi-file C submissions.
- Kept the Problems result shape provisional (`stdout`/`stderr` only); per-test results remain blocked on backend confirmation.

### v7 — 2026-09-08

Authentication contract corrected to match the current backend API:

- Removed the stale native `SIGNUP` access-method contract.
- Added custom OTP endpoint:
  `POST /api/main/main/otp`.
- Added custom OTP-based signup endpoint:
  `POST /api/main/main/signup`.
- Documented `201 Created`, `400`, and `429` OTP outcomes.
- Documented `201`, `400`, and `409` signup outcomes.
- Signup is explicitly a two-step flow: request OTP, then submit
  email + OTP + username + password.
- Signup does not return a token; successful signup redirects to login.
- Kept native `/signin` with `ac: 'users'`.
- Documented the namespaced routing required by deployed custom APIs.
- Kept the existing Problems and Submissions contracts provisional where
  the backend has not yet supplied a real endpoint.

This change fixes the documentation mismatch that previously described the
frontend against the wrong `/signup` contract.
