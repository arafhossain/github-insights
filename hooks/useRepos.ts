import { IRepo } from "@/models/IRepo";
import { useEffect, useState } from "react";

const TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

export function useRepos(token?: string) {
  const [reposResponse, setReposResponse] = useState<{
    repos: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  function getCachedRepos() {
    const cached = localStorage.getItem("reposCache");

    if (cached) {
      const { repos, ts } = JSON.parse(cached);
      if (Date.now() - ts < TTL) {
        console.log("setting repos in response", repos);

        setReposResponse(repos);
        return;
      }
    }
  }

  async function fetchRepos(force = false) {
    const cached = localStorage.getItem("reposCache");
    console.log(cached);

    if (!force && cached) {
      const { repos, ts } = JSON.parse(cached);
      if (Date.now() - ts < TTL) {
        console.log("setting repos in response", repos);

        setReposResponse(repos);
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch("/api/fetch-repos", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setReposResponse(data);
      localStorage.setItem(
        "reposCache",
        JSON.stringify({ repos: data, ts: Date.now() })
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getCachedRepos();
  }, []);

  return {
    reposResponse,
    loading,
    refresh: () => fetchRepos(true),
    getCachedRepos,
  };
}
