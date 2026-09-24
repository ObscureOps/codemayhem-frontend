
export type DiffLineStatus = 'okay' | 'excess' | 'lacking';

export interface DiffLine {
  lineNumber: number; // 1-indexed within its own column
  content: string;
  status: DiffLineStatus;
}

export interface DiffResult {
  actual: DiffLine[];
  expected: DiffLine[];
}

// LCS-based line diff. Classifies each line in `actual` as either "okay"
// (also present, in order, in `expected`) or "excess" (present in actual
// but not part of the matching subsequence — wrong or extra output).
// Each line in `expected` is classified as either "okay" or "lacking"
// (expected but never produced). Mirrors the CodeChum reference's
// Okay/Excess/Lacking structure functionally — nothing about its visual
// styling is copied.
export function diffLines(actual: string, expected: string): DiffResult {
  const actualLines = actual.split('\n');
  const expectedLines = expected.split('\n');

  const n = actualLines.length;
  const m = expectedLines.length;

  // dp[i][j] = length of LCS of actualLines[0..i) and expectedLines[0..j)
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (actualLines[i - 1] === expectedLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const actualStatus: DiffLineStatus[] = new Array(n).fill('excess');
  const expectedStatus: DiffLineStatus[] = new Array(m).fill('lacking');

  // Backtrack from dp[n][m], marking matched (LCS) lines "okay" on both sides.
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (actualLines[i - 1] === expectedLines[j - 1]) {
      actualStatus[i - 1] = 'okay';
      expectedStatus[j - 1] = 'okay';
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return {
    actual: actualLines.map((content, idx) => ({
      lineNumber: idx + 1,
      content,
      status: actualStatus[idx],
    })),
    expected: expectedLines.map((content, idx) => ({
      lineNumber: idx + 1,
      content,
      status: expectedStatus[idx],
    })),
  };
}
