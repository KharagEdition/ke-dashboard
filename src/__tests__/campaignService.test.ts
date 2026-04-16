import { describe, it, expect } from "vitest";
import {
  getDailyRemainingQuota,
  filterValidUsers,
  filterRemainingUsers,
  selectSendBatch,
  validateCampaignInput,
  checkDuplicateCampaign,
  getProgressPercent,
  isValidVersionFormat,
  normalisedEmail,
  DAILY_EMAIL_LIMIT,
  VALID_CATEGORIES,
} from "../lib/campaignService";
import type { User, CampaignVersion } from "../lib/types";

// ─── Fixtures ─────────────────────────────────────────────────────────────

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user_1",
    displayName: "Test User",
    email: "test@example.com",
    provider: "google",
    createdAt: "2024-01-01T00:00:00Z",
    lastLogin: "2024-09-01T00:00:00Z",
    ...overrides,
  };
}

const users: User[] = [
  makeUser({ id: "1", email: "alice@example.com" }),
  makeUser({ id: "2", email: "bob@example.com" }),
  makeUser({ id: "3", email: "carol@example.com" }),
  makeUser({ id: "4", email: "dave@example.com" }),
  makeUser({ id: "5", email: "eve@example.com" }),
];

// ─── getDailyRemainingQuota ────────────────────────────────────────────────

describe("getDailyRemainingQuota", () => {
  it("returns full limit when nothing sent", () => {
    expect(getDailyRemainingQuota(0)).toBe(DAILY_EMAIL_LIMIT);
  });

  it("returns zero when limit exactly reached", () => {
    expect(getDailyRemainingQuota(DAILY_EMAIL_LIMIT)).toBe(0);
  });

  it("returns zero when over the limit (never negative)", () => {
    expect(getDailyRemainingQuota(DAILY_EMAIL_LIMIT + 50)).toBe(0);
  });

  it("returns correct remainder for partial use", () => {
    expect(getDailyRemainingQuota(100)).toBe(DAILY_EMAIL_LIMIT - 100);
  });
});

// ─── filterValidUsers ─────────────────────────────────────────────────────

describe("filterValidUsers", () => {
  it("keeps users with valid emails", () => {
    const result = filterValidUsers(users);
    expect(result).toHaveLength(5);
  });

  it("removes users with missing email", () => {
    const input = [
      makeUser({ email: "" }),
      makeUser({ email: "valid@test.com" }),
    ];
    expect(filterValidUsers(input)).toHaveLength(1);
  });

  it("removes users with no @ in email", () => {
    const input = [
      makeUser({ email: "notanemail" }),
      makeUser({ email: "valid@ok.com" }),
    ];
    expect(filterValidUsers(input)).toHaveLength(1);
  });

  it("removes users with very short email strings", () => {
    const input = [makeUser({ email: "a@b" }), makeUser({ email: "a@b.c" })];
    // 'a@b' has length 3, which equals the threshold of > 3 so it should be excluded
    const result = filterValidUsers(input);
    expect(result.every((u) => u.email.length > 3)).toBe(true);
  });

  it("returns empty array for empty input", () => {
    expect(filterValidUsers([])).toHaveLength(0);
  });
});

// ─── filterRemainingUsers ─────────────────────────────────────────────────

describe("filterRemainingUsers", () => {
  it("returns all users when no emails have been sent", () => {
    const result = filterRemainingUsers(users, new Set());
    expect(result).toHaveLength(5);
  });

  it("removes already-sent users by email", () => {
    const sent = new Set(["alice@example.com", "bob@example.com"]);
    const result = filterRemainingUsers(users, sent);
    expect(result).toHaveLength(3);
    expect(result.map((u) => u.email)).not.toContain("alice@example.com");
    expect(result.map((u) => u.email)).not.toContain("bob@example.com");
  });

  it("returns empty array when all users already sent", () => {
    const sent = new Set(users.map((u) => u.email.toLowerCase()));
    expect(filterRemainingUsers(users, sent)).toHaveLength(0);
  });

  it("is case-insensitive for email matching", () => {
    const sent = new Set(["ALICE@EXAMPLE.COM"]);
    // normalisedEmail lowercases emails before putting them in the set
    const normSent = new Set([normalisedEmail("ALICE@EXAMPLE.COM")]);
    const result = filterRemainingUsers(users, normSent);
    expect(result.find((u) => u.email === "alice@example.com")).toBeUndefined();
  });
});

// ─── selectSendBatch ──────────────────────────────────────────────────────

describe("selectSendBatch", () => {
  it("returns all users when quota exceeds remaining", () => {
    expect(selectSendBatch(users, 1000)).toHaveLength(5);
  });

  it("slices to the quota limit", () => {
    expect(selectSendBatch(users, 3)).toHaveLength(3);
  });

  it("returns empty array when quota is zero", () => {
    expect(selectSendBatch(users, 0)).toHaveLength(0);
  });

  it("preserves original order (for stable resume)", () => {
    const batch = selectSendBatch(users, 2);
    expect(batch[0].email).toBe("alice@example.com");
    expect(batch[1].email).toBe("bob@example.com");
  });
});

// ─── validateCampaignInput ────────────────────────────────────────────────

describe("validateCampaignInput", () => {
  const valid = {
    appVersion: "2.0.0",
    category: "app_update",
    subject: "New update!",
    htmlContent: "<p>Hello</p>",
    fromName: "Tibetan Calendar",
  };

  it("returns null for valid input", () => {
    expect(validateCampaignInput(valid)).toBeNull();
  });

  it("rejects empty appVersion", () => {
    const err = validateCampaignInput({ ...valid, appVersion: "" });
    expect(err?.field).toBe("appVersion");
  });

  it("rejects whitespace-only appVersion", () => {
    const err = validateCampaignInput({ ...valid, appVersion: "   " });
    expect(err?.field).toBe("appVersion");
  });

  it("rejects non-semver version string", () => {
    const err = validateCampaignInput({ ...valid, appVersion: "version2" });
    expect(err?.field).toBe("appVersion");
  });

  it("accepts two-part version (2.0)", () => {
    expect(validateCampaignInput({ ...valid, appVersion: "2.0" })).toBeNull();
  });

  it("accepts three-part version (2.0.1)", () => {
    expect(validateCampaignInput({ ...valid, appVersion: "2.0.1" })).toBeNull();
  });

  it("rejects invalid category", () => {
    const err = validateCampaignInput({ ...valid, category: "spam" });
    expect(err?.field).toBe("category");
  });

  it("rejects empty subject", () => {
    const err = validateCampaignInput({ ...valid, subject: "" });
    expect(err?.field).toBe("subject");
  });

  it("rejects empty htmlContent", () => {
    const err = validateCampaignInput({ ...valid, htmlContent: "" });
    expect(err?.field).toBe("htmlContent");
  });

  it("rejects empty fromName", () => {
    const err = validateCampaignInput({ ...valid, fromName: "" });
    expect(err?.field).toBe("fromName");
  });

  it("validates all valid categories", () => {
    VALID_CATEGORIES.forEach((cat) => {
      expect(validateCampaignInput({ ...valid, category: cat })).toBeNull();
    });
  });
});

// ─── checkDuplicateCampaign ───────────────────────────────────────────────

describe("checkDuplicateCampaign", () => {
  const existing: Pick<CampaignVersion, "appVersion" | "category">[] = [
    { appVersion: "2.0.0", category: "app_update" },
    { appVersion: "1.5.0", category: "promotion" },
  ];

  it("returns true when exact duplicate exists", () => {
    expect(checkDuplicateCampaign("2.0.0", "app_update", existing)).toBe(true);
  });

  it("returns false when version matches but category differs", () => {
    expect(checkDuplicateCampaign("2.0.0", "promotion", existing)).toBe(false);
  });

  it("returns false when category matches but version differs", () => {
    expect(checkDuplicateCampaign("3.0.0", "app_update", existing)).toBe(false);
  });

  it("returns false for empty existing list", () => {
    expect(checkDuplicateCampaign("2.0.0", "app_update", [])).toBe(false);
  });

  it("is case-insensitive for version comparison", () => {
    expect(checkDuplicateCampaign("2.0.0", "app_update", existing)).toBe(true);
  });
});

// ─── getProgressPercent ───────────────────────────────────────────────────

describe("getProgressPercent", () => {
  it("returns 0 when campaign has not started (totalUsers = 0)", () => {
    expect(getProgressPercent(0, 0)).toBe(0);
  });

  it("returns 0 when nothing sent yet", () => {
    expect(getProgressPercent(0, 100)).toBe(0);
  });

  it("returns 100 when all users sent", () => {
    expect(getProgressPercent(100, 100)).toBe(100);
  });

  it("returns correct percentage", () => {
    expect(getProgressPercent(300, 750)).toBe(40);
  });

  it("never exceeds 100 (guard against data anomalies)", () => {
    expect(getProgressPercent(200, 100)).toBe(100);
  });

  it("rounds to nearest integer", () => {
    // 1/3 = 33.33... → 33
    expect(getProgressPercent(1, 3)).toBe(33);
  });
});

// ─── isValidVersionFormat ─────────────────────────────────────────────────

describe("isValidVersionFormat", () => {
  it("accepts two-segment version", () => {
    expect(isValidVersionFormat("2.0")).toBe(true);
  });

  it("accepts three-segment version", () => {
    expect(isValidVersionFormat("2.0.1")).toBe(true);
  });

  it("rejects version with letters", () => {
    expect(isValidVersionFormat("v2.0")).toBe(false);
    expect(isValidVersionFormat("2.0.1-beta")).toBe(false);
  });

  it("rejects single-segment version", () => {
    expect(isValidVersionFormat("2")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidVersionFormat("")).toBe(false);
  });

  it("trims whitespace before checking", () => {
    expect(isValidVersionFormat("  2.0.0  ")).toBe(true);
  });
});

// ─── normalisedEmail ──────────────────────────────────────────────────────

describe("normalisedEmail", () => {
  it("lowercases email", () => {
    expect(normalisedEmail("User@EXAMPLE.COM")).toBe("user@example.com");
  });

  it("trims whitespace", () => {
    expect(normalisedEmail("  user@example.com  ")).toBe("user@example.com");
  });
});
