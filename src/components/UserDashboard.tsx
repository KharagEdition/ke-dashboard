"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Mail,
  Download,
  Users,
  UserPlus,
  Settings,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckSquare,
  Square,
  Bell,
  Megaphone,
  X,
  AlertCircle,
  Loader2,
  Send,
} from "lucide-react";
import Image from "next/image";
import type { Pagination, User, UserStats } from "@/lib/types";
import PaginationBar from "./Pagination";
import EmailModal from "./EmailModal";
import NotificationModal from "./NotificationModal";
import CampaignList from "./CampaignList";

type ActiveTab = "users" | "campaigns";

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatDate(dateString: string): string {
  if (!dateString) return "Never";
  const d = new Date(dateString);
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

function subscriptionBadge(type: string | undefined): string {
  return type === "premium"
    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
    : "bg-gray-100 text-gray-600";
}

// ─── Component ────────────────────────────────────────────────────────────

export default function UserDashboard() {
  // ── Shared state ──────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ActiveTab>("users");
  const [configLoaded, setConfigLoaded] = useState(false);
  const [appName, setAppName] = useState("Dashboard");
  const [showConfigModal, setShowConfigModal] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  // ── Users tab state ───────────────────────────────────────────────────
  const [users, setUsers] = useState<User[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    totalUsers: 0,
    subscribedUsers: 0,
    activeToday: 0,
    newThisWeek: 0,
  });
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0,
    usersPerPage: 20,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [filterProvider, setFilterProvider] = useState("all");
  const [filterSubscription, setFilterSubscription] = useState("all");
  const [usersLoading, setUsersLoading] = useState(false);

  // ── Modal state ───────────────────────────────────────────────────────
  const [showBulkEmailModal, setShowBulkEmailModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showSelectedEmailModal, setShowSelectedEmailModal] = useState(false);

  // ── Selected-users email form ──────────────────────────────────────────
  const [emailSubject, setEmailSubject] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [emailFromName, setEmailFromName] = useState("Tibetan Keyboard");
  const [emailCustomFrom, setEmailCustomFrom] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // ── Firebase config upload ────────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/json") {
      setConfigError("Please select a valid JSON file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const raw = ev.target?.result as string;
        const parsed = JSON.parse(raw) as { project_id?: string };
        const encoded = btoa(raw);

        const res = await fetch("/api/firebase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ firebaseConfig: encoded }),
        });

        if (!res.ok) throw new Error("Failed to initialise Firebase");

        const name = (parsed.project_id ?? "Dashboard")
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");

        setAppName(name);
        setConfigLoaded(true);
        setShowConfigModal(false);
        setConfigError(null);
        fetchUsers(1, pagination.usersPerPage, "", "all", "all");
      } catch (err) {
        setConfigError(
          err instanceof Error
            ? err.message
            : "Invalid or unsupported JSON file"
        );
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  // ── Fetch users ───────────────────────────────────────────────────────
  const fetchUsers = useCallback(
    async (
      page: number,
      limit: number,
      search: string,
      provider: string,
      subscription: string
    ) => {
      setUsersLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
          ...(search && { search }),
          ...(provider !== "all" && { provider }),
          ...(subscription !== "all" && { subscription }),
        });

        const res = await fetch(`/api/users?${params}`);
        if (!res.ok) throw new Error("Failed to fetch users");
        const data = (await res.json()) as {
          users: User[];
          stats: UserStats;
          pagination: Pagination;
        };

        setUsers(data.users ?? []);
        setUserStats(
          data.stats ?? {
            totalUsers: 0,
            subscribedUsers: 0,
            activeToday: 0,
            newThisWeek: 0,
          }
        );
        setPagination(
          data.pagination ?? {
            currentPage: page,
            totalPages: 1,
            totalUsers: 0,
            usersPerPage: limit,
            hasNextPage: false,
            hasPrevPage: false,
          }
        );
        setSelectedUsers(new Set());
      } catch {
        // silently fail — users list just stays empty
      } finally {
        setUsersLoading(false);
      }
    },
    []
  );

  // Debounced search
  useEffect(() => {
    if (!configLoaded) return;
    const timer = setTimeout(() => {
      fetchUsers(1, pagination.usersPerPage, searchTerm, filterProvider, filterSubscription);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, filterProvider, filterSubscription]);

  // ── User selection ────────────────────────────────────────────────────
  const toggleUser = (id: string) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedUsers((prev) =>
      prev.size === users.length && users.length > 0
        ? new Set()
        : new Set(users.map((u) => u.id))
    );
  };

  // ── Export ────────────────────────────────────────────────────────────
  const exportSelectedUsers = () => {
    const data = users.filter((u) => selectedUsers.has(u.id));
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Send email to selected users ──────────────────────────────────────
  const sendToSelected = async () => {
    if (!emailSubject.trim() || !emailContent.trim()) {
      setEmailError("Subject and content are required");
      return;
    }
    setEmailSending(true);
    setEmailError(null);

    const selectedEmails = users
      .filter((u) => selectedUsers.has(u.id))
      .map((u) => u.email);

    const resolvedFrom =
      emailFromName === "Custom" ? emailCustomFrom : emailFromName;

    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: selectedEmails,
          subject: emailSubject,
          content: emailContent,
          sendToAll: false,
          fromName: resolvedFrom,
        }),
      });
      const data = (await res.json()) as { message: string };
      if (res.ok) {
        setShowSelectedEmailModal(false);
        setEmailSubject("");
        setEmailContent("");
        setSelectedUsers(new Set());
      } else {
        setEmailError(data.message);
      }
    } catch {
      setEmailError("Network error. Please try again.");
    } finally {
      setEmailSending(false);
    }
  };

  // ── Pagination page numbers ───────────────────────────────────────────
  const getPaginationNumbers = (): number[] => {
    const { currentPage, totalPages } = pagination;
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo + name */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-xl">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-gray-900 leading-none">
                  {appName}
                </h1>
                {configLoaded && (
                  <p className="text-xs text-gray-400 leading-none mt-0.5">
                    Admin Dashboard
                  </p>
                )}
              </div>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNotificationModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                title="Send push notification"
              >
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Notify</span>
              </button>
              <button
                onClick={() => setShowConfigModal(true)}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  configLoaded
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
              >
                <Settings className="h-4 w-4" />
                {configLoaded ? "Config ✓" : "Load Config"}
              </button>
            </div>
          </div>

          {/* Tab navigation */}
          <div className="flex gap-0 -mb-px">
            {(
              [
                { id: "users" as const, label: "Users", icon: Users },
                { id: "campaigns" as const, label: "Campaigns", icon: Megaphone },
              ]
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === id
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ══ USERS TAB ══════════════════════════════════════════════ */}
        {activeTab === "users" && (
          <div className="space-y-6">
            {!configLoaded ? (
              <div className="flex flex-col items-center justify-center py-32 text-gray-400">
                <Settings className="h-14 w-14 mb-4 opacity-20" />
                <p className="text-lg font-medium text-gray-500">
                  No app connected
                </p>
                <p className="text-sm mt-1">
                  Load your Firebase config to view users
                </p>
                <button
                  onClick={() => setShowConfigModal(true)}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
                >
                  Load Firebase Config
                </button>
              </div>
            ) : (
              <>
                {/* Stats cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    {
                      label: "Total Users",
                      value: userStats.totalUsers,
                      icon: Users,
                      color: "bg-blue-100 text-blue-600",
                    },
                    {
                      label: "Premium",
                      value: userStats.subscribedUsers,
                      icon: UserPlus,
                      color: "bg-purple-100 text-purple-600",
                    },
                    {
                      label: "Active Today",
                      value: userStats.activeToday,
                      icon: Eye,
                      color: "bg-green-100 text-green-600",
                    },
                    {
                      label: "New This Week",
                      value: userStats.newThisWeek,
                      icon: UserPlus,
                      color: "bg-amber-100 text-amber-600",
                    },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div
                      key={label}
                      className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                            {label}
                          </p>
                          <p className="text-2xl font-bold text-gray-900">
                            {value.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Search / filters / actions */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
                    {/* Search */}
                    <div className="relative flex-1 min-w-0">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search by name or email…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>

                    {/* Filters */}
                    <select
                      value={filterProvider}
                      onChange={(e) => setFilterProvider(e.target.value)}
                      className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      <option value="all">All Providers</option>
                      <option value="google">Google</option>
                      <option value="facebook">Facebook</option>
                      <option value="email">Email</option>
                    </select>

                    <select
                      value={filterSubscription}
                      onChange={(e) => setFilterSubscription(e.target.value)}
                      className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      <option value="all">All Plans</option>
                      <option value="premium">Premium</option>
                      <option value="trial">Trial</option>
                      <option value="free">Free</option>
                    </select>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {selectedUsers.size > 0 ? (
                        <>
                          <button
                            onClick={() => setShowSelectedEmailModal(true)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                          >
                            <Mail className="h-4 w-4" />
                            Email ({selectedUsers.size})
                          </button>
                          <button
                            onClick={exportSelectedUsers}
                            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <Download className="h-4 w-4" />
                            Export ({selectedUsers.size})
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setShowBulkEmailModal(true)}
                          className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <Send className="h-4 w-4" />
                          Email All
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Users table */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  {usersLoading ? (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mr-3" />
                      <span className="text-gray-500">Loading users…</span>
                    </div>
                  ) : users.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                      <Users className="h-10 w-10 mb-3 opacity-30" />
                      <p className="font-medium text-gray-500">No users found</p>
                      <p className="text-sm mt-1">
                        Try adjusting your filters
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                              <th className="px-5 py-3 text-left">
                                <button
                                  onClick={toggleAll}
                                  className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-800"
                                >
                                  {selectedUsers.size === users.length &&
                                  users.length > 0 ? (
                                    <CheckSquare className="h-4 w-4 text-indigo-600" />
                                  ) : (
                                    <Square className="h-4 w-4" />
                                  )}
                                  Select
                                </button>
                              </th>
                              {["User", "Email", "Provider", "Plan", "Joined", "Last Login"].map(
                                (h) => (
                                  <th
                                    key={h}
                                    className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                                  >
                                    {h}
                                  </th>
                                )
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {users.map((user) => (
                              <tr
                                key={user.id}
                                onClick={() => toggleUser(user.id)}
                                className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                                  selectedUsers.has(user.id)
                                    ? "bg-indigo-50 border-l-2 border-l-indigo-500"
                                    : ""
                                }`}
                              >
                                <td className="px-5 py-3.5">
                                  {selectedUsers.has(user.id) ? (
                                    <CheckSquare className="h-4 w-4 text-indigo-600" />
                                  ) : (
                                    <Square className="h-4 w-4 text-gray-400" />
                                  )}
                                </td>
                                <td className="px-5 py-3.5">
                                  <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
                                      {user.photoUrl ? (
                                        <Image
                                          src={user.photoUrl}
                                          alt={user.displayName}
                                          width={32}
                                          height={32}
                                          className="object-cover"
                                        />
                                      ) : (
                                        (user.displayName?.charAt(0).toUpperCase()) || "?"
                                      )}
                                    </div>
                                    <span className="text-sm font-medium text-gray-900">
                                      {user.displayName || "—"}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-5 py-3.5 text-sm text-gray-600">
                                  {user.email}
                                </td>
                                <td className="px-5 py-3.5">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 capitalize">
                                    {user.provider || "—"}
                                  </span>
                                </td>
                                <td className="px-5 py-3.5">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${subscriptionBadge(user.subscriptionType)}`}
                                  >
                                    {user.subscriptionType || "free"}
                                  </span>
                                </td>
                                <td className="px-5 py-3.5 text-sm text-gray-400">
                                  {formatDate(user.createdAt)}
                                </td>
                                <td className="px-5 py-3.5 text-sm text-gray-400">
                                  {formatDate(user.lastLogin)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      <PaginationBar
                        pagination={pagination}
                        loading={usersLoading}
                        onPageChange={(p) =>
                          fetchUsers(
                            p,
                            pagination.usersPerPage,
                            searchTerm,
                            filterProvider,
                            filterSubscription
                          )
                        }
                      />
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ══ CAMPAIGNS TAB ══════════════════════════════════════════ */}
        {activeTab === "campaigns" && (
          <CampaignList configLoaded={configLoaded} />
        )}
      </main>

      {/* ── Firebase Config Modal ─────────────────────────────────────── */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Connect Firebase App</h3>
              {configLoaded && (
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              )}
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500">
                Upload your Firebase service account JSON file to connect to
                your app&apos;s Firestore database.
              </p>

              <label className="flex flex-col items-center justify-center w-full border-2 border-dashed border-gray-300 rounded-xl p-8 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors">
                <Settings className="h-8 w-8 text-gray-400 mb-2" />
                <span className="text-sm font-medium text-gray-600">
                  Click to upload service account JSON
                </span>
                <span className="text-xs text-gray-400 mt-1">
                  .json files only
                </span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {configError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {configError}
                </div>
              )}

              {configLoaded && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                  <Settings className="h-4 w-4 shrink-0" />
                  Connected to <strong className="ml-1">{appName}</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Send email to selected users modal ────────────────────────── */}
      {showSelectedEmailModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">
                Email {selectedUsers.size} selected user
                {selectedUsers.size !== 1 ? "s" : ""}
              </h3>
              <button
                onClick={() => {
                  setShowSelectedEmailModal(false);
                  setEmailError(null);
                }}
                className="p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* From name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From
                </label>
                <select
                  value={emailFromName}
                  onChange={(e) => setEmailFromName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {[
                    "Tibetan Keyboard",
                    "Tibetan Calendar",
                    "Tibetan Language Learning App",
                    "Tibetan Prayer",
                    "Tibetan Dictionary",
                    "YiglyChecker",
                  ].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                  <option value="Custom">Custom…</option>
                </select>
                {emailFromName === "Custom" && (
                  <input
                    type="text"
                    value={emailCustomFrom}
                    onChange={(e) => setEmailCustomFrom(e.target.value)}
                    className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Custom sender name"
                  />
                )}
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Email subject"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  rows={5}
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Plain text message"
                />
              </div>

              {emailError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {emailError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowSelectedEmailModal(false);
                  setEmailError(null);
                }}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                disabled={emailSending}
              >
                Cancel
              </button>
              <button
                onClick={() => void sendToSelected()}
                disabled={
                  emailSending || !emailSubject.trim() || !emailContent.trim()
                }
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {emailSending && <Loader2 className="h-4 w-4 animate-spin" />}
                {emailSending ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Other modals (unchanged) ──────────────────────────────────── */}
      {showBulkEmailModal && (
        <EmailModal
          onClose={() => setShowBulkEmailModal(false)}
          onSend={() => setShowBulkEmailModal(false)}
        />
      )}
      {showNotificationModal && (
        <NotificationModal
          onClose={() => setShowNotificationModal(false)}
          onSend={() => setShowNotificationModal(false)}
        />
      )}
    </div>
  );
}
