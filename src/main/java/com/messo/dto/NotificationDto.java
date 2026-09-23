package com.messo.dto;

import com.messo.model.Notification;
import java.time.LocalDateTime;

public record NotificationDto(
        Long id,
        String message,
        boolean read,
        LocalDateTime createdAt
) {
    public static NotificationDto fromEntity(Notification notification) {
        if (notification == null) return null;
        return new NotificationDto(
                notification.getId(),
                notification.getMessage(),
                notification.isRead(),
                notification.getCreatedAt()
        );
    }
}
