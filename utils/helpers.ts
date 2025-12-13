import { IInsight, IInsightsResponse } from "@/models/IInsight";
import { IRepoSection } from "@/pages";
import toast from "react-hot-toast";

export const handleFetchCommits = async (
  repoName: string,
  sinceISO: string,
  accessToken: string
) => {
  const url = "/api/fetch-commits";
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      fullRepoName: repoName,
      sinceISO,
    }),
  };

  const data = await apiFetch(url, options);

  return {
    ...data,
    repoName,
  };
};

export const generateInsights = async (
  sections: IRepoSection[],
  sinceISO: string,
  pastNumDays: number
) => {
  const url = "/api/generate-insights";
  const options = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sections, sinceISO, pastNumDays }),
  };

  return apiFetch(url, options);
};

export async function saveAutomateRepos(repos: string[]) {
  const url = "/api/save-repos";
  const options = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ selectedRepos: repos }),
  };

  return apiFetch(url, options);
}

export const fetchAutomateRepos = async () => {
  const url = "/api/fetch-automate-repos";
  try {
    const data = await apiFetch(url);
    return data.repos || [];
  } catch {
    return [];
  }
};

export async function saveInsights(insightData: IInsight | null) {
  try {
    await fetch("/api/save-insight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(insightData),
    });
    console.log("Saved insights!");
  } catch (err) {
    console.error("Couldnt save insights: ", err);
  }
}

export const getInsights = async (): Promise<IInsightsResponse> => {
  let data;
  try {
    const res = await fetch("/api/insights");
    data = await res.json();
  } finally {
    return data;
  }
};

export async function apiFetch(url: string, options?: RequestInit) {
  try {
    const res = await fetch(url, options);

    if (!res.ok) {
      let err: any;
      try {
        err = await res.json();
      } catch {}

      const msg =
        err?.error ||
        err?.message ||
        `Request to ${url} failed (${res.status})`;

      toast.error(msg);
      throw new Error(msg);
    }

    return res.json();
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Something went wrong.";
    toast.error(msg);
    throw error;
  }
}

export const fetchSHAContent = async (
  fullRepoName: string,
  sha: string,
  accessToken: string
) => {
  try {
    const res = await fetch(
      `/api/fetch-sha?fullRepoName=${fullRepoName}&sha=${sha}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await res.json();
    return data;
  } catch (err) {
    console.log("Error: ", err);
  }
};
