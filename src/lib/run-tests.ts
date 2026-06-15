import type { GeneratedTests, TestRunResult, TestCaseResult } from "./codescan-types";
import { runInSandbox } from "./sandbox-runner";

function runOne(setup: string, code: string): Promise<{ passed: boolean; error: string | null }> {
  return runInSandbox(setup, code);
}

/** Runs AI-generated edge-case tests in the browser sandbox. */
export async function runGeneratedTests(plan: GeneratedTests): Promise<TestRunResult> {
  if (!plan.runnable) {
    return {
      runnable: false,
      reason: plan.reason,
      language: plan.language,
      total: 0,
      passed: 0,
      failed: 0,
      tests: [],
    };
  }

  const tests: TestCaseResult[] = [];
  for (const t of plan.tests) {
    const r = await runOne(plan.setup, t.code);
    tests.push({ name: t.name, passed: r.passed, error: r.error });
  }

  const passed = tests.filter((t) => t.passed).length;
  return {
    runnable: true,
    reason: null,
    language: plan.language,
    total: tests.length,
    passed,
    failed: tests.length - passed,
    tests,
  };
}