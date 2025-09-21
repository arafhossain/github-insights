import { ICommitData } from "@/models/ICommitData";
import { isInteresting, sanitizePatch } from "@/utils/functions";
import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import InsightsPage from "./insights";
import { useRepos } from "@/hooks/useRepos";
import { IRepo } from "@/models/IRepo";
import Image from "next/image";
import ControlBar from "./controlbar";

export interface IFileData {
  sha: string;
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  blob_url: string;
  raw_url: string;
  contents_url: string;
  patch: string;
}

type CommitForLLM = {
  sha: string;
  message: string;
  date: string;
  files: Array<{
    filename: string;
    status: string; // "modified" | "added" | ...
    additions: number;
    deletions: number;
    patch?: string; // truncated
  }>;
};

interface ICommitContainer {
  repoName: string;
  sha_content: any;
}

export interface IRepoSection {
  repo: string;
  payload: CommitForLLM[];
}

export default function Home() {
  const sessionHook = useSession();
  const session = sessionHook?.data;

  const [authenticating, setAuthenticating] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [newInsightsLoaded, setNewInsightsLoaded] = useState(false);

  useEffect(() => {
    setAuthenticating(false);
  }, []);

  const handleFetchCommits = async (repoName: string, sinceISO: string) => {
    try {
      const res = await fetch("/api/fetch-commits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.accessToken}`,
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

  const fetchSHAContent = async (fullRepoName: string, sha: string) => {
    try {
      const res = await fetch(
        `/api/fetch-sha?fullRepoName=${fullRepoName}&sha=${sha}`,
        {
          headers: {
            Authorization: `Bearer ${session?.accessToken}`,
          },
        }
      );

      const data = await res.json();
      return data;
    } catch (err) {
      console.log("Error: ", err);
    }
  };

  const fetchCommits = async (repos: string[], pastNumDays: number) => {
    setLoadingInsights(true);

    const sinceISO = new Date(
      Date.now() - pastNumDays * 24 * 60 * 60 * 1000
    ).toISOString();
    const ALL_COMMITS_BY_REPO = (await Promise.all(
      repos.map((name) => handleFetchCommits(name, sinceISO))
    )) as { commits: ICommitData[]; repoName: string }[];

    const REPO_SHA: { commit_sha: string[]; repoName: string }[] = [];

    if (Array.isArray(ALL_COMMITS_BY_REPO) && ALL_COMMITS_BY_REPO.length > 0) {
      ALL_COMMITS_BY_REPO.forEach((repoCommits) => {
        const COMMIT_SHA = repoCommits.commits.map(
          (commitData: ICommitData) => commitData.sha
        );
        const SHA_PER_REPO_DATA = {
          commit_sha: COMMIT_SHA,
          repoName: repoCommits.repoName,
        };

        REPO_SHA.push(SHA_PER_REPO_DATA);
      });
    }

    if (REPO_SHA.length > 0) {
      const COMMIT_DATA: ICommitContainer[] = await Promise.all(
        REPO_SHA.map(async (repo) => {
          const SHA_CONTENT_PER_REPO = await Promise.all(
            repo.commit_sha.map((sha) => fetchSHAContent(repo.repoName, sha))
          );
          const content = {
            repoName: repo.repoName,
            sha_content: SHA_CONTENT_PER_REPO,
          };
          return content;
        })
      );

      const PAYLOADS: IRepoSection[] = COMMIT_DATA.map((commitContainer) => {
        return {
          repo: commitContainer.repoName,
          payload: buildLLMPayload(commitContainer),
        };
      }).filter((commitData) => commitData.payload.length > 0);

      const INSIGHTS = await generateInsights(PAYLOADS, sinceISO, pastNumDays);

      if (INSIGHTS) {
        saveInsights(INSIGHTS);
        setNewInsightsLoaded(true);
      }
    }

    setLoadingInsights(false);
  };

  async function generateInsights(
    sections: IRepoSection[],
    sinceISO: string,
    pastNumDays: number
  ) {
    const res = await fetch("/api/generate-insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sections, sinceISO, pastNumDays }),
    });
    return res.json();
  }

  async function saveInsights(insights: any) {
    await fetch("/api/save-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(insights),
    }).then((res) => console.log("Saved insights!"));
  }

  function buildLLMPayload(commitContainer: ICommitContainer): CommitForLLM[] {
    const out: CommitForLLM[] = [];

    for (const commitDetails of commitContainer.sha_content ?? []) {
      const files: CommitForLLM["files"] = [];

      for (const f of commitDetails.files ?? []) {
        const churn = (f.additions ?? 0) + (f.deletions ?? 0);

        if (churn > 2000) continue;
        // filter noisy / huge files
        if (!isInteresting(f.filename, f.additions ?? 0, f.deletions ?? 0))
          continue;

        files.push({
          filename: f.filename,
          status: f.status,
          additions: f.additions,
          deletions: f.deletions,
          patch: sanitizePatch(f.patch, 4000),
        });
      }
      if (files.length === 0) continue;

      out.push({
        sha: commitDetails.sha,
        message: commitDetails.commit?.message ?? "",
        date: commitDetails.commit?.author?.date ?? "",
        files,
      });
    }

    return out;
  }

  return (
    <div>
      {!session ? (
        <div className="h-screen grid place-items-center">
          <button
            className="btn btn-primary"
            style={{ margin: "20px" }}
            onClick={() => {
              signIn("github");
              setAuthenticating(true);
            }}
          >
            {authenticating ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="opacity-25"
                    fill="none"
                  />
                  <path
                    d="M22 12a10 10 0 0 1-10 10"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="opacity-75"
                    fill="none"
                  />
                </svg>
                Redirecting…{" "}
              </>
            ) : (
              <>
                <Image
                  src="/assets/githubLogo.png"
                  alt="GitHub logo"
                  width={20}
                  height={20}
                />
                Login with GitHub
              </>
            )}
          </button>
        </div>
      ) : (
        <main>
          <header
            className="flex justify-end p-4"
            style={{ backgroundColor: "#260c11" }}
          >
            <p className="text-sm text-gray-400">
              Signed in as{" "}
              <span className="text-[#e54a66] font-semibold">
                {session.user?.email}
              </span>
            </p>
          </header>
          <ControlBar
            onGenerate={fetchCommits}
            loadingInsights={loadingInsights}
          />
          <br />
          <InsightsPage newInsightsLoaded={newInsightsLoaded} />
          <div>
            <button
              className="btn btn-primary"
              onClick={() => {
                signOut();
              }}
            >
              Sign out
            </button>
          </div>
        </main>
      )}
    </div>
  );
}
