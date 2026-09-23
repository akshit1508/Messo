package com.messo.dto;

public record PollOptionResultDto(
        String foodName,
        long votes,
        double percentage
) {}
