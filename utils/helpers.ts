import { IRepoSection } from "@/pages";
import type { Session } from "next-auth";
import {prisma} from "@/lib/prisma";

export const handleFetchCommits = async (
  repoName: string,
  sinceISO: string,
  accessToken: string
) => {
  try {
    const res = await fetch("/api/fetch-commits", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        fullRepoName: repoName,
        sinceISO,
      }),
    });

    const data = await res.json();
    data.repoName = repoName;
    return data;
  } catch (err) {
    console.log("Error: ", err);
  }
};

export const generateInsights = async (
  sections: IRepoSection[],
  sinceISO: string,
  pastNumDays: number
) => {
  const res = await fetch("/api/generate-insights", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sections, sinceISO, pastNumDays }),
  });
  return res.json();
};

export async function getOrCreateUser(session:Session) {
  if(!session?.user?.email) throw new Error("No user email in session");

  return prisma.user.upsert({
    where: {email: session.user.email},
    update: {},
    create: {email: session.user.email}
  });
}

export async function saveAutomateRepos(repos: string[]) {
  return await fetch("/api/save-repos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({selectedRepos: repos}),
  })
    .then(async(res) => {
      const results = await res.json() as {
        success: true,
        succeeded: number,
        failed: number,
      };

      return results;
    })
    .catch((err) => {
      console.error("Save repos err: ", err);
    });
}

export async function fetchAutomateRepos() {
  try {
    const res = await fetch("/api/fetch-automate-repos");
    if (!res.ok) throw new Error("Failed to fetch automate repos");
    const data = await res.json();
    return data.repos || [];
  } catch (err) {
    console.error("fetchAutomateRepos error:", err);
    return [];
  }
}