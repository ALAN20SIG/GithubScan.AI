import type { TestSuite, TestSuiteRun, SuiteCaseRun } from "./codescan-types";
import { runInSandbox } from "./sandbox-runner";

function runOne(setup: string, code: string): Promise<{ passed: boolean; error: string | null }> {
  return runInSandbox(setup, code);
}

/** Runs all executable cases of an AI-generated test suite in the browser sandbox. */
export async function runTestSuite(suite: TestSuite): Promise<TestSuiteRun> {
  const runs: Record<string, SuiteCaseRun> = {};
  let executed = 0;
  let passed = 0;

  for (const section of suite.sections) {
    for (const c of section.cases) {
      if (c.executable && typeof c.code === "string") {
        const r = await runOne(c.setup ?? "", c.code);
        runs[c.id] = { id: c.id, passed: r.passed, error: r.error };
        executed += 1;
        if (r.passed) passed += 1;
      } else {
        runs[c.id] = { id: c.id, passed: null, error: null };
      }
    }
  }

  return {
    suite,
    runs,
    executed,
    passed,
    failed: executed - passed,
  };
}
