package com.messo.dto;

import com.messo.model.Announcement;
import java.time.LocalDateTime;

public record AnnouncementDto(
        Long id,
        String title,
        String message,
        LocalDateTime createdAt
) {
    public static AnnouncementDto fromEntity(Announcement announcement) {
        if (announcement == null) return null;
        return new AnnouncementDto(
                announcement.getId(),
                announcement.getTitle(),
                announcement.getMessage(),
                announcement.getCreatedAt()
        );
    }
}
