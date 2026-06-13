import { createFileRoute } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { reviewCode } from "@/lib/review.functions";
import { reviewRepo } from "@/lib/repo-review.functions";
import { buildMarkdownReport } from "@/lib/report";
import type { Category } from "@/lib/codescan-types";
import { CATEGORIES } from "@/lib/codescan-types";
import { TopBar } from "@/components/codescan/TopBar";
import { CategoryTabs } from "@/components/codescan/CategoryTabs";
import { FindingCard } from "@/components/codescan/FindingCard";
import { ScanningState } from "@/components/codescan/ScanningState";
import { ManualInput } from "@/components/codescan/ManualInput";
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
  const [activeTab, setActiveTab] = useState<Category>("bugs");
  const [copied, setCopied] = useState(false);
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

  useEffect(() => {
    if (autoRan.current) return;
    if (code && code.trim()) {
      autoRan.current = true;
      mutation.mutate({ code, language: lang || "Other" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, lang]);

  const handleSubmit = (c: string, language: string) => {
    mutation.mutate({ code: c, language });
  };

  const handleRepoSubmit = (url: string, branch: string) => {
    repoMutation.mutate({ url, branch });
  };

  const data = mutation.data ?? repoMutation.data;
  const isPending = mutation.isPending || repoMutation.isPending;

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
          }}
          onCopy={handleCopy}
          copied={copied}
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
}: {
  result: import("@/lib/codescan-types").ReviewResult;
  activeTab: Category;
  setActiveTab: (c: Category) => void;
  onReviewAgain: () => void;
  onCopy: () => void;
  copied: boolean;
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
