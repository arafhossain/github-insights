import { IRepoSection } from "@/pages";

function buildPrompt(repos: IRepoSection[]): string {
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
