/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── User (locked — identical across all apps) ────────────────────────────
export interface User {
  id: string;
  displayName: string;
  email: string;
  provider: string;
  createdAt: string;
  lastLogin: string;
  photoUrl?: string;
  subscriptionType?: string;
}

// ─── User Stats & Pagination ───────────────────────────────────────────────
export interface UserStats {
  totalUsers: number;
  subscribedUsers: number;
  activeToday: number;
  newThisWeek: number;
}

export interface Pagination {
  currentPage: number;
  totalPages: number;
  totalUsers: number;
  usersPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// ─── Campaign ──────────────────────────────────────────────────────────────
// A CampaignVersion is the unit of work: one app version + one category.
// The (appVersion, category) pair is unique — enforced by the API.
// EmailLog is the source of truth for who received this campaign's email.

export type CampaignCategory = "app_update" | "promotion" | "general" | "newsletter";
export type CampaignStatus = "draft" | "active" | "paused" | "completed";

export interface CampaignVersion {
  id: string;
  appVersion: string;          // e.g. "2.0.0"
  category: CampaignCategory;
  subject: string;
  htmlContent: string;
  fromName: string;
  status: CampaignStatus;
  totalUsers: number;          // set on first run; 0 = never run
  sentCount: number;
  failedCount: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

// ─── Email Log (resume source of truth) ───────────────────────────────────
// One record per user per campaign version.
// Query emailLogs where campaignVersionId == id to find already-sent users.

export type EmailLogStatus = "sent" | "failed";

export interface EmailLog {
  id: string;
  campaignVersionId: string;
  userId: string;
  email: string;
  status: EmailLogStatus;
  messageId?: string;
  error?: string;
  sentAt: string;
}

// ─── Daily Email Stats (global Brevo 300/day quota) ───────────────────────
export interface DailyEmailStats {
  date: string;          // YYYY-MM-DD
  emailsSent: number;
  lastUpdated: string;
}

// ─── Firebase Config ──────────────────────────────────────────────────────
export interface FirebaseConfig {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain?: string;
}
