import { ICommitData } from "@/models/ICommitData";
import { isInteresting, sanitizePatch } from "@/utils/functions";
import { signIn, signOut, useSession } from "next-auth/react";
import { useState } from "react";

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

  const [fetchedRepoNames, setFetchedRepoNames] = useState(false);
  const [repoNames, setRepoNames] = useState<string[]>([]);
  const [selectedRepos, setSelectedRepos] = useState<string[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);

  const handleFetchRepos = async () => {
    setLoadingRepos(true);

    try {
      const res = await fetch("/api/fetch-repos", {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });

      const data = await res.json();

      if (data && Array.isArray(data.repos)) {
        setRepoNames(data.repos.slice());
        setFetchedRepoNames(true);
      }
    } catch (err) {
      console.log("Error: ", err);
    }

    setLoadingRepos(false);
  };

  const handleFetchCommits = async (repoName: string) => {
    try {
      const res = await fetch("/api/fetch-commits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
          fullRepoName: repoName,
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

  const fetchCommits = async () => {
    const ALL_COMMITS_BY_REPO = (await Promise.all(
      selectedRepos.map((name) => handleFetchCommits(name))
    )) as { commits: ICommitData[]; repoName: string }[];

    console.log(ALL_COMMITS_BY_REPO);

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
      });

      const INSIGHTS = await generateInsights(PAYLOADS);

      if (INSIGHTS) console.log(INSIGHTS.summary);
    }
  };

  async function generateInsights(sections: IRepoSection[]) {
    const res = await fetch("/api/generate-insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sections }),
    });
    return res.json();
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

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    if (!selectedRepos.includes(selected) && selectedRepos.length < 3) {
      const updated = [...selectedRepos, selected];
      setSelectedRepos(updated);
    }
  };

  const handleRemove = (repo: string) => {
    setSelectedRepos(selectedRepos.filter((r) => r !== repo));
  };

  return (
    <main>
      {!session ? (
        <button
          onClick={() => {
            signIn("github");
          }}
        >
          Login with Github
        </button>
      ) : (
        <>
          <p>Signed in as {session.user?.email}</p>
          <div>
            <button
              onClick={() => {
                handleFetchRepos();
              }}
              disabled={fetchedRepoNames}
            >
              Fetch repo names
            </button>
          </div>
          {loadingRepos && <div>Loading...</div>}
          {repoNames.length > 0 && (
            <div style={{ maxWidth: "400px", marginTop: "1rem" }}>
              <label htmlFor="repo-select" style={{ fontWeight: "bold" }}>
                Select up to 3 repositories:
              </label>
              <select
                id="repo-select"
                onChange={handleSelect}
                value=""
                style={{
                  display: "block",
                  width: "100%",
                  padding: "8px",
                  marginTop: "8px",
                  marginBottom: "8px",
                }}
              >
                <option value="" disabled>
                  -- Choose a repo --
                </option>
                {repoNames.map((repo) => (
                  <option
                    key={repo}
                    value={repo}
                    disabled={selectedRepos.includes(repo)}
                  >
                    {repo}
                  </option>
                ))}
              </select>

              {selectedRepos.length >= 3 && (
                <p style={{ color: "red", fontSize: "0.9rem" }}>
                  Maximum of 3 repositories selected.
                </p>
              )}

              {selectedRepos.length > 0 && (
                <ul style={{ paddingLeft: "1rem", marginTop: "8px" }}>
                  {selectedRepos.map((repo) => (
                    <li key={repo} style={{ marginBottom: "4px" }}>
                      {repo}{" "}
                      <button
                        onClick={() => handleRemove(repo)}
                        style={{
                          backgroundColor: "transparent",
                          color: "royalBlue",
                          border: "none",
                          cursor: "pointer",
                          marginLeft: "6px",
                        }}
                      >
                        ✕ Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {selectedRepos.length > 0 && (
            <button
              onClick={() => {
                fetchCommits();
              }}
            >
              Fetch Commits!
            </button>
          )}
          <div>
            <button
              onClick={() => {
                signOut();
              }}
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </main>
  );
}
