import { buildPrompt } from "@/utils/functions";
import type { NextApiRequest, NextApiResponse } from "next";
import { CommitForLLM } from "..";

export default async function handler(req:NextApiRequest, res: NextApiResponse) {
    const {sections} = req.body as {sections: {repo:string; payload: CommitForLLM[]}[]};
    const {sinceISO, pastNumDays} = req.body;
    if(!Array.isArray(sections) || sections.length === 0) {
        return res.status(400).json({error: "No sections provided"});
    }

  const REPOS = sections.map((section) => section.repo.includes("/") ? section.repo.split("/")[1] : section.repo);
    
  const prompt = buildPrompt(sections, pastNumDays);
  
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
const usage = json.usage; // { prompt_tokens, completion_tokens, total_tokens } or undefined
const model = "gpt-4o-mini";

const inputCost  = (usage?.prompt_tokens ?? 0)     * 0.15 / 1_000_000;
const outputCost = (usage?.completion_tokens ?? 0) * 0.60 / 1_000_000;
const costUSD = Number((inputCost + outputCost).toFixed(6));

return res.status(200).json({
  summary,
  usage,
  costUSD,
  model,
  repos: REPOS ?? [],
  sinceISO: sinceISO ?? null,
});

}