import { useSession } from "next-auth/react";
import { useState, useMemo } from "react";
import { useRepos } from "@/hooks/useRepos";
import Spinner from "./spinner";
import { SummaryListItem } from "./insights";

export default function ControlBar({
  onGenerate,
  loadingInsights,
  list,
}: {
  onGenerate: (repos: string[], pastNumDays: number) => void;
  loadingInsights: boolean;
  list: SummaryListItem[];
}) {
  const { data: session } = useSession();
  const token = session?.accessToken as string | undefined;

  const { repos, loading, error, refresh } = useRepos(token);
  const [selected, setSelected] = useState<string[]>([]);
  const [sinceDays, setSinceDays] = useState(7);
  // const [model, setModel] = useState("gpt-4o-mini");
  const [automateModalOpen, setAutomateModalOpen] = useState(false);
  const [autoGenerate, setAutoGenerate] = useState(false);

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
        <div
          className={`flex items-center gap-3 flex-wrap ${
            !list || list.length === 0 ? "items-start" : null
          }`}
        >
          <div className="flex flex-col gap-1">
            <div className="text-sm text-gray-300">
              Select up to 3 repositories{" "}
              <span className="text-gray-500">({selected.length}/3)</span>
            </div>

            {!list ||
              (list.length === 0 && (
                <p className="text-xs text-gray-400">
                  Select repos and click{" "}
                  <span className="text-white font-medium">Generate</span> to
                  create your first summary.
                </p>
              ))}
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
            className="btn btn-secondary"
            disabled={loading}
          >
            {loading ? <Spinner /> : "Refresh"}
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

          <button
            onClick={() => {
              onGenerate(selected, sinceDays);
            }}
            disabled={!canGenerate}
            className={`${
              canGenerate ? "btn btn-primary" : "btn btn-disabled"
            }`}
            style={{ minWidth: "100px", justifyItems: "center" }}
          >
            {loadingInsights ? <Spinner /> : <span>Generate</span>}
          </button>
          <button
            onClick={() => {
              setAutomateModalOpen(true);
            }}
            className="btn btn-secondary"
          >
            ⚙️ Automate
          </button>
        </div>
      </div>
      {automateModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
          <div className="bg-[#1a1a1a] rounded-lg p-6 w-[400px] text-gray-200">
            <h2 className="text-lg font-semibold mb-3">
              Automatic Weekly Summaries
            </h2>
            <p className="text-sm mb-4 text-gray-400">
              When enabled, summaries for your selected repositories will run
              every week automatically.
            </p>

            <label className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={autoGenerate}
                onChange={(e) => setAutoGenerate(e.target.checked)}
                className="accent-[#b21e35]"
              />
              Enable weekly summaries
            </label>

            <div className="flex justify-end gap-2">
              <button
                className="btn btn-secondary"
                onClick={() => setAutomateModalOpen(false)}
              >
                Cancel
              </button>
              <button className="btn btn-primary" onClick={() => {}}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="border-b border-white/10" />
    </div>
  );
}
