"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Play,
  FileText,
  CheckCircle,
  Loader2,
  Mail,
  TrendingUp,
  AlertCircle,
  X,
  RefreshCw,
  Clock,
  PauseCircle,
} from "lucide-react";
import type { CampaignVersion, CampaignStatus } from "@/lib/types";
import { getProgressPercent } from "@/lib/campaignService";
import {
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
} from "./campaignConstants";
import CreateCampaignModal from "./CreateCampaignModal";
import CampaignLogsModal from "./CampaignLogsModal";

interface DailyStats {
  date: string;
  emailsSent: number;
  remainingQuota: number;
  dailyLimit: number;
}

interface RunResult {
  message: string;
  sentThisRun: number;
  failedThisRun: number;
  remainingUsers: number;
  campaignStatus: CampaignStatus;
}

interface Toast {
  id: number;
  text: string;
  type: "success" | "error" | "info";
}

const STATUS_ICON: Record<CampaignStatus, React.ReactNode> = {
  draft: <Clock className="h-3 w-3" />,
  active: <Loader2 className="h-3 w-3 animate-spin" />,
  paused: <PauseCircle className="h-3 w-3" />,
  completed: <CheckCircle className="h-3 w-3" />,
};

function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function CampaignList({
  configLoaded,
}: {
  configLoaded: boolean;
}) {
  const [campaigns, setCampaigns] = useState<CampaignVersion[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [viewLogsFor, setViewLogsFor] = useState<CampaignVersion | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  let toastCounter = 0;

  const addToast = useCallback(
    (text: string, type: Toast["type"] = "success") => {
      const id = ++toastCounter;
      setToasts((prev) => [...prev, { id, text, type }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const fetchData = useCallback(async () => {
    if (!configLoaded) return;
    setLoading(true);
    try {
      const [cRes, sRes] = await Promise.all([
        fetch("/api/campaigns"),
        fetch("/api/email-stats"),
      ]);
      if (!cRes.ok || !sRes.ok) throw new Error("Failed to load data");
      const cData = (await cRes.json()) as { campaigns: CampaignVersion[] };
      const sData = (await sRes.json()) as DailyStats;
      setCampaigns(cData.campaigns ?? []);
      setDailyStats(sData);
    } catch {
      addToast("Failed to load campaigns", "error");
    } finally {
      setLoading(false);
    }
  }, [configLoaded, addToast]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleRun = async (campaign: CampaignVersion) => {
    setRunningId(campaign.id);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/run`, {
        method: "POST",
      });
      const data = (await res.json()) as RunResult & { message: string };

      if (res.ok) {
        addToast(data.message, "success");
        await fetchData();
      } else if (res.status === 429) {
        addToast(data.message, "info");
      } else {
        addToast(data.message, "error");
      }
    } catch {
      addToast("Network error. Please try again.", "error");
    } finally {
      setRunningId(null);
    }
  };

  const quotaPercent = dailyStats
    ? Math.min(100, (dailyStats.emailsSent / dailyStats.dailyLimit) * 100)
    : 0;

  const quotaColor =
    quotaPercent >= 95
      ? "bg-red-500"
      : quotaPercent >= 70
      ? "bg-amber-500"
      : "bg-indigo-500";

  const totalCampaigns = campaigns.length;
  const completed = campaigns.filter((c) => c.status === "completed").length;
  const pending = campaigns.filter(
    (c) => c.status === "draft" || c.status === "paused"
  ).length;

  if (!configLoaded) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-gray-400">
        <Mail className="h-14 w-14 mb-4 opacity-20" />
        <p className="text-lg font-medium text-gray-500">No app connected</p>
        <p className="text-sm mt-1">Load Firebase config to manage campaigns</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium max-w-sm pointer-events-auto transition-all ${
              t.type === "success"
                ? "bg-green-600 text-white"
                : t.type === "error"
                ? "bg-red-600 text-white"
                : "bg-indigo-600 text-white"
            }`}
          >
            {t.type === "success" && <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />}
            {t.type === "error" && <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
            {t.type === "info" && <Clock className="h-4 w-4 mt-0.5 shrink-0" />}
            <span className="leading-snug">{t.text}</span>
            <button
              onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))}
              className="ml-auto opacity-70 hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Daily quota */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Today&apos;s Quota
                </p>
                <p className="text-2xl font-bold text-gray-900 leading-tight">
                  {dailyStats?.emailsSent ?? 0}
                  <span className="text-sm font-normal text-gray-400">
                    {" "}/{dailyStats?.dailyLimit ?? 300}
                  </span>
                </p>
              </div>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${quotaColor}`}
              style={{ width: `${quotaPercent}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {dailyStats?.remainingQuota ?? 300} remaining today
          </p>
        </div>

        {/* Total */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Mail className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Total Campaigns
            </p>
            <p className="text-2xl font-bold text-gray-900">{totalCampaigns}</p>
            <p className="text-xs text-gray-400">{pending} pending</p>
          </div>
        </div>

        {/* Completed */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
          <div className="p-2 bg-green-100 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Completed
            </p>
            <p className="text-2xl font-bold text-gray-900">{completed}</p>
            <p className="text-xs text-gray-400">
              {totalCampaigns > 0
                ? `${Math.round((completed / totalCampaigns) * 100)}% success rate`
                : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Campaign table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Campaign Versions</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void fetchData()}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40"
              aria-label="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 active:scale-95 transition-all"
            >
              <Plus className="h-4 w-4" />
              New Campaign
            </button>
          </div>
        </div>

        {loading && campaigns.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mr-3" />
            <span className="text-gray-500">Loading campaigns…</span>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-4 bg-indigo-50 rounded-2xl mb-4">
              <Mail className="h-10 w-10 text-indigo-400" />
            </div>
            <p className="font-semibold text-gray-700">No campaigns yet</p>
            <p className="text-sm text-gray-400 mt-1 mb-4">
              Create your first campaign to start sending emails
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Campaign
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {[
                    "Version",
                    "Category",
                    "Status",
                    "Progress",
                    "Sent / Total",
                    "Created",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {campaigns.map((campaign) => {
                  const isRunning = runningId === campaign.id;
                  const canRun =
                    campaign.status === "draft" || campaign.status === "paused";
                  const progress = getProgressPercent(
                    campaign.sentCount,
                    campaign.totalUsers
                  );
                  const quotaExhausted = (dailyStats?.remainingQuota ?? 1) === 0;

                  return (
                    <tr
                      key={campaign.id}
                      className="hover:bg-gray-50/60 transition-colors"
                    >
                      {/* Version */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="font-mono text-sm font-bold text-gray-800">
                          v{campaign.appVersion}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[campaign.category]}`}
                        >
                          {CATEGORY_LABELS[campaign.category]}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[campaign.status]}`}
                        >
                          {STATUS_ICON[campaign.status]}
                          {STATUS_LABELS[campaign.status]}
                        </span>
                      </td>

                      {/* Progress */}
                      <td className="px-5 py-4">
                        <div className="w-28">
                          {campaign.totalUsers > 0 ? (
                            <>
                              <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1">
                                <div
                                  className={`h-1.5 rounded-full transition-all duration-500 ${
                                    campaign.status === "completed"
                                      ? "bg-green-500"
                                      : "bg-indigo-500"
                                  }`}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <p className="text-xs text-gray-500">
                                {progress}%
                              </p>
                            </>
                          ) : (
                            <span className="text-xs text-gray-400">
                              Not started
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Sent / Total */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">
                          {campaign.sentCount.toLocaleString()}
                        </span>
                        <span className="text-sm text-gray-400">
                          {" "}
                          /{" "}
                          {campaign.totalUsers > 0
                            ? campaign.totalUsers.toLocaleString()
                            : "—"}
                        </span>
                        {campaign.failedCount > 0 && (
                          <span className="ml-2 text-xs text-red-500">
                            ({campaign.failedCount} failed)
                          </span>
                        )}
                      </td>

                      {/* Created */}
                      <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-400">
                        {formatDate(campaign.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {canRun && (
                            <button
                              onClick={() => void handleRun(campaign)}
                              disabled={isRunning || quotaExhausted}
                              title={
                                quotaExhausted
                                  ? "Daily quota reached — try again tomorrow"
                                  : campaign.status === "paused"
                                  ? "Resume sending"
                                  : "Start sending"
                              }
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                              {isRunning ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Play className="h-3.5 w-3.5" />
                              )}
                              {isRunning
                                ? "Sending…"
                                : campaign.status === "paused"
                                ? "Resume"
                                : "Run"}
                            </button>
                          )}
                          <button
                            onClick={() => setViewLogsFor(campaign)}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 active:scale-95 transition-all"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Logs
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateCampaignModal
          onClose={() => setShowCreate(false)}
          onCreate={(campaign) => {
            setShowCreate(false);
            setCampaigns((prev) => [campaign, ...prev]);
            addToast(`Campaign v${campaign.appVersion} created`, "success");
          }}
        />
      )}

      {viewLogsFor && (
        <CampaignLogsModal
          campaign={viewLogsFor}
          onClose={() => setViewLogsFor(null)}
        />
      )}
    </div>
  );
}
