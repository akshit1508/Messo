"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loading } from "@/components/ui/Loading";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, role, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace("/login");
      } else if (role === "STUDENT") {
        router.replace("/student/dashboard");
      }
    }
  }, [isLoading, isAuthenticated, role, router]);

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loading size="lg" text="Verifying administrator privileges..." />
      </div>
    );
  }

  if (!isAuthenticated || role !== "ADMIN") {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      {/* Desktop Sidebar (fixed w-64) */}
      <AdminSidebar onLogout={handleLogout} />

      {/* Mobile Header (sticky top) */}
      <AdminHeader onLogout={handleLogout} />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
