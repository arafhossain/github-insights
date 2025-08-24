import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if(req.method !== "POST") return res.status(405).json({error: "Method not allowed"});


  const { summary, repos, sinceISO, model, usage, costUSD, userId } = req.body || {};
  if (!summary || !sinceISO || !model || !Array.isArray(repos)) {
    return res.status(400).json({ error: "Missing summary/model/sinceISO/repos" });
  }

  const row = await prisma.summary.create({
    data: {
      userId: userId ?? null,
      repos: repos.join(","),
      sinceISO,
      model,
      content: summary,
      promptTok: usage?.prompt_tokens ?? null,
      compTok: usage?.completion_tokens ?? null,
      totalTok: usage?.total_tokens ?? null,
      costUSD: costUSD ?? null,
    },
  });

  return res.status(200).json({id: row.id})
}