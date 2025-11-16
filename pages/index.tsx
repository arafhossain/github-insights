import { ICommitData } from "@/models/ICommitData";
import { buildLLMPayload } from "@/utils/functions";
import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import InsightsPage, { SummaryListItem } from "./insights";
import Image from "next/image";
import ControlBar from "./controlbar";
import Spinner from "./spinner";
import { handleFetchCommits } from "@/utils/helpers";
import { IShaContent } from "@/models/IShaContent";
import { IInsight } from "@/models/IInsight";

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

export type CommitForLLM = {
  sha: string;
  message: string;
  date: string;
  files: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    patch?: string;
  }>;
};

export interface ICommitContainer {
  repoName: string;
  sha_content: IShaContent[];
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
  const [list, setList] = useState<SummaryListItem[]>([]);
  // const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    setAuthenticating(false);
  }, []);

  useEffect(() => {
    if (!session) return;
    getInsights();
  }, [session]);

  useEffect(() => {
    if (session && newInsightsLoaded) {
      getInsights();
    }
  }, [newInsightsLoaded, session]);

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
      repos.map((name) =>
        handleFetchCommits(name, sinceISO, session?.accessToken ?? "")
      )
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

      const INSIGHTS: IInsight = await generateInsights(
        PAYLOADS,
        sinceISO,
        pastNumDays
      );

      if (INSIGHTS && !INSIGHTS.error) {
        saveInsights(INSIGHTS).then(() => {
          setNewInsightsLoaded(true);
        });
      } else {
        console.error("No commits to parse!");
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

  async function saveInsights(insights: IInsight) {
    return await fetch("/api/save-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(insights),
    })
      .then(() => {
        console.log("Saved insights!");
      })
      .catch((err) => {
        console.error("Couldnt save insights: ", err);
      });
  }

  const getInsights = async () => {
    try {
      // setLoadingList(true);
      const res = await fetch("/api/summaries");
      const data = await res.json();

      setList(data.items ?? []);
    } finally {
      // setLoadingList(false);
      setNewInsightsLoaded(false);
    }
  };

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
                <Spinner />
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
            className="flex items-center justify-end border-b border-white/10 px-4 py-3 mb-3"
            style={{ backgroundColor: "#260c11" }}
          >
            <div className="flex items-center space-x-3">
              <p className="text-sm text-gray-400">
                Signed in as{" "}
                <span className="text-[#e54a66] font-semibold">
                  {session.user?.email}
                </span>
              </p>
              <span className="h-4 border-l-2 border-white/20"></span>{" "}
              <button
                onClick={() => signOut()}
                className="text-gray-400 hover:text-white transition cursor-pointer"
                title="Sign out"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                  />
                </svg>
              </button>
            </div>
          </header>
          <ControlBar
            onGenerate={fetchCommits}
            loadingInsights={loadingInsights}
            list={list}
          />
          <br />
          {!list || list.length === 0 ? (
            <div className="relative flex flex-col items-center justify-center h-[60vh] text-center">
              <img
                src="./assets/version-control.png"
                alt="Background"
                className="absolute inset-0 w-full h-full object-contain opacity-10 brightness-[2] invert-[0.4] contrast-[1.1] pointer-events-none"
              />
              <div className="z-10">
                <h2 className="text-xl font-semibold text-gray-200 mb-2">
                  No summaries yet
                </h2>
                <p className="text-gray-400 text-sm mb-4">
                  Select up to 3 repositories and click{" "}
                  <span className="text-[#e54a66] font-semibold">Generate</span>{" "}
                  to create your first summary.
                </p>
              </div>
            </div>
          ) : (
            <InsightsPage
              list={list}
              getInsights={() => {
                getInsights();
              }}
            />
          )}
        </main>
      )}
    </div>
  );
}
