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