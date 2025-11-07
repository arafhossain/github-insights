import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getOrCreateUser } from "@/utils/helpers";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) return res.status(401).json({ error: "Unauthorized" });

    const user = await getOrCreateUser(session);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Fetch repos currently set to auto-generate
    const activeRepos = await prisma.repo.findMany({
      where: { userId: user.id, isActive: true },
      select: { fullName: true, name: true },
      orderBy: { createdAt: "asc" },
    });

    return res.status(200).json({
      success: true,
      repos: activeRepos.map((r) => r.fullName),
    });
  } catch (err) {
    console.error("Error fetching automate repos:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}