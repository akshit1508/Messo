package com.messo.dto;

import com.messo.model.PollOption;

public record PollOptionDto(
        Long id,
        String foodName
) {
    public static PollOptionDto fromEntity(PollOption option) {
        if (option == null) return null;
        return new PollOptionDto(option.getId(), option.getFoodName());
    }
}
