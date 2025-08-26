import { error } from "console";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "No authorization header provided" });
  }

  const token = authHeader.split(" ")[1];
  const { fullRepoName, sinceISO } = req.body;

  if (!fullRepoName) {
    return res.status(400).json({ error: "Missing full repo name." });
  }

  if (!sinceISO) {
    return res
      .status(400)
      .json({ error: "Missing start date for commit range." });
  }

  try {
    const commitRes = await fetch(
      `https://api.github.com/repos/${fullRepoName}/commits?since=${sinceISO}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    if (!commitRes.ok) {
      return res
        .status(commitRes.status)
        .json({ error: "Github API Error", status: commitRes.status });
    }

    const commits = await commitRes.json();

    res.status(200).json({ commits });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
