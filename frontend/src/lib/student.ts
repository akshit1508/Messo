import { api } from "@/lib/api";
import { ApiResponse } from "@/types/api";
import {
  AnnouncementDto,
  ComplaintCreateRequest,
  NotificationDto,
  PollResponse,
  StudentDashboardResponse,
  SubmitRatingRequest,
  TodayMenuResponse,
  TomorrowMenuResponse,
  VoteRequest,
} from "@/types/student";

export const studentApi = {
  getDashboard: (): Promise<StudentDashboardResponse> =>
    api.get<StudentDashboardResponse>("/api/student/dashboard"),

  getTodayMenu: (): Promise<TodayMenuResponse> =>
    api.get<TodayMenuResponse>("/api/student/menu/today"),

  getTodayRatingInfo: (): Promise<TodayMenuResponse> =>
    api.get<TodayMenuResponse>("/api/student/rating/today"),

  submitRating: (request: SubmitRatingRequest): Promise<ApiResponse> =>
    api.post<ApiResponse>("/api/student/rating", request),

  getTomorrowMenu: (): Promise<TomorrowMenuResponse> =>
    api.get<TomorrowMenuResponse>("/api/student/menu/tomorrow"),

  getActivePoll: (): Promise<PollResponse> =>
    api.get<PollResponse>("/api/student/poll"),

  vote: (request: VoteRequest): Promise<ApiResponse> =>
    api.post<ApiResponse>("/api/student/poll/vote", request),

  getAllAnnouncements: (): Promise<AnnouncementDto[]> =>
    api.get<AnnouncementDto[]>("/api/student/announcements"),

  dismissAnnouncement: (id: number): Promise<ApiResponse> =>
    api.post<ApiResponse>(`/api/student/announcements/${id}/dismiss`),

  submitComplaint: (request: ComplaintCreateRequest): Promise<ApiResponse> =>
    api.post<ApiResponse>("/api/student/complaints", request),

  getNotifications: (): Promise<NotificationDto[]> =>
    api.get<NotificationDto[]>("/api/student/notifications"),

  dismissNotification: (id: number): Promise<ApiResponse> =>
    api.post<ApiResponse>(`/api/student/notifications/${id}/dismiss`),
};
