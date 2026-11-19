import type { ProblemLanguage } from '../../api/types/problems';

export interface ProblemTemplate {
  boilerplate: string;
  harness: string;
  solution: string;
  // What the judge does with each field for this language.
  hints: { boilerplate: string; harness: string; solution: string };
}

// How the judge runs each language (from compilerms and the solve_problem
// function): C compiles harness.c with solution.c available on the include
// path; Java compiles Main.java together with Solution.java; SQLite feeds
// "harness;solution" to an in-memory database.
export const TEMPLATES: Record<ProblemLanguage, ProblemTemplate> = {
  C: {
    boilerplate: `int add(int a, int b) {
    /* write your code here */
    (void)a;
    (void)b;
    return 0;
}
`,
    harness: `#include <stdio.h>

/* Declare the prototype first: the build uses -Wmissing-prototypes -Werror. */
int add(int a, int b);

#include "solution.c"

int main(void) {
    printf("%d\\n", add(2, 3));
    printf("%d\\n", add(-4, 4));
    printf("%d\\n", add(0, 0));
    return 0;
}
`,
    solution: `int add(int a, int b) {
    return a + b;
}
`,
    hints: {
      boilerplate: 'Starter code students see. Avoid unused parameters or variables: warnings are errors in this build.',
      harness: 'harness.c. Includes the solution with #include "solution.c", prints results, and must exit with 0. Output is capped at 4096 bytes.',
      solution: 'Your reference solution. It runs through the harness once when you save, and that run must succeed.',
    },
  },

  Java: {
    boilerplate: `public class Solution {
    static int add(int a, int b) {
        // write your code here
        return 0;
    }
}
`,
    harness: `public class Main {
    public static void main(String[] args) {
        System.out.println(Solution.add(2, 3));
        System.out.println(Solution.add(-4, 4));
        System.out.println(Solution.add(0, 0));
    }
}
`,
    solution: `public class Solution {
    static int add(int a, int b) {
        return a + b;
    }
}
`,
    hints: {
      boilerplate: 'Solution.java as students see it. Warnings are errors (-Xlint -Werror).',
      harness: 'Main.java. The entry point must be a class named Main that calls into Solution.',
      solution: 'Your reference Solution.java. It runs through the harness once when you save, and that run must succeed.',
    },
  },

  SQLite: {
    boilerplate: `-- write your query here
SELECT * FROM students
`,
    harness: `CREATE TABLE students (id INTEGER PRIMARY KEY, name TEXT, score INTEGER);
INSERT INTO students VALUES (1, 'Ana', 90), (2, 'Ben', 75), (3, 'Cy', 82)
`,
    solution: `SELECT name FROM students WHERE score > 80 ORDER BY name
`,
    hints: {
      boilerplate: 'Starter query students see.',
      harness: 'Setup script that runs before the solution. Leave off the final semicolon, because the judge adds one.',
      solution: 'Your reference query. Use ORDER BY: row order is compared exactly.',
    },
  },
};
