package com.messo.dto;

import com.messo.model.Complaint;
import java.time.LocalDateTime;

public record ComplaintResponse(
        Long id,
        String type,
        String description,
        Integer rating,
        boolean resolved,
        LocalDateTime createdAt,
        String userEmail
) {
    public static ComplaintResponse fromEntity(Complaint complaint) {
        if (complaint == null) return null;
        String email = complaint.getUser() != null ? complaint.getUser().getEmail() : null;
        return new ComplaintResponse(
                complaint.getId(),
                complaint.getType(),
                complaint.getDescription(),
                complaint.getRating(),
                complaint.isResolved(),
                complaint.getCreatedAt(),
                email
        );
    }
}
