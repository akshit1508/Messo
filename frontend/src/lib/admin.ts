import { api } from "@/lib/api";
import { ApiResponse } from "@/types/api";
import {
  AdminDashboardResponse,
  AnnouncementCreateRequest,
  ComplaintResponse,
  CreatePollRequest,
  FoodAnalyticsResponse,
  PollResultResponse,
} from "@/types/admin";

export const adminApi = {
  getDashboard: (): Promise<AdminDashboardResponse> =>
    api.get<AdminDashboardResponse>("/api/admin/dashboard"),

  createPoll: (request: CreatePollRequest): Promise<ApiResponse> =>
    api.post<ApiResponse>("/api/admin/polls", request),

  getPollResults: (id: number): Promise<PollResultResponse> =>
    api.get<PollResultResponse>(`/api/admin/polls/${id}/results`),

  getActivePollResults: (): Promise<PollResultResponse> =>
    api.get<PollResultResponse>("/api/admin/polls/active/results"),

  publishPoll: (id: number): Promise<ApiResponse> =>
    api.post<ApiResponse>(`/api/admin/polls/${id}/publish`),

  publishActivePoll: (): Promise<ApiResponse> =>
    api.post<ApiResponse>("/api/admin/polls/publish"),

  getComplaints: (): Promise<ComplaintResponse[]> =>
    api.get<ComplaintResponse[]>("/api/admin/complaints"),

  getComplaint: (id: number): Promise<ComplaintResponse> =>
    api.get<ComplaintResponse>(`/api/admin/complaints/${id}`),

  resolveComplaint: (id: number): Promise<ApiResponse> =>
    api.post<ApiResponse>(`/api/admin/complaints/${id}/resolve`),

  createAnnouncement: (request: AnnouncementCreateRequest): Promise<ApiResponse> =>
    api.post<ApiResponse>("/api/admin/announcements", request),

  getRatings: (): Promise<FoodAnalyticsResponse[]> =>
    api.get<FoodAnalyticsResponse[]>("/api/admin/ratings"),
};
