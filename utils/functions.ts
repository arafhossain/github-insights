import { IRepoSection } from "@/pages";

const NOISE_SUBSTRINGS = [
  "node_modules/",
  "dist/",
  "build/",
  ".next/",
  "coverage/",
  ".turbo/",
  ".vercel/",
  "public/",
  ".map",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  ".min.js",
  ".min.css",
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
];

function isNoiseFile(filename: string) {
  const lower = filename.toLowerCase();
  return NOISE_SUBSTRINGS.some((p) => lower.includes(p));
}

// allow code-like files; include tests; exclude giant JSON by default
const CODE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rb|java|cs|cpp|c|rs|kt|php|sh|sql|mdx?)$/i;
const TEST_FILE = /\.(test|spec)\.(ts|tsx|js|jsx)$/i;
// small configs can be useful
const SMALL_CONFIG = /(tsconfig\.json|eslint|prettier|vite\.config|next\.config)/i;

export function isInteresting(
  filename: string,
  additions: number,
  deletions: number
) {
  if (isNoiseFile(filename)) return false;
  if (TEST_FILE.test(filename)) return true;
  if (SMALL_CONFIG.test(filename)) return true;
  if (CODE_EXT.test(filename)) return true;
  // optionally allow tiny JSON changes (e.g., app settings)
  if (filename.endsWith(".json") && additions + deletions <= 50) return true;
  return false;
}

export function sanitizePatch(patch?: string, maxChars = 4000) {
  if (!patch) return undefined;
  return patch.length <= maxChars
    ? patch
    : patch.slice(0, maxChars) + "\n...[truncated]";
}

export function buildPrompt(repos: IRepoSection[]): string {
  const repoBlocks = repos.map(({ repo, payload }) => {
    const commits = payload
      .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
      .slice(0, 20); // limit commits per repo

    const commitBlocks = commits
      .map((c) => {
        const fileBlocks = c.files
          .map((f) => {
            const meta = `# ${f.filename} (${f.status}, +${f.additions}/-${f.deletions})`;
            const diff = f.patch ? f.patch : "(no patch available)";
            return `${meta}\n${diff}`;
          })
          .join("\n\n");

        return [
          `--- COMMIT ${c.sha} ---`,
          `Date: ${c.date}`,
          `Message: ${c.message}`,
          fileBlocks,
        ].join("\n");
      })
      .join("\n\n");

    return [`### Repo: ${repo}`, commitBlocks].join("\n\n");
  });

  return [
    "You are a senior engineer creating a weekly development report.",
    "Be concise, technical, and theme-focused. Avoid file-by-file narration unless notable.",
    "",
    "Tasks:",
    "1) Summarize the week in 3–6 sentences (themes, rationale, impact).",
    "2) Provide 2–3 resume-ready bullets (action + outcome).",
    "3) List notable technical topics (e.g., OAuth, NextAuth, SSR, tests, DX).",
    "",
    repoBlocks.join("\n\n====\n\n"),
  ].join("\n");
}
