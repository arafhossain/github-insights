import { useEffect, useState } from "react";

export type SummaryListItem = {
  id: string;
  createdAt: string;
  repos: string;
  sinceISO: string;
  model: string;
  promptTok?: number | null;
  compTok?: number | null;
  totalTok?: number | null;
  costUSD?: number | null;
};

type SummaryRow = {
  id: string;
  createdAt: string;
  repos: string;
  sinceISO: string;
  model: string;
  content: string;
  promptTok?: number | null;
  compTok?: number | null;
  totalTok?: number | null;
  costUSD?: number | null;
};

interface InsightsPageProps {
  list: SummaryListItem[];
  getInsights: () => void;
}

export default function InsightsPage({ list, getInsights }: InsightsPageProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SummaryRow | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (!list.length) {
      setSelectedId(null);
      setDetail(null);
    } else {
      setSelectedId(list[0].id);
    }
  }, [list]);

  useEffect(() => {
    if (!selectedId) return;
    (async () => {
      try {
        setLoadingDetail(true);
        const res = await fetch(`/api/summary/${selectedId}`);
        const row = await res.json();
        setDetail(row);
      } finally {
        setLoadingDetail(false);
      }
    })();
  }, [selectedId]);

  function copy(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  function formatDate(dateString: string) {
    const d = new Date(dateString);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  const deleteInsight = async (insightId: string): Promise<void> => {
    await fetch(`/api/summary/${insightId}`, { method: "DELETE" });
  };

  return (
    <div className="flex flex-col md:flex-row">
      <div className="md:w-1/3 w-full p-3 md:pl-6 md:max-h-[70vh]">
        <h2 className="text-lg font-semibold mb-2 text-white pl-1">
          Summaries
        </h2>
        <div
          className="border-2 border-white/20 rounded-lg max-h-[70vh] overflow-y-auto p-2"
          // style={{ justifyItems: "center" }}
        >
          {list.length === 0 ? (
            <div className="rounded-md p-3 text-gray-400 text-sm text-center">
              No summaries yet.
            </div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {list.map((item, itemIdx) => {
                const displayDate = formatDate(item.createdAt);
                const isActive = item.id === selectedId;
                return (
                  <li
                    key={item.id}
                    style={
                      list.length > 0 && itemIdx < list.length - 1
                        ? { marginBottom: "8px" }
                        : {}
                    }
                  >
                    <div
                      style={{
                        border: "1px solid #e5e7eb",
                        background: isActive ? "#f1f5f9" : "white",
                        width: "100%",
                        textAlign: "left",
                        padding: "8px 10px",
                        borderRadius: 6,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 14,
                          color: "black",
                          display: "flex",
                          justifyContent: "space-between",
                          cursor: "pointer",
                        }}
                      >
                        <div onClick={() => setSelectedId(item.id)}>
                          {displayDate}
                        </div>
                        <div
                          style={{ color: "#ff6b6b", fontWeight: "lighter" }}
                          onClick={() => {
                            deleteInsight(item.id).then(() => {
                              getInsights();
                            });
                          }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                            className="w-5 h-5"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </div>
                      </div>
                      <div
                        onClick={() => setSelectedId(item.id)}
                        style={{
                          textAlign: "left",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ fontSize: 12, color: "#475569" }}>
                          Repos: {item.repos}
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>
                          Since: {item.sinceISO?.slice(0, 10)} • Model:{" "}
                          {item.model}
                        </div>
                        {item.costUSD != null && (
                          <div style={{ fontSize: 12, color: "#64748b" }}>
                            Cost: ${item.costUSD.toFixed(6)}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      <div className="md:w-2/3 w-full p-3 md:pl-2 ">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Summary</h2>
          {detail?.content && (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => detail?.content && copy(detail.content)}
                className="btn btn-utility"
                disabled={!detail}
              >
                Copy
              </button>
              <a
                href={`data:text/plain;charset=utf-8,${encodeURIComponent(
                  detail.content
                )}`}
                download={`weekly-summary-${detail.id}.txt`}
                className="btn btn-utility"
              >
                Download .txt
              </a>
            </div>
          )}
        </div>

        {loadingDetail ? (
          <div>Loading…</div>
        ) : !detail ? (
          <div className="text-gray-400 text-sm italic">
            Select repos and click{" "}
            <span className="text-white font-medium">Generate</span> to see your
            first report.
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
              Repos: {detail.repos} • Since:{" "}
              {formatDate(detail.sinceISO?.slice(0, 10))} • Model:{" "}
              {detail.model}
              {typeof detail.costUSD === "number" && (
                <> • Cost: ${detail.costUSD.toFixed(6)}</>
              )}
            </div>

            <div
              style={{
                whiteSpace: "pre-wrap",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              {detail.content}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
