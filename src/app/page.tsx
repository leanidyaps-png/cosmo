"use client";

import { useEffect, useState, useCallback } from "react";
import { marked } from "marked";

interface ReportSummary {
  id: string;
  signalCount: number;
  status: string;
  deliveryStatus: string;
  createdAt: string;
  completedAt: string | null;
  _count: { signals: number };
}

interface ReportDetail {
  id: string;
  markdownContent: string;
  signalCount: number;
  status: string;
  deliveryStatus: string;
  createdAt: string;
  completedAt: string | null;
  signals: {
    id: string;
    category: string;
    title: string;
    description: string;
    source: string | null;
    confidence: number;
  }[];
}

interface Recipient {
  id: string;
  email: string;
  name: string | null;
  isActive: boolean;
  createdAt: string;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    complete: "bg-emerald-100 text-emerald-700",
    searching: "bg-blue-100 text-blue-700",
    analyzing: "bg-violet-100 text-violet-700",
    generating: "bg-amber-100 text-amber-700",
    failed: "bg-red-100 text-red-700",
    pending: "bg-gray-100 text-gray-600",
    sent: "bg-emerald-100 text-emerald-700",
    partial: "bg-amber-100 text-amber-700",
  };

  return (
    <span
      className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${styles[status] || styles.pending}`}
    >
      {status}
    </span>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getNextRun(): Date {
  const next = new Date();
  next.setHours(6, 0, 0, 0);
  if (next <= new Date()) next.setDate(next.getDate() + 1);
  return next;
}

export default function CosmoPage() {
  const [tab, setTab] = useState<"reports" | "recipients">("reports");
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportDetail | null>(
    null
  );
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<false | "quick" | "deep">(false);
  const [runProgress, setRunProgress] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [addingRecipient, setAddingRecipient] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch("/api/reports");
      const data = await res.json();
      setReports(data);
      if (data.length > 0 && !selectedReport) {
        loadReport(data[0].id);
      }
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchRecipients = useCallback(async () => {
    try {
      const res = await fetch("/api/recipients");
      const data = await res.json();
      setRecipients(data);
    } catch {
      /* empty */
    }
  }, []);

  useEffect(() => {
    fetchReports();
    fetchRecipients();
  }, [fetchReports, fetchRecipients]);

  const loadReport = async (id: string) => {
    try {
      const res = await fetch(`/api/reports/${id}`);
      const data = await res.json();
      setSelectedReport(data);
    } catch {
      /* empty */
    }
  };

  const triggerRun = async (mode: "quick" | "deep") => {
    setRunning(mode);
    setRunProgress(
      mode === "quick"
        ? "Quick scan across all platforms (~1-2 min)..."
        : "Deep searching all platforms, newsletters, forums (~5-10 min)..."
    );

    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();

      if (data.reportId) {
        setRunProgress("Report generated. Loading...");
        await loadReport(data.reportId);
        await fetchReports();
        setRunProgress("");
      } else {
        setRunProgress(`Failed: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      setRunProgress(
        `Error: ${err instanceof Error ? err.message : "Unknown"}`
      );
    } finally {
      setRunning(false);
    }
  };

  const sendReport = async () => {
    if (!selectedReport) return;
    setSending(true);
    setSendResult("");

    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: selectedReport.id }),
      });
      const data = await res.json();

      if (data.error) {
        setSendResult(`Failed: ${data.error}`);
      } else {
        setSendResult(
          `Sent to ${data.sent}/${data.total} recipients`
        );
        await fetchReports();
        await loadReport(selectedReport.id);
      }
    } catch (err) {
      setSendResult(
        `Error: ${err instanceof Error ? err.message : "Unknown"}`
      );
    } finally {
      setSending(false);
      setTimeout(() => setSendResult(""), 5000);
    }
  };

  const addRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;
    setAddingRecipient(true);

    try {
      const res = await fetch("/api/recipients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, name: newName }),
      });
      const data = await res.json();

      if (res.ok) {
        setNewEmail("");
        setNewName("");
        await fetchRecipients();
      } else {
        alert(data.error || "Failed to add recipient");
      }
    } catch {
      alert("Failed to add recipient");
    } finally {
      setAddingRecipient(false);
    }
  };

  const removeRecipient = async (id: string) => {
    try {
      await fetch(`/api/recipients?id=${id}`, { method: "DELETE" });
      await fetchRecipients();
    } catch {
      /* empty */
    }
  };

  const toggleRecipient = async (id: string, isActive: boolean) => {
    try {
      await fetch("/api/recipients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive }),
      });
      await fetchRecipients();
    } catch {
      /* empty */
    }
  };

  const renderMarkdown = (md: string) => {
    return { __html: marked.parse(md, { async: false }) as string };
  };

  const activeRecipientCount = recipients.filter((r) => r.isActive).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)] mx-auto" />
          <p className="text-sm text-[var(--muted-foreground)] mt-3">
            Loading Cosmo...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--card)]">
        <div className="max-w-[1700px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--primary)] flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold">Cosmo</h1>
              <p className="text-xs text-[var(--muted-foreground)]">
                30 Models · 9 Use Cases · Daily Intelligence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-[11px] text-[var(--muted-foreground)]">
                Next auto report
              </p>
              <p className="text-xs font-mono font-medium">
                {getNextRun().toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}{" "}
                at 6:00 AM UTC
              </p>
            </div>
            <button
              onClick={() => triggerRun("quick")}
              disabled={!!running}
              className="flex items-center gap-2 px-3.5 py-2 bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--muted)] disabled:opacity-50 text-[var(--foreground)] text-sm font-medium rounded-lg transition-colors"
            >
              {running === "quick" ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-[var(--primary)]" />
                  Running...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4 text-[var(--primary)]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  Quick
                </>
              )}
            </button>
            <button
              onClick={() => triggerRun("deep")}
              disabled={!!running}
              className="flex items-center gap-2 px-3.5 py-2 bg-[var(--primary)] hover:opacity-90 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-opacity"
            >
              {running === "deep" ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                  Running...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  In-Depth
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Tab bar */}
      <div className="border-b border-[var(--border)] bg-[var(--card)]">
        <div className="max-w-[1700px] mx-auto px-6 flex gap-0">
          <button
            onClick={() => setTab("reports")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === "reports"
                ? "border-[var(--primary)] text-[var(--foreground)]"
                : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            Reports
          </button>
          <button
            onClick={() => setTab("recipients")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              tab === "recipients"
                ? "border-[var(--primary)] text-[var(--foreground)]"
                : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            Recipients
            {activeRecipientCount > 0 && (
              <span className="text-[10px] bg-[var(--primary)] text-white px-1.5 py-0.5 rounded-full font-semibold">
                {activeRecipientCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {runProgress && (
        <div className="bg-[var(--primary)] bg-opacity-10 border-b border-[var(--primary)] border-opacity-20">
          <div className="max-w-[1700px] mx-auto px-6 py-2.5">
            <p className="text-sm text-[var(--primary)] font-medium flex items-center gap-2">
              <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-[var(--primary)] inline-block" />
              {runProgress}
            </p>
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {tab === "reports" && (
        <div className="max-w-[1700px] mx-auto px-6 py-6">
          <div className="flex gap-6">
            <aside className="w-72 shrink-0 hidden lg:block">
              <h2 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">
                Report History
              </h2>
              <div className="space-y-1.5">
                {reports.length > 0 ? (
                  reports.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => loadReport(r.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                        selectedReport?.id === r.id
                          ? "bg-[var(--primary)] bg-opacity-10 border border-[var(--primary)] border-opacity-30"
                          : "hover:bg-[var(--muted)] border border-transparent"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">
                          {formatDate(r.createdAt)}
                        </p>
                        <StatusBadge status={r.status} />
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                        {r.signalCount || r._count?.signals || 0} signals
                        {r.deliveryStatus === "sent"
                          ? " · emailed"
                          : r.deliveryStatus === "partial"
                            ? " · partially sent"
                            : ""}
                      </p>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-8 text-sm text-[var(--muted-foreground)]">
                    No reports yet.
                    <br />
                    Click Quick or In-Depth to generate one.
                  </div>
                )}
              </div>
            </aside>

            <main className="flex-1 min-w-0">
              {selectedReport?.markdownContent ? (
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl">
                  <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {formatDate(selectedReport.createdAt)}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {selectedReport.signalCount} signals ·{" "}
                        <StatusBadge
                          status={selectedReport.deliveryStatus}
                        />
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {sendResult && (
                        <span className="text-xs text-[var(--muted-foreground)]">
                          {sendResult}
                        </span>
                      )}
                      <button
                        onClick={sendReport}
                        disabled={
                          sending || activeRecipientCount === 0
                        }
                        title={
                          activeRecipientCount === 0
                            ? "Add recipients in the Recipients tab first"
                            : `Send to ${activeRecipientCount} recipient${activeRecipientCount !== 1 ? "s" : ""}`
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--muted)] disabled:opacity-40 text-[var(--foreground)] text-xs font-medium rounded-lg transition-colors"
                      >
                        {sending ? (
                          <>
                            <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-[var(--primary)] inline-block" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                              />
                            </svg>
                            Send
                            {activeRecipientCount > 0 &&
                              ` (${activeRecipientCount})`}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <div
                    className="prose px-6 py-6 text-sm leading-relaxed overflow-x-auto"
                    dangerouslySetInnerHTML={renderMarkdown(
                      selectedReport.markdownContent
                    )}
                  />
                </div>
              ) : (
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl flex items-center justify-center h-96">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-[var(--muted)] flex items-center justify-center mx-auto mb-4">
                      <svg
                        className="w-8 h-8 text-[var(--muted-foreground)]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-[var(--foreground)]">
                      No Reports Yet
                    </h3>
                    <p className="text-sm text-[var(--muted-foreground)] mt-1 max-w-xs">
                      Click <strong>Quick</strong> for a fast scan (~1-2 min)
                      or <strong>In-Depth</strong> for a comprehensive deep
                      search (~5-10 min).
                    </p>
                  </div>
                </div>
              )}

              {reports.length > 1 && (
                <div className="lg:hidden mt-6">
                  <h2 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">
                    Previous Reports
                  </h2>
                  <div className="space-y-1.5">
                    {reports.slice(1).map((r) => (
                      <button
                        key={r.id}
                        onClick={() => loadReport(r.id)}
                        className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-[var(--muted)] border border-transparent transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">
                            {formatDate(r.createdAt)}
                          </p>
                          <StatusBadge status={r.status} />
                        </div>
                        <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                          {r.signalCount || r._count?.signals || 0} signals
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      )}

      {/* Recipients Tab */}
      {tab === "recipients" && (
        <div className="max-w-2xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h2 className="text-lg font-semibold">Email Recipients</h2>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              Reports are automatically sent to active recipients after each
              daily run. You can also send any report on demand.
            </p>
          </div>

          {/* Add recipient form */}
          <form
            onSubmit={addRecipient}
            className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 mb-6"
          >
            <h3 className="text-sm font-semibold mb-3">Add Recipient</h3>
            <div className="flex gap-3">
              <div className="flex-1">
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-opacity-50"
                />
              </div>
              <div className="w-40">
                <input
                  type="text"
                  placeholder="Name (optional)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-opacity-50"
                />
              </div>
              <button
                type="submit"
                disabled={addingRecipient || !newEmail}
                className="px-4 py-2 bg-[var(--primary)] hover:opacity-90 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-opacity"
              >
                {addingRecipient ? "Adding..." : "Add"}
              </button>
            </div>
          </form>

          {/* Recipients list */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
            {recipients.length > 0 ? (
              <div className="divide-y divide-[var(--border)]">
                {recipients.map((r) => (
                  <div
                    key={r.id}
                    className="px-5 py-3.5 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleRecipient(r.id, !r.isActive)}
                        className={`w-9 h-5 rounded-full transition-colors relative ${
                          r.isActive
                            ? "bg-[var(--primary)]"
                            : "bg-[var(--muted)]"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                            r.isActive ? "left-4" : "left-0.5"
                          }`}
                        />
                      </button>
                      <div>
                        <p
                          className={`text-sm font-medium ${!r.isActive ? "text-[var(--muted-foreground)] line-through" : ""}`}
                        >
                          {r.email}
                        </p>
                        {r.name && (
                          <p className="text-xs text-[var(--muted-foreground)]">
                            {r.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeRecipient(r.id)}
                      className="text-[var(--muted-foreground)] hover:text-red-500 transition-colors p-1"
                      title="Remove recipient"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-12 text-center">
                <svg
                  className="w-10 h-10 text-[var(--muted-foreground)] mx-auto mb-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-sm font-medium text-[var(--foreground)]">
                  No recipients yet
                </p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  Add email addresses above to receive daily reports
                  automatically.
                </p>
              </div>
            )}
          </div>

          {recipients.length > 0 && (
            <p className="text-xs text-[var(--muted-foreground)] mt-3">
              {activeRecipientCount} active recipient
              {activeRecipientCount !== 1 ? "s" : ""} will receive the
              daily report automatically at 6:00 AM UTC and on any
              on-demand send.
            </p>
          )}
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-[var(--border)] mt-12">
        <div className="max-w-[1700px] mx-auto px-6 py-4">
          <p className="text-xs text-[var(--muted-foreground)]">
            Cosmo v2.0 — Klein Ventures — Daily AI Model Intelligence System
          </p>
        </div>
      </footer>
    </div>
  );
}
