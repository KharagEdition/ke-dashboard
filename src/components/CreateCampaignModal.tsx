"use client";

import { useState, useEffect, useCallback } from "react";
import { X, AlertTriangle, Check, Loader2 } from "lucide-react";
import type { CampaignCategory, CampaignVersion } from "@/lib/types";
import { isValidVersionFormat } from "@/lib/campaignService";
import { CATEGORY_LABELS, APP_NAMES } from "./campaignConstants";

const CATEGORIES: { value: CampaignCategory; label: string }[] = [
  { value: "app_update", label: "App Update" },
  { value: "promotion", label: "Promotion" },
  { value: "general", label: "General" },
  { value: "newsletter", label: "Newsletter" },
];

const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body{font-family:'Segoe UI',sans-serif;line-height:1.6;margin:0;padding:0;background:#f4f4f4}
  .wrap{max-width:600px;margin:20px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.1)}
  .header{background:linear-gradient(135deg,#795d21,#795d21);color:#fff;padding:32px 24px;text-align:center}
  .header h1{margin:0;font-size:26px}
  .body{padding:28px 24px}
  .btn{display:inline-block;background:linear-gradient(135deg,#795d21,#795d21);color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:600;margin:20px 0}
  .footer{text-align:center;font-size:13px;color:#888;padding:20px 24px;border-top:1px solid #eee}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>{{params.appName}}</h1>
    <p style="margin:4px 0 0;opacity:.85">New Update Available</p>
  </div>
  <div class="body">
    <h2 style="margin-top:0">Hello {{params.displayName}}!</h2>
    <p>We have exciting news to share with you.</p>
    <ul>
      <li>Feature 1: More event added</li>
      <li>Feature 2: Theme and color update</li>
      <li>Feature 3: Haircutting favourable check Translated by Lama Zopa Rinpoche</li>
      <li>Feature 4: Person element and animal check</li>
      <li>Feature 5: Custom reminder and reminder</li>
    </ul>
    <div style="text-align:center">
      <a href="https://play.google.com/store/apps/details?id=com.codingwithtashi.tibetan_calender" class="btn">Update Now</a>
    </div>
    <p>Best regards,<br>{{params.appName}} Team</p>
  </div>
  <div class="footer">
    &copy; 2025 KharagEdition &nbsp;|&nbsp;
    <a href="https://kharagedition.com" style="color:#4f46e5">Website</a> &nbsp;|&nbsp;
    <a href="mailto:developer.kharag@gmail.com" style="color:#4f46e5">Support</a>
  </div>
</div>
</body>
</html>`;

interface Props {
  onClose: () => void;
  onCreate: (campaign: CampaignVersion) => void;
}

type UniquenessState = "idle" | "checking" | "ok" | "duplicate";

export default function CreateCampaignModal({ onClose, onCreate }: Props) {
  const [appVersion, setAppVersion] = useState("");
  const [category, setCategory] = useState<CampaignCategory>("app_update");
  const [fromName, setFromName] = useState<string>(APP_NAMES[0]);
  const [customFromName, setCustomFromName] = useState("");
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState(DEFAULT_HTML);
  const [submitting, setSubmitting] = useState(false);
  const [uniqueness, setUniqueness] = useState<UniquenessState>("idle");
  const [formError, setFormError] = useState<string | null>(null);

  const resolvedFromName =
    fromName === "Custom" ? customFromName.trim() : fromName;

  // Live uniqueness check (debounced)
  const checkUniqueness = useCallback(async () => {
    const v = appVersion.trim();
    if (!v || !isValidVersionFormat(v)) {
      setUniqueness("idle");
      return;
    }
    setUniqueness("checking");
    try {
      const res = await fetch("/api/campaigns");
      const data = (await res.json()) as { campaigns: CampaignVersion[] };
      const exists = data.campaigns.some(
        (c) =>
          c.appVersion.toLowerCase() === v.toLowerCase() &&
          c.category === category,
      );
      setUniqueness(exists ? "duplicate" : "ok");
    } catch {
      setUniqueness("idle");
    }
  }, [appVersion, category]);

  useEffect(() => {
    setUniqueness("idle");
    const timer = setTimeout(() => void checkUniqueness(), 500);
    return () => clearTimeout(timer);
  }, [checkUniqueness]);

  // Escape key closes modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, submitting]);

  const canSubmit =
    appVersion.trim() &&
    isValidVersionFormat(appVersion.trim()) &&
    subject.trim() &&
    htmlContent.trim() &&
    resolvedFromName &&
    uniqueness !== "duplicate" &&
    uniqueness !== "checking" &&
    !submitting;

  const handleCreate = async () => {
    if (!canSubmit) return;
    setFormError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appVersion: appVersion.trim(),
          category,
          subject: subject.trim(),
          htmlContent: htmlContent.trim(),
          fromName: resolvedFromName,
        }),
      });
      const data = (await res.json()) as {
        message: string;
        campaign?: CampaignVersion;
      };
      if (!res.ok) {
        setFormError(data.message);
        return;
      }
      if (data.campaign) onCreate(data.campaign);
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const versionInvalid =
    appVersion.trim() !== "" && !isValidVersionFormat(appVersion.trim());

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Create Campaign</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Each app version + category combination must be unique
            </p>
          </div>
          <button
            onClick={() => {
              if (!submitting) onClose();
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left — Form */}
          <div className="w-1/2 flex flex-col overflow-y-auto border-r border-gray-100 p-6 gap-4">
            {/* App Version */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                App Version <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={appVersion}
                  onChange={(e) => setAppVersion(e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                    versionInvalid || uniqueness === "duplicate"
                      ? "border-red-300 bg-red-50"
                      : uniqueness === "ok"
                        ? "border-green-300"
                        : "border-gray-300"
                  }`}
                  placeholder="e.g. 2.0.0"
                />
                <div className="absolute right-3 top-2.5">
                  {uniqueness === "checking" && (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  )}
                  {uniqueness === "ok" && !versionInvalid && (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                  {(uniqueness === "duplicate" || versionInvalid) && (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </div>
              {versionInvalid && (
                <p className="text-xs text-red-600 mt-1">
                  Use semver format: 2.0 or 2.0.0
                </p>
              )}
              {uniqueness === "duplicate" && !versionInvalid && (
                <p className="text-xs text-red-600 mt-1">
                  v{appVersion.trim()} / {CATEGORY_LABELS[category]} already
                  exists
                </p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as CampaignCategory)
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* From Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Name <span className="text-red-500">*</span>
              </label>
              <select
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {APP_NAMES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
                <option value="Custom">Custom…</option>
              </select>
              {fromName === "Custom" && (
                <input
                  type="text"
                  value={customFromName}
                  onChange={(e) => setCustomFromName(e.target.value)}
                  className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter custom sender name"
                />
              )}
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Email subject line"
              />
            </div>

            {/* HTML Content */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                HTML Content <span className="text-red-500">*</span>
              </label>
              <textarea
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                rows={14}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="Paste HTML email content here"
              />
            </div>

            {formError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}
          </div>

          {/* Right — Live Preview */}
          <div className="w-1/2 flex flex-col p-6 bg-gray-50">
            <p className="text-sm font-semibold text-gray-600 mb-3">
              Live Preview
            </p>
            {htmlContent ? (
              <div className="flex-1 rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
                <iframe
                  srcDoc={htmlContent}
                  className="w-full h-full"
                  title="Email preview"
                  sandbox="allow-same-origin"
                />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center border border-dashed border-gray-300 rounded-xl text-gray-400 text-sm">
                Enter HTML content to see preview
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={() => {
              if (!submitting) onClose();
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={() => void handleCreate()}
            disabled={!canSubmit}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Creating…" : "Create Campaign"}
          </button>
        </div>
      </div>
    </div>
  );
}
