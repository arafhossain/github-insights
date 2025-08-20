import { buildPrompt } from "@/utils/functions";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req:NextApiRequest, res: NextApiResponse) {
    const {sections} = req.body as {sections: {repo:string; payload: any[]}[]};
    if(!Array.isArray(sections) || sections.length === 0) {
        return res.status(400).json({error: "No sections provided"});
    }

    const prompt = buildPrompt(sections);

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        { role: "system", content: "You write concise, technical engineering summaries." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if(!resp.ok) return res.status(500).json({error: "LLM Error", detail: JSON.parse(await resp.text())});
  const json = await resp.json();
  const summary = json.choices?.[0]?.message?.content ?? "";
  return res.status(200).json({summary});

}