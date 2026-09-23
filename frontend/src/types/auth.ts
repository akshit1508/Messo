export type UserRole = "STUDENT" | "ADMIN";

export interface AuthUserResponse {
  authenticated: boolean;
  userId: number | null;
  email: string | null;
  role: UserRole | null;
  message?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  name?: string;
  studentId?: string;
  hostel?: string;
  phone?: string;
}
