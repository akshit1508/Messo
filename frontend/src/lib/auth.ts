import { api } from "@/lib/api";
import { ApiResponse } from "@/types/api";
import { AuthUserResponse, LoginRequest, SignupRequest } from "@/types/auth";

export const authApi = {
  login: async (credentials: LoginRequest): Promise<AuthUserResponse> => {
    return api.post<AuthUserResponse>("/api/auth/login", credentials);
  },

  signup: async (data: SignupRequest): Promise<ApiResponse> => {
    return api.post<ApiResponse>("/api/auth/signup", data);
  },

  logout: async (): Promise<ApiResponse> => {
    return api.post<ApiResponse>("/api/auth/logout");
  },

  getMe: async (): Promise<AuthUserResponse> => {
    return api.get<AuthUserResponse>("/api/auth/me");
  },
};
