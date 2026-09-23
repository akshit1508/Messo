package com.messo.dto;

public record AdminDashboardResponse(
        boolean pollActive,
        long totalComplaints,
        long pendingComplaints,
        long resolvedComplaints
) {}
