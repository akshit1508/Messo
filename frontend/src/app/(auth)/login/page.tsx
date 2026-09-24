"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { formatErrorMessage } from "@/lib/error";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const user = await login({ email: email.trim(), password });
      if (user.role === "ADMIN") {
        router.push("/admin/dashboard");
      } else {
        router.push("/student/dashboard");
      }
    } catch (err) {
      setError(formatErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-slate-50">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white font-black text-xl tracking-wider shadow-sm mb-3">
            M
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            MESO
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Hostel Mess Management & Student Feedback Platform
          </p>
        </div>

        {/* Login Card */}
        <Card className="border border-slate-200/90 shadow-xs">
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>
              Sign in to your account using your hostel mess credentials
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <Alert variant="danger" className="mb-4">
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                name="email"
                placeholder="student@hostel.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />

              <Input
                label="Password"
                type="password"
                name="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isLoading}
                className="w-full mt-2"
              >
                Sign In
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-600">
              New hostel resident?{" "}
              <Link
                href="/signup"
                className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
              >
                Create student account
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-xs text-slate-400">
          Independent Hostel Mess Platform &bull; Secure Session Verification
        </p>
      </div>
    </div>
  );
}
