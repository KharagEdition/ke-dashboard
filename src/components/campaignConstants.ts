import type { CampaignCategory, CampaignStatus } from "@/lib/types";

export const CATEGORY_LABELS: Record<CampaignCategory, string> = {
  app_update: "App Update",
  promotion: "Promotion",
  general: "General",
  newsletter: "Newsletter",
};

export const CATEGORY_COLORS: Record<CampaignCategory, string> = {
  app_update: "bg-[#fdf6e9] text-[#795d21]",
  promotion: "bg-[#f5ead6] text-[#5a4218]",
  general: "bg-stone-100 text-stone-600",
  newsletter: "bg-amber-100 text-amber-700",
};

export const STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Draft",
  active: "Sending",
  paused: "Paused",
  completed: "Completed",
};

export const STATUS_COLORS: Record<CampaignStatus, string> = {
  draft: "bg-gray-100 text-gray-600",
  active: "bg-blue-100 text-blue-700",
  paused: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
};

export const APP_NAMES = [
  "Tibetan Keyboard",
  "Tibetan Calendar",
  "Tibetan Language Learning App",
  "Tibetan Prayer",
  "Tibetan Dictionary",
  "YiglyChecker",
] as const;
