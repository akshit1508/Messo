package com.messo.dto;

public record AuthUserResponse(
        boolean authenticated,
        Long userId,
        String email,
        String role,
        String message
) {
    public static AuthUserResponse unauthenticated() {
        return new AuthUserResponse(false, null, null, null, "Not authenticated");
    }

    public static AuthUserResponse authenticated(Long userId, String email, String role) {
        return new AuthUserResponse(true, userId, email, role, "Authenticated successfully");
    }
}
