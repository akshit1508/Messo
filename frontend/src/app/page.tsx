"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { PageLoading } from "@/components/ui/Loading";

export default function RootPage() {
  const { isAuthenticated, role, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        if (role === "ADMIN") {
          router.replace("/admin/dashboard");
        } else {
          router.replace("/student/dashboard");
        }
      } else {
        router.replace("/login");
      }
    }
  }, [isAuthenticated, role, isLoading, router]);

  return <PageLoading message="Connecting to MESO session..." />;
}
