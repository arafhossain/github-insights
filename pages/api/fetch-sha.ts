import { error } from "console";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { fullRepoName, sha } = req.query;

  console.log(fullRepoName, sha);

  if (!fullRepoName || !sha) {
    return res.status(400).json({ error: "Missing required query params" });
  }

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "No authorization header provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const response = await fetch(
      `https://api.github.com/repos/${fullRepoName}/commits/${sha}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: "Github API Error", status: response.status });
    }

    const shaData = await response.json();

    res.status(200).json(shaData);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
