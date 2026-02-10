"use client";

import { useAuth } from "@/contexts/AuthContext";

export default function HomePage() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold">Dashboard</h1>
      <p className="mt-4 text-gray-600">
        Welcome, {user?.name || user?.email || "User"}!
      </p>
      <button
        onClick={logout}
        className="mt-6 rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
      >
        Logout
      </button>
    </div>
  );
}
