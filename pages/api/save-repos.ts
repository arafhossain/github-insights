import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { getOrCreateUser } from "@/utils/helpers";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if(req.method !== "POST") return res.status(405).json({error: "Method not allowed"});

    try {

    const session = await getServerSession();

    if(!session?.user?.email) return res.status(401). json({error: "Unauthorized"})

    const user = await getOrCreateUser(session);

    if(!user) return res.status(404).json({error: "User not found"})

    const { selectedRepos } = req.body as { selectedRepos?: string[] };

    if (!Array.isArray(selectedRepos)) {
        return res.status(400).json({ error: "Invalid request body" });
    }

    await prisma.repo.updateMany({
        where: { userId: user.id },
        data: { isActive: false },
    });

    const results = await Promise.allSettled(
        selectedRepos.map((fullName:string) =>
            prisma.repo.upsert({
                where: { fullName_userId: { fullName, userId: user.id } },
                update: { isActive: true },
                create: { fullName, name: fullName.split("/")[1], userId: user.id, isActive: true },
            })
        )
    )
    console.log("Results: ", results);

    await prisma.user.update({
        where: { id: user.id },
        data: { autoGenerate: selectedRepos.length > 0 },
    });
    
    const succeeded = results.filter(r => r.status === "fulfilled").length;
    const failed = results.filter(r => r.status === "rejected").length;

    return res.status(200).json({
        success: true,
        succeeded,
        failed,
    });
    } catch (err) {
        console.error("Error saving repos:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}