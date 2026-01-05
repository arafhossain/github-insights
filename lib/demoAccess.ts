import type { NextApiRequest, NextApiResponse } from "next";

export function requireDemoAccess(req: NextApiRequest, res: NextApiResponse) {
  const demoOk = req.cookies?.demo_ok;
  if (demoOk === "1") return true;

  res.status(403).json({ success: false, error: "Access code required" });
  return false;
}