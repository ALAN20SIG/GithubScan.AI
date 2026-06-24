import { createFileRoute } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { reviewCode } from "@/lib/review.functions";
import { reviewRepo } from "@/lib/repo-review.functions";
import { generateEdgeCaseTests } from "@/lib/test-runner.functions";
import { generateTestSuite } from "@/lib/test-suite.functions";
import { runPipeline } from "@/lib/pipeline.functions";
import { analyzeArchitecture } from "@/lib/architecture.functions";
import { buildMarkdownReport } from "@/lib/report";
import { CATEGORIES } from "@/lib/codescan-types";
import { TopBar } from "@/components/codescan/TopBar";
import { CategoryTabs } from "@/components/codescan/CategoryTabs";
import type { ViewTab } from "@/components/codescan/CategoryTabs";
import { FindingCard } from "@/components/codescan/FindingCard";
import { ScanningState } from "@/components/codescan/ScanningState";
import { ManualInput } from "@/components/codescan/ManualInput";
import { TestPanel } from "@/components/codescan/TestPanel";
import { TestSuitePanel } from "@/components/codescan/TestSuitePanel";
import { PipelinePanel } from "@/components/codescan/PipelinePanel";
import { ArchitecturePanel } from "@/components/codescan/ArchitecturePanel";
import { ModelConfigPanel } from "@/components/codescan/ModelConfigPanel";
import { useModel } from "@/lib/use-model";
import { BottomBar } from "@/components/codescan/BottomBar";

const searchSchema = z.object({
  code: fallback(z.string(), "").default(""),
  lang: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "CodeScan AI — AI Code Reviewer" },
      { name: "description", content: "AI-powered code review: bugs, security, quality and suggestions in seconds." },
      { property: "og:title", content: "CodeScan AI — AI Code Reviewer" },
      { property: "og:description", content: "AI-powered code review: bugs, security, quality and suggestions in seconds." },
      { property: "og:url", content: "https://ntellicode-pal.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://ntellicode-pal.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "CodeScan AI",
          applicationCategory: "DeveloperApplication",
          operatingSystem: "Web",
          description:
            "AI-powered code reviewer that finds bugs, security vulnerabilities, and quality issues, then generates tests and simulates a CI/CD pipeline.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }),
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { code, lang } = Route.useSearch();
  const review = useServerFn(reviewCode);
  const repoReview = useServerFn(reviewRepo);
  const genTests = useServerFn(generateEdgeCaseTests);
  const genSuite = useServerFn(generateTestSuite);
  const runCi = useServerFn(runPipeline);
  const analyzeArch = useServerFn(analyzeArchitecture);
  const [model] = useModel();
  const [configOpen, setConfigOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ViewTab>("bugs");
  const [copied, setCopied] = useState(false);
  const [tested, setTested] = useState<{ code: string; language: string }>({ code: "", language: "" });
  const autoRan = useRef(false);

  const mutation = useMutation({
    mutationFn: (vars: { code: string; language: string }) =>
      review({ data: { ...vars, model } }),
    onSuccess: () => setActiveTab("bugs"),
  });

  const repoMutation = useMutation({
    mutationFn: (vars: { url: string; branch: string }) =>
      repoReview({ data: { url: vars.url, branch: vars.branch || undefined, model } }),
    onSuccess: () => setActiveTab("bugs"),
  });

  const testMutation = useMutation({
    mutationFn: async (vars: { code: string; language: string }) => {
      const { runGeneratedTests } = await import("@/lib/run-tests");
      const plan = await genTests({ data: { ...vars, model } });
      return runGeneratedTests(plan);
    },
  });

  const suiteMutation = useMutation({
    mutationFn: async (vars: { code: string; language: string }) => {
      const { runTestSuite } = await import("@/lib/run-suite");
      const suite = await genSuite({ data: { ...vars, model } });
      return runTestSuite(suite);
    },
  });

  const pipelineMutation = useMutation({
    mutationFn: (vars: { code: string; language: string }) =>
      runCi({ data: { ...vars, model } }),
  });

  const archMutation = useMutation({
    mutationFn: (vars: { code: string; language: string; tree?: string }) =>
      analyzeArch({ data: { ...vars, model } }),
  });

  useEffect(() => {
    if (autoRan.current) return;
    if (code && code.trim()) {
      autoRan.current = true;
      setTested({ code, language: lang || "Other" });
      mutation.mutate({ code, language: lang || "Other" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, lang]);

  const handleSubmit = (c: string, language: string) => {
    setTested({ code: c, language });
    mutation.mutate({ code: c, language });
  };

  const handleRepoSubmit = (url: string, branch: string) => {
    setTested({ code: "", language: "" });
    repoMutation.mutate({ url, branch });
  };

  const data = mutation.data ?? repoMutation.data;
  const isPending = mutation.isPending || repoMutation.isPending;

  // Resolve the code that edge-case tests should run against.
  const repoCode = repoMutation.data?.structure?.keyFileContents ?? "";
  const repoLang =
    repoMutation.data?.structure?.languages?.[0]?.name ?? repoMutation.data?.language ?? "JavaScript";
  const testCode = tested.code || repoCode;
  const testLang = tested.code ? tested.language : repoLang;
  const canRunTests = testCode.trim().length > 0;

  const handleRunTests = () => {
    if (!canRunTests) return;
    testMutation.mutate({ code: testCode, language: testLang });
  };

  const handleRunSuite = () => {
    if (!canRunTests) return;
    suiteMutation.mutate({ code: testCode, language: testLang });
  };

  const handleRunPipeline = () => {
    if (!canRunTests) return;
    pipelineMutation.mutate({ code: testCode, language: testLang });
  };

  const repoTree = repoMutation.data?.structure?.tree?.join("\n");
  const handleRunArch = () => {
    if (!canRunTests) return;
    archMutation.mutate({ code: testCode, language: testLang, tree: repoTree });
  };

  const testError =
    testMutation.error instanceof Error
      ? testMutation.error.message
      : testMutation.error
        ? "Test run failed."
        : null;

  const suiteError =
    suiteMutation.error instanceof Error
      ? suiteMutation.error.message
      : suiteMutation.error
        ? "Test suite failed."
        : null;

  const pipelineError =
    pipelineMutation.error instanceof Error
      ? pipelineMutation.error.message
      : pipelineMutation.error
        ? "Pipeline run failed."
        : null;

  const archError =
    archMutation.error instanceof Error
      ? archMutation.error.message
      : archMutation.error
        ? "Architecture analysis failed."
        : null;

  const handleCopy = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(buildMarkdownReport(data));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const activeError = mutation.error ?? repoMutation.error;
  const errorMessage =
    activeError instanceof Error ? activeError.message : activeError ? "Something went wrong." : null;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col bg-cs-bg font-sans text-cs-text">
      {isPending ? (
        <ScanningState />
      ) : data ? (
        <ResultView
          result={data}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onReviewAgain={() => {
            mutation.reset();
            repoMutation.reset();
            testMutation.reset();
            suiteMutation.reset();
            pipelineMutation.reset();
          }}
          onCopy={handleCopy}
          copied={copied}
          onRunTests={handleRunTests}
          testPending={testMutation.isPending}
          testResult={testMutation.data ?? null}
          testError={testError}
          canRunTests={canRunTests}
          onRunSuite={handleRunSuite}
          suitePending={suiteMutation.isPending}
          suiteRun={suiteMutation.data ?? null}
          suiteError={suiteError}
          onRunPipeline={handleRunPipeline}
          pipelinePending={pipelineMutation.isPending}
          pipelineResult={pipelineMutation.data ?? null}
          pipelineError={pipelineError}
        />
      ) : (
        <>
          <TopBar language="—" grade="—" />
          <ManualInput onSubmit={handleSubmit} onRepoSubmit={handleRepoSubmit} error={errorMessage} />
        </>
      )}
    </div>
  );
}

function ResultView({
  result,
  activeTab,
  setActiveTab,
  onReviewAgain,
  onCopy,
  copied,
  onRunTests,
  testPending,
  testResult,
  testError,
  canRunTests,
  onRunSuite,
  suitePending,
  suiteRun,
  suiteError,
  onRunPipeline,
  pipelinePending,
  pipelineResult,
  pipelineError,
}: {
  result: import("@/lib/codescan-types").ReviewResult;
  activeTab: ViewTab;
  setActiveTab: (c: ViewTab) => void;
  onReviewAgain: () => void;
  onCopy: () => void;
  copied: boolean;
  onRunTests: () => void;
  testPending: boolean;
  testResult: import("@/lib/codescan-types").TestRunResult | null;
  testError: string | null;
  canRunTests: boolean;
  onRunSuite: () => void;
  suitePending: boolean;
  suiteRun: import("@/lib/codescan-types").TestSuiteRun | null;
  suiteError: string | null;
  onRunPipeline: () => void;
  pipelinePending: boolean;
  pipelineResult: import("@/lib/codescan-types").PipelineResult | null;
  pipelineError: string | null;
}) {
  const items = result.findings.filter((f) => f.category === activeTab);
  const tabLabel = CATEGORIES.find((c) => c.key === activeTab)?.label ?? "";

  return (
    <>
      <TopBar language={result.language} grade={result.grade} />
      {result.structure && <RepoStructurePanel structure={result.structure} />}
      {result.summary && (
        <p className="border-b border-cs-border bg-cs-surface px-4 py-3 text-sm leading-relaxed text-cs-muted md:px-6">
          {result.summary}
        </p>
      )}
      <CategoryTabs
        active={activeTab}
        onChange={setActiveTab}
        findings={result.findings}
        edgeStatus={testResult ? (testResult.failed === 0 ? "passed" : "failed") : null}
        suiteStatus={suiteRun ? (suiteRun.failed === 0 ? "passed" : "failed") : null}
        pipelineStatus={pipelineResult ? (pipelineResult.success ? "passed" : "failed") : null}
      />
      {activeTab === "edge" ? (
        <div className="flex-1 overflow-y-auto">
          <TestPanel
            onRun={onRunTests}
            isPending={testPending}
            result={testResult}
            error={testError}
            canRun={canRunTests}
          />
        </div>
      ) : activeTab === "suite" ? (
        <div className="flex-1 overflow-y-auto">
          <TestSuitePanel
            onRun={onRunSuite}
            isPending={suitePending}
            run={suiteRun}
            error={suiteError}
            canRun={canRunTests}
          />
        </div>
      ) : activeTab === "cicd" ? (
        <div className="flex-1 overflow-y-auto">
          <PipelinePanel
            onRun={onRunPipeline}
            isPending={pipelinePending}
            result={pipelineResult}
            error={pipelineError}
            canRun={canRunTests}
          />
        </div>
      ) : (
      <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.18 }}
            className="grid grid-cols-1 gap-3 xl:grid-cols-2"
          >
            {items.length === 0 ? (
              <div className="col-span-full flex flex-col items-center gap-2 py-12 text-center">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-cs-success/15 text-lg text-cs-success">
                  ✓
                </span>
                <p className="text-sm text-cs-muted">No {tabLabel.toLowerCase()} issues found</p>
              </div>
            ) : (
              items.map((f, i) => <FindingCard key={i} finding={f} index={i} />)
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      )}
      <BottomBar onReviewAgain={onReviewAgain} onCopy={onCopy} copied={copied} />
    </>
  );
}

function RepoStructurePanel({
  structure,
}: {
  structure: import("@/lib/codescan-types").RepoStructure;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-cs-border bg-cs-surface px-4 py-3 md:px-6">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate font-mono text-sm font-bold text-cs-text">
          {structure.repo}
          <span className="ml-1.5 font-normal text-cs-muted">@ {structure.branch}</span>
        </p>
        <span className="shrink-0 rounded-md border border-cs-border bg-cs-surface-2 px-2.5 py-1 font-mono text-xs text-cs-muted">
          {structure.totalFiles} files
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {structure.languages.slice(0, 8).map((l) => (
          <span
            key={l.name}
            className="rounded-md bg-cs-info/15 px-2 py-1 font-mono text-xs text-cs-info"
          >
            {l.name} · {l.count}
          </span>
        ))}
      </div>
      {structure.filesReviewed.length > 0 && (
        <p className="mt-2 text-xs text-cs-muted">
          Deep-reviewed: {structure.filesReviewed.join(", ")}
        </p>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-2 font-mono text-xs text-cs-info hover:underline"
      >
        {open ? "Hide file tree" : "Show file tree"}
      </button>
      {open && (
        <pre className="mt-2 max-h-64 overflow-auto rounded-md border border-cs-border bg-cs-bg p-3 font-mono text-xs leading-relaxed text-cs-muted">
          {structure.tree.join("\n")}
        </pre>
      )}
    </div>
  );
}
