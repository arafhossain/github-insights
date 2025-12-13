import { prisma } from "@/lib/prisma";
import { IInsightResponse } from "@/models/IInsight";
import { buildLLMPayload } from "@/utils/functions";
import {
  fetchSHAContent,
  generateInsights,
  getInsights,
  handleFetchCommits,
  saveInsights,
} from "@/utils/helpers";

export async function generateSummaryForRepos(
  userId: string,
  accessToken?: string,
  sinceDays = 7
) {
  const sinceISO = new Date(Date.now() - sinceDays * 86400000).toISOString();

  const repos = await prisma.repo.findMany({ where: { userId } });
  if (repos.length === 0) return;

  const sections: { repo: string; payload: any[] }[] = [];

  if (!accessToken) return;

  for (const repo of repos) {
    const commits = await handleFetchCommits(repo.name, sinceISO, accessToken);
    if (!commits?.length) continue;

    const shaContent = await Promise.all(
      commits.map((commit: any) =>
        fetchSHAContent(repo.fullName, commit.sha, accessToken)
      )
    );

    const payload = buildLLMPayload({
      sha_content: shaContent,
      repoName: repo.fullName,
    });

    if (payload.length) sections.push({ repo: repo.fullName, payload });
  }

  if (sections.length === 0) return;

  const INSIGHT_DATA: IInsightResponse = await generateInsights(
    sections,
    sinceISO,
    sinceDays
  );

  if (
    INSIGHT_DATA &&
    !INSIGHT_DATA.error &&
    INSIGHT_DATA.success &&
    INSIGHT_DATA.data
  ) {
    await saveInsights(INSIGHT_DATA.data);
  }

  const INSIGHTS = await getInsights();

  return INSIGHTS;
}
