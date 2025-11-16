import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/utils/helpers";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getServerSession } from "next-auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if(req.method !== "POST") return res.status(405).json({error: "Method not allowed"});


  const { summary, repos, sinceISO, model, usage, costUSD, userId } = req.body || {};
  if (!summary || !sinceISO || !model || !Array.isArray(repos)) {
    return res.status(400).json({ error: "Missing summary/model/sinceISO/repos" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) return res.status(401).json({ error: "Unauthorized" });
    const user = await getOrCreateUser(session);

    const row = await prisma.summary.create({
      data: {
        user: {
          connect: {
            id: user.id
          }
        },
        repos: repos.join(", "),
        since: sinceISO,
        model,
        content: summary,
        promptTok: usage?.prompt_tokens ?? null,
        compTok: usage?.completion_tokens ?? null,
        totalTok: usage?.total_tokens ?? null,
        costUSD: costUSD ?? null,
      },
    });
  
    return res.status(200).json({id: row.id})
  }  catch (err) {
        console.error("Error saving repos:", err);
        return res.status(500).json({ error: "Internal server error: ", err });
    }

}