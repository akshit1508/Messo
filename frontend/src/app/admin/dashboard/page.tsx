"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";

export default function AdminDashboardPage() {
  const { currentUser } = useAuth();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Control Center"
        description={`Administrator workspace for ${currentUser?.email ?? "Admin"}.`}
        action={
          <Badge variant="warning">Administrator Session</Badge>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Daily Menu Management</CardTitle>
              <Badge variant="neutral">Upcoming</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Create, update, and publish breakfast, lunch, and dinner menus with automatic meal timing.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Ratings & Analytics</CardTitle>
              <Badge variant="neutral">Upcoming</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Inspect student ratings, meal satisfaction percentages, and low-rated food item alerts.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Polls & Feedback</CardTitle>
              <Badge variant="neutral">Upcoming</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Publish student preference polls, tally live voting counts, and schedule seasonal changes.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Student Complaints</CardTitle>
              <Badge variant="neutral">Upcoming</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Review grievances submitted by students, assign actions, and resolve tickets.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Announcements</CardTitle>
              <Badge variant="neutral">Upcoming</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Broadcast hostel-wide notices regarding timing changes, special feasts, and maintenance.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Demographic Insights</CardTitle>
              <Badge variant="neutral">Upcoming</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Track student mess subscriptions, dietary distributions (Veg / Non-Veg), and hostel room allocations.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">System Access & Security Verification</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-500 font-medium">Administrator Email</dt>
              <dd className="text-gray-900 font-mono mt-0.5">{currentUser?.email}</dd>
            </div>
            <div>
              <dt className="text-gray-500 font-medium">Internal User ID</dt>
              <dd className="text-gray-900 font-mono mt-0.5">#{currentUser?.userId}</dd>
            </div>
            <div>
              <dt className="text-gray-500 font-medium">Assigned Authority</dt>
              <dd className="text-gray-900 mt-0.5">
                <Badge variant="warning">ROLE_ADMIN</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 font-medium">Session Protection</dt>
              <dd className="text-gray-900 mt-0.5">CORS-verified `JSESSIONID` cookie with CSRF synchronization</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
