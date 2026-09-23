package com.messo.dto;

import java.util.List;

public record StudentDashboardResponse(
        long unreadAnnouncementsCount,
        List<AnnouncementDto> latestAnnouncements,
        List<NotificationDto> notifications
) {}
