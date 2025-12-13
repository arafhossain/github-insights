import { ICommitData } from "@/models/ICommitData";
import { buildLLMPayload } from "@/utils/functions";
import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import InsightsPage from "./insights";
import Image from "next/image";
import ControlBar from "./controlbar";
import Spinner from "./spinner";
import {
  fetchSHAContent,
  generateInsights,
  getInsights,
  handleFetchCommits,
  saveInsights,
} from "@/utils/helpers";
import { IShaContent } from "@/models/IShaContent";
import { IInsight, IInsightResponse } from "@/models/IInsight";
import toast from "react-hot-toast";

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
  const [list, setList] = useState<IInsight[]>([]);

  useEffect(() => {
    setAuthenticating(false);
  }, []);

  useEffect(() => {
    if (!session) return;
    fetchAndSetInsights();
  }, [session]);

  useEffect(() => {
    if (session && newInsightsLoaded) {
      fetchAndSetInsights();
    }
  }, [newInsightsLoaded, session]);

  const fetchAndSetInsights = async () => {
    const INSIGHTS = await getInsights();

    if (INSIGHTS.success && Array.isArray(INSIGHTS.data)) {
      setList(INSIGHTS.data);
    } else {
      setList([]);
    }
    setNewInsightsLoaded(false);
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
            repo.commit_sha.map((sha) =>
              fetchSHAContent(repo.repoName, sha, session?.accessToken ?? "")
            )
          );
          const content = {
            repoName: repo.repoName,
            sha_content: SHA_CONTENT_PER_REPO,
          };
          return content;
        })
      );

      const repoSections: IRepoSection[] = COMMIT_DATA.map(
        (commitContainer) => {
          return {
            repo: commitContainer.repoName,
            payload: buildLLMPayload(commitContainer),
          };
        }
      ).filter((commitData) => commitData.payload.length > 0);

      try {
        const INSIGHT_RESPONSE: IInsightResponse = await generateInsights(
          repoSections,
          sinceISO,
          pastNumDays
        );

        setLoadingInsights(false);

        if (INSIGHT_RESPONSE.empty) {
          toast("No commits found.");
          return;
        }

        if (!INSIGHT_RESPONSE.success) {
          toast.error(INSIGHT_RESPONSE.error || "Failed to generate insights.");
          return;
        }

        await saveInsights(INSIGHT_RESPONSE.data);
        setNewInsightsLoaded(true);
      } catch (err) {
        console.error("Error: ", err);
      }
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
                  to create your first insight.
                </p>
              </div>
            </div>
          ) : (
            <InsightsPage
              list={list}
              getInsights={() => {
                fetchAndSetInsights();
              }}
            />
          )}
        </main>
      )}
    </div>
  );
}
