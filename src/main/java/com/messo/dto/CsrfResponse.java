package com.messo.dto;

public record CsrfResponse(
        String token,
        String headerName,
        String parameterName
) {}
