export interface AdminDashboardResponse {
  pollActive: boolean;
  totalComplaints: number;
  pendingComplaints: number;
  resolvedComplaints: number;
}

export interface CreatePollRequest {
  foods: string[];
}

export interface PollOptionResultDto {
  foodName: string;
  votes: number;
  percentage: number;
}

export interface PollResultResponse {
  pollId: number | null;
  active: boolean;
  winningFood: string | null;
  totalVotes: number;
  results: PollOptionResultDto[];
}

export interface ComplaintResponse {
  id: number;
  type: string;
  description: string;
  rating: number | null;
  resolved: boolean;
  createdAt: string;
  userEmail: string | null;
}

export interface AnnouncementCreateRequest {
  title: string;
  message: string;
}

export interface FoodAnalyticsResponse {
  foodName: string;
  averageRating: number;
  totalReviews: number;
}
