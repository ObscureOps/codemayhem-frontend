import type { Problem, ProblemVariant, Language, ProblemResult, ProblemSubmitFile } from '../types/problems';

export const MOCK_PROBLEMS: Problem[] = [
  {
    id: 'p1',
    title: 'Two Sum',
    difficulty: 'Easy',
    author: 'dcism-staff',
    tags: ['Arrays', 'Hash Table'],
    hints: [
      'Think about what you need to check for each number as you scan the array.',
      'A hash map from value to index lets you check "have I seen target - nums[i] before?" in O(1).',
    ],
    solution:
      'Use a hash map from value to index. For each number, check whether target - nums[i] is already in the map; if so, return the stored index and the current index. Otherwise, store nums[i] with its index and continue. Single pass, O(n) time.',
  },
  {
    id: 'p2',
    title: 'Binary Search Tree Validation',
    difficulty: 'Medium',
    author: 'dcism-staff',
    tags: ['Trees', 'Recursion'],
    solution:
      'Recursively track a valid (min, max) range for each node. A node is valid only if its value falls strictly within that range; recurse left with an updated max and right with an updated min.',
  },
  {
    id: 'p3',
    title: 'Longest Increasing Subsequence',
    difficulty: 'Hard',
    author: 'dcism-staff',
    tags: ['Dynamic Programming', 'Arrays'],
    hints: ['Consider what information you need to know about subsequences ending at each index.'],
    solution:
      'Let dp[i] be the length of the longest increasing subsequence ending at index i. For each i, check every j < i where nums[j] < nums[i] and take dp[i] = max(dp[i], dp[j] + 1). The answer is the max over all dp[i]. O(n^2); can be improved to O(n log n) with patience sorting.',
  },
  {
    id: 'p4',
    title: 'Student Enrollment Query',
    difficulty: 'Easy',
    author: 'dcism-staff',
    tags: ['SQL', 'Joins', 'Aggregation'],
    solution:
      'SELECT s.name, COUNT(e.course_id) AS course_count FROM students s JOIN enrollments e ON e.student_id = s.id GROUP BY s.id, s.name;',
  },
  {
    id: 'p5',
    title: 'Deadlock Detection',
    difficulty: 'Hard',
    author: 'dcism-staff',
    tags: ['Graphs', 'Cycle Detection'],
    solution:
      "Model the resource allocation graph as a directed graph and run cycle detection (e.g. DFS with a recursion stack, or Kahn's algorithm looking for leftover nodes). A cycle in the wait-for graph indicates a deadlock.",
  },
];

export const MOCK_VARIANTS: ProblemVariant[] = [
  {
    id: 'p1-c',
    problemId: 'p1',
    language: 'c',
    body: 'Given an array of integers nums and a target value, return the indices of the two numbers that add up to target.\n\nAssume exactly one solution exists.',
    boilerplate: '#include <stdio.h>\n\nint main(void) {\n    // your code here\n    return 0;\n}\n',
    sampleOutputs: [
      { label: 'Sample Output 1', content: 'Input: nums = [2, 7, 11, 15], target = 9\nOutput: [0, 1]' },
      { label: 'Sample Output 2', content: 'Input: nums = [3, 2, 4], target = 6\nOutput: [1, 2]' },
    ],
  },
  {
    id: 'p1-java',
    problemId: 'p1',
    language: 'java',
    body: 'Given an array of integers nums and a target value, return the indices of the two numbers that add up to target.\n\nAssume exactly one solution exists.',
    boilerplate: 'public class Main {\n    public static void main(String[] args) {\n        // your code here\n    }\n}\n',
    sampleOutputs: [
      { label: 'Sample Output 1', content: 'Input: nums = [2, 7, 11, 15], target = 9\nOutput: [0, 1]' },
      { label: 'Sample Output 2', content: 'Input: nums = [3, 2, 4], target = 6\nOutput: [1, 2]' },
    ],
  },
  {
    id: 'p2-c',
    problemId: 'p2',
    language: 'c',
    body: 'Given the root of a binary tree, determine whether it is a valid binary search tree.',
    boilerplate: '#include <stdio.h>\n\nint main(void) {\n    return 0;\n}\n',
  },
  {
    id: 'p2-java',
    problemId: 'p2',
    language: 'java',
    body: 'Given the root of a binary tree, determine whether it is a valid binary search tree.',
    boilerplate: 'public class Main {\n    public static void main(String[] args) {\n    }\n}\n',
  },
  {
    id: 'p3-c',
    problemId: 'p3',
    language: 'c',
    body: 'Find the length of the longest strictly increasing subsequence in an array of integers.',
    boilerplate: '#include <stdio.h>\n\nint main(void) {\n    return 0;\n}\n',
  },
  {
    id: 'p4-sql',
    problemId: 'p4',
    language: 'sql',
    body: "Given `students(id, name)` and `enrollments(student_id, course_id)`, return each student's name and how many courses they are enrolled in.",
    boilerplate: 'SELECT\n  -- your query here\n;\n',
    sampleOutputs: [
      { label: 'Sample Output', content: 'name  | course_count\n------+-------------\nAlice | 3\nBob   | 2' },
    ],
  },
  {
    id: 'p5-java',
    problemId: 'p5',
    language: 'java',
    body: 'Given a resource allocation graph, determine whether a deadlock exists among the processes.',
    boilerplate: 'public class Main {\n    public static void main(String[] args) {\n    }\n}\n',
  },
];

export function getProblem(id: string): Problem | undefined {
  return MOCK_PROBLEMS.find((p) => p.id === id);
}

export function getVariantsForProblem(problemId: string): ProblemVariant[] {
  return MOCK_VARIANTS.filter((v) => v.problemId === problemId);
}

// PROVISIONAL mock — no real compilation happens here. CHANGED (4c):
// takes `files[]` instead of a single `code` string, matching the
// multi-file submission request shape. Swap the body of this function
// for a real POST /api/submissions + poll loop once the judge service
// exists; the reducer in useProblemSubmissionFlow doesn't need to change.
export async function mockSubmit(
  _variantId: string,
   language: Language,
  files: ProblemSubmitFile[]
): Promise<ProblemResult> {
  const allEmpty = files.every((f) => !f.content.trim());
  if (allEmpty) {
    return { stderr: 'error: empty submission' };
  }
  // SQL branch kept for when it's eventually enabled — dead code today
  // since only 'c' submissions can actually be triggered this milestone.
  if (language === 'sql') {
    return { stdout: 'name  | course_count\n------+-------------\nAlice | 3\nBob   | 2\n(2 rows)' };
  }
  return { stdout: 'Hello from your submission!\n(exit code 0)' };
}
