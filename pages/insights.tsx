import { useEffect, useState } from "react";

type SummaryListItem = {
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
  newInsightsLoaded: boolean;
}

export default function InsightsPage({ newInsightsLoaded }: InsightsPageProps) {
  const [list, setList] = useState<SummaryListItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SummaryRow | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    (async () => {
      getInsights();
    })();
  }, []);

  useEffect(() => {
    if (newInsightsLoaded) getInsights();
  }, [newInsightsLoaded]);

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

  const getInsights = async () => {
    try {
      setLoadingList(true);
      const res = await fetch("/api/summaries");
      const data = await res.json();
      setList(data.items ?? []);
      if ((data.items ?? []).length > 0) setSelectedId(data.items[0].id);
    } finally {
      setLoadingList(false);
    }
  };

  const deleteInsight = async (insightId: string): Promise<void> => {
    await fetch(`/api/summary/${insightId}`, { method: "DELETE" });
  };

  return (
    <main
      style={{
        display: "grid",
        gridTemplateColumns: "320px 1fr",
        gap: "1rem",
        padding: 16,
      }}
    >
      <aside style={{ borderRight: "1px solid #eee", paddingRight: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
          Summaries
        </h2>
        {loadingList ? (
          <div>Loading…</div>
        ) : list.length === 0 ? (
          <div>No summaries yet.</div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {list.map((item) => {
              const dt = new Date(item.createdAt);
              const isActive = item.id === selectedId;
              return (
                <li key={item.id} style={{ marginBottom: 8 }}>
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
                        {dt.toLocaleString()}
                      </div>
                      <div
                        style={{ color: "#ff6b6b", fontWeight: "lighter" }}
                        onClick={() => {
                          deleteInsight(item.id).then(() => {
                            getInsights();
                          });
                        }}
                      >
                        Delete
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
      </aside>

      <section>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Summary</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => detail?.content && copy(detail.content)}
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                border: "1px solid #e5e7eb",
                background: "#f8fafc",
                cursor: "pointer",
                color: "black",
              }}
              disabled={!detail}
            >
              Copy
            </button>
            {detail?.content && (
              <a
                href={`data:text/plain;charset=utf-8,${encodeURIComponent(
                  detail.content
                )}`}
                download={`weekly-summary-${detail.id}.txt`}
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid #e5e7eb",
                  background: "#f8fafc",
                  textDecoration: "none",
                }}
              >
                Download .txt
              </a>
            )}
          </div>
        </div>

        {loadingDetail ? (
          <div>Loading…</div>
        ) : !detail ? (
          <div>Select a summary</div>
        ) : (
          <div>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
              Repos: {detail.repos} • Since: {detail.sinceISO?.slice(0, 10)} •
              Model: {detail.model}
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
      </section>
    </main>
  );
}
