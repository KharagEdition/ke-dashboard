"use client";

import { useState, useEffect, useCallback } from "react";
import { X, CheckCircle, XCircle, Loader2, Mail, AlertCircle } from "lucide-react";
import type { CampaignVersion, EmailLog, EmailLogStatus } from "@/lib/types";
import { CATEGORY_LABELS } from "./campaignConstants";

interface Props {
  campaign: CampaignVersion;
  onClose: () => void;
}

type FilterStatus = "all" | EmailLogStatus;

function formatDateTime(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CampaignLogsModal({ campaign, onClose }: Props) {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>("all");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = filter !== "all" ? `?status=${filter}` : "";
      const res = await fetch(`/api/campaigns/${campaign.id}/logs${qs}`);
      if (!res.ok) throw new Error("Failed to load logs");
      const data = (await res.json()) as { logs: EmailLog[] };
      setLogs(data.logs ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load logs");
    } finally {
      setLoading(false);
    }
  }, [campaign.id, filter]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const sentCount = logs.filter((l) => l.status === "sent").length;
  const failedCount = logs.filter((l) => l.status === "failed").length;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Email Logs — v{campaign.appVersion}{" "}
              <span className="text-gray-400 font-normal">
                / {CATEGORY_LABELS[campaign.category]}
              </span>
            </h2>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
              <span className="text-green-600 font-medium">
                ✓ {campaign.sentCount.toLocaleString()} sent
              </span>
              {campaign.failedCount > 0 && (
                <span className="text-red-500 font-medium">
                  ✗ {campaign.failedCount.toLocaleString()} failed
                </span>
              )}
              <span>/ {campaign.totalUsers > 0 ? campaign.totalUsers.toLocaleString() : "—"} total</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1.5 px-6 py-3 border-b border-gray-100 bg-gray-50">
          {(["all", "sent", "failed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors capitalize ${
                filter === f
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f === "all"
                ? `All (${sentCount + failedCount})`
                : f === "sent"
                ? `Sent (${sentCount})`
                : `Failed (${failedCount})`}
            </button>
          ))}
        </div>

        {/* Log list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-500 mr-2" />
              <span className="text-sm text-gray-500">Loading logs…</span>
            </div>
          ) : error ? (
            <div className="flex items-center gap-3 m-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Mail className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">No logs found</p>
              <p className="text-xs mt-1">
                {filter !== "all"
                  ? `No ${filter} emails for this campaign`
                  : "Run the campaign to start sending emails"}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 transition-colors"
                >
                  {log.status === "sent" ? (
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {log.email}
                    </p>
                    {log.error && (
                      <p className="text-xs text-red-500 truncate mt-0.5">
                        {log.error}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 shrink-0 ml-2">
                    {formatDateTime(log.sentAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
