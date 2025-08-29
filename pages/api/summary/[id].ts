import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

  if (req.method !== "GET" && req.method !== "DELETE") return res.status(405).json({ error: "Method not allowed" });

  const { id } = req.query;
  if (!id || typeof id !== "string") return res.status(400).json({ error: "Missing id" });

  try {
    if(req.method === "GET") {
      const row = await prisma.summary.findUnique({ where: { id } });
      if (!row) return res.status(404).json({ error: "Not found" });
      res.status(200).json(row);
    } else if (req.method === "DELETE") {
      await prisma.summary.delete({where: {id}})
      res.status(200).json({ ok: true });
    }
  } catch (e: any) {
    res.status(500).json({ error: "DB Error", detail: e?.message || String(e) });
  }
}