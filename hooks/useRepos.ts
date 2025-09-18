import { IRepo } from "@/models/IRepo";
import { useEffect, useState } from "react";
const TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

function readCache(): { repos: string[]; ts: number } | null {
  try {
    const raw = localStorage.getItem("reposCache");

    if (!raw) return null;
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed?.repos) || typeof parsed?.ts !== "number")
      return null;
    return parsed;
  } catch {
    return null;
  }
}

export function useRepos(token?: string) {
  const [repos, setRepos] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchRepos(force = false) {
    setError(null);
    // cache path
    if (!force) {
      const cached = readCache();
      if (cached && Date.now() - cached.ts < TTL) {
        setRepos(cached.repos);
        return;
      }
    }
    // network path
    setLoading(true);
    try {
      const res = await fetch("/api/fetch-repos", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`GitHub ${res.status}`);
      const data: { repos: string[] } = await res.json();

      setRepos(data.repos);
      localStorage.setItem(
        "reposCache",
        JSON.stringify({ repos: data.repos, ts: Date.now() })
      );
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("Failed to fetch repos");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchRepos(false);
  }, [token]);

  return { repos, loading, error, refresh: () => fetchRepos(true) };
}
