"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { studentApi } from "@/lib/student";
import { formatErrorMessage } from "@/lib/error";
import {
  StudentDashboardResponse,
  TodayMenuResponse,
  TomorrowMenuResponse,
  NotificationDto,
  AnnouncementDto,
} from "@/types/student";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Loading } from "@/components/ui/Loading";
import { ErrorState } from "@/components/ui/ErrorState";
import { MenuCard } from "@/components/student/MenuCard";

export default function StudentDashboardPage() {
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dashboardData, setDashboardData] = useState<StudentDashboardResponse | null>(null);
  const [todayMenu, setTodayMenu] = useState<TodayMenuResponse | null>(null);
  const [tomorrowMenu, setTomorrowMenu] = useState<TomorrowMenuResponse | null>(null);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);

  const [dismissingAnnouncementId, setDismissingAnnouncementId] = useState<number | null>(null);
  const [dismissingNotificationId, setDismissingNotificationId] = useState<number | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, todayRes, tomorrowRes, notifRes] = await Promise.all([
        studentApi.getDashboard(),
        studentApi.getTodayMenu(),
        studentApi.getTomorrowMenu(),
        studentApi.getNotifications(),
      ]);

      setDashboardData(dashRes);
      setTodayMenu(todayRes);
      setTomorrowMenu(tomorrowRes);
      setNotifications(notifRes);
    } catch (err) {
      setError(formatErrorMessage(err, "Failed to load student dashboard"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleDismissAnnouncement = async (id: number) => {
    setDismissingAnnouncementId(id);
    try {
      await studentApi.dismissAnnouncement(id);
      // Remove or mark as dismissed in local state
      if (dashboardData) {
        setDashboardData({
          ...dashboardData,
          unreadAnnouncementsCount: Math.max(0, dashboardData.unreadAnnouncementsCount - 1),
          latestAnnouncements: dashboardData.latestAnnouncements.filter((a) => a.id !== id),
        });
      }
    } catch (err) {
      console.error("Failed to dismiss announcement:", err);
    } finally {
      setDismissingAnnouncementId(null);
    }
  };

  const handleDismissNotification = async (id: number) => {
    setDismissingNotificationId(id);
    try {
      await studentApi.dismissNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error("Failed to dismiss notification:", err);
    } finally {
      setDismissingNotificationId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loading size="lg" text="Loading your dashboard..." />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchDashboardData} />;
  }

  const todayDateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const tomorrowDateStr = new Date(Date.now() + 86400000).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Student Dashboard"
        description={`Welcome back! Here is today's meal schedule, announcements, and mess updates.`}
        action={
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500 font-mono hidden sm:inline">
              {currentUser?.email}
            </span>
            <Badge variant="success">Active Session</Badge>
          </div>
        }
      />

      {/* Notifications Section (if any alerts exist) */}
      {notifications.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-blue-900 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
              <span>Important Notifications & Resolution Updates ({notifications.length})</span>
            </h3>
          </div>
          <div className="space-y-2">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className="flex items-center justify-between p-4 bg-blue-50/80 border border-blue-200 rounded-xl transition-all"
              >
                <div className="flex items-start space-x-3">
                  <div className="p-1 rounded bg-blue-100 text-blue-700 mt-0.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-950">{notif.message}</p>
                    <p className="text-xs text-blue-600 mt-0.5">
                      {new Date(notif.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={dismissingNotificationId === notif.id}
                  onClick={() => handleDismissNotification(notif.id)}
                  className="text-blue-700 hover:bg-blue-100 text-xs"
                >
                  {dismissingNotificationId === notif.id ? "Dismissing..." : "Dismiss"}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Menus Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Today's Menu */}
        <MenuCard
          title="Today's Meal"
          date={todayDateStr}
          isAvailable={!!(todayMenu?.served && todayMenu?.food)}
          foodName={todayMenu?.food?.name}
          mealType={todayMenu?.food?.mealType}
          statusBadgeText={
            !todayMenu?.served
              ? "Not Served"
              : todayMenu.alreadyRated
              ? "Rated"
              : "Served"
          }
          statusBadgeVariant={
            !todayMenu?.served
              ? "neutral"
              : todayMenu.alreadyRated
              ? "success"
              : "default"
          }
          emptyMessage="No meal is scheduled for today yet."
          actionHref={todayMenu?.served ? "/student/rate" : undefined}
          actionText={
            todayMenu?.served
              ? todayMenu.alreadyRated
                ? "View Rating"
                : "Rate This Meal"
              : undefined
          }
        />

        {/* Tomorrow's Menu */}
        <MenuCard
          title="Tomorrow's Meal"
          date={tomorrowDateStr}
          isAvailable={!!(tomorrowMenu?.published && tomorrowMenu?.food)}
          foodName={tomorrowMenu?.food?.name}
          mealType={tomorrowMenu?.food?.mealType}
          statusBadgeText={tomorrowMenu?.published ? "Published" : "Pending Publication"}
          statusBadgeVariant={tomorrowMenu?.published ? "success" : "neutral"}
          emptyMessage="Tomorrow's menu has not been published yet."
          actionHref="/student/tomorrow"
          actionText="View Tomorrow's Details"
        />
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/student/rate"
          className="p-5 bg-white border border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-sm transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </div>
          <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
            Rate Food
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            Provide feedback on today&apos;s meal quality and taste.
          </p>
        </Link>

        <Link
          href="/student/poll"
          className="p-5 bg-white border border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-sm transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
            Tomorrow&apos;s Poll
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            Vote for tomorrow&apos;s special menu choices.
          </p>
        </Link>

        <Link
          href="/student/complaint"
          className="p-5 bg-white border border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-sm transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
            File Complaint
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            Report hygiene or facility grievances to mess administration.
          </p>
        </Link>
      </div>

      {/* Latest Announcements Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <CardTitle className="text-base font-semibold">Latest Announcements</CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">
              Hostel circulars and mess administration notices.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {dashboardData && dashboardData.unreadAnnouncementsCount > 0 && (
              <Badge variant="warning">
                {dashboardData.unreadAnnouncementsCount} unread
              </Badge>
            )}
            <Link href="/student/announcements">
              <Button variant="ghost" size="sm" className="text-xs">
                View all &rarr;
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {!dashboardData?.latestAnnouncements || dashboardData.latestAnnouncements.length === 0 ? (
            <p className="text-sm text-gray-500 italic py-4 text-center">
              No recent announcements posted.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {dashboardData.latestAnnouncements.map((announcement: AnnouncementDto) => (
                <div
                  key={announcement.id}
                  className="py-3 flex items-start justify-between gap-4 first:pt-0 last:pb-0"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <h5 className="text-sm font-semibold text-gray-900">
                      {announcement.title}
                    </h5>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {announcement.message}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {new Date(announcement.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={dismissingAnnouncementId === announcement.id}
                    onClick={() => handleDismissAnnouncement(announcement.id)}
                    className="text-xs shrink-0"
                  >
                    {dismissingAnnouncementId === announcement.id ? "Dismissing..." : "Dismiss"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
