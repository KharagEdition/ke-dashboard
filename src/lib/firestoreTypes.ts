/**
 * Typed interfaces for Firestore document shapes (server-side only).
 * These mirror the public types in types.ts but use Firestore Timestamps.
 */
import type { Timestamp } from "firebase-admin/firestore";
import type {
  CampaignCategory,
  CampaignStatus,
  CampaignVersion,
  EmailLog,
  EmailLogStatus,
} from "./types";

export interface CampaignVersionDoc {
  appVersion: string;
  category: CampaignCategory;
  subject: string;
  htmlContent: string;
  fromName: string;
  status: CampaignStatus;
  totalUsers: number;
  sentCount: number;
  failedCount: number;
  createdAt: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
}

export interface EmailLogDoc {
  campaignVersionId: string;
  userId: string;
  email: string;
  status: EmailLogStatus;
  messageId?: string;
  error?: string;
  sentAt: Timestamp;
}

export interface DailyEmailStatsDoc {
  date: string;
  emailsSent: number;
  lastUpdated: Timestamp;
}

// ─── Converters ───────────────────────────────────────────────────────────

function tsToISO(ts: Timestamp | undefined): string | undefined {
  return ts?.toDate?.()?.toISOString();
}

export function docToCampaignVersion(
  id: string,
  data: CampaignVersionDoc
): CampaignVersion {
  return {
    id,
    appVersion: data.appVersion,
    category: data.category,
    subject: data.subject,
    htmlContent: data.htmlContent,
    fromName: data.fromName,
    status: data.status,
    totalUsers: data.totalUsers,
    sentCount: data.sentCount,
    failedCount: data.failedCount,
    createdAt: tsToISO(data.createdAt) ?? "",
    startedAt: tsToISO(data.startedAt),
    completedAt: tsToISO(data.completedAt),
  };
}

export function docToEmailLog(id: string, data: EmailLogDoc): EmailLog {
  return {
    id,
    campaignVersionId: data.campaignVersionId,
    userId: data.userId,
    email: data.email,
    status: data.status,
    messageId: data.messageId,
    error: data.error,
    sentAt: tsToISO(data.sentAt) ?? "",
  };
}
