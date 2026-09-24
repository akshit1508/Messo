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

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    studentId: "",
    hostel: "",
    phone: "",
    email: "",
    password: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await signup({
        name: formData.name.trim(),
        studentId: formData.studentId.trim(),
        hostel: formData.hostel.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });

      // Redirect to login with query param indicating success
      router.push("/login?registered=true");
    } catch (err) {
      setError(formatErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-slate-50">
      <div className="w-full max-w-lg">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white font-black text-xl tracking-wider shadow-sm mb-3">
            M
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            MESO Registration
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Create your student resident account for daily mess voting & ratings
          </p>
        </div>

        {/* Signup Card */}
        <Card className="border border-slate-200/90 shadow-xs">
          <CardHeader>
            <CardTitle>Student Registration</CardTitle>
            <CardDescription>
              Enter your student details to activate your mess voting privileges
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <Alert variant="danger" className="mb-4">
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  type="text"
                  name="name"
                  placeholder="Rahul Sharma"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />

                <Input
                  label="Student ID / Roll No"
                  type="text"
                  name="studentId"
                  placeholder="STU-2024-042"
                  value={formData.studentId}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Hostel & Room"
                  type="text"
                  name="hostel"
                  placeholder="Block B, Room 304"
                  value={formData.hostel}
                  onChange={handleChange}
                  required
                />

                <Input
                  label="Phone Number"
                  type="tel"
                  name="phone"
                  placeholder="9876543210"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>

              <Input
                label="Hostel / College Email"
                type="email"
                name="email"
                placeholder="student@hostel.edu"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />

              <Input
                label="Password"
                type="password"
                name="password"
                placeholder="Minimum 6 characters"
                value={formData.password}
                onChange={handleChange}
                required
                autoComplete="new-password"
                helperText="Must be at least 6 characters long"
              />

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isLoading}
                className="w-full mt-3"
              >
                Complete Registration
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-600">
              Already registered?{" "}
              <Link
                href="/login"
                className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
              >
                Sign in to your account
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
