"use client";

import { useState } from "react";

interface EmailModalProps {
  onClose: () => void;
  onSend: () => void;
}

export default function EmailModal({ onClose, onSend }: EmailModalProps) {
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Default HTML template
  const calendarReleaseTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{subject}}</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            margin: 0; 
            padding: 0; 
            background-color: #f4f4f4; 
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white; 
            padding: 20px; 
            border-radius: 10px; 
            box-shadow: 0 0 10px rgba(0,0,0,0.1); 
            margin-top: 20px;
        }
        .header { 
            background: linear-gradient(135deg, #b37c3b 0%, #8a5c1e 100%); 
            color: white; 
            padding: 30px; 
            text-align: center; 
            border-radius: 10px 10px 0 0; 
            margin: -20px -20px 30px -20px;
        }
        .header h1 { 
            margin: 0; 
            font-size: 28px; 
        }
        .content { 
            padding: 0 10px; 
        }
        .cta-button { 
            display: inline-block; 
            background: linear-gradient(135deg, #b37c3b 0%, #8a5c1e 100%);
            color: white; 
            padding: 15px 30px; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0; 
            font-weight: bold;
        }
        .footer { 
            text-align: center; 
            color: #666; 
            font-size: 14px; 
            margin-top: 40px; 
            padding-top: 20px; 
            border-top: 1px solid #eee; 
        }
        @media (max-width: 600px) {
            .container { margin: 10px; padding: 15px; }
            .header { padding: 20px; }
            .header h1 { font-size: 24px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1> {{params.appName}}</h1>
            <p>Important Update</p>
        </div>
        
        <div class="content">
            <h2>Hello {{params.displayName}}!</h2>
            <p>We have some exciting news to share with you.</p>
            
            <p>Here's what's new:</p>
            <ul>
                <li>Feature 1: Create Custom Event</li>
                <li>Feature 2: Event Notifications</li>
                <li>Feature 3: Create Reminder</li>
            </ul>
            
            <div style="text-align: center;">
                <a href="https://play.google.com/store/apps/details?id=com.codingwithtashi.tibetan_calender" class="cta-button">
                    Update App
                </a>
            </div>
            
            <p>If you have any questions, feel free to reach out to our support team.</p>
            
            <p>Best regards,<br>
             {{params.appName}} Team</p>
        </div>
        
        <div class="footer">
            <p>&copy; 2025 KharagEdition. All rights reserved.</p>
            <p>
                <a href="https://kharagedition.com" style="color: #8a5c1e;">Visit our website</a> | 
                <a href="mailto:developer.kharag@gmail.com" style="color: #8a5c1e;">Contact Support</a>
            </p>
        </div>
    </div>
</body>
</html>`;

  const keyboardReleaseTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{subject}}</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            margin: 0; 
            padding: 0; 
            background-color: #f4f4f4; 
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white; 
            padding: 20px; 
            border-radius: 10px; 
            box-shadow: 0 0 10px rgba(0,0,0,0.1); 
            margin-top: 20px;
        }
        .header { 
            background: linear-gradient(135deg, #b37c3b 0%, #8a5c1e 100%); 
            color: white; 
            padding: 30px; 
            text-align: center; 
            border-radius: 10px 10px 0 0; 
            margin: -20px -20px 30px -20px;
        }
        .header h1 { 
            margin: 0; 
            font-size: 28px; 
        }
        .content { 
            padding: 0 10px; 
        }
        .cta-button { 
            display: inline-block; 
            background: linear-gradient(135deg, #b37c3b 0%, #8a5c1e 100%);
            color: white; 
            padding: 15px 30px; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0; 
            font-weight: bold;
        }
        .footer { 
            text-align: center; 
            color: #666; 
            font-size: 14px; 
            margin-top: 40px; 
            padding-top: 20px; 
            border-top: 1px solid #eee; 
        }
        @media (max-width: 600px) {
            .container { margin: 10px; padding: 15px; }
            .header { padding: 20px; }
            .header h1 { font-size: 24px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1> {{params.appName}}</h1>
            <p>Important Update</p>
        </div>
        
        <div class="content">
            <h2>Hello {{params.displayName}}!</h2>
            <p>We have some exciting news to share with you.</p>
            
            <p>Here's what's new:</p>
            <ul>
                <li>Feature 1: Text Translation</li>
                <li>Feature 2: Chat with AI</li>
                <li>Feature 3: Premium IAP Support</li>
            </ul>
            
            <div style="text-align: center;">
                <a href="https://play.google.com/store/apps/details?id=com.kharagedition.tibetankeyboard" class="cta-button">
                    Update App
                </a>
            </div>
            
            <p>If you have any questions, feel free to reach out to our support team.</p>
            
            <p>Best regards,<br>
             {{params.appName}} Team</p>
        </div>
        
        <div class="footer">
            <p>&copy; 2025 KharagEdition. All rights reserved.</p>
            <p>
                <a href="https://kharagedition.com" style="color: #8a5c1e;">Visit our website</a> | 
                <a href="mailto:developer.kharag@gmail.com" style="color: #8a5c1e;">Contact Support</a>
            </p>
        </div>
    </div>
</body>
</html>`;

  const handleLoadTemplate = () => {
    setHtmlContent(keyboardReleaseTemplate);
    setSubject("Important Update from Your App");
  };

  const handleSend = async () => {
    if (!subject.trim() || !htmlContent.trim()) {
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
        body: JSON.stringify({ subject, htmlContent, sendToAll: true }),
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
      <div className="bg-white rounded-lg w-full max-w-6xl m-4 h-5/6 flex">
        {/* Left Panel - Email Editor */}
        <div className="w-1/2 p-6 border-r border-gray-200">
          <h2 className="text-xl font-bold mb-4">Send Email Campaign</h2>

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

          {/* Template Button */}
          <div className="mb-4">
            <button
              onClick={handleLoadTemplate}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 text-sm"
            >
              Load Default Template
            </button>
          </div>

          {/* HTML Content */}
          <div className="mb-6 flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              HTML Content
            </label>
            <textarea
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              className="w-full h-34 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="Enter HTML email content"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between">
            <div>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="bg-blue-100 text-blue-700 px-4 py-2 rounded-md hover:bg-blue-200 mr-2"
              >
                {showPreview ? "Hide Preview" : "Show Preview"}
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={sending}
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !subject.trim() || !htmlContent.trim()}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? "Sending..." : "Send to All Users"}
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Preview */}
        <div className="w-1/2 p-6">
          <h3 className="text-lg font-semibold mb-4">Email Preview</h3>

          {showPreview && htmlContent ? (
            <div className="border border-gray-200 rounded-md h-full overflow-hidden">
              <iframe
                srcDoc={htmlContent}
                className="w-full h-full"
                title="Email Preview"
                sandbox="allow-same-origin"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-92 bg-gray-50 rounded-md text-gray-500">
              {htmlContent
                ? 'Click "Show Preview" to see email'
                : "Enter HTML content to preview"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
