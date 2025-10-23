import { getServerSession } from "next-auth";
import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email)
    return res.status(401).json({ error: "Unauthorized" });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user) return res.status(404).json({ error: "User not found" });

  if (req.method === "POST") {
    const { autoGenerate } = req.body;
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { autoGenerate },
    });
    return res.status(200).json(updated);
  }

  if (req.method === "GET") {
    return res.status(200).json({ autoGenerate: user.autoGenerate });
  }

  res.status(405).end();
}
