export type FreestyleLanguage = 'c' | 'java'

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

export type FreestyleRequest = GCCRequest | JavaRequest

// Shared response shape for both /gcc and /java. HTTP 200 even when the
// compile or the program run failed — `reason` is what distinguishes
// success from a compile error from a runtime error, not the status code.
export interface GCCResponse {
  output: string
  status: number
  reason?: 'compiler error' | 'program error'
}

export type JavaResponse = GCCResponse
export type FreestyleResponse = GCCResponse
