import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  const { code } = req.body ?? {};

  if (!code || code !== process.env.DEMO_CODE) {
    return res.status(403).json({
      success: false,
      error: "Invalid access code",
    });
  }

  res.setHeader(
    "Set-Cookie",
    `demo_ok=1; HttpOnly; Path=/; Max-Age=28800; SameSite=Lax${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`
  );

  return res.status(200).json({
    success: true,
  });
}