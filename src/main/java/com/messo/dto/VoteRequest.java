package com.messo.dto;

import jakarta.validation.constraints.NotNull;

public record VoteRequest(
        @NotNull(message = "Option ID is required")
        Long optionId
) {}
