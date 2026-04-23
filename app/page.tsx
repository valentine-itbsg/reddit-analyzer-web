"use client";

import { useEffect, useMemo, useState } from "react";

type Analysis = {
  id: string;
  sourceUrl: string;
  status: string;
  title: string | null;
  subreddit: string | null;
  author: string | null;
  postScore: number | null;
  commentCount: number | null;
  parsedCommentCount: number;
  createdAtReddit: string | null;
  summary: string | null;
  sentiment: string | null;
  recommendedServices: unknown | null;
  mentionedBrands: unknown | null;
  painPoints: unknown | null;
  advantages: unknown | null;
  keyTakeaways: unknown | null;
  usefulnessScore: number | null;
  topicRelevanceScore: number | null;
  finalTakeaway: string | null;
  errorMessage: string | null;
  rawPayload: unknown | null;

  keywordCount: number | null;
  uniqueKeywordCount: number | null;
  topKeywords: unknown | null;
  matchedKeywords: unknown | null;
  keywordFrequency: unknown | null;

  createdAt: string;
  updatedAt: string;
};

type SortKey =
  | "postScore"
  | "commentCount"
  | "parsedCommentCount"
  | "usefulnessScore"
  | "topicRelevanceScore"
  | "keywordCount";

type SortDirection = "asc" | "desc";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function formatNumber(v: number | null) {
  if (v === null || Number.isNaN(v)) return "—";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(v);
}

function formatDateTimeIso(v: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(d);
}

function formatCompactJson(value: unknown, fallback = "—") {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  try {
    const s = JSON.stringify(value);
    if (!s) return fallback;
    return s.length > 160 ? `${s.slice(0, 160)}…` : s;
  } catch {
    return fallback;
  }
}

function getSentimentBadge(sentiment: string | null) {
  if (!sentiment) return "bg-zinc-50 text-zinc-700 ring-zinc-600/20";
  const s = sentiment.trim().toLowerCase();
  if (s.includes("pos")) return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
  if (s.includes("neg")) return "bg-rose-50 text-rose-700 ring-rose-600/20";
  if (s.includes("neu")) return "bg-slate-50 text-slate-700 ring-slate-600/20";
  return "bg-zinc-50 text-zinc-700 ring-zinc-600/20";
}

function getSortValue(row: Analysis, key: SortKey): number | null {
  const value = row[key];
  return typeof value === "number" && !Number.isNaN(value) ? value : null;
}

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [rows, setRows] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedText, setExpandedText] = useState<{
    title: string;
    text: string;
  } | null>(null);
  const [exporting, setExporting] = useState(false);

  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  async function loadRows() {
    setRefreshing(true);
    setError(null);

    try {
      const res = await fetch("/api/analyses");
      if (!res.ok) throw new Error(`Failed to load analyses (${res.status})`);
      const data = await res.json();
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analyses");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => {
      void loadRows();
    }, 0);

    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!expandedText) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setExpandedText(null);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expandedText]);

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;

    const copy = [...rows];

    copy.sort((a, b) => {
      const aValue = getSortValue(a, sortKey);
      const bValue = getSortValue(b, sortKey);

      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return 1;
      if (bValue === null) return -1;

      if (sortDirection === "asc") return aValue - bValue;
      return bValue - aValue;
    });

    return copy;
  }, [rows, sortKey, sortDirection]);

  function handleSort(key: SortKey) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDirection("asc");
      return;
    }

    if (sortDirection === "asc") {
      setSortDirection("desc");
      return;
    }

    setSortKey(null);
    setSortDirection("asc");
  }

  function renderSortIndicator(key: SortKey) {
    if (sortKey !== key) {
      return <span className="text-zinc-400">↕</span>;
    }

    if (sortDirection === "asc") {
      return <span className="text-zinc-900 dark:text-zinc-100">↑</span>;
    }

    return <span className="text-zinc-900 dark:text-zinc-100">↓</span>;
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) throw new Error(`Analyze failed (${res.status})`);

      setUrl("");
      await loadRows();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analyze failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleFileChange(file: File | null) {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(`Import failed (${res.status})`);

      await loadRows();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    setError(null);

    try {
      const res = await fetch("/api/export");
      if (!res.ok) throw new Error(`Export failed (${res.status})`);

      const blob = await res.blob();
      const contentDisposition = res.headers.get("Content-Disposition") ?? "";
      const match = /filename="([^"]+)"/.exec(contentDisposition);
      const filename = match?.[1] ?? "reddit-analyses.xlsx";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-0px)] bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-950">
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <header className="mb-8 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                Reddit Analyzer
              </h1>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Analyze a single Reddit post URL or import a batch from Excel. Results appear below.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting || refreshing || loading}
                className={cx(
                  "inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm",
                  "hover:bg-zinc-50 active:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60",
                  "dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
                )}
              >
                {exporting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-50" />
                    Exporting…
                  </>
                ) : (
                  "Download Excel"
                )}
              </button>

              <button
                type="button"
                onClick={loadRows}
                disabled={refreshing || loading || exporting}
                className={cx(
                  "inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm",
                  "hover:bg-zinc-50 active:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60",
                  "dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
                )}
              >
                {refreshing ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-50" />
                    Refreshing
                  </span>
                ) : (
                  "Refresh"
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
            <span className="rounded-md bg-white px-2 py-1 ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
              Rows: <span className="font-medium text-zinc-900 dark:text-zinc-100">{sortedRows.length}</span>
            </span>

            {sortKey ? (
              <span className="rounded-md bg-white px-2 py-1 ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
                Sorted by:{" "}
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {sortKey} ({sortDirection})
                </span>
              </span>
            ) : null}

            {loading ? (
              <span className="rounded-md bg-sky-50 px-2 py-1 text-sky-700 ring-1 ring-sky-600/20 dark:bg-sky-950/40 dark:text-sky-200">
                Working…
              </span>
            ) : null}

            {error ? (
              <span className="rounded-md bg-rose-50 px-2 py-1 text-rose-700 ring-1 ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-200">
                {error}
              </span>
            ) : null}
          </div>
        </header>

        <section className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Analyze URL</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Paste a Reddit post link and start analysis.
            </p>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <label className="sr-only" htmlFor="reddit-url">
                  Reddit URL
                </label>
                <input
                  id="reddit-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.reddit.com/r/.../comments/..."
                  disabled={loading}
                  className={cx(
                    "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none",
                    "placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-200/50",
                    "disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500",
                    "dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-600 dark:focus:ring-zinc-800/60 dark:disabled:bg-zinc-900"
                  )}
                />
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !url.trim()}
                className={cx(
                  "inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm",
                  "hover:bg-zinc-800 active:bg-zinc-950 disabled:cursor-not-allowed disabled:opacity-60",
                  "dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:active:bg-white"
                )}
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white dark:border-zinc-900/30 dark:border-t-zinc-900" />
                    Analyzing
                  </>
                ) : (
                  "Analyze"
                )}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Import from Excel</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Upload a <span className="font-medium">.xlsx</span> file to import multiple URLs.
            </p>

            <div className="mt-4">
              <label
                className={cx(
                  "flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4",
                  "hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900/40 dark:hover:bg-zinc-900",
                  loading && "cursor-not-allowed opacity-60"
                )}
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Choose file</div>
                  <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                    We’ll import and refresh the table automatically.
                  </div>
                </div>
                <span className="shrink-0 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-zinc-900 ring-1 ring-zinc-200 dark:bg-zinc-950 dark:text-zinc-100 dark:ring-zinc-800">
                  .xlsx
                </span>
                <input
                  type="file"
                  accept=".xlsx"
                  disabled={loading}
                  className="hidden"
                  onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Analyses</h2>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                Tip: click numeric column headers to sort. Titles are truncated; open the original post via the link icon.
              </p>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <div className="mx-auto max-w-md">
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">No data yet</div>
                <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  Analyze a URL or import an Excel file to see results here.
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1400px] border-separate border-spacing-0">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th
                      scope="col"
                      className={cx(
                        "whitespace-nowrap border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-xs font-semibold text-zinc-600",
                        "dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300"
                      )}
                    >
                      Source
                    </th>

                    <th
                      scope="col"
                      className={cx(
                        "whitespace-nowrap border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-xs font-semibold text-zinc-600",
                        "dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300"
                      )}
                    >
                      Title
                    </th>

                    <th
                      scope="col"
                      className={cx(
                        "whitespace-nowrap border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-xs font-semibold text-zinc-600",
                        "dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300"
                      )}
                    >
                      Subreddit
                    </th>

                    <th
                      scope="col"
                      className={cx(
                        "whitespace-nowrap border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-xs font-semibold text-zinc-600",
                        "dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300"
                      )}
                    >
                      Author
                    </th>

                    <th
                      scope="col"
                      className={cx(
                        "border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-xs font-semibold text-zinc-600",
                        "dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => handleSort("postScore")}
                        className="inline-flex items-center gap-2 rounded-md hover:text-zinc-900 dark:hover:text-zinc-100"
                      >
                        Score
                        {renderSortIndicator("postScore")}
                      </button>
                    </th>

                    <th
                      scope="col"
                      className={cx(
                        "border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-xs font-semibold text-zinc-600",
                        "dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => handleSort("commentCount")}
                        className="inline-flex items-center gap-2 rounded-md hover:text-zinc-900 dark:hover:text-zinc-100"
                      >
                        Comments
                        {renderSortIndicator("commentCount")}
                      </button>
                    </th>

                    <th
                      scope="col"
                      className={cx(
                        "border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-xs font-semibold text-zinc-600",
                        "dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => handleSort("parsedCommentCount")}
                        className="inline-flex items-center gap-2 rounded-md hover:text-zinc-900 dark:hover:text-zinc-100"
                      >
                        Parsed
                        {renderSortIndicator("parsedCommentCount")}
                      </button>
                    </th>

                    <th
                      scope="col"
                      className={cx(
                        "whitespace-nowrap border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-xs font-semibold text-zinc-600",
                        "dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300"
                      )}
                    >
                      Sentiment
                    </th>

                    <th
                      scope="col"
                      className={cx(
                        "border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-xs font-semibold text-zinc-600",
                        "dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => handleSort("usefulnessScore")}
                        className="inline-flex items-center gap-2 rounded-md hover:text-zinc-900 dark:hover:text-zinc-100"
                      >
                        Usefulness
                        {renderSortIndicator("usefulnessScore")}
                      </button>
                    </th>

                    <th
                      scope="col"
                      className={cx(
                        "border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-xs font-semibold text-zinc-600",
                        "dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => handleSort("topicRelevanceScore")}
                        className="inline-flex items-center gap-2 rounded-md hover:text-zinc-900 dark:hover:text-zinc-100"
                      >
                        Relevance
                        {renderSortIndicator("topicRelevanceScore")}
                      </button>
                    </th>

                    <th
                      scope="col"
                      className={cx(
                        "whitespace-nowrap border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-xs font-semibold text-zinc-600",
                        "dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300"
                      )}
                    >
                      Summary
                    </th>

                    <th
                      scope="col"
                      className={cx(
                        "whitespace-nowrap border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-xs font-semibold text-zinc-600",
                        "dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300"
                      )}
                    >
                      Final takeaway
                    </th>

                    <th
                      scope="col"
                      className={cx(
                        "whitespace-nowrap border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-xs font-semibold text-zinc-600",
                        "dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300"
                      )}
                    >
                      Recommended services
                    </th>

                    <th
                      scope="col"
                      className={cx(
                        "border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-xs font-semibold text-zinc-600",
                        "dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => handleSort("keywordCount")}
                        className="inline-flex items-center gap-2 rounded-md hover:text-zinc-900 dark:hover:text-zinc-100"
                      >
                        Keyword count
                        {renderSortIndicator("keywordCount")}
                      </button>
                    </th>

                    <th
                      scope="col"
                      className={cx(
                        "whitespace-nowrap border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-xs font-semibold text-zinc-600",
                        "dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300"
                      )}
                    >
                      Top keywords
                    </th>

                    <th
                      scope="col"
                      className={cx(
                        "whitespace-nowrap border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-xs font-semibold text-zinc-600",
                        "dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300"
                      )}
                    >
                      Reddit created
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {sortedRows.map((row) => (
                    <tr
                      key={row.id}
                      className={cx(
                        "group border-b border-zinc-100",
                        "odd:bg-white even:bg-zinc-50/60 hover:bg-zinc-100/70",
                        "dark:odd:bg-zinc-950 dark:even:bg-zinc-900/30 dark:hover:bg-zinc-900/60"
                      )}
                    >
                      <td className="px-4 py-3 text-sm">
                        {row.sourceUrl ? (
                          <a
                            href={row.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={cx(
                              "inline-flex items-center gap-2 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 ring-1 ring-zinc-200 shadow-sm",
                              "hover:bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-200 dark:ring-zinc-800 dark:hover:bg-zinc-900"
                            )}
                            title={row.sourceUrl}
                          >
                            ↗ <span className="hidden lg:inline">Open</span>
                          </a>
                        ) : (
                          <span className="text-zinc-500">—</span>
                        )}
                      </td>

                      <td className="max-w-[420px] px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">
                        <div className="truncate font-medium">
                          {row.title ?? <span className="text-zinc-500">—</span>}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-200">
                        {row.subreddit ?? <span className="text-zinc-500">—</span>}
                      </td>

                      <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-200">
                        {row.author ?? <span className="text-zinc-500">—</span>}
                      </td>

                      <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-200">
                        {formatNumber(row.postScore)}
                      </td>

                      <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-200">
                        {formatNumber(row.commentCount)}
                      </td>

                      <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-200">
                        {formatNumber(row.parsedCommentCount)}
                      </td>

                      <td className="px-4 py-3 text-sm">
                        <span
                          className={cx(
                            "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ring-1 ring-inset",
                            getSentimentBadge(row.sentiment)
                          )}
                        >
                          {row.sentiment ?? "—"}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-200">
                        {formatNumber(row.usefulnessScore)}
                      </td>

                      <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-200">
                        {formatNumber(row.topicRelevanceScore)}
                      </td>

                      <td className="max-w-[360px] px-4 py-3 text-sm text-zinc-700 dark:text-zinc-200">
                        {row.summary ? (
                          <button
                            type="button"
                            className={cx(
                              "block w-full text-left",
                              "rounded-lg focus:outline-none focus:ring-4 focus:ring-zinc-200/60 dark:focus:ring-zinc-800/60"
                            )}
                            onClick={() => setExpandedText({ title: "Summary", text: row.summary ?? "" })}
                            title="Click to expand"
                          >
                            <div className="line-clamp-3">{row.summary}</div>
                            <div className="mt-1 text-xs font-semibold text-zinc-500">Expand</div>
                          </button>
                        ) : (
                          <span className="text-zinc-500">—</span>
                        )}
                      </td>

                      <td className="max-w-[360px] px-4 py-3 text-sm text-zinc-700 dark:text-zinc-200">
                        {row.finalTakeaway ? (
                          <button
                            type="button"
                            className={cx(
                              "block w-full text-left",
                              "rounded-lg focus:outline-none focus:ring-4 focus:ring-zinc-200/60 dark:focus:ring-zinc-800/60"
                            )}
                            onClick={() =>
                              setExpandedText({ title: "Final takeaway", text: row.finalTakeaway ?? "" })
                            }
                            title="Click to expand"
                          >
                            <div className="line-clamp-3">{row.finalTakeaway}</div>
                            <div className="mt-1 text-xs font-semibold text-zinc-500">Expand</div>
                          </button>
                        ) : (
                          <span className="text-zinc-500">—</span>
                        )}
                      </td>

                      <td className="max-w-[360px] px-4 py-3 text-xs text-zinc-700 dark:text-zinc-200">
                        <div className="truncate" title={formatCompactJson(row.recommendedServices)}>
                          {formatCompactJson(row.recommendedServices)}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-200">
                        {formatNumber(row.keywordCount)}
                      </td>

                      <td className="max-w-[360px] px-4 py-3 text-xs text-zinc-700 dark:text-zinc-200">
                        <div className="truncate" title={formatCompactJson(row.topKeywords)}>
                          {formatCompactJson(row.topKeywords)}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-200">
                        {formatDateTimeIso(row.createdAtReddit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {expandedText ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={expandedText.title}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setExpandedText(null);
          }}
        >
          <div className="w-full max-w-3xl rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {expandedText.title}
                </div>
                <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">Press Esc to close</div>
              </div>

              <button
                type="button"
                onClick={() => setExpandedText(null)}
                className={cx(
                  "inline-flex items-center rounded-lg px-3 py-2 text-xs font-semibold text-zinc-700 ring-1 ring-zinc-200",
                  "bg-white hover:bg-zinc-50 active:bg-zinc-100",
                  "dark:bg-zinc-950 dark:text-zinc-200 dark:ring-zinc-800 dark:hover:bg-zinc-900"
                )}
              >
                Close
              </button>
            </div>

            <div className="max-h-[70vh] overflow-auto px-5 py-4">
              <div className="whitespace-pre-wrap break-words text-sm leading-6 text-zinc-900 dark:text-zinc-100">
                {expandedText.text}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}