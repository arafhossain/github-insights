import { useSession } from "next-auth/react";
import { useState, useMemo } from "react";
import { useRepos } from "@/hooks/useRepos";

export default function ControlBar({
  onGenerate,
}: {
  onGenerate: (repos: string[], pastNumDays: number) => void;
}) {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  const { repos, loading, error, refresh } = useRepos(token);
  const [selected, setSelected] = useState<string[]>([]);
  const [sinceDays, setSinceDays] = useState(7);
  // const [model, setModel] = useState("gpt-4o-mini");

  const canGenerate = selected.length >= 1 && selected.length <= 3 && !loading;

  const options: string[] = useMemo(() => repos ?? [], [repos]);

  const toggleSelect = (full: string) => {
    setSelected((prev) => {
      if (prev.includes(full)) return prev.filter((x) => x !== full);
      if (prev.length >= 3) return prev; // cap at 3
      return [...prev, full];
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-4">
      <div className="flex flex-wrap items-center justify-between gap-3 py-4">
        {/* Left group */}
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-300">
            Select up to 3 repositories{" "}
            <span className="text-gray-500">({selected.length}/3)</span>
          </div>

          <div className="relative">
            <details className="group">
              <summary className="min-w-[240px] cursor-pointer rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-left text-gray-200">
                {loading
                  ? "Loading repos…"
                  : selected.length
                  ? selected
                      .map((option) =>
                        option.includes("/")
                          ? option.substring(option.indexOf("/") + 1)
                          : option
                      )
                      .join(", ")
                  : "-- Choose repo --"}
              </summary>
              <div className="absolute z-10 mt-2 max-h-72 w-[320px] overflow-auto rounded-lg border border-white/10 bg-[#0f0f0f] p-2 shadow-lg">
                {error && (
                  <div className="px-2 py-1 text-sm text-red-300">
                    Error: {error}
                  </div>
                )}
                {!repos && !loading && (
                  <div className="px-2 py-1 text-sm text-gray-400">
                    No repos
                  </div>
                )}
                {options.map((option) => {
                  const checked = selected.includes(option);
                  return (
                    <label
                      key={option}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-gray-200 hover:bg-white/5"
                    >
                      <input
                        type="checkbox"
                        className="accent-[#b21e35]"
                        checked={checked}
                        onChange={() => toggleSelect(option)}
                      />
                      <span className="truncate">
                        {option.includes("/")
                          ? option.substring(option.indexOf("/") + 1)
                          : option}
                      </span>
                    </label>
                  );
                })}
              </div>
            </details>
          </div>

          {/* Refresh (manual) */}
          <button
            onClick={refresh}
            className="rounded-lg border border-[#b21e35]/70 bg-[#b21e35]/15 px-3 py-2 text-[#ffdfe6] hover:bg-[#b21e35]/25 transition"
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {/* Right group */}
        <div className="flex items-center gap-3">
          <select
            value={sinceDays}
            onChange={(e) => setSinceDays(Number(e.target.value))}
            className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-gray-200"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>

          {/* <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-gray-200"
          >
            <option value="gpt-4o-mini">gpt-4o-mini</option>
            <option value="gpt-4o">gpt-4o</option>
          </select> */}

          <button
            onClick={() => {
              onGenerate(selected, sinceDays);
            }}
            disabled={!canGenerate}
            className={`rounded-xl px-4 py-2 font-medium text-white ring-1 ring-[#e54a66]/30 transition
              ${
                canGenerate
                  ? "bg-[linear-gradient(180deg,#9a0f2a_0%,#7b0c22_100%)] hover:brightness-110 active:brightness-95"
                  : "bg-white/10 text-gray-400 cursor-not-allowed"
              }`}
          >
            Generate
          </button>
        </div>
      </div>

      <div className="border-b border-white/10" />
    </div>
  );
}
