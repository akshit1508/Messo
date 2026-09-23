export interface FoodDto {
  id: number;
  name: string;
  mealType: string;
}

export interface AnnouncementDto {
  id: number;
  title: string;
  message: string;
  createdAt: string;
}

export interface NotificationDto {
  id: number;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface StudentDashboardResponse {
  unreadAnnouncementsCount: number;
  latestAnnouncements: AnnouncementDto[];
  notifications: NotificationDto[];
}

export interface TodayMenuResponse {
  served: boolean;
  message: string;
  food: FoodDto | null;
  alreadyRated: boolean;
}

export interface TomorrowMenuResponse {
  published: boolean;
  message: string;
  food: FoodDto | null;
  date: string;
}

export interface PollOptionDto {
  id: number;
  foodName: string;
}

export interface PollResponse {
  pollId: number | null;
  pollDate: string | null;
  active: boolean;
  alreadyVoted: boolean;
  options: PollOptionDto[];
  message: string;
}

export interface SubmitRatingRequest {
  foodId: number;
  rating: number;
}

export interface VoteRequest {
  optionId: number;
}

export interface ComplaintCreateRequest {
  type: string;
  description: string;
  rating?: number;
}
