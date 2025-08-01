import { signIn, signOut, useSession } from "next-auth/react";
import { useState } from "react";

export default function Home() {
  const sessionHook = useSession();
  const session = sessionHook?.data;

  const [fetchedRepoNames, setFetchedRepoNames] = useState(false);
  const [repoNames, setRepoNames] = useState<string[]>([]);
  const [selectedRepos, setSelectedRepos] = useState<string[]>([]);

  const handleFetchCommits = async () => {
    const res = await fetch("/api/fetch-commits", {
      headers: {
        Authorization: `Bearer ${session?.accessToken}`,
      },
    });

    const data = await res.json();

    if (data && Array.isArray(data.repos)) {
      setRepoNames(data.repos.slice());
      setFetchedRepoNames(true);
    }
  };

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
                handleFetchCommits();
              }}
              disabled={fetchedRepoNames}
            >
              Fetch commits
            </button>
          </div>
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
                          color: "blue",
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
