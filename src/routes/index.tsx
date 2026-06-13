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
import { buildMarkdownReport } from "@/lib/report";
import type { Category } from "@/lib/codescan-types";
import { CATEGORIES } from "@/lib/codescan-types";
import { TopBar } from "@/components/codescan/TopBar";
import { CategoryTabs } from "@/components/codescan/CategoryTabs";
import { FindingCard } from "@/components/codescan/FindingCard";
import { ScanningState } from "@/components/codescan/ScanningState";
import { ManualInput } from "@/components/codescan/ManualInput";
import { TestPanel } from "@/components/codescan/TestPanel";
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
    ],
  }),
  component: Index,
});

function Index() {
  const { code, lang } = Route.useSearch();
  const review = useServerFn(reviewCode);
  const repoReview = useServerFn(reviewRepo);
  const genTests = useServerFn(generateEdgeCaseTests);
  const [activeTab, setActiveTab] = useState<Category>("bugs");
  const [copied, setCopied] = useState(false);
  const [tested, setTested] = useState<{ code: string; language: string }>({ code: "", language: "" });
  const autoRan = useRef(false);

  const mutation = useMutation({
    mutationFn: (vars: { code: string; language: string }) => review({ data: vars }),
    onSuccess: () => setActiveTab("bugs"),
  });

  const repoMutation = useMutation({
    mutationFn: (vars: { url: string; branch: string }) =>
      repoReview({ data: { url: vars.url, branch: vars.branch || undefined } }),
    onSuccess: () => setActiveTab("bugs"),
  });

  const testMutation = useMutation({
    mutationFn: async (vars: { code: string; language: string }) => {
      const { runGeneratedTests } = await import("@/lib/run-tests.client");
      const plan = await genTests({ data: vars });
      return runGeneratedTests(plan);
    },
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

  const testError =
    testMutation.error instanceof Error
      ? testMutation.error.message
      : testMutation.error
        ? "Test run failed."
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
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-cs-bg font-sans text-cs-text">
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
          }}
          onCopy={handleCopy}
          copied={copied}
          onRunTests={handleRunTests}
          testPending={testMutation.isPending}
          testResult={testMutation.data ?? null}
          testError={testError}
          canRunTests={canRunTests}
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
}: {
  result: import("@/lib/codescan-types").ReviewResult;
  activeTab: Category;
  setActiveTab: (c: Category) => void;
  onReviewAgain: () => void;
  onCopy: () => void;
  copied: boolean;
  onRunTests: () => void;
  testPending: boolean;
  testResult: import("@/lib/codescan-types").TestRunResult | null;
  testError: string | null;
  canRunTests: boolean;
}) {
  const items = result.findings.filter((f) => f.category === activeTab);
  const tabLabel = CATEGORIES.find((c) => c.key === activeTab)?.label ?? "";

  return (
    <>
      <TopBar language={result.language} grade={result.grade} />
      {result.structure && <RepoStructurePanel structure={result.structure} />}
      {result.summary && (
        <p className="border-b border-cs-border bg-cs-surface px-3 py-2 text-xs leading-relaxed text-cs-muted">
          {result.summary}
        </p>
      )}
      <TestPanel
        onRun={onRunTests}
        isPending={testPending}
        result={testResult}
        error={testError}
        canRun={canRunTests}
      />
      <CategoryTabs active={activeTab} onChange={setActiveTab} findings={result.findings} />
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col gap-2"
          >
            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
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
    <div className="border-b border-cs-border bg-cs-surface px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate font-mono text-xs font-bold text-cs-text">
          {structure.repo}
          <span className="ml-1.5 font-normal text-cs-muted">@ {structure.branch}</span>
        </p>
        <span className="shrink-0 rounded-md border border-cs-border bg-cs-surface-2 px-2 py-0.5 font-mono text-[10px] text-cs-muted">
          {structure.totalFiles} files
        </span>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {structure.languages.slice(0, 5).map((l) => (
          <span
            key={l.name}
            className="rounded-md bg-cs-info/15 px-1.5 py-0.5 font-mono text-[10px] text-cs-info"
          >
            {l.name} · {l.count}
          </span>
        ))}
      </div>
      {structure.filesReviewed.length > 0 && (
        <p className="mt-1.5 text-[10px] text-cs-muted">
          Deep-reviewed: {structure.filesReviewed.join(", ")}
        </p>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-1.5 font-mono text-[10px] text-cs-info hover:underline"
      >
        {open ? "Hide file tree" : "Show file tree"}
      </button>
      {open && (
        <pre className="mt-1.5 max-h-48 overflow-auto rounded-md border border-cs-border bg-cs-bg p-2 font-mono text-[10px] leading-relaxed text-cs-muted">
          {structure.tree.join("\n")}
        </pre>
      )}
    </div>
  );
}
