"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
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
import { EmptyState } from "@/components/ui/EmptyState";

export default function StudentDashboardPage() {
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dashboardData, setDashboardData] = useState<StudentDashboardResponse | null>(null);
  const [todayMenu, setTodayMenu] = useState<TodayMenuResponse | null>(null);
  const [tomorrowMenu, setTomorrowMenu] = useState<TomorrowMenuResponse | null>(null);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);

  const [dismissingAnnouncementId, setDismissingAnnouncementId] = useState<number | null>(null);
  const [dismissingNotificationId, setDismissingNotificationId] = useState<number | null>(null);

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
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
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleDismissAnnouncement = async (id: number) => {
    setDismissingAnnouncementId(id);
    try {
      await studentApi.dismissAnnouncement(id);
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

  // Time-of-day greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, []);

  const tomorrowFormatted = useMemo(() => {
    return new Date(Date.now() + 86400000).toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loading size="lg" text="Loading your dashboard..." />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => fetchDashboardData(false)} />;
  }

  const studentDisplayName = currentUser?.email
    ? currentUser.email.split("@")[0]
    : "Student";

  return (
    <div className="space-y-8 pb-12">
      {/* Top Welcome & Context Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                {greeting}, {studentDisplayName}
              </h1>
              <Badge variant="success" dot={true} className="hidden sm:inline-flex">
                Active Session
              </Badge>
            </div>
            <p className="text-sm text-slate-500 flex items-center gap-2">
              <svg
                className="w-4 h-4 text-slate-400 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span>{todayFormatted}</span>
              <span className="text-slate-300">•</span>
              <span className="font-mono text-xs text-slate-500">{currentUser?.email}</span>
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              disabled={refreshing}
              onClick={() => fetchDashboardData(true)}
              className="text-xs text-slate-700"
            >
              <svg
                className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? "animate-spin text-blue-600" : "text-slate-500"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
            <Link href="/student/rate">
              <Button size="sm" className="text-xs">
                Rate Today
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Notifications & Grievance Resolution Alerts */}
      {notifications.length > 0 && (
        <section aria-labelledby="notifications-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2
              id="notifications-heading"
              className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <span>Important Notifications & Resolution Updates ({notifications.length})</span>
            </h2>
          </div>
          <div className="space-y-2.5">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className="flex items-center justify-between p-4 bg-blue-50/80 border border-blue-200/90 rounded-xl transition-all"
              >
                <div className="flex items-start gap-3 min-w-0 pr-4">
                  <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0 mt-0.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-blue-950 leading-snug">{notif.message}</p>
                    <p className="text-xs text-blue-700/80 mt-1">
                      {new Date(notif.createdAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={dismissingNotificationId === notif.id}
                  onClick={() => handleDismissNotification(notif.id)}
                  className="text-blue-700 hover:bg-blue-100 text-xs shrink-0"
                >
                  {dismissingNotificationId === notif.id ? "Dismissing..." : "Dismiss"}
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Main Dining Operations (Today's Meal & Tomorrow's Outlook) */}
      <section aria-labelledby="dining-schedule-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="dining-schedule-heading" className="text-lg font-semibold text-slate-900">
              Mess Dining Schedule
            </h2>
            <p className="text-xs text-slate-500">
              Live kitchen operational status and meal schedules.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Today's Meal */}
          <Card className="flex flex-col justify-between border-slate-200 hover:border-slate-300 transition-colors">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Today&apos;s Meal
                  </span>
                  <CardTitle className="text-base font-semibold text-slate-900">
                    Today&apos;s Kitchen Service
                  </CardTitle>
                </div>
                {!todayMenu?.served ? (
                  <Badge variant="neutral" dot={false}>
                    Not Served
                  </Badge>
                ) : todayMenu.alreadyRated ? (
                  <Badge variant="success" dot={true}>
                    Served & Rated
                  </Badge>
                ) : (
                  <Badge variant="default" dot={true}>
                    Served • Rating Pending
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="pt-4 flex-1 flex flex-col justify-between space-y-5">
              {todayMenu?.served && todayMenu?.food ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100">
                      {todayMenu.food.mealType}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      #{todayMenu.food.id}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                      {todayMenu.food.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {todayMenu.alreadyRated
                        ? "You have already submitted your feedback for this meal."
                        : "Meal is currently being served in the dining hall."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-700">No Meal Currently Served</p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    The kitchen staff has not flagged a meal as served yet today.
                  </p>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100">
                {todayMenu?.served ? (
                  todayMenu.alreadyRated ? (
                    <Link href="/student/rate" className="block w-full">
                      <Button variant="outline" size="sm" className="w-full justify-center">
                        <svg className="w-3.5 h-3.5 mr-1.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        View or Update Rating
                      </Button>
                    </Link>
                  ) : (
                    <Link href="/student/rate" className="block w-full">
                      <Button variant="primary" size="sm" className="w-full justify-center">
                        Rate This Meal Now &rarr;
                      </Button>
                    </Link>
                  )
                ) : (
                  <Link href="/student/tomorrow" className="block w-full">
                    <Button variant="ghost" size="sm" className="w-full justify-center text-slate-600">
                      View Tomorrow&apos;s Menu Plan &rarr;
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Tomorrow's Menu */}
          <Card className="flex flex-col justify-between border-slate-200 hover:border-slate-300 transition-colors">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Next Day Plan
                  </span>
                  <CardTitle className="text-base font-semibold text-slate-900">
                    {tomorrowFormatted}
                  </CardTitle>
                </div>
                {tomorrowMenu?.published ? (
                  <Badge variant="success" dot={true}>
                    Menu Confirmed
                  </Badge>
                ) : (
                  <Badge variant="neutral" dot={false}>
                    Pending Publication
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="pt-4 flex-1 flex flex-col justify-between space-y-5">
              {tomorrowMenu?.published && tomorrowMenu?.food ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                      {tomorrowMenu.food.mealType}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      #{tomorrowMenu.food.id}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                      {tomorrowMenu.food.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Kitchen schedule confirmed for tomorrow.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-700">Menu Not Published Yet</p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Tomorrow&apos;s menu has not been confirmed yet. Have you voted in today&apos;s poll?
                  </p>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex gap-2">
                <Link href="/student/tomorrow" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full justify-center">
                    Full Details &rarr;
                  </Button>
                </Link>
                <Link href="/student/poll" className="flex-1">
                  <Button variant="secondary" size="sm" className="w-full justify-center">
                    Vote in Poll
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Quick Action Navigation Grid */}
      <section aria-labelledby="quick-actions-heading" className="space-y-3">
        <h2 id="quick-actions-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500">
          Quick Actions & Services
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/student/rate"
            className="p-5 bg-white border border-slate-200/90 rounded-xl hover:border-blue-400 hover:shadow-xs transition-all duration-150 group"
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
            <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
              Rate Today&apos;s Meal
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Submit ratings and direct taste feedback for today&apos;s dining session.
            </p>
          </Link>

          <Link
            href="/student/poll"
            className="p-5 bg-white border border-slate-200/90 rounded-xl hover:border-blue-400 hover:shadow-xs transition-all duration-150 group"
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
            <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
              Tomorrow&apos;s Poll
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Cast your vote on dish preferences for tomorrow&apos;s upcoming menu.
            </p>
          </Link>

          <Link
            href="/student/tomorrow"
            className="p-5 bg-white border border-slate-200/90 rounded-xl hover:border-blue-400 hover:shadow-xs transition-all duration-150 group"
          >
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
              Tomorrow&apos;s Schedule
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Inspect confirmed kitchen preparations and meal options for tomorrow.
            </p>
          </Link>

          <Link
            href="/student/complaint"
            className="p-5 bg-white border border-slate-200/90 rounded-xl hover:border-blue-400 hover:shadow-xs transition-all duration-150 group"
          >
            <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
              File Grievance
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Report hygiene, quality, or mess facility issues directly to administration.
            </p>
          </Link>
        </div>
      </section>

      {/* Official Circulars & Announcements Section */}
      <section aria-labelledby="announcements-heading">
        <Card className="border-slate-200/90">
          <CardHeader className="flex flex-row items-center justify-between pb-3.5 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2" id="announcements-heading">
                <CardTitle className="text-base font-semibold text-slate-900">
                  Hostel & Mess Circulars
                </CardTitle>
                {dashboardData && dashboardData.unreadAnnouncementsCount > 0 && (
                  <Badge variant="warning" dot={true}>
                    {dashboardData.unreadAnnouncementsCount} unread
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Official notices and administrative announcements from the mess committee.
              </p>
            </div>
            <Link href="/student/announcements">
              <Button variant="ghost" size="sm" className="text-xs text-slate-700 hover:text-slate-900">
                View all &rarr;
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-4">
            {!dashboardData?.latestAnnouncements || dashboardData.latestAnnouncements.length === 0 ? (
              <EmptyState
                title="No Active Circulars"
                description="There are currently no new announcements or circulars from the mess administration."
                className="my-4 border-slate-200"
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {dashboardData.latestAnnouncements.map((announcement: AnnouncementDto) => (
                  <div
                    key={announcement.id}
                    className="py-4 first:pt-1 last:pb-1 flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                        <h4 className="text-sm font-semibold text-slate-900 truncate">
                          {announcement.title}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed pl-3.5">
                        {announcement.message}
                      </p>
                      <p className="text-[11px] text-slate-400 pl-3.5">
                        {new Date(announcement.createdAt).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={dismissingAnnouncementId === announcement.id}
                      onClick={() => handleDismissAnnouncement(announcement.id)}
                      className="text-xs shrink-0 text-slate-600 hover:text-slate-900"
                      aria-label={`Dismiss announcement: ${announcement.title}`}
                    >
                      {dismissingAnnouncementId === announcement.id ? "Dismissing..." : "Dismiss"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
