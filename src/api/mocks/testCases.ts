
// TEMPORARY MOCK-ONLY — not backed by any real endpoint or contract
// type. Exists purely to unblock 4d's UI while the real
// CodeResult.tests[] vs {stdout?, stderr?} question is still open with
// backend (see CONTRACT.md). Delete this file — and the mock-data
// import inside useCheckCodeFlow.ts — once the real answer comes in.

export interface MockTestCase {
  id: string;
  name: string;
  passed: boolean;
  actualOutput: string;
  expectedOutput: string;
}

const MOCK_TEST_CASES: Record<string, MockTestCase[]> = {
  'p1-c': [
    {
      id: 't1',
      name: 'Test case 1',
      passed: true,
      actualOutput: 'Output: [0, 1]',
      expectedOutput: 'Output: [0, 1]',
    },
    {
      id: 't2',
      name: 'Test case 2',
      passed: true,
      actualOutput: 'Output: [1, 2]',
      expectedOutput: 'Output: [1, 2]',
    },
    {
      id: 't3',
      name: 'Test case 3',
      passed: false,
      actualOutput: 'Output: [2, 0]',
      expectedOutput: 'Output: [0, 2]',
    },
    {
      id: 't4',
      name: 'Test case 4 (edge: negative numbers)',
      passed: false,
      actualOutput: 'Segmentation fault (core dumped)',
      expectedOutput: 'Output: [1, 3]',
    },
  ],
  'p2-c': [
    { id: 't1', name: 'Test case 1', passed: true, actualOutput: 'true', expectedOutput: 'true' },
    { id: 't2', name: 'Test case 2', passed: true, actualOutput: 'false', expectedOutput: 'false' },
    { id: 't3', name: 'Test case 3', passed: true, actualOutput: 'true', expectedOutput: 'true' },
  ],
};

export function getMockTestCases(variantId: string): MockTestCase[] {
  return MOCK_TEST_CASES[variantId] ?? [];
}
