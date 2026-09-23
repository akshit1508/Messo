package com.messo.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CreatePollRequest(
        @NotEmpty(message = "At least two food options are required")
        @Size(min = 2, message = "At least two food options are required")
        List<String> foods
) {}
