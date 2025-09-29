"use client";

import { useState } from "react";

interface EmailModalProps {
  onClose: () => void;
  onSend: () => void;
}

export default function EmailModal({ onClose, onSend }: EmailModalProps) {
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!subject.trim() || !content.trim()) {
      alert("Please fill in both subject and content");
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject,
          content, // Plain text content
          sendToAll: true,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Success! ${data.message}`);
        onSend();
      } else {
        alert(`Failed to send emails: ${data.message}`);
      }
    } catch (error) {
      console.error("Error sending emails:", error);
      alert("Network error occurred while sending emails");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl m-4">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Send Email to All Users</h2>

          {/* Subject */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject Line
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter email subject"
            />
          </div>

          {/* Text Content */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Content (Plain Text)
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your email message here..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={sending}
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !subject.trim() || !content.trim()}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? "Sending..." : "Send to All Users"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
