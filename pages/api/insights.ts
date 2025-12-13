import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({
    success: false,
    error: "Method not allowed" 
  });

  try {
    const take = Math.min(parseInt(String(req.query.take || "20"), 10), 100);
  
    const items = await prisma.insight.findMany({
      orderBy: { createdAt: "desc" },
      take,
    });
  
    res.status(200).json({
      success: true,
      data: items
    });

  } catch(e) {
    res.status(500).json({
      success: false,
      error:e instanceof Error ? e.message : String(e),
      data: null,
    });
  }

}