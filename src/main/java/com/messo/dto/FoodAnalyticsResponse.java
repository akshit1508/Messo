package com.messo.dto;

public record FoodAnalyticsResponse(
        String foodName,
        double averageRating,
        long totalReviews
) {}
