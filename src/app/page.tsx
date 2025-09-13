// src/app/page.tsx
"use client";

import dynamic from "next/dynamic";

// Dynamically import the UserDashboard to avoid SSR issues
const UserDashboard = dynamic(() => import("../components/UserDashboard"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading dashboard...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  return <UserDashboard />;
}
