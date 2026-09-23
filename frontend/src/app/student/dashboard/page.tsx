"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";

export default function StudentDashboardPage() {
  const { currentUser } = useAuth();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Dashboard"
        description={`Welcome back, ${currentUser?.email ?? "Student"}! Your authentication session is active.`}
        action={
          <Badge variant="success">Authenticated Session</Badge>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">{"Today's Menu & Ratings"}</CardTitle>
              <Badge variant="neutral">Upcoming</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              View daily breakfast, lunch, and dinner menus and submit real-time feedback ratings.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Mess Polls</CardTitle>
              <Badge variant="neutral">Upcoming</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Vote on weekly special menus and dietary preferences organized by mess management.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Complaints & Suggestions</CardTitle>
              <Badge variant="neutral">Upcoming</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Submit food hygiene or facility issues and track real-time resolution from admin staff.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Session & Account Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-500 font-medium">Logged in Email</dt>
              <dd className="text-gray-900 font-mono mt-0.5">{currentUser?.email}</dd>
            </div>
            <div>
              <dt className="text-gray-500 font-medium">Student User ID</dt>
              <dd className="text-gray-900 font-mono mt-0.5">#{currentUser?.userId}</dd>
            </div>
            <div>
              <dt className="text-gray-500 font-medium">Assigned Role</dt>
              <dd className="text-gray-900 mt-0.5">
                <Badge variant="default">{currentUser?.role}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 font-medium">Authentication Type</dt>
              <dd className="text-gray-900 mt-0.5">Spring Security HTTP-only Cookie (`JSESSIONID`)</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
