import { useSession } from "next-auth/react";
import { useState, useMemo } from "react";
import { useRepos } from "@/hooks/useRepos";
import Spinner from "./spinner";
import {
  clearCode,
  fetchAutomateRepos,
  saveAutomateRepos,
  validateCode,
} from "@/utils/helpers";
import { IInsight } from "@/models/IInsight";
import toast from "react-hot-toast";

export default function ControlBar({
  onGenerate,
  loadingInsights,
  list,
}: {
  onGenerate: (repos: string[], pastNumDays: number) => void;
  loadingInsights: boolean;
  list: IInsight[];
}) {
  const { data: session } = useSession();
  const token = session?.accessToken as string | undefined;

  const { repos, loading, error, refresh } = useRepos(token);
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedAutomate, setSelectedAutomate] = useState<string[]>([]);
  const [automateModalOpen, setAutomateModalOpen] = useState(false);
  const [automateReposResponse, setAutoReposResponse] = useState<{
    succeeded: boolean;
    success: number;
    failed: number;
  } | null>(null);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [demoCode, setDemoCode] = useState("");
  const [sinceDays, setSinceDays] = useState(7);

  const [savingInsightAction, setSavingInsightAction] = useState(false);
  const [validCode, setValidCode] = useState(false);

  const canGenerate = selected.length >= 1 && selected.length <= 3 && !loading;

  const options: string[] = useMemo(() => repos ?? [], [repos]);

  const toggleSelect = (full: string, isAutomate = false) => {
    if (!isAutomate) {
      setSelected((prev) => {
        if (prev.includes(full)) return prev.filter((x) => x !== full);
        if (prev.length >= 3) return prev; // cap at 3
        return [...prev, full];
      });
    } else {
      setSelectedAutomate((prev) => {
        if (prev.includes(full)) return prev.filter((x) => x !== full);
        if (prev.length >= 3) return prev; // cap at 3
        return [...prev, full];
      });
    }
  };

  const openAutomateModal = async () => {
    setAutomateModalOpen(true);
    setSavingInsightAction(true);
    const existingRepos = await fetchAutomateRepos();
    setSelectedAutomate(existingRepos);
    setSavingInsightAction(false);
  };

  const handleSaveAutomation = async () => {
    setSavingInsightAction(true);

    try {
      const RESPONSE = await saveAutomateRepos(selectedAutomate);
      if (RESPONSE && RESPONSE.success) {
        setAutoReposResponse({
          succeeded: true,
          success: RESPONSE.succeeded,
          failed: RESPONSE.failed,
        });
      } else {
        setAutoReposResponse({ succeeded: false, success: 0, failed: 0 });
      }
    } catch (err) {
      console.error("Error: ", err);
      setAutoReposResponse({
        succeeded: false,
        success: 0,
        failed: 0,
      });
    } finally {
      setSavingInsightAction(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4">
      <div className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div className={`flex items-center gap-3 flex-wrap`}>
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
                  create your first insight.
                </p>
              ))}
          </div>
          <div className="relative" style={{ zIndex: 1000 }}>
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
          <button
            onClick={refresh}
            className="btn btn-secondary"
            disabled={loading}
          >
            {loading ? <Spinner /> : "Refresh"}
          </button>
        </div>

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
              setGenerateModalOpen(true);
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
              openAutomateModal();
            }}
            className="btn btn-secondary"
          >
            ⚙️ Automate
          </button>
        </div>
      </div>
      {generateModalOpen && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center"
          style={{ zIndex: 1000 }}
        >
          <div className="bg-[#1a1a1a] rounded-lg p-6 w-[420px] text-gray-200 shadow-xl border border-white/10">
            <h2 className="text-lg font-semibold mb-2">Generate Insights</h2>
            <p className="text-sm mb-4 text-gray-400">
              We’ll analyze your selected repositories and generate a concise
              summary of your recent work.
            </p>

            <div className="mb-4">
              <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">
                Demo Access Code
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="password"
                  value={demoCode}
                  onChange={(e) => setDemoCode(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-[#b21e35]"
                  placeholder="Enter access code"
                />
                <button
                  className={`btn ${
                    demoCode && demoCode.trim().length > 0
                      ? "btn-secondary"
                      : "btn-disabled"
                  }`}
                  disabled={!Boolean(demoCode && demoCode.trim().length > 0)}
                  onClick={async () => {
                    try {
                      await validateCode(demoCode);
                      toast.success("Demo code valid.");
                      setValidCode(true);
                    } catch (err) {
                      console.error("Err:", err);
                      await clearCode();
                      toast.error("Demo code invalid.");
                      setValidCode(false);
                    }
                  }}
                >
                  Validate
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Required to run AI parsing on this demo instance.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setGenerateModalOpen(false);
                }}
              >
                Cancel
              </button>
              <button
                className={`btn  ${
                  !validCode ? "btn-disabled" : "btn-primary"
                }`}
                disabled={!validCode}
                onClick={() => {
                  onGenerate(selected, sinceDays);
                  setGenerateModalOpen(false);
                }}
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}
      {automateModalOpen && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center"
          style={{ zIndex: 1000 }}
        >
          <div className="bg-[#1a1a1a] rounded-lg p-6 w-[420px] text-gray-200">
            <h2 className="text-lg font-semibold mb-3">
              Automatic Weekly Summaries
            </h2>
            <p className="text-sm mb-4 text-gray-400">
              Choose up to 3 repositories to summarize automatically each week.
            </p>

            {savingInsightAction && (
              <div className="mb-4 flex items-center justify-center">
                <Spinner />
              </div>
            )}

            {!savingInsightAction && (
              <div className="mb-4">
                <div className="relative" style={{ zIndex: 1000 }}>
                  <details className="group">
                    <summary className="min-w-[240px] cursor-pointer rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-left text-gray-200">
                      {loading
                        ? "Loading repos…"
                        : selectedAutomate.length
                        ? selectedAutomate
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
                        const checked = selectedAutomate.includes(option);
                        return (
                          <label
                            key={option}
                            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-gray-200 hover:bg-white/5"
                          >
                            <input
                              type="checkbox"
                              className="accent-[#b21e35]"
                              checked={checked}
                              onChange={() => toggleSelect(option, true)}
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

                {automateReposResponse && (
                  <div className="mt-3 border border-white/10 rounded-lg p-3 bg-black/30 text-sm">
                    {automateReposResponse.succeeded &&
                      automateReposResponse.failed === 0 && (
                        <div className="flex items-center gap-2 text-green-400">
                          <span>✅</span>
                          {automateReposResponse.success === 0 && (
                            <span>Cleared automation for all repos.</span>
                          )}
                          {automateReposResponse.success > 0 && (
                            <span>
                              Successfully saved {automateReposResponse.success}{" "}
                              repos for automation.
                            </span>
                          )}
                        </div>
                      )}

                    {automateReposResponse.succeeded &&
                      automateReposResponse.failed > 0 && (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-yellow-400">
                            <span>⚠️</span>
                            <span>
                              Some repos failed to save —{" "}
                              {automateReposResponse.success} succeeded,{" "}
                              {automateReposResponse.failed} failed.
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            You can retry saving them after checking your GitHub
                            connection.
                          </p>
                        </div>
                      )}

                    {!automateReposResponse.succeeded && (
                      <div className="flex items-center gap-2 text-red-400">
                        <span>❌</span>
                        <span>
                          Failed to save selected repos. Please try again.
                        </span>
                      </div>
                    )}

                    <div className="mt-3 flex justify-end">
                      <button
                        className="btn btn-secondary text-xs"
                        onClick={() => setAutoReposResponse(null)}
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setAutomateModalOpen(false);
                  setAutoReposResponse(null);
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveAutomation}
              >
                Save Automation
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="border-b border-white/10" />
    </div>
  );
}
