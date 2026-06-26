import { useState } from "react";
import { LANGUAGES } from "@/lib/codescan-types";

const SAMPLE = `function getUser(req, db) {
  const id = req.query.id;
  const result = db.query("SELECT * FROM users WHERE id = " + id);
  return result;
}`;

export function ManualInput({
  onSubmit,
  onRepoSubmit,
  error,
}: {
  onSubmit: (code: string, language: string) => void;
  onRepoSubmit: (url: string, branch: string) => void;
  error?: string | null;
}) {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState<string>("JavaScript");
  const [repoUrl, setRepoUrl] = useState("");
  const [repoBranch, setRepoBranch] = useState("");

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-4 md:px-6 lg:grid lg:grid-cols-[360px_1fr] lg:gap-6">
      {/* Left column — inputs */}
      <div className="flex flex-col gap-4">
        <p className="text-sm text-cs-muted">
          Paste code to get an AI-powered review with bugs, security, quality, and
          suggestions.
        </p>
        <div className="flex flex-col gap-2 rounded-lg border border-cs-border bg-cs-surface p-3">
          <label htmlFor="repo-url" className="text-xs font-medium text-cs-muted">
            Review an entire public GitHub repo
          </label>
          <input
            id="repo-url"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
            spellCheck={false}
            aria-label="Public GitHub repository URL"
            className="min-w-0 rounded-md border border-cs-border bg-cs-surface-2 px-3 py-2.5 font-mono text-xs text-cs-text outline-none placeholder:text-cs-muted focus:border-cs-info"
          />
          <div className="flex items-center gap-2">
            <input
              id="repo-branch"
              value={repoBranch}
              onChange={(e) => setRepoBranch(e.target.value)}
              placeholder="branch (default)"
              spellCheck={false}
              aria-label="Repository branch"
              className="min-w-0 flex-1 rounded-md border border-cs-border bg-cs-surface-2 px-3 py-2.5 font-mono text-xs text-cs-text outline-none placeholder:text-cs-muted focus:border-cs-info"
            />
            <button
              type="button"
              onClick={() => repoUrl.trim() && onRepoSubmit(repoUrl.trim(), repoBranch.trim())}
              disabled={!repoUrl.trim()}
              className="shrink-0 rounded-md bg-cs-info px-4 py-2.5 text-sm font-bold text-cs-bg transition-colors hover:bg-cs-info/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Scan repo
            </button>
          </div>
          <p className="text-xs text-cs-muted">
            Maps the file tree and deep-reviews key source files.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="language-select" className="sr-only">
            Programming language
          </label>
          <select
            id="language-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            aria-label="Programming language"
            className="rounded-md border border-cs-border bg-cs-surface-2 px-3 py-2.5 text-sm text-cs-text outline-none focus:border-cs-info"
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setCode(SAMPLE)}
            className="rounded-md border border-cs-border bg-cs-surface-2 px-3 py-2.5 text-sm text-cs-muted transition-colors hover:text-cs-text"
          >
            Sample
          </button>
        </div>
        {error && (
          <p className="rounded-md border border-cs-critical/30 bg-cs-critical/10 px-3 py-2 text-sm text-cs-critical">
            {error}
          </p>
        )}
      </div>

      {/* Right column — textarea */}
      <div className="flex flex-col gap-3">
        <label htmlFor="code-input" className="sr-only">
          Code to review
        </label>
        <textarea
          id="code-input"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="// Paste your code here..."
          spellCheck={false}
          aria-label="Code to review"
          className="min-h-64 flex-1 resize-none rounded-lg border border-cs-border bg-cs-surface p-4 font-mono text-sm text-cs-text outline-none placeholder:text-cs-muted focus:border-cs-info lg:min-h-0"
        />
        <button
          onClick={() => onSubmit(code, language)}
          disabled={!code.trim()}
          className="rounded-md bg-cs-info px-4 py-3 text-base font-bold text-cs-bg transition-colors hover:bg-cs-info/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Review Code
        </button>
      </div>
    </div>
  );
}
