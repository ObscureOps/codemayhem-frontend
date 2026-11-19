export type FreestyleLanguage = 'c' | 'java' | 'sql'

// POST /gcc on compilerms. `sources` is required (>=1 entry), `headers`
// is optional and C-only. Filenames must not contain "/" — flat
// filesystem, no subfolders (compilerms compilers/gcc.go validation).
export interface GCCRequest {
  sources: Record<string, string>
  headers?: Record<string, string>
  stdin?: string
}

// POST /java on compilerms. Same sources rules as /gcc, no headers field.
// The sandbox always runs `java -cp /out Main` — whichever source defines
// the entry point must declare `public class Main` (compilers/java.go).
export interface JavaRequest {
  sources: Record<string, string>
  stdin?: string
}

// POST /sqlite3tmp on compilerms. No sources/headers — the entire SQL
// script is sent as `stdin` and run statement-by-statement against a
// fresh in-memory SQLite database (modules/sqlite3tmp/_src/sqlite3tmp).
// There is no separate "code" field: `stdin` IS the program.
export interface SQLite3tmpRequest {
  stdin: string
}

export type FreestyleRequest = GCCRequest | JavaRequest | SQLite3tmpRequest

// Shared response shape for /gcc, /java, and /sqlite3tmp. HTTP 200 even
// when the compile or the program run failed — `reason` is what
// distinguishes success from a compile error from a runtime error, not
// the status code. sqlite3tmp has no compile step of its own, so its
// only possible `reason` is 'program error' (never 'compiler error').
export interface GCCResponse {
  output: string
  status: number
  reason?: 'compiler error' | 'program error'
}

export type JavaResponse = GCCResponse
export type SQLite3tmpResponse = GCCResponse
export type FreestyleResponse = GCCResponse

// One entry per SQL statement that returned columns. Statements with no
// result set (CREATE, INSERT, UPDATE, DELETE, ...) are silently skipped
// by sqlite3tmp's main.go (`if len(output.Columns) == 0 { continue }`)
// — they never appear as empty entries in this array.
export interface SqlStatementResult {
  columns: string[]
  rows: unknown[][]
}

// On success, sqlite3tmp's `output` field is a JSON-encoded array of
// SqlStatementResult — sqlite3tmp writes `json.Encode(outputs)` to its
// own stdout, which compilerms then captures verbatim as `output`
// (capped at 4096 bytes by the same limitio writer /gcc and /java use).
// A parse failure is NOT necessarily an error: it can mean truncated
// JSON (a large result set hit the 4096-byte cap) or a genuine SQL
// error surfaced as plain text instead of JSON. `status` is the actual
// success/failure signal — never infer failure from a parse failure
// alone. An empty array ([]) is valid success, e.g. an all-INSERT
// script with no SELECTs — never treat length 0 as failure.
export function parseSqlOutput(output: string): SqlStatementResult[] | null {
  try {
    const parsed: unknown = JSON.parse(output)
    return Array.isArray(parsed) ? (parsed as SqlStatementResult[]) : null
  } catch {
    return null
  }
}
