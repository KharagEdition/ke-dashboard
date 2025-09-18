/* eslint-disable @typescript-eslint/no-explicit-any */
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

export interface UserStats {
  totalUsers: number;
  subscribedUsers: number;
  activeToday: number;
  newThisWeek: number;
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalUsers: number;
  usersPerPage: number;
}

export interface EmailTrackingRecord {
  userId: string;
  email: string;
  subject: string;
  sentAt: Date;
  messageId?: string;
  campaignId?: string; // Optional: to group related emails
}

export interface DailyEmailStats {
  date: string; // YYYY-MM-DD format
  emailsSent: number;
  lastUpdated: Date;
}

export interface BulkEmailRequest {
  subject: string;
  htmlContent: string;
  campaignId?: string; // Optional: to group related emails
  maxEmailsPerDay?: number; // Default: 80
  skipDuplicates?: boolean; // Default: true
}

export interface EmailSendResult {
  email: string;
  messageId?: string;
  error?: string;
  success: boolean;
}

export interface BulkEmailResponse {
  message: string;
  totalProcessed: number;
  successCount: number;
  failedCount: number;
  remainingQuota: number;
  emailsSentToday: number;
  results: EmailSendResult[];
}

export interface EmailStatsResponse {
  date: string;
  emailsSent: number;
  remainingQuota: number;
  recentEmails: (EmailTrackingRecord & { id: string; sentAt: string })[];
  lastUpdated: Date;
}

// Firestore document data (without Timestamp conversion)
export interface EmailTrackingRecordDoc {
  userId: string;
  email: string;
  subject: string;
  sentAt: any; // Firestore Timestamp
  messageId?: string;
  campaignId?: string;
}

export interface DailyEmailStatsDoc {
  date: string;
  emailsSent: number;
  lastUpdated: any; // Firestore Timestamp
}

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

export interface Pagination {
  currentPage: number;
  totalPages: number;
  totalUsers: number;
  usersPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}
