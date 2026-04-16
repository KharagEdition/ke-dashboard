import type { CampaignCategory, CampaignVersion, User } from "./types";

export const DAILY_EMAIL_LIMIT = 300;
export const SEND_BATCH_SIZE = 10;

export const VALID_CATEGORIES: readonly CampaignCategory[] = [
  "app_update",
  "promotion",
  "general",
  "newsletter",
] as const;

// ─── Quota ────────────────────────────────────────────────────────────────

export function getDailyRemainingQuota(emailsSentToday: number): number {
  return Math.max(0, DAILY_EMAIL_LIMIT - emailsSentToday);
}

// ─── User Filtering ───────────────────────────────────────────────────────

export function filterValidUsers(users: User[]): User[] {
  return users.filter(
    (u) => typeof u.email === "string" && u.email.includes("@") && u.email.length > 3
  );
}

export function filterRemainingUsers(
  validUsers: User[],
  alreadySentEmails: Set<string>
): User[] {
  return validUsers.filter(
    (u) => !alreadySentEmails.has(u.email.toLowerCase())
  );
}

export function selectSendBatch(remainingUsers: User[], remainingQuota: number): User[] {
  return remainingUsers.slice(0, remainingQuota);
}

// ─── Validation ───────────────────────────────────────────────────────────

export interface CampaignCreateInput {
  appVersion: string;
  category: string;
  subject: string;
  htmlContent: string;
  fromName: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export function validateCampaignInput(
  input: CampaignCreateInput
): ValidationError | null {
  if (!input.appVersion?.trim()) {
    return { field: "appVersion", message: "App version is required" };
  }
  if (!isValidVersionFormat(input.appVersion.trim())) {
    return {
      field: "appVersion",
      message: "Version must follow semver format (e.g. 2.0.0 or 2.0)",
    };
  }
  if (!VALID_CATEGORIES.includes(input.category as CampaignCategory)) {
    return {
      field: "category",
      message: `Category must be one of: ${VALID_CATEGORIES.join(", ")}`,
    };
  }
  if (!input.subject?.trim()) {
    return { field: "subject", message: "Subject is required" };
  }
  if (!input.htmlContent?.trim()) {
    return { field: "htmlContent", message: "HTML content is required" };
  }
  if (!input.fromName?.trim()) {
    return { field: "fromName", message: "From name is required" };
  }
  return null;
}

export function checkDuplicateCampaign(
  appVersion: string,
  category: CampaignCategory,
  existing: Pick<CampaignVersion, "appVersion" | "category">[]
): boolean {
  return existing.some(
    (c) =>
      c.appVersion.toLowerCase() === appVersion.trim().toLowerCase() &&
      c.category === category
  );
}

// ─── Progress ─────────────────────────────────────────────────────────────

export function getProgressPercent(sentCount: number, totalUsers: number): number {
  if (totalUsers === 0) return 0;
  return Math.min(100, Math.round((sentCount / totalUsers) * 100));
}

// ─── Format ───────────────────────────────────────────────────────────────

export function isValidVersionFormat(version: string): boolean {
  return /^\d+\.\d+(\.\d+)?$/.test(version.trim());
}

export function normalisedEmail(email: string): string {
  return email.trim().toLowerCase();
}
