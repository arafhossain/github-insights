import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { generateSummaryForRepos } from "@/lib/generateSummary"; // the logic we already extracted

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // verify the request comes from Vercel Cron
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    // Example: get all active users or just your own account
    const users = await prisma.user.findMany({ where: { autoGenerate: true } });

    for (const user of users) {
      console.log(`Running weekly summary for ${user.email}`);
      await generateSummaryForRepos(user.id);
    }

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
