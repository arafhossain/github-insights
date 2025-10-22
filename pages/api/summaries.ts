import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const take = Math.min(parseInt(String(req.query.take || "20"), 10), 100);
  
    const items = await prisma.summary.findMany({
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true, createdAt: true, repos: true, sinceISO: true, content: true,
        model: true, promptTok: true, compTok: true, totalTok: true, costUSD: true
      },
    });
  
    res.status(200).json({ items });

  } catch(e) {
    res.status(500).json({ error: "DB Error", detail: e instanceof Error ? e.message : String(e) });
  }

}