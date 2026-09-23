"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authApi } from "@/lib/auth";
import { AuthUserResponse, LoginRequest, SignupRequest, UserRole } from "@/types/auth";
import { ApiResponse } from "@/types/api";

interface AuthContextType {
  currentUser: AuthUserResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  role: UserRole | null;
  login: (credentials: LoginRequest) => Promise<AuthUserResponse>;
  signup: (data: SignupRequest) => Promise<ApiResponse>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AuthUserResponse | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUserResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async (): Promise<AuthUserResponse | null> => {
    try {
      const data = await authApi.getMe();
      if (data && data.authenticated) {
        setCurrentUser(data);
        return data;
      } else {
        setCurrentUser(null);
        return null;
      }
    } catch {
      setCurrentUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (credentials: LoginRequest): Promise<AuthUserResponse> => {
    setIsLoading(true);
    try {
      const user = await authApi.login(credentials);
      setCurrentUser(user);
      return user;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (data: SignupRequest): Promise<ApiResponse> => {
    return authApi.signup(data);
  };

  const logout = async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch (err) {
      console.warn("Logout request encountered an error:", err);
    } finally {
      setCurrentUser(null);
    }
  };

  const isAuthenticated = !!(currentUser && currentUser.authenticated);
  const role = currentUser?.role || null;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        isLoading,
        role,
        login,
        signup,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
