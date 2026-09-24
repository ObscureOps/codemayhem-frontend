
// Standalone sanity check for diffLines — this is the "tested in
// isolation" step from the Milestone 4 plan. Run with:
//   npx tsx src/features/problems/diff.selftest.ts
// (install tsx as a dev dependency first if you don't have it: npm i -D tsx)
// or swap in ts-node if you already use that. Not part of the app bundle
// and not wired into any component — delete or move it once a real test
// runner (vitest, etc.) is set up for the project.

import { diffLines } from './diff';

function check(
  name: string,
  actual: string,
  expected: string,
  expectedActualStatuses: string[],
  expectedExpectedStatuses: string[]
) {
  const result = diffLines(actual, expected);
  const gotActual = result.actual.map((l) => l.status);
  const gotExpected = result.expected.map((l) => l.status);
  const pass =
    JSON.stringify(gotActual) === JSON.stringify(expectedActualStatuses) &&
    JSON.stringify(gotExpected) === JSON.stringify(expectedExpectedStatuses);
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name}`);
  if (!pass) {
    console.log('  actual statuses:   got', gotActual, ' want', expectedActualStatuses);
    console.log('  expected statuses: got', gotExpected, ' want', expectedExpectedStatuses);
  }
}

// Case 1: program crashes instead of printing the final line.
check(
  'crash before final output',
  'Enter two numbers:\n12\n15\nSegmentation fault (core dumped)',
  'Enter two numbers:\n12\n15\nThe GCD of 12 and 15 is: 3',
  ['okay', 'okay', 'okay', 'excess'],
  ['okay', 'okay', 'okay', 'lacking']
);

// Case 2: stray debug line in the middle, everything else matches.
check(
  'extra debug line mid-sequence',
  'Enter two numbers:\n[debug] parsing input\n12\n15\nThe GCD of 12 and 15 is: 3',
  'Enter two numbers:\n12\n15\nThe GCD of 12 and 15 is: 3',
  ['okay', 'excess', 'okay', 'okay', 'okay'],
  ['okay', 'okay', 'okay', 'okay']
);

// Case 3: perfect match.
check(
  'exact match',
  'Enter two numbers:\n12\n15\nThe GCD of 12 and 15 is: 3',
  'Enter two numbers:\n12\n15\nThe GCD of 12 and 15 is: 3',
  ['okay', 'okay', 'okay', 'okay'],
  ['okay', 'okay', 'okay', 'okay']
);
