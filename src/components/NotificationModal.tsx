"use client";

import { useState } from "react";
import { Bell } from "lucide-react";

interface NotificationModalProps {
  onClose: () => void;
  onSend: () => void;
}

export default function NotificationModal({
  onClose,
  onSend,
}: NotificationModalProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [data, setData] = useState({
    type: "app_update", // Default to app_update as expected by Android
    version: "",
    url: "",
  });
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      alert("Please fill in both title and message");
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/api/send-update-notification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          body,
          data: Object.fromEntries(
            Object.entries(data).filter(([_, value]) => value.trim() !== "")
          ),
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert(`Success! ${result.message}`);
        onSend();
      } else {
        alert(`Failed to send notification: ${result.message}`);
      }
    } catch (error) {
      console.error("Error sending notification:", error);
      alert("Network error occurred while sending notification");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md m-4">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Send Push Notification
          </h2>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Notification title"
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message *
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="App update message (this will be sent as 'message' field to Android)"
              />
            </div>

            {/* Optional Data Fields */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={data.type}
                onChange={(e) => setData({ ...data, type: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="app_update">app_update</option>
                <option value="general">general</option>
                <option value="maintenance">maintenance</option>
                <option value="promotion">promotion</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Version (Optional)
              </label>
              <input
                type="text"
                value={data.version}
                onChange={(e) => setData({ ...data, version: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 2.0.0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL (Optional)
              </label>
              <input
                type="url"
                value={data.url}
                onChange={(e) => setData({ ...data, url: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={sending}
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !title.trim() || !body.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? "Sending..." : "Send Notification"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
