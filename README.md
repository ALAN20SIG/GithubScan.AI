# CodeScan AI

AI-powered code review for bugs, security vulnerabilities, quality issues, and improvement suggestions. Supports manual code input and full GitHub repository analysis with automated edge-case testing.

![Tech Stack](https://img.shields.io/badge/TanStack%20Start-v1-blue)
![React](https://img.shields.io/badge/React-19-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6)
![Tailwind](https://img.shields.io/badge/Tailwind%20CSS-4-06B6D4)

---

## Features

### 1. AI Code Review
Submit any code snippet or fetch an entire GitHub repository for a comprehensive AI-powered review. Reviews analyze across four categories:

| Category | Description |
|----------|-------------|
| **Bugs** | Logic errors, potential runtime exceptions, incorrect behavior |
| **Security** | Vulnerabilities, injection risks, unsafe patterns |
| **Quality** | Code smell, maintainability, architecture concerns |
| **Suggestions** | Performance improvements, better practices, refactoring ideas |

Each finding includes:
- Severity level (Critical / Warning / Info)
- Title and detailed description
- Affected line number (when applicable)
- Actionable fix suggestion
- Overall letter grade (A+ through F)

### 2. GitHub Repository Analysis
Paste any public GitHub repo URL and CodeScan AI will:
- Fetch the full repository file tree
- Identify language distribution
- Intelligently select up to 6 key source files (entry points, routers, configs)
- Deep-review architecture, structure, and code quality
- Surface repository-wide security and quality issues

### 3. Edge-Case Testing (JS/TS)
After any review, run automated edge-case tests that:
- Generate boundary-condition test cases via AI
- Execute tests safely in the browser sandbox
- Report pass/fail status for each individual test
- Show detailed error messages for failures
- **Save results** as a downloadable text report

Tests cover:
- Empty / null / undefined inputs
- Boundary values and edge conditions
- Large values and overflow scenarios
- Tricky control-flow paths

### 4. Export & Share
- Copy the full review report as Markdown to clipboard
- Save edge-case test results as `.txt` files

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [TanStack Start](https://tanstack.com/start) (v1) — Full-stack React with SSR |
| UI Library | React 19 |
| Language | TypeScript 5.8 (strict mode) |
| Styling | Tailwind CSS v4 |
| Components | Radix UI primitives + shadcn/ui |
| Animation | Framer Motion |
| State & Data | TanStack Query |
| AI Gateway | Lovable AI Gateway (Gemini 3 Flash) |
| Validation | Zod |
| Build Tool | Vite 7 |

---

## Project Structure

```
src/
├── routes/
│   ├── __root.tsx              # Root layout (HTML shell)
│   ├── index.tsx               # Main page — review UI, results, test panel
│   └── routeTree.gen.ts        # Auto-generated route tree (do not edit)
├── components/
│   └── codescan/
│       ├── TopBar.tsx          # Header with language & grade
│       ├── ManualInput.tsx     # Code editor + GitHub repo input form
│       ├── CategoryTabs.tsx    # Tab navigation (Bugs / Security / Quality / Suggestions)
│       ├── FindingCard.tsx     # Individual review finding card
│       ├── ScanningState.tsx   # Loading skeleton animation
│       ├── TestPanel.tsx       # Edge-case test runner & results display
│       └── BottomBar.tsx       # Footer actions (Review again, Copy report)
├── lib/
│   ├── codescan-types.ts       # Shared TypeScript interfaces
│   ├── review.functions.ts     # Server function: single-file AI review
│   ├── repo-review.functions.ts# Server function: GitHub repo fetch + review
│   ├── test-runner.functions.ts# Server function: AI-generated edge-case tests
│   ├── run-tests.ts            # Browser sandbox test executor
│   ├── report.ts               # Markdown report builder
│   └── ai-gateway.server.ts  # AI provider configuration (server-only)
├── router.tsx                  # TanStack Router setup
└── styles.css                  # Tailwind CSS entry + design tokens
```

---

## Getting Started

### Prerequisites
- [Bun](https://bun.sh/) (recommended) or Node.js 20+

### Installation

```bash
# Install dependencies
bun install

# Start development server
bun dev
```

The app will be available at `http://localhost:3000`.

### Environment Variables

Create a `.env` file in the project root:

```env
# Required — AI review & test generation
LOVABLE_API_KEY=your_lovable_ai_gateway_key

# Optional — only needed if using Supabase/Lovable Cloud features
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

> **Note:** `LOVABLE_API_KEY` is required for the AI review features to work.

---

## Usage

### Manual Code Review
1. Paste your code into the editor
2. Select the programming language
3. Click **Review code**
4. Browse findings by category (Bugs, Security, Quality, Suggestions)
5. Click **Run tests** to generate and execute edge-case tests (JS/TS only)
6. Click **Save results** to download the test report

### Repository Review
1. Paste a public GitHub repository URL (e.g., `https://github.com/owner/repo`)
2. Optionally specify a branch (defaults to the repo's default branch)
3. Click **Review repository**
4. View the file tree, language breakdown, and AI findings
5. Run edge-case tests on the key files fetched from the repo

### Keyboard Shortcuts
| Action | Shortcut |
|--------|----------|
| Submit review | `Ctrl + Enter` (in code editor) |

---

## Architecture Notes

### Server Functions (`createServerFn`)
All AI operations run server-side via TanStack Start server functions:
- **`reviewCode`** — Analyzes a single code snippet
- **`reviewRepo`** — Fetches GitHub repo metadata + key files, then runs AI analysis
- **`generateEdgeCaseTests`** — Generates a JSON test plan with runnable JS assertions

These functions use the Lovable AI Gateway (Gemini 3 Flash) and return strictly-typed JSON responses.

### Client-Side Test Execution
Edge-case tests are executed in the **browser** (not the server) via a sandboxed `new Function()` approach with:
- 3-second timeout per test (`Promise.race`)
- Safe isolation — no DOM, network, or filesystem access
- Only supports JavaScript/TypeScript code that can be transpiled to plain JS

### GitHub Integration
Repository fetching uses the public GitHub API and raw content endpoints:
- **API calls:** `https://api.github.com/repos/{owner}/{repo}`
- **File tree:** `https://api.github.com/repos/{owner}/{repo}/git/trees/{branch}?recursive=1`
- **Raw files:** `https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}`

No GitHub token is required for public repositories. Rate limits apply.

---

## Supported Languages

| Language | Review | Repo Analysis | Edge-Case Tests |
|----------|--------|---------------|-----------------|
| JavaScript | ✅ | ✅ | ✅ |
| TypeScript | ✅ | ✅ | ✅ |
| Python | ✅ | ✅ | ❌ |
| Go | ✅ | ✅ | ❌ |
| Rust | ✅ | ✅ | ❌ |
| Java | ✅ | ✅ | ❌ |
| C / C++ | ✅ | ✅ | ❌ |
| Ruby | ✅ | ✅ | ❌ |
| PHP | ✅ | ✅ | ❌ |
| C# | ✅ | ✅ | ❌ |
| Swift | ✅ | ✅ | ❌ |
| Kotlin | ✅ | ✅ | ❌ |

> Edge-case tests require JS/TS because they execute in a browser JavaScript sandbox.

---

## Scripts

| Command | Description |
|---------|-------------|
| `bun dev` | Start development server with hot reload |
| `bun run build` | Production build |
| `bun run build:dev` | Development build |
| `bun run preview` | Preview production build locally |
| `bun run lint` | Run ESLint |
| `bun run format` | Format code with Prettier |

---

## Design Tokens

The app uses a custom dark-themed color system defined in `src/styles.css`:

| Token | Purpose |
|-------|---------|
| `--cs-bg` | Page background |
| `--cs-surface` | Card / panel surfaces |
| `--cs-text` | Primary text |
| `--cs-muted` | Secondary / helper text |
| `--cs-info` | Accent / action color |
| `--cs-success` | Positive states (passing tests) |
| `--cs-critical` | Negative states (failures, critical issues) |
| `--cs-warning` | Warning severity |

---

## License

MIT
